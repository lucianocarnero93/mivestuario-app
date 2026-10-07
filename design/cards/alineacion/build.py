#!/usr/bin/env python3
"""Alineación para compartir · arma templates ({{PLACEHOLDERS}}), ejemplos llenos y PNG (Chrome headless).

  python3 alineacion/build.py          # templates + ejemplos + PNG + QA + hoja de contacto + antes/después
  python3 alineacion/build.py rapido   # sin hoja ni antes/después

Templates: whatsapp.html (1080×1350), story.html (1080×1920), og.html (1200×630).
El layout (líneas, perspectiva, chips) sale de alineacion.js, que es la fuente de verdad para portar a canvas."""
import os, re, sys, json, html, base64, subprocess

ROOT = "/workspace/mivestuario/cards"
DIR = f"{ROOT}/alineacion"
EJ = f"{DIR}/ejemplos"
OUT = f"{ROOT}/png/alineacion"
import importlib.util as _iu
_spec = _iu.spec_from_file_location("cards_build", "/workspace/mivestuario/cards/_tools/build.py")
_cb = _iu.module_from_spec(_spec); _spec.loader.exec_module(_cb)
LOGO = _cb.LOGO  # mismo logo que las cards de premios

SIZES = dict(whatsapp=(1080, 1350), story=(1080, 1920), og=(1200, 630))

# ------------------------------------------------------------------ templates
SCRIPTS = '''<script id="datos" type="application/json">{{DATOS_JSON}}</script>
<script src="{{BASE}}../avatar/avatar.js"></script>
<script src="{{BASE}}alineacion.js"></script>
<script>document.fonts.ready.then(function () { MVAlineacion.render(JSON.parse(document.getElementById("datos").textContent)); });</script>'''

def doc(fmt, body, title):
    return f'''<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<title>{title}</title>
<!-- Template "Alineación para compartir" · {fmt} {SIZES[fmt][0]}x{SIZES[fmt][1]}. Reemplazar {{{{...}}}}. Ver SPEC.md § Alineación para compartir -->
<link rel="stylesheet" href="{{{{BASE}}}}alineacion.css">
</head>
<body class="fmt-{fmt}">
{body}
{SCRIPTS}
</body>
</html>
'''

CREST = '''<div class="crest" data-escudo="{{TIENE_ESCUDO}}"><div class="crest-shape">{{EQUIPO_INICIALES}}</div><img src="{{ESCUDO_SRC}}" alt=""></div>'''
TITLES = '''<div class="titles">
      <div class="kicker">{{KICKER}}</div>
      <div class="team"><span class="fit" data-min="46">{{EQUIPO}}</span></div>
      <div class="rival"><span class="fit" data-min="32"><em>vs</em> {{RIVAL}}</span></div>
      {META}
    </div>'''
BADGE = '<div class="badge"><b>{{FORMATO}}</b><span>{{ESQUEMA}}</span></div>'
BANCO = '''<section class="banco key">
    <div class="col-banco"><h3>Banco</h3><div class="banco-lista"></div></div>
    <div class="col-dt"><h3>DT</h3><div class="dt-lista"></div></div>
  </section>'''
MARCA = f'<footer class="marca key">{LOGO}<span>Armado en <b>Mi Vestuario</b> · <em>mivestuario.com.ar</em></span></footer>'

T_WHATSAPP = doc("whatsapp", f'''<div class="stage">
  <div class="bg"></div>
  <div class="pitch-holder"></div>
  <header class="head key">
    {CREST}
    {TITLES.replace("{META}", '<div class="meta"><span class="fit" data-min="20"><b>{{FECHA}} · {{HORA}}</b> · {{CANCHA}}</span></div>')}
    {BADGE}
  </header>
  <div class="players"></div>
  {BANCO}
  {MARCA}
</div>''', "Mi Vestuario · Alineación · WhatsApp 1080x1350")

T_STORY = doc("story", f'''<div class="stage">
  <div class="bg"></div>
  <div class="pitch-holder"></div>
  <header class="head key">
    {CREST}
    {TITLES.replace("{META}", "")}
    {BADGE}
  </header>
  <div class="pills key"><span>{{{{FECHA}}}} · {{{{HORA}}}}</span><span>{{{{CANCHA}}}}</span></div>
  <div class="players"></div>
  {BANCO}
  {MARCA}
</div>''', "Mi Vestuario · Alineación · Story 1080x1920")

