import sys; sys.path.insert(0, "/workspace/mivestuario/cards/_tools")
import build as b
TIER = dict(neon="Neón", oro="Oro", esmeralda="Esmeralda", hielo="Hielo", plata="Plata", fuego="Fuego", bronce="Bronce", cancha="Cancha", pizarra="Pizarra")
cells = "".join(f'<figure><img src="{c["slug"]}.png"><figcaption><b>{c["slug"][:2]} · {c["nombre_tipo"]}</b><span>{TIER[c["tier"]]}</span></figcaption></figure>' for c in b.CARDS)
stories = "".join(f'<figure class="st"><img src="{s}.png"><figcaption><b>Story 1080×1920</b><span>{n}</span></figcaption></figure>' for s, n in [("story-figura-del-partido","Figura del partido"),("story-goleador-del-mes","Goleador/a del mes")])
h = f'''<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;width:2060px;background:#061109;color:#eef6ef;font-family:Figtree,sans-serif;
 background:radial-gradient(ellipse 1200px 700px at 50% 0%,rgba(184,242,90,.10),transparent 70%),#061109}}
header{{display:flex;align-items:center;gap:20px;padding:56px 60px 20px}}
header svg{{width:64px;height:64px;border-radius:14px}}
h1{{font:800 64px/1 "Barlow Condensed";letter-spacing:.02em;text-transform:uppercase;margin:0}}
h1 em{{font-style:normal;color:#b8f25a}}
header p{{margin:6px 0 0;color:#9bb5a4;font-size:22px}}
.grid{{display:grid;grid-template-columns:repeat(5,360px);gap:36px 35px;padding:30px 60px}}
figure{{margin:0}} figure img{{width:360px;height:500px;display:block}}
figcaption{{margin-top:12px;text-align:center}} figcaption b{{display:block;font:700 26px/1.1 "Barlow Condensed";letter-spacing:.06em;text-transform:uppercase}}
figcaption span{{color:#9bb5a4;font-size:18px}}
.legend{{grid-column:5;align-self:center;background:#132a1c;border:1px solid #234833;border-radius:20px;padding:26px;font-size:19px;color:#9bb5a4;line-height:1.5}}
.legend b{{color:#b8f25a;font:700 24px "Barlow Condensed";letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:8px}}
.stories{{display:flex;gap:60px;padding:20px 60px 70px;align-items:flex-start}}
.st img{{width:432px;height:768px;border-radius:18px;box-shadow:0 0 0 1px #234833}}
.note{{align-self:center;max-width:820px;color:#9bb5a4;font-size:22px;line-height:1.5}}
.note b{{color:#eef6ef}}
</style></head><body>
<header>{b.LOGO}<div><h1>Mi Vestuario · <em>Cards de premios</em></h1><p>9 tipos de card (720×1000, exportar @2x) + 2 stories para Instagram · datos de ejemplo ficticios</p></div></header>
<div class="grid">{cells}<div class="legend"><b>Cómo leerlas</b>Número grande = la estadística real del premio (goles, votos, asistencias…), nunca un rating inventado.<br><br>Sin foto: silueta + iniciales.<br>Nombres largos: se achican hasta 56px y después “…”.</div></div>
<div class="stories">{stories}<div class="note"><b>Títulos con género:</b> Goleador/Goleadora, Asistidor/Asistidora, Capitán/Capitana según preferencia del perfil; si no hay dato, versión neutra (ej. “Más goles del mes”). Figura y DT son neutros.<br><br><b>Capitán/a</b> es opcional: la app hoy no guarda capitanía (ver SPEC.md).</div></div>
</body></html>'''
open("/workspace/mivestuario/cards/png/_sheet.html","w").write(h)
