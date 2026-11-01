"""Split the published journal into the pieces the Next.js app serves, and swap its storage layer
for the customer backend (window.BlotterBackend). Re-run whenever the journal design changes."""
import os, re, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..')
SRC = os.environ.get('BLOTTER_SRC', os.path.join(APP, 'design', 'blotter.html'))
s = open(SRC, encoding='utf-8').read()

css = s[s.index('<style>') + len('<style>'):s.index('</style>')]
main_start = s.index('<script>\n(function(){')
markup_start = s.index('<canvas id="bg"')
markup = s[markup_start:main_start].strip()
js = s[main_start + len('<script>'):s.rindex('</script>')]

def rep(text, old, new, count=1):
    n = text.count(old)
    if n != count:
        sys.exit('expected %d, found %d: %r' % (count, n, old[:100]))
    return text.replace(old, new)

# ---- backend instead of claude.ai capabilities
js = rep(js, "    const c = window.claude;\n", "    const c = window.BlotterBackend || window.claude;\n")
js = rep(js, "    return '/_blob/' + ref;\n", "    return window.BlotterBackend ? window.BlotterBackend.imgSrc(ref) : '/_blob/' + ref;\n")
js = rep(js, "  if (c === 'revoked') return 'Der Zugriff auf dieses Journal wurde entzogen.';\n",
         "  if (c === 'revoked') return 'Der Zugriff auf dieses Journal wurde entzogen.';\n"
         "  if (c === 'no_sub') return 'Dein Abo ist nicht aktiv. Öffne die Einstellungen, um es zu verwalten.';\n"
         "  if (c === 'not_logged_in') return 'Du bist nicht mehr angemeldet. Lade die Seite neu und melde dich an.';\n")
js = rep(js, "'Cloud-Speicher ist in dieser Ansicht nicht verfügbar. Deine Einträge werden nur in diesem Browser gespeichert. Öffne das Journal über claude.ai, damit sie auf allen Geräten verfügbar sind.'",
         "'Die Verbindung zu deinem Konto ist gerade nicht möglich. Einträge werden vorerst nur in diesem Browser gespeichert.'")
js = rep(js, "'In dieser Ansicht kann nichts gespeichert werden. Öffne das Journal über claude.ai.'",
         "'In diesem Browser kann gerade nichts gespeichert werden. Lade die Seite neu.'")
js = rep(js, "'Gespeichert im Journal, auf all deinen Geräten verfügbar'", "'Gespeichert in deinem Konto, auf all deinen Geräten verfügbar'")

# ---- account & subscription section in the settings dialog
js = rep(js, """      <section class="set-sec"><h3>Konten</h3>${acctFields(draft.acctNames, 'set')}</section>""",
"""      <section class="set-sec"><h3>Konten</h3>${acctFields(draft.acctNames, 'set')}</section>
      ${window.BlotterBackend ? `<section class="set-sec"><h3>Konto &amp; Abo</h3><p class="acct-mail">Angemeldet als <b>${esc(window.BlotterBackend.email || '')}</b></p><div class="acct-btns"><button type="button" class="btn" data-action="acct-portal">Abo verwalten oder kündigen</button><button type="button" class="btn ghost" data-action="acct-logout">Abmelden</button></div></section>` : ''}""")
js = rep(js, """        if (act === 'set-cancel') { if (Modal.cur) Modal.cur.dirty = false; Modal.close(); }""",
"""        if (act === 'set-cancel') { if (Modal.cur) Modal.cur.dirty = false; Modal.close(); }
        else if (act === 'acct-portal' || act === 'acct-logout') {
          a.disabled = true;
          try { if (act === 'acct-portal') await window.BlotterBackend.portal(); else await window.BlotterBackend.logout(); }
          catch (err) { a.disabled = false; const er = $('#form-err', p); er.textContent = errText(err); er.hidden = false; }
        }""")

css = css + """
.acct-mail{margin:0;color:var(--muted);font-size:14px;overflow-wrap:anywhere}
.acct-mail b{color:var(--ink);font-weight:600}
.acct-btns{display:flex;flex-wrap:wrap;gap:8px}
"""

RESET = (":root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}\n"
         "html,body{margin:0}body{font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}\n")

open(APP + '/app/(journal)/journal.css', 'w', encoding='utf-8').write(RESET + css)
open(APP + '/public/journal/journal.js', 'w', encoding='utf-8').write('/* Blotter journal — generated from the design source, do not edit by hand. */\n' + js.strip() + '\n')
open(APP + '/app/(journal)/app/markup.js', 'w', encoding='utf-8').write(
    '// Generated from the journal design source.\nexport const MARKUP = ' + json.dumps(markup, ensure_ascii=False) + ';\n')
print('css', len(css), 'markup', len(markup), 'js', len(js))