T_OG = doc("og", f'''<div class="stage">
  <div class="bg"></div>
  <div class="pitch-holder"></div>
  <div class="players"></div>
  <div class="left">
    <div class="brand">{LOGO}<span>Mi Vestuario</span></div>
    <div class="og-head">{CREST}<div class="titles"><div class="kicker">{{{{KICKER}}}}</div><div class="team"><span class="fit" data-min="40">{{{{EQUIPO}}}}</span></div></div></div>
    <div class="rival"><span class="fit" data-min="30"><em>vs</em> {{{{RIVAL}}}}</span></div>
    <div class="meta"><span class="fit" data-min="18"><b>{{{{FECHA}}}} · {{{{HORA}}}}</b> · {{{{CANCHA}}}}</span></div>
    <div class="og-pill"><b>{{{{FORMATO}}}}</b><span>{{{{ESQUEMA}}}}</span></div>
    <div class="og-foot">Resultado y formación en el link · <em>mivestuario.com.ar</em></div>
  </div>
</div>''', "Mi Vestuario · Alineación · Link 1200x630")

TEMPLATES = dict(whatsapp=T_WHATSAPP, story=T_STORY, og=T_OG)

# ------------------------------------------------------------------ datos de ejemplo (ficticios)
def b64(path, mime):
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()

FOTO = b64(f"{ROOT}/avatar/assets/foto-ejemplo.jpg", "image/jpeg")   # silueta dibujada, no es una persona

def svg_url(svg):
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()

CREST_PIBES = svg_url('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<defs><clipPath id="s"><path d="M30 22 H170 V100 C170 150 130 176 100 190 C70 176 30 150 30 100 Z"/></clipPath></defs>
<path d="M24 16 H176 V100 C176 156 132 182 100 197 C68 182 24 156 24 100 Z" fill="#f4efe6"/>
<g clip-path="url(#s)"><rect x="0" y="0" width="200" height="200" fill="#151515"/>
<rect x="44" y="0" width="22" height="200" fill="#d0202e"/><rect x="89" y="0" width="22" height="200" fill="#d0202e"/><rect x="134" y="0" width="22" height="200" fill="#d0202e"/>
<rect x="0" y="78" width="200" height="40" fill="#f4efe6"/></g>
<text x="100" y="109" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="34" fill="#151515" letter-spacing="2">L P F C</text>
<polygon points="100,34 106,50 123,50 109,60 114,76 100,66 86,76 91,60 77,50 94,50" fill="#f4efe6"/></svg>''')

CREST_JUVE = svg_url('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<circle cx="100" cy="100" r="94" fill="#f2c200"/><circle cx="100" cy="100" r="84" fill="#0a3d8f"/>
<rect x="16" y="82" width="168" height="36" fill="#f2c200"/>
<text x="100" y="111" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="30" fill="#0a3d8f" letter-spacing="3">JUVENTUD</text>
<text x="100" y="66" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="38" fill="#f2c200">J U</text>
<text x="100" y="156" text-anchor="middle" font-family="Barlow Condensed" font-weight="700" font-size="22" fill="#f2c200" letter-spacing="4">UNIDA</text></svg>''')

def cfg(skin, hair, color, facial="ninguno", extras=None, pattern="lisa", collar="redondo"):
    return dict(v=1, skin=skin, hair=hair, hairColor=color, facial=facial, extras=extras or [], shirtPattern=pattern, collar=collar)

def ini(nombre):
    parts = [p for p in re.split(r"\s+", nombre.strip()) if p]
    return (parts[0][0] + (parts[1][0] if len(parts) > 1 else parts[0][1:2])).upper()

def P(slot, num, nick, img, nombre=None, menor=False):
    """img: "foto" | "ini" | cfg(...) (avatar). nombre = name completo (para iniciales)."""
    # menores: iniciales del apodo, nunca del nombre real (imagen.ts → inicialesDe)
    d = dict(slot=slot, numero=num, nombre=nick, iniciales=ini(nick if menor else (nombre or nick)), menor=menor)
    if img == "foto":
        d["imagen"] = dict(tipo="foto", src=FOTO); d["ejemplo"] = True
    elif img == "ini":
        d["imagen"] = dict(tipo="iniciales", letras=d["iniciales"])
    else:
        d["imagen"] = dict(tipo="avatar", cfg=img); d["avatar"] = img
    return d

DT_RUBEN = P(None, None, "Rubén", cfg("t2", "pelado", "canoso", "barba", ["anteojos"], collar="campera"), "Rubén Ferreyra")
DT_GUS = P(None, None, "Gus", cfg("t5", "medio", "canoso", "bigote", collar="campera"), "Gustavo Ortiz")

