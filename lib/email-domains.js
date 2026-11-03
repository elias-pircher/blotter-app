// Common mail providers (Austria/Germany first): typo suggestions and where their spam folder is.

const PROVIDERS = [
  { domains: ['gmail.com', 'googlemail.com'], name: 'Gmail', spam: '„Spam“ und im Tab „Werbung“' },
  { domains: ['gmx.at', 'gmx.net', 'gmx.de', 'gmx.ch', 'gmx.com'], name: 'GMX', spam: '„Spamverdacht“' },
  { domains: ['web.de'], name: 'WEB.DE', spam: '„Spamverdacht“' },
  { domains: ['aon.at', 'a1.net', 'aon.cc', 'telering.at'], name: 'A1', spam: '„Spam“ im A1 Webmail' },
  { domains: ['outlook.com', 'outlook.de', 'outlook.at', 'hotmail.com', 'hotmail.de', 'hotmail.at', 'live.com', 'live.at', 'live.de', 'msn.com'], name: 'Outlook', spam: '„Junk-E-Mail“' },
  { domains: ['icloud.com', 'me.com', 'mac.com'], name: 'iCloud', spam: '„Werbung“' },
  { domains: ['yahoo.com', 'yahoo.de', 'ymail.com'], name: 'Yahoo', spam: '„Spam“' },
  { domains: ['t-online.de'], name: 't-online', spam: '„Spam“' },
  { domains: ['chello.at', 'kabsi.at', 'liwest.at', 'tele2.at', 'drei.at', 'inode.at', 'utanet.at', 'freenet.de', 'posteo.de', 'posteo.at', 'mailbox.org', 'protonmail.com', 'proton.me', 'gmx.ch'], name: '', spam: '' },
];

const KNOWN = PROVIDERS.flatMap((p) => p.domains);

// edit distance where swapping two neighbouring letters counts as one typo
function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const WRONG_TLD_BASES = ['gmail', 'googlemail', 'icloud', 'hotmail', 'outlook', 'yahoo'];

const TLD_FIX = { con: 'com', cmo: 'com', comm: 'com', ocm: 'com', vom: 'com', xom: 'com', cpm: 'com', co: 'com', nte: 'net', ner: 'net', ent: 'net', ta: 'at', att: 'at', ed: 'de' };

// "max@gmial.com" -> "max@gmail.com"; null if nothing looks off.
export function suggestEmail(email) {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const user = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase().replace(/\.+$/, '');
  if (!domain || KNOWN.includes(domain)) return null;
  let best = null, bestD = 9;
  for (const k of KNOWN) {
    const d = distance(domain, k);
    if (d < bestD) { best = k; bestD = d; }
  }
  const limit = domain.length <= 7 ? 1 : 2;
  if (best && bestD > 0 && bestD <= limit) return `${user}@${best}`;
  const parts = domain.split('.');
  const tld = parts.pop();
  if (parts.length && TLD_FIX[tld]) {
    const fixed = `${parts.join('.')}.${TLD_FIX[tld]}`;
    if (KNOWN.includes(fixed)) return `${user}@${fixed}`;
  }
  // right provider, wrong ending: gmail.at, icloud.de, …
  if (parts.length === 1 && WRONG_TLD_BASES.includes(parts[0])) {
    const hit = KNOWN.find((k) => k.startsWith(`${parts[0]}.`));
    if (hit) return `${user}@${hit}`;
  }
  return null;
}

export function providerOf(email) {
  const domain = String(email).split('@')[1]?.toLowerCase() || '';
  return PROVIDERS.find((p) => p.name && p.domains.includes(domain)) || null;
}
