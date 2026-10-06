#!/usr/bin/env python3
"""Mi Vestuario · Avatar: arma partes SVG, HTML y PNG.

  python3 avatar/build.py            # todo lo del avatar
  python3 avatar/build.py --todo     # además rearma las 9 cards y las 2 stories originales (_tools/build.py)
  python3 avatar/build.py grid cards # solo algunas piezas

Requiere: node (avatar.js) y google-chrome (headless). Sin dependencias de npm/pip salvo Pillow (hoja de recorte)."""
import os, sys, json, base64, subprocess, html as H, io

AV = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(AV)
HT = f"{AV}/html"
OUT = f"{ROOT}/png/avatar"
sys.path.insert(0, AV); sys.path.insert(0, f"{ROOT}/_tools")
from data import TEAMS, PEOPLE, team, person  # noqa: E402

# ------------------------------------------------------------------ util
def mix(a, b, t):
    a = [int(a[i:i+2], 16) for i in (1, 3, 5)]; b = [int(b[i:i+2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02x}" for x, y in zip(a, b))

def avatar_bg(t):
    """Fondo del círculo del avatar en la app: secundario del equipo, apagado hacia el verde de la marca."""
    return mix(t["secondary"], "#0b1c12", 0.74)

def svgs(jobs):
    """jobs: [(cfg, team, opts)] -> [svg]"""
    payload = json.dumps([{"cfg": c, "team": t, "opts": o} for c, t, o in jobs])
    r = subprocess.run(["node", f"{AV}/render.js"], input=payload, capture_output=True, text=True, check=True)
    return json.loads(r.stdout)

class Batch:
    """Junta pedidos de avatar y los resuelve en una sola llamada a node."""
    def __init__(self, prefix):
        self.jobs, self.prefix = [], prefix
    def add(self, cfg, t, **opts):
        opts.setdefault("uid", f"{self.prefix}{len(self.jobs)}")
        self.jobs.append((cfg, t, opts)); return f"@@AV{len(self.jobs)-1}@@"
    def fill(self, s):
        out = svgs(self.jobs)
        for i, svg in enumerate(out):
            s = s.replace(f"@@AV{i}@@", svg)
        return s

def data_uri(svg):
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()

def render(src, out, w, h, scale=1, transparent=False):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    args = ["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
            f"--force-device-scale-factor={scale}", f"--window-size={w},{h}", "--virtual-time-budget=3000",
            f"--screenshot={out}", f"file://{src}"]
    if transparent: args.insert(5, "--default-background-color=00000000")
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("png", os.path.relpath(out, ROOT))

def write(name, s):
    p = f"{HT}/{name}"; os.makedirs(os.path.dirname(p), exist_ok=True); open(p, "w").write(s); return p

LOGO = ('<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="Mi Vestuario">'
  '<rect width="32" height="32" rx="7" fill="#0b1c12"/><rect x="4" y="6" width="10" height="20" rx="2" fill="#b8f25a"/>'
  '<rect x="18" y="6" width="10" height="20" rx="2" fill="#b8f25a"/><rect x="6" y="8" width="6" height="2" rx="1" fill="#0b1c12"/>'
  '<rect x="6" y="12" width="6" height="2" rx="1" fill="#0b1c12"/><rect x="20" y="8" width="6" height="2" rx="1" fill="#0b1c12"/>'
  '<rect x="20" y="12" width="6" height="2" rx="1" fill="#0b1c12"/><circle cx="12" cy="22" r="1.5" fill="#0b1c12"/>'
  '<circle cx="20" cy="22" r="1.5" fill="#0b1c12"/><circle cx="16" cy="16" r="6" fill="#0b1c12"/><circle cx="16" cy="16" r="5.2" fill="#eef6ef"/>'
  '<polygon fill="#0b1c12" points="16,12.85 19,15.03 17.85,18.55 14.15,18.55 13,15.03"/></svg>')

SHEET_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(ellipse 1200px 700px at 50% 0%,rgba(184,242,90,.10),transparent 70%),#061109;color:#eef6ef;font-family:Figtree,sans-serif;-webkit-font-smoothing:antialiased}
header.sh{display:flex;align-items:center;gap:20px;padding:56px 60px 18px}
header.sh>svg{width:64px;height:64px;border-radius:14px;flex:none}
header.sh h1{font:800 60px/1 "Barlow Condensed";letter-spacing:.02em;text-transform:uppercase}
header.sh h1 em{font-style:normal;color:#b8f25a}
header.sh p{margin-top:6px;color:#9bb5a4;font-size:22px}
.k{font:700 20px "Barlow Condensed";letter-spacing:.14em;text-transform:uppercase;color:#b8f25a}
.muted{color:#9bb5a4}
"""

ICON = {
  "x": '<path d="M18 6 6 18M6 6l12 12"/>',
  "back": '<path d="m15 18-6-6 6-6"/>',
  "camera": '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.2"/>',
  "avatar": '<circle cx="12" cy="8.5" r="4"/><path d="M4 21c.6-4 3.8-6.5 8-6.5s7.4 2.5 8 6.5"/><path d="M8.2 6.8c1.3-1.6 6.3-1.6 7.6 0"/>',
  "shuffle": '<path d="m18 14 4 4-4 4M18 2l4 4-4 4M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22M2 6h1.4c1.3 0 2.5.6 3.3 1.7l.6.8M22 18h-6c-1.3 0-2.6-.6-3.3-1.7l-.6-.8"/>',
  "check": '<path d="M20 6 9 17l-5-5"/>',
  "lock": '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  "eye": '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  "house": '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  "cal": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  "chart": '<path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>',
  "calcheck": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18m-12 6 2 2 4-4"/>',
  "wallet": '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  "trash": '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  "arrow": '<path d="M5 12h14m-6-6 6 6-6 6"/>',
}
def icon(name, size=20, sw=2, color="currentColor"):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round">{ICON[name]}</svg>')

def initials(name):
    p = name.split(); return ((p[0][0] if p else "") + (p[1][0] if len(p) > 1 else "")).upper()

# ------------------------------------------------------------------ 1 · grilla de ejemplos
def page_grid():
    b = Batch("g")
    tiles = []
    for p in PEOPLE:
        t = TEAMS[p["team"]]
        av = b.add(p["cfg"], team(p["team"]), bg=avatar_bg(t), circle=True)
        sub = f'{p["rol"]}' + (f' · {p["puesto"]} #{p["num"]}' if p["num"] else "")
        tiles.append(f'''<figure class="t"><div class="av">{av}</div>
<figcaption><b>{p["nick"]}</b><span class="rol {'dt' if p['rol']=='DT' else ''}">{sub}</span>
<span class="eq"><i style="background:{t['primary']}"></i><i style="background:{t['secondary']}"></i>{t['name']}</span></figcaption></figure>''')
    s = f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>{SHEET_CSS}
body{{width:1640px}}
.grid{{display:grid;grid-template-columns:repeat(4,350px);gap:30px;padding:26px 60px 40px}}
.t{{background:#132a1c;border:1px solid #234833;border-radius:26px;padding:26px 24px 22px;text-align:center}}
.av svg{{width:270px;height:270px;display:block;margin:0 auto;border-radius:50%;box-shadow:0 0 0 4px #0b1c12,0 0 0 6px #234833}}
figcaption b{{display:block;font:800 40px/1 "Barlow Condensed";letter-spacing:.03em;text-transform:uppercase;margin-top:18px}}
.rol{{display:inline-block;margin-top:8px;font:600 18px Figtree;color:#9bb5a4}}
.rol.dt{{color:#0c1a10;background:#b8f25a;border-radius:99px;padding:2px 12px;font-weight:700}}
.eq{{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:12px;font:600 16px Figtree;color:#9bb5a4}}
.eq i{{width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(238,246,239,.35)}}
.eq i+i{{margin-left:-10px;margin-right:4px}}
.foot{{padding:0 60px 54px;color:#9bb5a4;font-size:19px;line-height:1.5}}
.foot b{{color:#eef6ef}}
</style></head><body>
<header class="sh">{LOGO}<div><h1>Mi Vestuario · <em>Avatares</em></h1>
<p>12 ejemplos armados con el creador · 6 mujeres y 6 varones · jugadoras, jugadores y DT · cada camiseta con los colores de su equipo</p></div></header>
<div class="grid">{"".join(tiles)}</div>
<p class="foot"><b>Dibujo plano y vectorial</b>, busto de frente. Todo sale de capas SVG con colores por parámetro (piel, pelo, colores del equipo). <b>No se genera nada con IA ni a partir de fotos.</b> Nombres y equipos ficticios.</p>
</body></html>'''
    p = write("01-avatares-ejemplo.html", b.fill(s))
    render(p, f"{OUT}/01-avatares-ejemplo.png", 1640, 1770)
    # SVG sueltos de los ejemplos
    os.makedirs(f"{AV}/svg/ejemplos", exist_ok=True)
    out = svgs([(p_["cfg"], team(p_["team"]), {"uid": p_["id"]}) for p_ in PEOPLE])
    for p_, svg in zip(PEOPLE, out):
        open(f"{AV}/svg/ejemplos/{p_['id']}.svg", "w").write(svg)
    json.dump([{"id": p_["id"], "nick": p_["nick"], "rol": p_["rol"], "team": TEAMS[p_["team"]], "avatar": dict(v=1, **p_["cfg"])} for p_ in PEOPLE],
              open(f"{AV}/svg/ejemplos/ejemplos.json", "w"), ensure_ascii=False, indent=2)

# ------------------------------------------------------------------ 2 · opciones
HEAD_VB = "84 40 232 232"     # recorte de cabeza (miniaturas de pelo)
FACE_VB = "112 104 176 176"   # recorte de cara (barba, anteojos)
SHIRT_VB = "40 196 320 200"   # recorte de camiseta (diseño, cuello)
LABEL = dict(
    hair=dict(pelado="Pelado", rapado="Rapado", corto="Corto", medio="Medio", largo="Largo", colita="Colita", rodete="Rodete",
              trenzas="Trenzas", rulos="Rulos", afro="Afro", melena="Melena", rastas="Rastas"),
    hairColor={"negro": "Negro", "castano-oscuro": "Castaño oscuro", "castano": "Castaño", "rubio": "Rubio", "colorado": "Colorado", "canoso": "Canoso"},
    facial={"ninguno": "Nada", "barba-corta": "Barba de días", "barba": "Barba", "bigote": "Bigote", "candado": "Candado"},
    shirtPattern=dict(lisa="Lisa", bastones="Bastones", banda="Banda", franja="Franja", mitades="Mitades"),
    collar=dict(redondo="Redondo", v="En V", polo="Polo", campera="Campera (DT)"),
)
SKINS = dict(t1="#f7dcc8", t2="#efc4a3", t3="#e0aa83", t4="#c98d63", t5="#ad7148", t6="#8d5636", t7="#6e3f26", t8="#4b2a1a")
HAIRC = {"negro": "#1d1715", "castano-oscuro": "#3b2519", "castano": "#70462b", "rubio": "#d4a95c", "colorado": "#b0502b", "canoso": "#bcb7af"}
HAIRS = list(LABEL["hair"]); FACIALS = list(LABEL["facial"]); PATTERNS = list(LABEL["shirtPattern"]); COLLARS = list(LABEL["collar"])

def page_options():
    b = Batch("o"); P = team("pasaje"); BG = avatar_bg(TEAMS["pasaje"])
    base = dict(skin="t4", hair="medio", hairColor="castano-oscuro", facial="ninguno", extras=[], shirtPattern="lisa", collar="redondo")
    def tile(cfg, label, vb=None, sw=None, t=P, wide=False, sub="", bg=BG):
        av = b.add({**base, **cfg}, t, viewBox=vb, bg=bg if vb else None, circle=False)
        chip = f'<i style="background:{sw}"></i>' if sw else ""
        return f'<figure class="o{" w" if wide else ""}"><div class="pic">{av}</div><figcaption>{chip}{label}{f"<small>{sub}</small>" if sub else ""}</figcaption></figure>'
    skin = "".join(tile(dict(skin=k, hair="corto" if i % 2 else "colita"), f"Tono {i+1}", HEAD_VB, v) for i, (k, v) in enumerate(SKINS.items()))
    alt = ["t2", "t6", "t3", "t7", "t1", "t5", "t4", "t8", "t3", "t6", "t2", "t5"]
    hair = "".join(tile(dict(hair=h, skin=alt[i]), LABEL["hair"][h], HEAD_VB) for i, h in enumerate(HAIRS))
    hc = "".join(tile(dict(hair="largo" if i % 2 == 0 else "rulos", hairColor=k, skin=["t2", "t5", "t3", "t1", "t2", "t4"][i]), LABEL["hairColor"][k], HEAD_VB, v) for i, (k, v) in enumerate(HAIRC.items()))
    fac = "".join(tile(dict(hair="corto", facial=f, skin=["t3", "t5", "t2", "t6", "t7"][i], hairColor=["castano", "negro", "castano", "negro", "negro"][i]), LABEL["facial"][f], FACE_VB) for i, f in enumerate(FACIALS))
    ext = (tile(dict(hair="colita", extras=[]), "Sin extras", HEAD_VB) + tile(dict(hair="colita", extras=["vincha"]), "Vincha", HEAD_VB, sub="color secundario") +
           tile(dict(hair="corto", skin="t6", hairColor="negro", extras=["anteojos"]), "Anteojos", HEAD_VB) + tile(dict(hair="afro", skin="t7", hairColor="negro", extras=["vincha", "anteojos"]), "Las dos", HEAD_VB))
    pat = "".join(tile(dict(shirtPattern=p_), LABEL["shirtPattern"][p_], SHIRT_VB, wide=True) for p_ in PATTERNS)
    col = "".join(tile(dict(collar=c), LABEL["collar"][c], SHIRT_VB, wide=True) for c in COLLARS)
    same = dict(skin="t3", hair="rodete", hairColor="castano", shirtPattern="bastones", collar="v")
    teams = "".join(tile(same, TEAMS[k]["name"], HEAD_VB.replace("40 232 232", "40 300 300").replace("84", "50"), t=team(k), sub="", bg=avatar_bg(TEAMS[k])) for k in ["pasaje", "norte", "ribera", "taller", "halcones", "villa", "ferro"])
    s = f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>{SHEET_CSS}
body{{width:1640px}}
section{{padding:16px 60px 10px}}
section h2{{font:800 30px "Barlow Condensed";letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:baseline;gap:14px}}
section h2 span{{font:500 18px Figtree;letter-spacing:0;text-transform:none;color:#9bb5a4}}
.row{{display:flex;flex-wrap:wrap;gap:18px;margin-top:14px}}
.o{{width:172px;margin:0}} .o.w{{width:232px}}
.pic svg{{width:172px;height:172px;display:block;border-radius:20px;background:#132a1c;box-shadow:inset 0 0 0 1px #234833}}
.o.w .pic svg{{width:232px;height:145px}}
figcaption{{margin-top:8px;font:700 19px "Barlow Condensed";letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:center;gap:8px;flex-wrap:wrap}}
figcaption i{{width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(238,246,239,.4)}}
figcaption small{{width:100%;font:500 14px Figtree;letter-spacing:0;text-transform:none;color:#9bb5a4;margin-top:-2px}}
.two{{display:flex;gap:40px}} .two>div{{flex:none}}
.note{{margin:18px 60px 50px;background:#132a1c;border:1px solid #234833;border-radius:20px;padding:22px 26px;color:#9bb5a4;font-size:18px;line-height:1.55}}
.note b{{color:#eef6ef}}
</style></head><body>
<header class="sh">{LOGO}<div><h1>Avatar · <em>todas las opciones</em></h1>
<p>Lo que la persona elige en el creador. Los colores de la camiseta y de la vincha salen del equipo.</p></div></header>
<section><h2>Piel <span>8 tonos · se muestra como muestra de color, sin nombres</span></h2><div class="row">{skin}</div></section>
<section><h2>Pelo <span>12 peinados · sirven para cualquiera, no hay “de mujer” o “de varón”</span></h2><div class="row">{hair}</div></section>
<section><h2>Color de pelo <span>6 colores · las cejas toman el mismo color, más oscuro</span></h2><div class="row">{hc}</div></section>
<section class="two"><div><h2>Barba y bigote <span>5 opciones</span></h2><div class="row">{fac}</div></div></section>
<section><h2>Extras <span>se pueden combinar</span></h2><div class="row">{ext}</div></section>
<section><h2>Camiseta · diseño <span>5 · primario + secundario del equipo</span></h2><div class="row">{pat}</div></section>
<section><h2>Camiseta · cuello <span>4 · “Campera” queda bien para DT y ayudantes</span></h2><div class="row">{col}</div></section>
<section><h2>Mismo avatar, otro equipo <span>si la persona juega en dos equipos, la camiseta cambia sola</span></h2><div class="row">{teams}</div></section>
<div class="note"><b>Combinaciones:</b> 8 tonos × 12 peinados × 6 colores × 5 barbas × 4 extras × 5 diseños × 4 cuellos = <b>460.800</b> avatares distintos, sin contar los colores de cada equipo. <b>Por defecto</b> (si la persona toca “Armar mi avatar” por primera vez): tono 3, pelo corto castaño oscuro, sin barba, camiseta lisa con cuello redondo; DT y ayudante arrancan con “Campera”.</div>
</body></html>'''
    p = write("02-opciones.html", b.fill(s))
    render(p, f"{OUT}/02-opciones.png", 1640, 2740)

# ------------------------------------------------------------------ 3 · capas
def page_layers():
    demo = dict(skin="t5", hair="rulos", hairColor="castano", facial="barba-corta", extras=["vincha", "anteojos"], shirtPattern="bastones", collar="redondo")
    t = team("pasaje")
    pal = json.loads(subprocess.run(["node", f"{AV}/render.js"], input=json.dumps([{"cfg": demo, "team": t, "mode": "palette"}]),
                                    capture_output=True, text=True, check=True).stdout)[0]
    var_names = dict(skin="skin", skinShade="skin-shade", skinDeep="skin-deep", lip="lip", mouth="mouth", blush="blush", eye="eye", hair="hair",
                     hairDark="hair-dark", hairLight="hair-light", brow="brow", stubble="stubble", primary="primary", primaryDark="primary-dark",
                     secondary="secondary", secondaryDark="secondary-dark", band="band", buzz="buzz")
    style = ";".join(f"--mv-{v}:{pal[k]}" for k, v in var_names.items())
    order = [("pelo-atras", "rulos"), ("cuello", "cuello"), ("camiseta", "bastones-redondo"), ("cabeza", "cabeza"), ("cara", "cara"),
             ("barba", "barba-corta"), ("boca", "boca"), ("pelo-adelante", "rulos"), ("vincha", "vincha"), ("anteojos", "anteojos")]
    def part(layer, name):
        return open(f"{AV}/svg/parts/{layer}/{name}.svg").read()
    tiles = "".join(f'<figure><div class="pic chk">{part(l, n)}</div><figcaption><b>{i+1}</b>{l}<code>parts/{l}/{n}.svg</code></figcaption></figure>' for i, (l, n) in enumerate(order))
    stack = "".join(f'<div class="layer">{part(l, n)}</div>' for l, n in order)
    swatches = "".join(f'<li><i style="background:{pal[k]}"></i><code>--mv-{v}</code></li>' for k, v in var_names.items() if k not in ("blush",))
    s = f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>{SHEET_CSS}
body{{width:1640px}}
.wrap{{display:flex;gap:40px;padding:20px 60px 30px;align-items:flex-start}}
.grid{{display:grid;grid-template-columns:repeat(5,196px);gap:22px 18px}}
figure{{margin:0}}
.pic{{width:196px;height:196px;border-radius:18px;box-shadow:inset 0 0 0 1px #234833;overflow:hidden}}
.pic svg{{width:100%;height:100%;display:block}}
.chk{{background:repeating-conic-gradient(#132a1c 0 25%,#0f2318 0 50%) 0 0/24px 24px}}
figcaption{{margin-top:8px;font:700 19px "Barlow Condensed";letter-spacing:.06em;text-transform:uppercase}}
figcaption b{{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#b8f25a;color:#0c1a10;margin-right:8px;font-size:16px}}
code{{display:block;font:500 13px ui-monospace,monospace;color:#9bb5a4;text-transform:none;letter-spacing:0;margin-top:3px}}
.res{{flex:none;width:420px}}
.stack{{position:relative;width:420px;height:420px;border-radius:50%;background:{avatar_bg(TEAMS["pasaje"])};overflow:hidden;box-shadow:0 0 0 6px #0b1c12,0 0 0 8px #234833}}
.layer{{position:absolute;inset:0}} .layer svg{{width:100%;height:100%}}
.res h3{{font:800 30px "Barlow Condensed";text-transform:uppercase;letter-spacing:.06em;margin:26px 0 10px}}
ul{{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:6px 14px}}
li{{display:flex;align-items:center;gap:8px}} li i{{width:18px;height:18px;border-radius:5px;flex:none;box-shadow:0 0 0 1px rgba(255,255,255,.2)}}
li code{{display:inline;margin:0;font-size:13px}}
.json{{margin:0 60px 50px;background:#132a1c;border:1px solid #234833;border-radius:18px;padding:20px 24px;font:500 17px/1.5 ui-monospace,monospace;color:#d6e6da;white-space:pre}}
.json b{{color:#b8f25a;font-weight:600}}
</style></head><body>
<header class="sh">{LOGO}<div><h1>Avatar · <em>capas SVG</em></h1>
<p>Cada parte es un SVG suelto, mismo lienzo (0–400, encuadre 20 24 360 360). Se apilan en este orden. Los colores entran por variables CSS.</p></div></header>
<div class="wrap"><div class="grid">{tiles}</div>
<div class="res" style="{style}"><div class="stack">{stack}</div><h3>Resultado</h3><ul>{swatches}</ul></div></div>
<div class="json">// lo que se guarda por persona (Member.avatar) · los colores NO se guardan: salen del equipo
{{ <b>"v"</b>: 1, <b>"skin"</b>: "t5", <b>"hair"</b>: "rulos", <b>"hairColor"</b>: "castano", <b>"facial"</b>: "barba-corta",
  <b>"extras"</b>: ["vincha", "anteojos"], <b>"shirtPattern"</b>: "bastones", <b>"collar"</b>: "redondo" }}
// equipo (Club.colores):  {{ <b>"primary"</b>: "#1f6f3f", <b>"secondary"</b>: "#b8f25a" }}</div>
</body></html>'''
    p = write("03-capas.html", s)
    render(p, f"{OUT}/03-capas.png", 1640, 1090)

# ------------------------------------------------------------------ 4 · cards con foto / avatar / iniciales
import importlib.util
def cards_build():
    spec = importlib.util.spec_from_file_location("cards_build", f"{ROOT}/_tools/build.py")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

FOTO_JPG = f"{AV}/assets/foto-ejemplo.jpg"
def foto_ejemplo():
    """Rasteriza la foto de ejemplo a 512x512 JPEG (como quedaría una foto subida)."""
    from PIL import Image
    png = "/tmp/mv-foto-ejemplo.png"
    render(f"{AV}/assets/foto-ejemplo.svg", png, 512, 512)
    Image.open(png).convert("RGB").save(FOTO_JPG, "JPEG", quality=80, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(open(FOTO_JPG, "rb").read()).decode()

def foto_uri():
    if not os.path.exists(FOTO_JPG): return foto_ejemplo()
    return "data:image/jpeg;base64," + base64.b64encode(open(FOTO_JPG, "rb").read()).decode()

VARIANT_CARDS = [("01-figura-del-partido", "cami"), ("02-goleador-del-mes", "flor"), ("06-hat-trick", "nico"), ("09-dt-del-mes", "vero")]
MODES = [("foto", "Foto subida"), ("avatar", "Avatar"), ("iniciales", "Iniciales")]

def card_variant_html(cb, slug, pid, mode, foto_uri, avatar_svg, tag=True):
    c = next(x for x in cb.CARDS if x["slug"] == slug)
    p = person(pid)
    data = cb.example_data(c)
    data["NOMBRE"] = p["nick"]; data["INICIALES"] = initials(p["name"])
    if mode == "foto": data.update(FOTO_SRC=foto_uri, TIENE_FOTO="si")
    elif mode == "avatar": data.update(FOTO_SRC=data_uri(avatar_svg), TIENE_FOTO="avatar")
    else: data.update(FOTO_SRC="", TIENE_FOTO="no")
    t = cb.base_t(c); t["deco"] = cb.deco_html(c.get("deco", ""), ex=c["ex"])
    body = cb.card_markup(t)
    if mode == "foto" and tag:
        body = body.replace('<div class="col">', '<div class="placeholder-tag">Foto de ejemplo</div>\n  <div class="col">', 1)
    return cb.fill(body, data)

def page_cards():
    cb = cards_build()
    foto = foto_ejemplo()
    avs = svgs([(person(pid)["cfg"], team(person(pid)["team"]), {"uid": f"c{i}"}) for i, (_, pid) in enumerate(VARIANT_CARDS)])
    cells = []
    for (slug, pid), av in zip(VARIANT_CARDS, avs):
        row = []
        for mode, label in MODES:
            body = card_variant_html(cb, slug, pid, mode, foto, av)
            html_ = f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><title>{slug} · {mode}</title>
<link rel="stylesheet" href="../../../html/cards.css"><link rel="stylesheet" href="../cards-avatar.css"></head>
<body class="solo-card">{body}{cb.FIT_JS}</body></html>'''
            p = write(f"cards/{slug}--{mode}.html", html_)
            out = f"{OUT}/cards/{slug}--{mode}.png"
            render(p, out, 720, 1000, transparent=True)
            row.append((mode, label, os.path.relpath(out, OUT)))
        cells.append((slug, pid, row))
    # hoja comparativa
    names = {"01-figura-del-partido": "Figura del partido", "02-goleador-del-mes": "Goleadora del mes", "06-hat-trick": "Hat-trick", "09-dt-del-mes": "DT del mes"}
    rows = "".join(f'''<div class="r"><div class="lab"><b>{names[slug]}</b><span>{person(pid)["nick"]} · {person(pid)["rol"]}</span></div>
{"".join(f'<figure><img src="{src}"><figcaption>{label}</figcaption></figure>' for mode, label, src in row)}</div>''' for slug, pid, row in cells)
    s = f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>{SHEET_CSS}
body{{width:1500px}}
.chain{{display:flex;align-items:stretch;gap:0;margin:18px 60px 10px;background:#132a1c;border:1px solid #234833;border-radius:22px;overflow:hidden}}
.chain div{{flex:1;padding:20px 24px;position:relative}}
.chain div+div{{border-left:1px solid #234833}}
.chain b{{display:block;font:800 30px "Barlow Condensed";text-transform:uppercase;letter-spacing:.05em}}
.chain b em{{font-style:normal;color:#b8f25a;margin-right:10px}}
.chain span{{display:block;color:#9bb5a4;font-size:17px;line-height:1.4;margin-top:4px}}
.cols{{display:grid;grid-template-columns:220px repeat(3,340px);gap:0 30px;padding:24px 60px 0}}
.cols div{{font:800 26px "Barlow Condensed";text-transform:uppercase;letter-spacing:.08em;text-align:center;color:#b8f25a}}
.r{{display:grid;grid-template-columns:220px repeat(3,340px);gap:30px;padding:16px 60px 18px;align-items:center;border-bottom:1px solid #132a1c}}
.lab b{{display:block;font:800 34px/1 "Barlow Condensed";text-transform:uppercase;letter-spacing:.03em}}
.lab span{{display:block;color:#9bb5a4;font-size:18px;margin-top:6px}}
figure{{margin:0;text-align:center}} figure img{{width:340px;height:472px;display:block}}
figcaption{{display:none}}
.foot{{padding:24px 60px 50px;color:#9bb5a4;font-size:18px;line-height:1.55}} .foot b{{color:#eef6ef}}
</style></head><body>
<header class="sh">{LOGO}<div><h1>Cards · <em>foto, avatar o iniciales</em></h1>
<p>La misma card en sus tres estados. Se usa el primero que exista.</p></div></header>
<div class="chain">
<div><b><em>1</em>Foto</b><span>Si la persona subió foto y no es menor de 18. Ventana con fundido ovalado: el fondo de la foto se funde con la card.</span></div>
<div><b><em>2</em>Avatar</b><span>Si armó su avatar. Fondo transparente, camiseta con los colores del equipo. También para menores.</span></div>
<div><b><em>3</em>Iniciales</b><span>Si no hay ninguno. Silueta del color del tier + iniciales (2 letras). Siempre funciona.</span></div></div>
<div class="cols"><div></div><div>1 · Foto</div><div>2 · Avatar</div><div>3 · Iniciales</div></div>
{rows}
<p class="foot"><b>La foto es un ejemplo</b> (silueta genérica dibujada, no es una persona real). En la app es la foto cuadrada que sube cada uno. Personas y equipos ficticios.</p>
</body></html>'''
    p = f"{OUT}/_comparacion.html"; open(p, "w").write(s)
    render(p, f"{OUT}/05-cards-foto-avatar-iniciales.png", 1500, 2560)
    os.remove(p)
# ------------------------------------------------------------------ 6 · pantalla de recorte + guía de recorte de foto
def screen_crop(cb, foto):
    mini = card_variant_html(cb, "01-figura-del-partido", "cami", "foto", foto, "", tag=False)
    body = f'''<header class="tb"><span class="ib">{icon("x", 24, 2.2)}</span><h1>Recortar foto</h1></header>
<div style="position:relative;height:390px;background:#000;overflow:hidden;margin-top:4px">
  <img src="{foto}" style="position:absolute;left:-40px;top:-30px;width:470px;height:470px;object-fit:cover">
  <div style="position:absolute;left:35px;top:35px;width:320px;height:320px;box-shadow:0 0 0 400px rgba(0,0,0,.58);outline:2px solid rgba(238,246,239,.9)"></div>
  <div style="position:absolute;left:35px;top:35px;width:320px;height:320px;border-radius:50%;border:2px dashed rgba(184,242,90,.9)"></div>
  <div style="position:absolute;left:35px;top:35px;width:320px;height:320px;background:linear-gradient(90deg,transparent 33.2%,rgba(238,246,239,.25) 33.3% 33.6%,transparent 33.7% 66.4%,rgba(238,246,239,.25) 66.5% 66.8%,transparent 67%),linear-gradient(180deg,transparent 33.2%,rgba(238,246,239,.25) 33.3% 33.6%,transparent 33.7% 66.4%,rgba(238,246,239,.25) 66.5% 66.8%,transparent 67%)"></div>
</div>
<p class="hint" style="padding:0 16px;margin-top:12px">Mové y achicá con dos dedos. <b>Que la cara quede adentro del círculo.</b></p>
<div class="pad"><h3 style="font:700 11.5px Figtree;letter-spacing:.12em;text-transform:uppercase;color:#9bb5a4;margin:14px 0 8px">Así se ve</h3>
<div style="display:flex;align-items:center;gap:18px">
 <div style="text-align:center;font-size:12px;color:#9bb5a4"><div class="pa" style="width:56px;height:56px;margin:0 auto 6px"><img src="{foto}"></div>Plantel</div>
 <div style="text-align:center;font-size:12px;color:#9bb5a4"><div style="width:56px;height:56px;margin:0 auto 6px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 3px #e8f3ea,0 6px 14px rgba(0,0,0,.4)"><img src="{foto}" style="width:100%;height:100%;object-fit:cover"></div>Formación</div>
 <div style="text-align:center;font-size:12px;color:#9bb5a4"><div class="mini" style="width:108px;height:150px;margin:0 auto 4px"><div style="transform:scale(.6);transform-origin:0 0">{mini.replace('class="card', 'style="transform:scale(.25);transform-origin:0 0" class="card', 1)}</div></div>Card</div>
</div></div>
<footer class="save" style="display:flex;gap:10px"><div class="btn" style="flex:1;background:#132a1c;color:#eef6ef;box-shadow:inset 0 0 0 1px #234833">Elegir otra</div><div class="btn" style="flex:1.4">Usar foto</div></footer>'''
    return mock_page("recortar", body)

def page_crop_guide(foto):
    s = f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>{SHEET_CSS}
body{{width:1640px}}
.w{{display:flex;gap:56px;padding:20px 60px 50px;align-items:flex-start}}
.ph{{position:relative;width:600px;height:600px;flex:none;border-radius:8px;overflow:hidden}}
.ph img{{width:100%;height:100%;display:block}}
.ov{{position:absolute;inset:0}}
.lg{{display:flex;gap:18px;flex-wrap:wrap;margin-top:18px;font-size:17px;color:#9bb5a4}}
.lg i{{display:inline-block;width:26px;height:0;border-top:3px solid;vertical-align:middle;margin-right:8px}}
.spec{{flex:1}}
.spec h2{{font:800 32px "Barlow Condensed";letter-spacing:.06em;text-transform:uppercase;color:#b8f25a;margin:0 0 10px}}
.spec h2+table{{margin-bottom:28px}}
table{{border-collapse:collapse;width:100%;font-size:18px}}
td{{padding:10px 0;border-bottom:1px solid #1d3a29;vertical-align:top;line-height:1.45}}
td:first-child{{color:#9bb5a4;width:170px;padding-right:16px}}
td b{{color:#eef6ef}}
.tag{{display:inline-block;background:#f0b429;color:#2a1a00;border-radius:6px;padding:1px 8px;font-weight:700;font-size:14px;margin-left:6px}}
</style></head><body>
<header class="sh">{LOGO}<div><h1>Foto · <em>recorte y reglas</em></h1>
<p>Una sola foto cuadrada por persona. Se recorta en el celular antes de subirla. Foto de ejemplo, no es una persona real.</p></div></header>
<div class="w"><div style="width:600px;flex:none"><div class="ph"><img src="{foto}">
<svg class="ov" viewBox="0 0 512 512">
 <circle cx="256" cy="256" r="254" fill="none" stroke="#b8f25a" stroke-width="3" stroke-dasharray="10 8"/>
 <rect x="28.6" y="0" width="454.8" height="509" fill="none" stroke="#eef6ef" stroke-width="3"/>
 <ellipse cx="256" cy="204" rx="273" ry="336" fill="none" stroke="#f0b429" stroke-width="3" stroke-dasharray="4 6" clip-path="url(#c)"/>
 <ellipse cx="256" cy="204" rx="152" ry="187" fill="none" stroke="#f0b429" stroke-width="3" clip-path="url(#c)"/>
 <clipPath id="c"><rect width="512" height="512"/></clipPath>
</svg></div>
<div class="lg"><span><i style="border-color:#b8f25a;border-top-style:dashed"></i>Círculo: plantel y formación</span><span><i style="border-color:#eef6ef"></i>Ventana de la card (500×560, “cover”)</span><span><i style="border-color:#f0b429"></i>Fundido: sólido adentro, se desvanece hacia afuera</span></div></div>
<div class="spec">
<h2>Subida</h2><table>
<tr><td>Formato guardado</td><td><b>JPEG cuadrado 512×512</b>, calidad 0,8 → ~35–70 KB. Se recorta y comprime en el celular (canvas), como hoy hace <code>readCrestFile</code>.</td></tr>
<tr><td>Mínimo</td><td>La foto original tiene que tener <b>al menos 400 px</b> del lado corto. Si es más chica: “Esa foto es muy chica. Probá con otra.”</td></tr>
<tr><td>Máximo</td><td>Archivo de hasta 15 MB antes de comprimir. Si el JPEG final pasa 120 KB, se baja la calidad hasta 0,6.</td></tr>
<tr><td>Recorte</td><td>Siempre cuadrado. La persona mueve y hace zoom; guía circular para la cara. Se respeta la rotación EXIF.</td></tr>
<tr><td>Hoy en la app</td><td>128×128, calidad 0,7, &lt; 30.000 caracteres <span class="tag">se ve pixelada en la card</span></td></tr>
</table>
<h2>Control</h2><table>
<tr><td>Quitar</td><td>“Quitar foto” siempre visible (ya existe). Al quitarla, vuelve el avatar; si no hay, las iniciales.</td></tr>
<tr><td>Quién la ve</td><td>Solo el equipo (plantel, formación, cards). El link público del partido no muestra fotos (ya es así).</td></tr>
<tr><td>Menores de 18</td><td><b>No se pide ni se guarda foto</b> (ya es así). Pueden armar avatar. Sus cards no tienen botón de compartir.</td></tr>
<tr><td>Cuenta borrada</td><td>Se borra la foto y el avatar con la cuenta (eliminar-cuenta ya menciona la foto).</td></tr>
</table></div></div>
</body></html>'''
    p = f"{OUT}/_recorte.html"; open(p, "w").write(s)
    render(p, f"{OUT}/06-recorte-foto.png", 1640, 1000)
    os.remove(p)
# ------------------------------------------------------------------ 5 · mockups del creador (390x844 @2x)
SB = ('<div class="sb">9:41<span>'
      '<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#eef6ef"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#eef6ef"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#eef6ef"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#eef6ef"/></svg>'
      '<svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="#eef6ef" stroke-width="2" stroke-linecap="round"><path d="M1 4.5a10 10 0 0 1 14 0M3.5 7.2a6.4 6.4 0 0 1 9 0"/><circle cx="8" cy="10" r="1.2" fill="#eef6ef" stroke="none"/></svg>'
      '<svg width="26" height="12" viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3.5" fill="none" stroke="#eef6ef" opacity=".5"/><rect x="2" y="2" width="16" height="8" rx="2" fill="#eef6ef"/><rect x="24" y="4" width="1.6" height="4" rx=".8" fill="#eef6ef" opacity=".5"/></svg>'
      '</span></div>')
HOME = '<div class="home"></div>'
def NAV(active="Equipo"):
    items = [("house", "Inicio"), ("cal", "Agenda"), ("shield", "Pizarra"), ("chart", "Stats"), ("calcheck", "Fecha"), ("wallet", "Caja"), ("users", "Equipo")]
    return '<nav class="nav">' + "".join(f'<a class="{"on" if l == active else ""}">{icon(i, 20, 2.4 if l == active else 1.8)}{l}</a>' for i, l in items) + "</nav>"

def mock_page(name, body, glow="rgba(184,242,90,.26)"):
    return f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><title>{name}</title>
<link rel="stylesheet" href="../../html/cards.css"><link rel="stylesheet" href="cards-avatar.css"><link rel="stylesheet" href="mockup.css"></head>
<body class="m" style="--glow:{glow}">{SB}{body}{HOME}
<script>document.querySelectorAll('[data-fit]').forEach(function(el){{var s=parseFloat(getComputedStyle(el).fontSize),m=parseFloat(el.dataset.min||40);while(el.scrollWidth>el.clientWidth+1&&s>m){{s-=2;el.style.fontSize=s+'px';}}}});</script>
</body></html>'''

def creator(b, p, tab, panel, plate):
    t = team(p["team"])
    stage_av = b.add(p["cfg"], t)
    glow = mix(t["secondary"], "#0b1c12", 0.35)
    tabs = "".join(f'<b class="{"on" if x == tab else ""}">{x}</b>' for x in ["Piel", "Pelo", "Cara", "Camiseta"])
    body = f'''<header class="tb"><span class="ib">{icon("x", 24, 2.2)}</span><h1>Mi avatar</h1><span class="tx">{icon("shuffle", 16, 2.2)}Al azar</span></header>
<section class="stage">{stage_av}<div class="plate">{plate}</div></section>
<nav class="tabs">{tabs}</nav>
<section class="panel">{panel}</section>
<footer class="save"><div class="btn">Guardar</div></footer>'''
    return body, glow

def page_mockups():
    cb = cards_build()
    foto = foto_uri()
    screens = []
    PSB = team("pasaje"); BGP = avatar_bg(TEAMS["pasaje"])

    # --- A · perfil: elegir (adulta, hoy con iniciales)
    b = Batch("pa")
    cami = person("cami")
    mini = card_variant_html(cb, "01-figura-del-partido", "cami", "iniciales", foto, "", tag=False)
    av_small = b.add(cami["cfg"], PSB, bg=BGP, circle=True)
    body = f'''<header class="tb"><span class="ib">{icon("back", 26, 2.2)}</span><h1>Tu imagen</h1></header>
<div class="hero"><div class="mini">{mini}</div><div><h2>Así salís hoy en tus cards</h2><p>No tenés foto ni avatar, así que van tus iniciales.</p></div></div>
<div class="pad">
<div class="opt"><div class="ic">{icon("camera", 24, 2.2)}</div><div><b>Subir foto</b><span>Del celular. Se recorta cuadrada.</span></div><span class="go">{icon("back", 20, 2.2).replace('m15 18-6-6 6-6', 'm9 18 6-6-6-6')}</span></div>
<div class="opt"><div class="ic">{icon("avatar", 24, 2.2)}</div><div><b>Armar mi avatar</b><span>Elegís piel, pelo y cara. La camiseta es la del equipo.</span></div><span class="go">{icon("back", 20, 2.2).replace('m15 18-6-6 6-6', 'm9 18 6-6-6-6')}</span></div>
<div class="steps"><figure><div><img src="{foto}"></div>1 · Foto</figure><span class="ar">{icon("arrow", 18, 2)}</span>
<figure><div>{av_small}</div>2 · Avatar</figure><span class="ar">{icon("arrow", 18, 2)}</span>
<figure><div>CP</div>3 · Iniciales</figure></div>
<p class="note">{icon("eye", 16, 2.2)}<span>Se usa la primera que tengas. La foto la ve tu equipo y la podés sacar cuando quieras.</span></p>
</div>{NAV()}'''
    screens.append(("10-perfil-elegir", "Perfil · elegir foto o avatar", b.fill(mock_page("perfil", body))))

    # --- B · perfil: menor de 18
    b = Batch("pb")
    juli = dict(name="Juli Morales", nick="Juli", cfg=dict(skin="t6", hair="colita", hairColor="negro", facial="ninguno", extras=["vincha"], shirtPattern="lisa", collar="redondo"))
    data_juli = juli
    mini = card_variant_html(cb, "07-debut", "cami", "iniciales", foto, "", tag=False).replace(">Cami<", ">Juli<").replace(">CP<", ">JM<")
    av_small = b.add(juli["cfg"], PSB, bg=BGP, circle=True)
    body = f'''<header class="tb"><span class="ib">{icon("back", 26, 2.2)}</span><h1>Tu imagen</h1></header>
<div class="hero"><div class="mini">{mini}</div><div><h2>Así salís hoy en tus cards</h2><p>Con tus iniciales. Podés armar un avatar.</p></div></div>
<div class="pad">
<div class="opt off"><div class="ic">{icon("lock", 22, 2.2)}</div><div><b>Subir foto</b><span>No pedimos foto si sos menor de 18.</span></div></div>
<div class="opt"><div class="ic">{icon("avatar", 24, 2.2)}</div><div><b>Armar mi avatar</b><span>Elegís piel, pelo y cara. La camiseta es la del equipo.</span></div><span class="go">{icon("back", 20, 2.2).replace('m15 18-6-6 6-6', 'm9 18 6-6-6-6')}</span></div>
<div class="steps" style="justify-content:center;gap:28px"><figure><div>{av_small}</div>1 · Avatar</figure><span class="ar">{icon("arrow", 18, 2)}</span><figure><div>JM</div>2 · Iniciales</figure></div>
<p class="note">{icon("lock", 16, 2.2)}<span>Tus cards se ven solo dentro del equipo. No tienen botón de compartir.</span></p>
</div>{NAV()}'''
    screens.append(("11-perfil-menor", "Perfil · menor de 18 (sin foto)", b.fill(mock_page("perfil menor", body))))

    # --- C · creador: Piel (Cami)
    b = Batch("pc")
    tiles = "".join(f'<div class="tile h{" on" if k == cami["cfg"]["skin"] else ""}">{b.add({**cami["cfg"], "skin": k}, PSB, viewBox=HEAD_VB, bg="#132a1c", circle=False)}</div>' for k in SKINS)
    sw = "".join(f'<i class="{"on" if k == cami["cfg"]["skin"] else ""}" style="background:{v}"></i>' for k, v in SKINS.items())
    panel = f'''<h3>Tono de piel <em>Tono 4</em></h3><div class="tiles">{tiles}</div>
<p class="hint">Elegí el que más se parezca a vos. Lo podés cambiar cuando quieras.</p>'''
    body, glow = creator(b, cami, "Piel", panel, "Cami · #10")
    screens.append(("12-creador-piel", "Creador · Piel", b.fill(mock_page("piel", body, glow))))

    # --- D · creador: Pelo (Cami)
    b = Batch("pd")
    sw = "".join(f'<i class="{"on" if k == cami["cfg"]["hairColor"] else ""}" style="background:{v}"></i>' for k, v in HAIRC.items())
    tiles = "".join(f'<div class="tile h{" on" if h == cami["cfg"]["hair"] else ""}">{b.add({**cami["cfg"], "hair": h}, PSB, viewBox=HEAD_VB, bg="#132a1c", circle=False)}</div>' for h in HAIRS)
    panel = f'''<h3>Color <em>Castaño oscuro</em></h3><div class="sw">{sw}</div><h3>Peinado <em>Colita</em></h3><div class="tiles">{tiles}</div>'''
    body, glow = creator(b, cami, "Pelo", panel, "Cami · #10")
    screens.append(("13-creador-pelo", "Creador · Pelo", b.fill(mock_page("pelo", body, glow))))

    # --- E · creador: Cara (Nico)
    b = Batch("pe")
    nico = person("nico")
    tiles = "".join(f'<div class="tile{" on" if f == nico["cfg"]["facial"] else ""}">{b.add({**nico["cfg"], "facial": f}, PSB, viewBox=FACE_VB, bg="#132a1c", circle=False)}</div>' for f in FACIALS)
    vincha = b.add({**nico["cfg"], "extras": ["vincha"]}, PSB, viewBox=HEAD_VB, bg="#1a3826", circle=False)
    lentes = b.add({**nico["cfg"], "extras": ["anteojos"]}, PSB, viewBox=FACE_VB, bg="#1a3826", circle=False)
    panel = f'''<h3>Barba y bigote <em>Barba de días</em></h3><div class="tiles c5">{tiles}</div>
<h3>Extras</h3>
<div class="row"><div class="pa" style="border-radius:12px;width:46px;height:46px">{vincha}</div><div><b style="font:600 15px Figtree">Vincha</b><span style="display:block;font-size:12.5px;color:#9bb5a4">Con el color del equipo</span></div><div class="toggle"></div></div>
<div class="row" style="margin-top:8px"><div class="pa" style="border-radius:12px;width:46px;height:46px">{lentes}</div><div><b style="font:600 15px Figtree">Anteojos</b></div><div class="toggle"></div></div>'''
    body, glow = creator(b, nico, "Cara", panel, "Nico · #11")
    screens.append(("14-creador-cara", "Creador · Cara", b.fill(mock_page("cara", body, glow))))

    # --- F · creador: Camiseta (Vero, DT)
    b = Batch("pf")
    vero = person("vero")
    pats = "".join(f'<div class="tile{" on" if x == vero["cfg"]["shirtPattern"] else ""}" style="aspect-ratio:.9">{b.add({**vero["cfg"], "shirtPattern": x}, PSB, viewBox="70 220 260 180", par="xMidYMid slice", bg="#132a1c", circle=False)}<small>{LABEL["shirtPattern"][x]}</small></div>' for x in PATTERNS)
    cols = "".join(f'<div class="tile{" on" if x == vero["cfg"]["collar"] else ""}" style="aspect-ratio:1.25">{b.add({**vero["cfg"], "collar": x}, PSB, viewBox="60 200 280 200", par="xMidYMid slice", bg="#132a1c", circle=False)}<small>{LABEL["collar"][x].replace(" (DT)", "")}</small></div>' for x in COLLARS)
    panel = f'''<h3>Colores del equipo <em>Los elige el DT</em></h3>
<div style="display:flex;gap:8px"><span class="chip"><i style="background:{PSB['primary']}"></i>Verde</span><span class="chip"><i style="background:{PSB['secondary']}"></i>Lima</span></div>
<h3>Diseño <em>Lisa</em></h3><div class="tiles c5">{pats}</div>
<h3>Cuello <em>Campera</em></h3><div class="tiles">{cols}</div>'''
    body, glow = creator(b, vero, "Camiseta", panel, "Vero · DT")
    screens.append(("15-creador-camiseta", "Creador · Camiseta (DT)", b.fill(mock_page("camiseta", body, glow))))

    # --- G · plantel con el resultado
    b = Batch("pg")
    def pa(cfg, me=False): return f'<div class="pa{" me" if me else ""}">{b.add(cfg, PSB, bg=BGP, circle=True)}</div>'
    sofi_p = {**person("sofi")["cfg"], "shirtPattern": "lisa", "collar": "redondo"}
    rows_ct = f'<div class="li">{pa(vero["cfg"])}<div><b>Vero Sosa</b><span>DT</span></div><div class="r">Avatar</div></div>'
    rows = "".join([
        f'<div class="li">{pa(cami["cfg"], True)}<div><b>Cami Paz</b><span>VOL · #10 · vos</span></div><div class="r">1 G · 2 A</div></div>',
        f'<div class="li"><div class="pa"><img src="{foto}"></div><div><b>Flor Acosta</b><span>DEL · #9</span></div><div class="r">6 G · 2 A</div></div>',
        f'<div class="li">{pa(nico["cfg"])}<div><b>Nico Barrios</b><span>DEL · #11</span></div><div class="r">3 G · 1 A</div></div>',
        f'<div class="li"><div class="pa">LG</div><div><b>Luqui Giménez</b><span>VOL · #8</span></div><div class="r">2 G · 5 A</div></div>',
        f'<div class="li">{pa(sofi_p)}<div><b>Sofi Medina</b><span>ARQ · #1</span></div><div class="r">—</div></div>',
        f'<div class="li">{pa(juli["cfg"])}<div><b>Juli</b><span>DEF · #14</span></div><div class="r">—</div></div>',
    ])
    body = f'''<header class="tb" style="gap:12px;padding:0 16px"><span class="pa" style="background:#b8f25a;color:#0c1a10;font:700 15px Figtree">DP</span><h1>Deportivo Pasaje</h1></header>
<div class="sec">Cuerpo técnico</div><div class="list">{rows_ct}</div>
<div class="sec">Plantel</div><div class="list">{rows}</div>
<div class="toast"><i>{icon("check", 14, 3.2)}</i>Avatar guardado. Ya se ve en la formación.</div>{NAV()}'''
    screens.append(("16-plantel", "Equipo · el plantel con fotos, avatares e iniciales", b.fill(mock_page("plantel", body))))

    screens.append(("17-recortar-foto", "Subir foto · recorte cuadrado", screen_crop(cb, foto)))
    outs = []
    for slug, label, s in screens:
        p = write(f"{slug}.html", s)
        out = f"{OUT}/pantallas/{slug}.png"
        render(p, out, 390, 844, scale=2)
        outs.append((slug, label, out))
    # hoja con todas las pantallas
    figs = "".join(f'<figure><img src="pantallas/{slug}.png"><figcaption><b>{slug[:2]}</b>{label}</figcaption></figure>' for slug, label, _ in outs)
    s = f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>{SHEET_CSS}
body{{width:2620px}}
.g{{display:grid;grid-template-columns:repeat(4,585px);gap:40px 36px;padding:20px 60px 60px}}
figure{{margin:0}} img{{width:585px;height:1266px;display:block;border-radius:44px;box-shadow:0 0 0 10px #132a1c,0 0 0 12px #234833,0 30px 60px rgba(0,0,0,.5)}}
figcaption{{margin-top:22px;font:700 26px "Barlow Condensed";letter-spacing:.06em;text-transform:uppercase;text-align:center}}
figcaption b{{color:#b8f25a;margin-right:10px}}
.copy{{grid-column:4;align-self:center;background:#132a1c;border:1px solid #234833;border-radius:26px;padding:34px;font-size:22px;line-height:1.55;color:#9bb5a4}}
.copy h3{{font:800 32px "Barlow Condensed";letter-spacing:.06em;text-transform:uppercase;color:#b8f25a;margin-bottom:12px}}
.copy b{{color:#eef6ef}} .copy ul{{margin:8px 0 0 22px}}
</style></head><body>
<header class="sh">{LOGO}<div><h1>Creador de avatar · <em>pantallas</em></h1>
<p>Mockups 390×844 (@2x). Se entra desde Equipo → tu foto. El creador ocupa toda la pantalla, sin barra de abajo.</p></div></header>
<div class="g">{figs}</div><div class="g" style="padding-top:0"><div class="copy" style="grid-column:1/5"><h3>Textos</h3>
<b>Título:</b> Tu imagen · Mi avatar<br><b>Opciones:</b> Subir foto · Armar mi avatar<br><b>Pestañas:</b> Piel · Pelo · Cara · Camiseta<br>
<b>Botones:</b> Guardar · Al azar · Quitar foto<br><b>Aviso:</b> “Avatar guardado. Ya se ve en la formación.”<br><b>Menores:</b> “No pedimos foto si sos menor de 18.” (ya está en la app)
<ul><li>Al tocar Guardar se vuelve a Equipo.</li><li>Si cierra con ✕ y cambió algo: “¿Salir sin guardar?” Salir / Seguir.</li><li>“Al azar” nunca cambia la camiseta (los colores son del equipo).</li><li>Si la persona ya tiene foto, en Tu imagen aparece “Quitar foto” y debajo “Armar mi avatar” (el avatar queda de respaldo).</li></ul></div></div>
</body></html>'''
    p = f"{OUT}/_pantallas.html"; open(p, "w").write(s)
    render(p, f"{OUT}/04-creador-pantallas.png", 2620, 3480)
    os.remove(p)
def rebuild_originals():
    """Las 9 cards + 2 stories + hoja 00-todas.png de la primera entrega (sin cambios de diseño)."""
    subprocess.run([sys.executable, f"{ROOT}/_tools/build.py"], check=True)
    subprocess.run([sys.executable, f"{ROOT}/_tools/sheet.py"], check=True)
    sheet = f"{ROOT}/png/_sheet.html"
    render(sheet, f"{ROOT}/png/00-todas.png", 2060, 2370)
    os.remove(sheet)

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    subprocess.run(["node", f"{AV}/export_parts.js"], check=True)
    pages = {"grid": page_grid, "opciones": page_options, "capas": page_layers, "cards": page_cards,
             "pantallas": page_mockups, "recorte": lambda: page_crop_guide(foto_uri())}
    for name, fn in pages.items():
        if not args or name in args: fn()
    if "--todo" in sys.argv: rebuild_originals()

if __name__ == "__main__":
    main()