# F7 · Los Pibes FC vs Racing del Bajo · 1-3-2-1
PIBES_TIT = [
    P("ARQ", 1, "Fede", cfg("t3", "corto", "castano-oscuro", "barba-corta"), "Federico Sosa"),
    P("LI", 3, "Tincho", "foto", "Martín Díaz"),
    P("DF", 2, "Mati", "ini", "Matías Romero"),
    P("LD", 4, "Lucho", cfg("t6", "rapado", "negro", "bigote"), "Luciano Paz"),
    P("MI", 8, "Juanchi", cfg("t2", "rulos", "castano", extras=["vincha"]), "Juan Ignacio Vera", menor=True),
    P("MD", 5, "Nacho", "foto", "Ignacio Ruiz"),
    P("DC", 9, "Pipa", cfg("t4", "medio", "negro", "candado"), "Lucas Pipino"),
]
# un menor que tiene foto cargada en los datos (no debería pasar): el template la baja a iniciales
PIBES_BANCO = [
    P(None, 14, "Rodri", "foto", "Rodrigo Ledesma"),
    P(None, 11, "Gonza", "ini", "Gonzalo Funes"),
    dict(P(None, 16, "Thiago", "foto", "Thiago Benítez", menor=True), ejemplo=False),
]
# F5 · Deportivo Pasaje vs Los Halcones · Rombo (sin escudo cargado → escudo con iniciales)
PASAJE_TIT = [
    P("ARQ", 1, "Rama", "ini", "Ramiro Acuña"),
    P("DEF", 6, "Nico", cfg("t1", "corto", "rubio", "barba-corta"), "Nicolás Barrios"),
    P("AI", 8, "Luqui", cfg("t3", "rulos", "castano", extras=["vincha"], pattern="mitades"), "Lucas Giménez"),
    P("AD", 7, "Joaco", "foto", "Joaquín Ledesma"),
    P("PIV", 9, "Flor", cfg("t2", "largo", "colorado"), "Florencia Acosta"),
]
PASAJE_BANCO = [P(None, 5, "Mati", cfg("t6", "rapado", "negro", "bigote", pattern="banda"), "Matías Romero"),
                P(None, 10, "Dani", "ini", "Daniel Quiroga", menor=True)]
# F11 · Juventud Unida vs Atlético Ribera
def juve(formacion):
    base = {
        "4-3-3":   ["ARQ", "LI", "DFI", "DFD", "LD", "MC1", "MC2", "MC3", "EI", "DC", "ED"],
        "4-2-3-1": ["ARQ", "LI", "DFI", "DFD", "LD", "MC1", "MC2", "MI", "MCO", "MD", "DC"],
    }[formacion]
    gente = [
        (1, "Pato", cfg("t3", "rapado", "castano-oscuro", "barba"), "Patricio Gómez", False),
        (3, "Facu", "foto", "Facundo Ríos", False),
        (2, "Colo", cfg("t1", "corto", "colorado"), "Ezequiel Colombo", False),
        (6, "Toto", "ini", "Tomás Toledo", False),
        (4, "Maxi", "foto", "Maximiliano Sánchez", False),
        (8, "Lean", cfg("t5", "afro", "negro"), "Leandro Medina", False),
        (5, "Bruno", "ini", "Bruno Castro", False),
        (10, "Enzo", cfg("t4", "corto", "negro", pattern="bastones"), "Enzo Herrera", True),
        (7, "Joaco", "foto", "Joaquín Molina", False),
        (9, "Cristian", cfg("t7", "rastas", "negro", "candado"), "Cristian Núñez", False),
        (11, "Juan Cruz", "ini", "Juan Cruz Almada", False),
    ]
    return [P(s, n, k, i, nm, m) for s, (n, k, i, nm, m) in zip(base, gente)]
JUVE_BANCO = [
    P(None, 12, "Santi", "foto", "Santiago Paredes"),
    P(None, 13, "Lauti", cfg("t3", "medio", "castano"), "Lautaro Vega"),
    P(None, 14, "Ramiro", "ini", "Ramiro Ibarra"),
    P(None, 15, "Tomi", cfg("t6", "rulos", "negro"), "Tomás Luna"),
    P(None, 16, "Nahuel", "ini", "Nahuel Correa"),
    P(None, 17, "Benja", "ini", "Benjamín Ojeda", menor=True),
]

