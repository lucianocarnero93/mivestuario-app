#!/usr/bin/env python3
"""Genera templates (html/*.html con {{placeholders}}), ejemplos llenos (html/ejemplos/) y PNGs."""
import os, re, subprocess, html, base64

ROOT = "/workspace/mivestuario/cards"
HTML = f"{ROOT}/html"
EJ = f"{HTML}/ejemplos"
PNG = f"{ROOT}/png"

LOGO = ('<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="Mi Vestuario">'
  '<rect width="32" height="32" rx="7" fill="#0b1c12"/><rect x="4" y="6" width="10" height="20" rx="2" fill="#b8f25a"/>'
  '<rect x="18" y="6" width="10" height="20" rx="2" fill="#b8f25a"/><rect x="6" y="8" width="6" height="2" rx="1" fill="#0b1c12"/>'
  '<rect x="6" y="12" width="6" height="2" rx="1" fill="#0b1c12"/><rect x="20" y="8" width="6" height="2" rx="1" fill="#0b1c12"/>'
  '<rect x="20" y="12" width="6" height="2" rx="1" fill="#0b1c12"/><circle cx="12" cy="22" r="1.5" fill="#0b1c12"/>'
  '<circle cx="20" cy="22" r="1.5" fill="#0b1c12"/><circle cx="16" cy="16" r="6" fill="#0b1c12"/><circle cx="16" cy="16" r="5.2" fill="#eef6ef"/>'
  '<polygon fill="#0b1c12" points="16,12.85 19,15.03 17.85,18.55 14.15,18.55 13,15.03"/></svg>')

TRIM = "M 56 24 H 252 L 280 46 H 440 L 468 24 H 664 Q 696 24 696 56 V 792 Q 696 842 648 866 L 390 968 Q 360 980 330 968 L 72 866 Q 24 842 24 792 V 56 Q 24 24 56 24 Z"

SILUETA = ('<svg viewBox="0 0 400 490" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="150" r="92"/>'
  '<path d="M20 490 C 26 360 96 290 200 288 C 304 290 374 360 380 490 Z"/></svg>')

BALL = ('<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#fff4ea" stroke="#1d0a03" stroke-width="2"/>'
  '<polygon points="20,11 28,17 25,27 15,27 12,17" fill="#1d0a03"/></svg>')

CHALK = ('<svg class="chalk" viewBox="0 0 720 1000"><circle cx="560" cy="170" r="26"/><circle cx="470" cy="300" r="26"/>'
  '<path d="M600 300 l40 40 M640 300 l-40 40"/><path d="M300 230 l40 40 M340 230 l-40 40"/>'
  '<path d="M486 280 C 540 220 590 220 620 270" /><path d="M612 250 l10 22 l-24 4"/>'
  '<path d="M230 120 C 300 90 380 110 420 160"/><path d="M40 640 C 120 600 200 600 260 640"/></svg>')

FIT_JS = """<script>
document.querySelectorAll('[data-fit]').forEach(function (el) {
  var size = parseFloat(getComputedStyle(el).fontSize), min = parseFloat(el.dataset.min || 40);
  while (el.scrollWidth > el.clientWidth + 1 && size > min) { size -= 2; el.style.fontSize = size + 'px'; }
});
</script>"""

def card_markup(t):
    """t: dict con claves de template (valores pueden ser {{PLACEHOLDER}} o datos)."""
    stats = "".join(f'<div><b>{v}</b><span>{l}</span></div>' for l, v in t["stats"])
    deco = t.get("deco", "")
    chalk = CHALK if t["tier"] == "pizarra" else ""
    return f'''<div class="card tier-{t["tier"]}" data-foto="{t["has_foto"]}" data-escudo="{t["has_escudo"]}">
  <div class="shape frame"></div>
  <div class="shape body">
    {chalk}
    <div class="foto">
      <img src="{t["foto"]}" alt="">
      <div class="fallback">{SILUETA}<div class="ini">{t["iniciales"]}</div></div>
    </div>
    <div class="shine-top"></div>
    <div class="shine"></div>
  </div>
  <svg class="trim" viewBox="0 0 720 1000"><path d="{TRIM}"/></svg>
  <div class="col">
    <div class="big" data-fit data-min="96">{t["big"]}</div>
    <div class="big-label">{t["big_label"]}</div>
    <div class="puesto">{t["puesto"]}</div>
    <div class="dorsal">{t["dorsal"]}</div>
    <div class="sep"></div>
    <div class="crest"><div class="crest-shape">{t["equipo_ini"]}</div><img src="{t["escudo"]}" alt=""></div>
  </div>
  {deco}
  <div class="ribbon" data-fit data-min="26">{t["titulo"]}</div>
  <div class="contexto">{t["contexto"]}</div>
  <div class="nombre" data-fit data-min="56">{t["nombre"]}</div>
  <div class="equipo">{t["equipo"]}</div>
  <div class="stats">{stats}</div>
  <div class="marca">{LOGO}<span>Mi Vestuario</span></div>
</div>'''

