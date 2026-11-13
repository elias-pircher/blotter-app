'use client';
// Gives the journal the same small storage API it uses inside Claude (collections, documents,
// screenshots), backed by Supabase. Every row belongs to the signed-in customer; the database's
// row level security keeps customers apart and blocks writes without an active subscription.

const KINDS = new Set(['trades', 'learnings', 'outlooks', 'settings']);
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

function mapError(e) {
  const msg = (e && (e.message || e.error)) || '';
  if (e && (e.code === '42501' || /row-level security|violates row level/i.test(msg))) return { code: 'no_sub', message: msg };
  if (e && (e.status === 401 || /JWT|not authenticated/i.test(msg))) return { code: 'not_logged_in', message: msg };
  if (e && (e.statusCode === '413' || e.statusCode === 413 || /too large|exceeded/i.test(msg))) return { code: 'too_large', message: msg };
  return { code: 'unavailable', message: msg };
}

export function makeBackend(sb, uid, email, opts = {}) {
  const cache = {};
  const listeners = {};
  const loading = {};

  const emit = (kind) => (listeners[kind] || new Set()).forEach((fn) => fn(cache[kind] || new Map()));

  async function load(kind) {
    if (loading[kind]) return loading[kind];
    loading[kind] = (async () => {
      const { data, error } = await sb.from('entries').select('id,data').eq('kind', kind);
      if (error) throw mapError(error);
      cache[kind] = new Map(data.map((r) => [r.id, r.data]));
      emit(kind);
    })().finally(() => { loading[kind] = null; });
    return loading[kind];
  }

  function listen(kind, fn, onError) {
    if (!KINDS.has(kind)) throw new TypeError('Unbekannte Sammlung: ' + kind);
    (listeners[kind] ||= new Set()).add(fn);
    if (cache[kind]) fn(cache[kind]);
    load(kind).catch((e) => onError && onError(e));
    return () => listeners[kind].delete(fn);
  }

  function docRef(kind, id) {
    return {
      id,
      async set(body) {
        const { error } = await sb.from('entries').upsert({ user_id: uid, kind, id, data: body, updated_at: new Date().toISOString() });
        if (error) throw mapError(error);
        (cache[kind] ||= new Map()).set(id, body);
        emit(kind);
      },
      async delete() {
        const { error } = await sb.from('entries').delete().eq('kind', kind).eq('id', id);
        if (error) throw mapError(error);
        cache[kind]?.delete(id);
        emit(kind);
      },
      onSnapshot(next, onError) {
        return listen(kind, (m) => {
          const d = m.get(id);
          next({ id, exists: d !== undefined, data: () => d, metadata: { fromCache: false, hasPendingWrites: false } });
        }, onError);
      },
    };
  }

  const db = {
    collection(kind) {
      return {
        doc: (id) => docRef(kind, id),
        onSnapshot(next, onError) {
          return listen(kind, (m) => {
            const docs = [...m].map(([id, d]) => ({ id, exists: true, data: () => d, metadata: { fromCache: false, hasPendingWrites: false } }));
            next({ docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false } });
          }, onError);
        },
      };
    },
    doc(path) {
      const [kind, id] = String(path).split('/');
      return docRef(kind, id);
    },
  };

  const assets = {
    async upload(blob, opts) {
      const type = (opts && opts.type) || blob.type;
      const ext = EXT[type];
      if (!ext) throw { code: 'unsupported_type' };
      const path = uid + '/' + crypto.randomUUID() + '.' + ext;
      const { error } = await sb.storage.from('shots').upload(path, blob, { contentType: type, upsert: false });
      if (error) throw mapError(error);
      return { id: path, url: '/api/shot?p=' + encodeURIComponent(path), sizeBytes: blob.size, contentType: type };
    },
    async delete(ref) {
      const { error } = await sb.storage.from('shots').remove([ref]);
      if (error) throw mapError(error);
      return { deleted: true };
    },
  };

  // Live updates from other devices, plus a refresh when the tab comes back into view.
  try {
    sb.channel('entries-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: 'user_id=eq.' + uid }, (payload) => {
        const kind = (payload.new && payload.new.kind) || (payload.old && payload.old.kind);
        if (kind && listeners[kind]) load(kind).catch(() => {});
      })
      .subscribe();
  } catch (e) { /* realtime is optional */ }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') Object.keys(listeners).forEach((k) => load(k).catch(() => {}));
  });

  return {
    email,
    friend: !!opts.friend,
    async use(name) { return name === 'db' ? db : name === 'assets' ? assets : null; },
    imgSrc(ref) { return '/api/shot?p=' + encodeURIComponent(ref); },
    async portal() {
      const r = await fetch('/api/portal', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw { code: r.status === 401 ? 'not_logged_in' : 'unavailable' };
      window.location.href = j.url;
    },
    async logout() {
      await sb.auth.signOut();
      window.location.href = '/';
    },
  };
}