# F8 · Unión Barrial vs Estrella del Sur · 1-3-3-1 (clásica, la primera/por defecto de la app)
CREST_UNION = svg_url('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<defs><clipPath id="u"><path d="M34 26 H166 L160 112 C156 150 126 174 100 188 C74 174 44 150 40 112 Z"/></clipPath></defs>
<path d="M26 18 H174 L168 112 C164 156 130 182 100 197 C70 182 36 156 32 112 Z" fill="#f4f4ee"/>
<g clip-path="url(#u)"><rect width="200" height="200" fill="#1f7a3e"/><path d="M0 0 L200 200 L200 150 L50 0 Z" fill="#f4f4ee"/></g>
<text x="100" y="118" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="58" fill="#0d3d1f" stroke="#f4f4ee" stroke-width="5" paint-order="stroke" letter-spacing="2">UB</text></svg>''')
DT_OSVALDO = P(None, None, "Osvaldo", cfg("t3", "corto", "canoso", "bigote", collar="campera"), "Osvaldo Rinaldi")
UNION_TIT = [
    P("ARQ", 1, "Gato", cfg("t2", "medio", "negro", "barba-corta"), "Gastón Ibáñez"),
    P("LI", 3, "Pela", "foto", "Pablo Pelaez"),
    P("DF", 2, "Chino", "ini", "Leonel Chávez"),
    P("LD", 4, "Kevin", cfg("t5", "rapado", "negro"), "Kevin Arias"),
    P("MI", 7, "Valen", cfg("t1", "rulos", "rubio", extras=["vincha"]), "Valentín Suárez", menor=True),
    P("MC", 5, "Mono", "foto", "Marcos Montero"),
    P("MD", 8, "Seba", "ini", "Sebastián Ortega"),
    P("DC", 9, "Pancho", cfg("t4", "corto", "castano-oscuro", "candado"), "Francisco Benítez"),
]
UNION_BANCO = [
    P(None, 12, "Lalo", "foto", "Eduardo Lagos"),
    P(None, 15, "Ale", "ini", "Alejandro Peralta"),
    dict(P(None, 18, "Lolo", "foto", "Lorenzo Godoy", menor=True), ejemplo=False),   # menor con foto en los datos → iniciales
]
UNION = dict(EQUIPO="Unión Barrial", EQUIPO_INICIALES="UB", ESCUDO_SRC=CREST_UNION, TIENE_ESCUDO="si",
             RIVAL="Estrella del Sur", FECHA="Vie 16/10", HORA="20:00", CANCHA="Complejo La Redonda, cancha 2")

# F9 · Sportivo Alameda vs Deportivo Los Aromos · 1-3-3-2 (clásica, la primera/por defecto de la app) · bordó y celeste
CREST_ALAMEDA = svg_url('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<path d="M100 6 L186 40 V104 C186 150 146 180 100 196 C54 180 14 150 14 104 V40 Z" fill="#7cc4ef"/>
<path d="M100 20 L172 48 V104 C172 142 140 168 100 182 C60 168 28 142 28 104 V48 Z" fill="#7a1230"/>
<rect x="28" y="92" width="144" height="30" fill="#7cc4ef"/>
<text x="100" y="116" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="27" fill="#7a1230" letter-spacing="2">SPORTIVO</text>
<text x="100" y="80" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="44" fill="#7cc4ef" letter-spacing="3">SA</text>
<text x="100" y="156" text-anchor="middle" font-family="Barlow Condensed" font-weight="700" font-size="21" fill="#7cc4ef" letter-spacing="3">ALAMEDA</text></svg>''')
DT_HUGO = P(None, None, "Hugo", cfg("t4", "pelado", "negro", "barba", collar="campera"), "Hugo Medina")
ALAMEDA_TIT = [
    P("ARQ", 1, "Beto", "ini", "Alberto Ríos"),
    P("LI", 3, "Lucas", cfg("t3", "corto", "castano"), "Lucas Ferreyra"),
    P("DFI", 2, "Polaco", "foto", "Damián Kowalski"),
    P("DFD", 6, "Fran", cfg("t6", "afro", "negro", "barba-corta"), "Franco Duarte"),
    P("LD", 4, "Cachi", "foto", "Carlos Cáceres"),
    P("MI", 11, "Ian", cfg("t2", "medio", "castano", pattern="bastones"), "Ian Morales", menor=True),
    P("MC", 5, "Coco", "ini", "Jorge Cocco"),
    P("MD", 8, "Rafa", "foto", "Rafael Vidal"),
    P("DC", 9, "Tano", cfg("t1", "rapado", "castano-oscuro", "candado"), "Nicolás Russo"),
]
ALAMEDA_BANCO = [
    P(None, 12, "Pablo", "foto", "Pablo Aguirre"),
    P(None, 13, "Rulo", cfg("t5", "rulos", "negro"), "Gustavo Ledesma"),
    P(None, 14, "Agus", "ini", "Agustín Cabral"),
    P(None, 15, "Leo", "ini", "Leonardo Ponce"),
    dict(P(None, 16, "Mateo", "foto", "Mateo Quiroga", menor=True), ejemplo=False),  # menor con foto en los datos → iniciales
]
ALAMEDA = dict(EQUIPO="Sportivo Alameda", EQUIPO_INICIALES="SA", ESCUDO_SRC=CREST_ALAMEDA, TIENE_ESCUDO="si",
               RIVAL="Deportivo Los Aromos", FECHA="Dom 18/10", HORA="09:30", CANCHA="Predio Los Tilos, cancha 4")