def page(body, cls, title, comment=""):
    return f'''<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<title>{title}</title>
<!-- {comment} -->
<link rel="stylesheet" href="{{{{CSS_HREF}}}}">
</head>
<body class="{cls}">
{body}
{FIT_JS}
</body>
</html>
'''

STORY_LINES = ('<svg class="lineas" viewBox="0 0 1080 1920"><circle cx="540" cy="960" r="250"/>'
  '<path d="M0 960 H1080"/><rect x="240" y="-10" width="600" height="250"/><rect x="240" y="1680" width="600" height="250"/></svg>')

def story_markup(t, frase, sub, kicker):
    return f'''<div class="story tier-{t["tier"]}">
  {STORY_LINES}
  <div class="head">{LOGO}<span>Mi Vestuario</span></div>
  <div class="kicker">{kicker}</div>
  <div class="holder">{card_markup(t)}</div>
  <div class="frase" data-fit data-min="48">{frase}</div>
  <div class="sub">{sub}</div>
  <div class="url">mivestuario.com.ar</div>
</div>'''

# ------------------------------------------------------------------ avatars (placeholder de foto)
def avatar(skin, hair, style, jersey, trim, extra=""):
    shade = "rgba(0,0,0,.16)"
    back = ""
    front = ""
    if style == "largo":
        back = f'<path d="M150 250 C 140 120 220 95 260 96 C 310 96 384 120 372 250 C 380 360 400 430 360 470 L 160 470 C 120 430 142 360 150 250 Z" fill="{hair}"/>'
        front = f'<path d="M168 262 C 160 150 220 118 262 120 C 304 118 364 150 354 262 C 350 220 332 192 302 180 C 284 198 240 198 222 180 C 192 192 172 222 168 262 Z" fill="{hair}"/>'
    elif style == "colita":
        back = f'<path d="M330 170 C 410 170 430 260 400 360 C 390 300 372 250 340 230 Z" fill="{hair}"/>'
        front = f'<path d="M170 250 C 162 150 222 120 262 121 C 320 122 360 160 352 250 C 340 200 300 178 262 178 C 220 178 186 200 170 250 Z" fill="{hair}"/><circle cx="345" cy="180" r="18" fill="{trim}"/>'
    elif style == "rulos":
        circles = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{hair}"/>' for x, y, r in
            [(190,200,40),(225,160,42),(270,145,44),(315,160,42),(345,200,38),(178,240,28),(355,240,28),(250,175,40),(290,180,36)])
        front = circles
    elif style == "rapado":
        front = f'<path d="M174 238 C 170 160 220 132 262 132 C 306 132 352 160 348 238 C 334 196 300 180 262 180 C 222 180 188 196 174 238 Z" fill="{hair}" opacity=".9"/>'
    else:  # corto
        front = f'<path d="M168 246 C 158 150 222 118 266 120 C 326 120 366 162 352 246 C 344 196 306 168 300 162 C 270 186 214 190 168 246 Z" fill="{hair}"/>'
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 560" width="1000" height="1120">
<defs><radialGradient id="hl" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient>
<linearGradient id="jg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{jersey}"/><stop offset="1" stop-color="#000" stop-opacity=".0"/></linearGradient></defs>
{back}
<path d="M30 560 C 40 450 130 405 205 392 L 315 392 C 390 405 480 450 490 560 Z" fill="{jersey}"/>
<path d="M30 560 C 40 450 130 405 205 392 L 315 392 C 390 405 480 450 490 560 Z" fill="url(#hl)"/>
<path d="M120 430 L 160 560 M400 430 L 360 560" stroke="{trim}" stroke-width="10" opacity=".8"/>
<rect x="224" y="318" width="72" height="100" rx="30" fill="{skin}"/>
<rect x="224" y="318" width="72" height="60" rx="26" fill="{shade}"/>
<path d="M205 392 L 260 452 L 315 392 Z" fill="{trim}"/>
<path d="M222 392 L 260 434 L 298 392 Z" fill="{skin}"/>
<ellipse cx="174" cy="262" rx="16" ry="25" fill="{skin}"/><ellipse cx="346" cy="262" rx="16" ry="25" fill="{skin}"/>
<ellipse cx="260" cy="250" rx="88" ry="108" fill="{skin}"/>
<ellipse cx="260" cy="250" rx="88" ry="108" fill="url(#hl)"/>
{front}
{extra}
</svg>'''
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()

GLOVES = ('<g><rect x="70" y="470" width="90" height="80" rx="30" fill="#b8f25a"/><rect x="360" y="470" width="90" height="80" rx="30" fill="#b8f25a"/></g>')

# ------------------------------------------------------------------ definiciones
EQUIPO = "Deportivo Pasaje"
EQUIPO_INI = "DP"

CARDS = [
  dict(slug="01-figura-del-partido", tier="neon", nombre_tipo="Figura del partido",
       titulo_tpl="FIGURA DEL PARTIDO", big_label="Votos",
       ctx_tpl="vs. {{RIVAL}} · {{FECHA}}",
       stats_tpl=[("Goles","{{GOLES}}"),("Asist.","{{ASISTENCIAS}}"),("Result.","{{RESULTADO}}")],
       ex=dict(TITULO="FIGURA DEL PARTIDO", NOMBRE="Cami", INICIALES="CP", PUESTO="VOL", DORSAL="#10",
               STAT="7", RIVAL="Villa Real FC", FECHA="12/09/2026", GOLES="1", ASISTENCIAS="2", RESULTADO="3-1"),
       foto=("#c98e6a","#2a1a12","colita","#1f6f3f","#b8f25a")),
  dict(slug="02-goleador-del-mes", tier="oro", nombre_tipo="Goleador/a del mes",
       titulo_tpl="{{TITULO}}", big_label="Goles",
       ctx_tpl="{{MES}} {{ANIO}}",
       stats_tpl=[("PJ","{{PJ}}"),("Prom.","{{PROMEDIO}}"),("Asist.","{{ASISTENCIAS}}")],
       ex=dict(TITULO="GOLEADORA DEL MES", NOMBRE="Flor", INICIALES="FA", PUESTO="DEL", DORSAL="#9",
               STAT="6", MES="Septiembre", ANIO="2026", PJ="4", PROMEDIO="1,5", ASISTENCIAS="2"),
       foto=("#e8b996","#5a3418","largo","#1f6f3f","#b8f25a")),
  dict(slug="03-asistidor-del-mes", tier="esmeralda", nombre_tipo="Asistidor/a del mes",
       titulo_tpl="{{TITULO}}", big_label="Asist.",
       ctx_tpl="{{MES}} {{ANIO}}",
       stats_tpl=[("PJ","{{PJ}}"),("Prom.","{{PROMEDIO}}"),("Goles","{{GOLES}}")],
       ex=dict(TITULO="ASISTIDOR DEL MES", NOMBRE="Luqui Giménez", INICIALES="LG", PUESTO="VOL", DORSAL="#8",
               STAT="5", MES="Septiembre", ANIO="2026", PJ="4", PROMEDIO="1,3", GOLES="2"),
       foto=None),
  dict(slug="04-valla-invicta", tier="hielo", nombre_tipo="Valla invicta",
       titulo_tpl="VALLA INVICTA", big_label="Goles en contra",
       ctx_tpl="vs. {{RIVAL}} · {{FECHA}}",
       stats_tpl=[("Result.","{{RESULTADO}}"),("Vallas","{{VALLAS_TORNEO}}"),("PJ arco","{{PJ_ARCO}}")],
       ex=dict(TITULO="VALLA INVICTA", NOMBRE="Sofi", INICIALES="SM", PUESTO="ARQ", DORSAL="#1",
               STAT="0", RIVAL="Los Halcones", FECHA="19/09/2026", RESULTADO="2-0", VALLAS_TORNEO="3", PJ_ARCO="7"),
       foto=("#8d5a3b","#120c08","rulos","#f0b429","#0b1c12")),
  dict(slug="05-presente-siempre", tier="plata", nombre_tipo="Presente siempre",
       titulo_tpl="PRESENTE SIEMPRE", big_label="de {{PARTIDOS_MES}}",
       ctx_tpl="{{MES}} {{ANIO}}",
       stats_tpl=[("Voy","{{VOY}}/{{PARTIDOS_MES}}"),("Jugados","{{PJ}}"),("Racha","{{RACHA}}")],
       ex=dict(TITULO="PRESENTE SIEMPRE", NOMBRE="Mati", INICIALES="MR", PUESTO="DEF", DORSAL="#5",
               STAT="4", PARTIDOS_MES="4", MES="Septiembre", ANIO="2026", VOY="4", PJ="4", RACHA="9"),
       foto=None, deco="checks"),
  dict(slug="06-hat-trick", tier="fuego", nombre_tipo="Hat-trick",
       titulo_tpl="HAT-TRICK", big_label="Goles",
       ctx_tpl="vs. {{RIVAL}} · {{FECHA}}",
       stats_tpl=[("Result.","{{RESULTADO}}"),("Asist.","{{ASISTENCIAS}}"),("Goles año","{{GOLES_TOTAL}}")],
       ex=dict(TITULO="HAT-TRICK", NOMBRE="Nico", INICIALES="NB", PUESTO="DEL", DORSAL="#11",
               STAT="3", RIVAL="Ferro del Oeste", FECHA="26/09/2026", RESULTADO="5-2", ASISTENCIAS="1", GOLES_TOTAL="14"),
       foto=("#f1c7a5","#3a2a1e","corto","#1f6f3f","#b8f25a"), deco="balls"),
  dict(slug="07-debut", tier="bronce", nombre_tipo="Debut",
       titulo_tpl="DEBUT", big_label="Partido",
       ctx_tpl="vs. {{RIVAL}} · {{FECHA}}",
       stats_tpl=[("Result.","{{RESULTADO}}"),("Goles","{{GOLES}}"),("Asist.","{{ASISTENCIAS}}")],
       ex=dict(TITULO="DEBUT", NOMBRE="Vale Irigoyen", INICIALES="VI", PUESTO="DEF", DORSAL="#14",
               STAT="1°", RIVAL="Villa Real FC", FECHA="03/10/2026", RESULTADO="2-2", GOLES="1", ASISTENCIAS="0"),
       foto=None, deco="tag"),
  dict(slug="08-capitan", tier="cancha", nombre_tipo="Capitán/a (opcional)",
       titulo_tpl="{{TITULO}}", big_label="PJ",
       ctx_tpl="{{TORNEO}}",
       stats_tpl=[("Goles","{{GOLES}}"),("Asist.","{{ASISTENCIAS}}"),("Ganados","{{GANADOS}}")],
       ex=dict(TITULO="CAPITANA", NOMBRE="Pau", INICIALES="PL", PUESTO="DEF", DORSAL="#4",
               STAT="12", TORNEO="Torneo Apertura 2026", GOLES="2", ASISTENCIAS="4", GANADOS="8"),
       foto=("#d9a27c","#1b120c","colita","#1f6f3f","#b8f25a"), deco="brazalete"),
  dict(slug="09-dt-del-mes", tier="pizarra", nombre_tipo="DT del mes",
       titulo_tpl="DT DEL MES", big_label="Ganados",
       ctx_tpl="{{MES}} {{ANIO}}",
       stats_tpl=[("PJ","{{PJ}}"),("E / P","{{PE}} / {{PP}}"),("Goles","{{GF}}-{{GC}}")],
       ex=dict(TITULO="DT DEL MES", NOMBRE="Vero", INICIALES="VS", PUESTO="DT", DORSAL="&nbsp;",
               STAT="4", MES="Septiembre", ANIO="2026", PJ="5", PE="1", PP="0", GF="14", GC="5"),
       foto=("#e0ad88","#6e3420","largo","#2f4a39","#b8f25a")),
]

def deco_html(kind, ex=None, tpl=False):
    if kind == "balls":
        return f'<div class="deco balls">{BALL*3}</div>' if not tpl else '<div class="deco balls"><!-- repetir {{GOLES_PARTIDO}} veces, máx 5 -->' + BALL*3 + '</div>'
    if kind == "checks":
        n = 4 if not ex else int(ex["PARTIDOS_MES"])
        inner = "<i></i>" * n
        return f'<div class="deco checks">{"<!-- un <i></i> por partido del mes con Voy, máx 8 -->" if tpl else ""}{inner}</div>'
    if kind == "brazalete":
        return '<div class="deco brazalete">C</div>'
    if kind == "tag":
        return '<div class="deco tag">Primer partido</div>'
    return ""

def fill(s, data):
    def rep(m):
        k = m.group(1)
        return data.get(k, m.group(0))
    return re.sub(r"\{\{([A-Z0-9_]+)\}\}", rep, s)

def base_t(c, tpl=True):
    return dict(tier=c["tier"], has_foto="{{TIENE_FOTO}}", has_escudo="{{TIENE_ESCUDO}}", foto="{{FOTO_SRC}}",
                iniciales="{{INICIALES}}", big="{{STAT}}", big_label=c["big_label"], puesto="{{PUESTO}}", dorsal="{{DORSAL}}",
                equipo_ini="{{EQUIPO_INICIALES}}", escudo="{{ESCUDO_SRC}}", titulo=c["titulo_tpl"], contexto=c["ctx_tpl"],
                nombre="{{NOMBRE}}", equipo="{{EQUIPO}}", stats=c["stats_tpl"], deco=deco_html(c.get("deco",""), tpl=True))

def example_data(c):
    d = dict(c["ex"])
    d.update(EQUIPO=EQUIPO, EQUIPO_INICIALES=EQUIPO_INI, ESCUDO_SRC="", TIENE_ESCUDO="no")
    if c["foto"]:
        skin, hair, style, jersey, trim = c["foto"]
        extra = ""
        d["FOTO_SRC"] = avatar(skin, hair, style, jersey, trim, extra); d["TIENE_FOTO"] = "si"
    else:
        d["FOTO_SRC"] = ""; d["TIENE_FOTO"] = "no"
    return d

STORIES = [
  dict(slug="story-figura-del-partido", card="01-figura-del-partido",
       frase_tpl="<em>{{NOMBRE}}</em>, figura", sub_tpl="{{EQUIPO}} {{RESULTADO}} {{RIVAL}}", kicker_tpl="{{EQUIPO}} · {{FECHA}}",
       ex=dict()),
  dict(slug="story-goleador-del-mes", card="02-goleador-del-mes",
       frase_tpl="<em>{{NOMBRE}}</em>, {{TITULO_CORTO}}", sub_tpl="{{STAT}} goles en {{MES_MIN}}", kicker_tpl="{{EQUIPO}} · {{MES_MIN}} {{ANIO}}",
       ex=dict(TITULO_CORTO="goleadora del mes", MES_MIN="septiembre")),
]

def render(src, out, w, h):
    subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--default-background-color=00000000",
                    f"--window-size={w},{h}", "--virtual-time-budget=3000", f"--screenshot={out}", f"file://{src}"],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def main(extra=None):
    os.makedirs(EJ, exist_ok=True)
    jobs = []
    for c in CARDS:
        tpl_body = card_markup(base_t(c))
        comment = f"Template: {c['nombre_tipo']} · tier {c['tier']} · 720x1000. Reemplazar {{{{...}}}}. Ver SPEC.md"
        tpl = page(tpl_body, "solo-card", f"Mi Vestuario · {c['nombre_tipo']}", comment)
        open(f"{HTML}/{c['slug']}.html", "w").write(tpl.replace("{{CSS_HREF}}", "cards.css"))
        data = example_data(c)
        ex_t = base_t(c); ex_t["deco"] = deco_html(c.get("deco",""), ex=c["ex"])
        ex = page(card_markup(ex_t), "solo-card", f"Ejemplo · {c['nombre_tipo']}", "Ejemplo con datos ficticios")
        ex = fill(ex.replace("{{CSS_HREF}}", "../cards.css"), data)
        p = f"{EJ}/{c['slug']}.html"; open(p, "w").write(ex)
        jobs.append((p, f"{PNG}/{c['slug']}.png", 720, 1000))
    for s in STORIES:
        c = next(x for x in CARDS if x["slug"] == s["card"])
        body = story_markup(base_t(c), s["frase_tpl"], s["sub_tpl"], s["kicker_tpl"])
        tpl = page(body, "solo-story", f"Story · {c['nombre_tipo']}", "Story 1080x1920 para Instagram. Ver SPEC.md")
        open(f"{HTML}/{s['slug']}.html", "w").write(tpl.replace("{{CSS_HREF}}", "cards.css"))
        data = example_data(c); data.update(s["ex"])
        ex_t = base_t(c); ex_t["deco"] = deco_html(c.get("deco",""), ex=c["ex"])
        ex = page(story_markup(ex_t, s["frase_tpl"], s["sub_tpl"], s["kicker_tpl"]), "solo-story", "Ejemplo story", "Ejemplo")
        ex = fill(ex.replace("{{CSS_HREF}}", "../cards.css"), data)
        p = f"{EJ}/{s['slug']}.html"; open(p, "w").write(ex)
        jobs.append((p, f"{PNG}/{s['slug']}.png", 1080, 1920))
    for j in jobs:
        render(*j); print("png", j[1])

if __name__ == "__main__":
    main()