BORDO_CELESTE = dict(primary="#7a1230", secondary="#7cc4ef")

PIBES = dict(EQUIPO="Los Pibes FC", EQUIPO_INICIALES="LP", ESCUDO_SRC=CREST_PIBES, TIENE_ESCUDO="si",
             RIVAL="Racing del Bajo", FECHA="Sáb 10/10", HORA="15:00", CANCHA="Complejo El Potrero, cancha 3")
PASAJE = dict(EQUIPO="Deportivo Pasaje", EQUIPO_INICIALES="DP", ESCUDO_SRC="", TIENE_ESCUDO="no",
              RIVAL="Los Halcones", FECHA="Jue 15/10", HORA="21:00", CANCHA="Fútbol Club Saavedra")
JUVE = dict(EQUIPO="Juventud Unida", EQUIPO_INICIALES="JU", ESCUDO_SRC=CREST_JUVE, TIENE_ESCUDO="si",
            RIVAL="Atlético Ribera", FECHA="Dom 11/10", HORA="10:30", CANCHA="Predio Municipal, cancha 1")
ROJO_NEGRO = dict(primary="#151515", secondary="#d0202e")
AZUL_AMARILLO = dict(primary="#0a3d8f", secondary="#f2c200")

def ex(slug, fmt, equipo, modalidad, formacion, esquema, tema, titulares, banco, dt, colores=None, kicker="Así salimos"):
    return dict(slug=slug, fmt=fmt, header=dict(equipo, FORMATO=modalidad.upper(), ESQUEMA=esquema, KICKER=kicker),
                datos=dict(formato=fmt, modalidad=modalidad, formacion=formacion, tema=tema, colores=colores,
                           titulares=titulares, banco=banco, dt=dt))

EJEMPLOS = [
    ex("whatsapp-f5-neon", "whatsapp", PASAJE, "f5", "rombo", "Rombo", "neon", PASAJE_TIT, PASAJE_BANCO, [DT_RUBEN]),
    ex("whatsapp-f7-neon", "whatsapp", PIBES, "f7", "1-3-2-1", "1-3-2-1", "neon", PIBES_TIT, PIBES_BANCO, [DT_RUBEN]),
    ex("whatsapp-f7-equipo-rojo-negro", "whatsapp", PIBES, "f7", "1-3-2-1", "1-3-2-1", "equipo", PIBES_TIT, PIBES_BANCO, [DT_RUBEN], ROJO_NEGRO),
    ex("whatsapp-f11-neon", "whatsapp", JUVE, "f11", "4-2-3-1", "4-2-3-1", "neon", juve("4-2-3-1"), JUVE_BANCO, [DT_GUS]),
    ex("whatsapp-f11-equipo-azul-amarillo", "whatsapp", JUVE, "f11", "4-3-3", "4-3-3", "equipo", juve("4-3-3"), JUVE_BANCO, [DT_GUS], AZUL_AMARILLO),
    ex("story-f5-neon", "story", PASAJE, "f5", "rombo", "Rombo", "neon", PASAJE_TIT, PASAJE_BANCO, [DT_RUBEN]),
    ex("story-f7-neon", "story", PIBES, "f7", "1-3-2-1", "1-3-2-1", "neon", PIBES_TIT, PIBES_BANCO, [DT_RUBEN]),
    ex("story-f7-equipo-rojo-negro", "story", PIBES, "f7", "1-3-2-1", "1-3-2-1", "equipo", PIBES_TIT, PIBES_BANCO, [DT_RUBEN], ROJO_NEGRO),
    ex("story-f11-equipo-azul-amarillo", "story", JUVE, "f11", "4-3-3", "4-3-3", "equipo", juve("4-3-3"), JUVE_BANCO, [DT_GUS], AZUL_AMARILLO),
    ex("og-f7-neon", "og", PIBES, "f7", "1-3-2-1", "1-3-2-1", "neon", PIBES_TIT, [], []),
    ex("og-f11-equipo-azul-amarillo", "og", JUVE, "f11", "4-3-3", "4-3-3", "equipo", juve("4-3-3"), [], [], AZUL_AMARILLO),
    # F8 (neón) y F9 (colores del equipo) en los tres formatos
    ex("whatsapp-f8-neon", "whatsapp", UNION, "f8", "clasica", "1-3-3-1", "neon", UNION_TIT, UNION_BANCO, [DT_OSVALDO]),
    ex("story-f8-neon", "story", UNION, "f8", "clasica", "1-3-3-1", "neon", UNION_TIT, UNION_BANCO, [DT_OSVALDO]),
    ex("og-f8-neon", "og", UNION, "f8", "clasica", "1-3-3-1", "neon", UNION_TIT, [], []),
    ex("whatsapp-f9-equipo-bordo-celeste", "whatsapp", ALAMEDA, "f9", "clasica", "1-3-3-2", "equipo", ALAMEDA_TIT, ALAMEDA_BANCO, [DT_HUGO], BORDO_CELESTE),
    ex("story-f9-equipo-bordo-celeste", "story", ALAMEDA, "f9", "clasica", "1-3-3-2", "equipo", ALAMEDA_TIT, ALAMEDA_BANCO, [DT_HUGO], BORDO_CELESTE),
    ex("og-f9-equipo-bordo-celeste", "og", ALAMEDA, "f9", "clasica", "1-3-3-2", "equipo", ALAMEDA_TIT, [], [], BORDO_CELESTE),
]

# ------------------------------------------------------------------ armado
def fill(s, data):
    return re.sub(r"\{\{([A-Z0-9_]+)\}\}", lambda m: data.get(m.group(1), m.group(0)), s)

def og_publico(datos):
    """El link público no muestra fotos, nombres ni menores (vivo.ts → armarFormacionPublica). Solo número + puesto."""
    d = dict(datos)
    d["titulares"] = [dict(slot=p["slot"], numero=p["numero"], menor=p.get("menor", False), oculto=p.get("menor", False))
                      for p in datos["titulares"]]
    d["banco"] = []; d["dt"] = []
    return d

def chrome(args):
    return subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
                           "--force-device-scale-factor=1", "--allow-file-access-from-files"] + args,
                          check=True, capture_output=True, text=True)

def render(src, out, w, h):
    chrome([f"--window-size={w},{h}", "--virtual-time-budget=4000", f"--screenshot={out}", f"file://{src}"])

def qa(src, w, h):
    r = chrome([f"--window-size={w},{h}", "--virtual-time-budget=4000", "--dump-dom", f"file://{src}"])
    m = re.search(r'<pre id="qa"[^>]*>(.*?)</pre>', r.stdout, re.S)
    return json.loads(html.unescape(m.group(1))) if m else ["SIN QA (no corrió el script)"]

def main(rapido=False):
    os.makedirs(EJ, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    for fmt, t in TEMPLATES.items():
        open(f"{DIR}/{fmt}.html", "w").write(t.replace("{{BASE}}", ""))
    problemas = {}
    for e in EJEMPLOS:
        datos = og_publico(e["datos"]) if e["fmt"] == "og" else e["datos"]
        head = {k: html.escape(v) if k not in ("ESCUDO_SRC",) else v for k, v in e["header"].items()}
        js = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
        page = fill(TEMPLATES[e["fmt"]].replace("{{BASE}}", "../"), dict(head, DATOS_JSON=js))
        p = f"{EJ}/{e['slug']}.html"; open(p, "w").write(page)
        w, h = SIZES[e["fmt"]]
        render(p, f"{OUT}/{e['slug']}.png", w, h)
        problemas[e["slug"]] = qa(p, w, h)
        print(("OK " if not problemas[e["slug"]] else "!! ") + e["slug"], problemas[e["slug"]] or "")
    json.dump(problemas, open(f"{OUT}/_qa.json", "w"), ensure_ascii=False, indent=1)
    if not rapido:
        sys.path.insert(0, DIR)
        import hoja
        hoja.main()

if __name__ == "__main__":
    main("rapido" in sys.argv)
