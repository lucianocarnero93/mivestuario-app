"""Hoja de contacto (00-alineacion-todas.png) y antes/después (00-antes-despues.png)."""
import sys, subprocess
import importlib.util as _iu
_spec = _iu.spec_from_file_location("cards_build", "/workspace/mivestuario/cards/_tools/build.py")
_cb = _iu.module_from_spec(_spec); _spec.loader.exec_module(_cb)
LOGO = _cb.LOGO  # mismo logo que las cards de premios

OUT = "/workspace/mivestuario/cards/png/alineacion"
H = 2400
CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{background:#061109;color:#eef6ef;font-family:Figtree,sans-serif;
 background:radial-gradient(ellipse 1400px 700px at 50% 0%,rgba(184,242,90,.10),transparent 70%),#061109}
header{display:flex;align-items:center;gap:22px;padding:56px 64px 18px}
header svg{width:68px;height:68px;border-radius:15px;flex:none}
h1{font:800 66px/1 "Barlow Condensed";letter-spacing:.02em;text-transform:uppercase}
h1 em{font-style:normal;color:#b8f25a}
header p{margin-top:8px;color:#9bb5a4;font-size:24px}
h2{font:800 30px/1 "Barlow Condensed";letter-spacing:.14em;text-transform:uppercase;color:#b8f25a;padding:34px 64px 16px}
h2 span{color:#9bb5a4;font:600 21px Figtree;letter-spacing:0;text-transform:none;margin-left:14px}
.row{display:flex;gap:36px;padding:0 64px;align-items:flex-start}
figure{margin:0} figure img{display:block;border-radius:14px;box-shadow:0 0 0 1px #234833,0 18px 40px rgba(0,0,0,.45)}
figcaption{margin-top:12px;text-align:center} figcaption b{display:block;font:700 25px/1.1 "Barlow Condensed";letter-spacing:.06em;text-transform:uppercase}
figcaption span{color:#9bb5a4;font-size:18px}
.note{background:#132a1c;border:1px solid #234833;border-radius:20px;padding:26px 28px;font-size:20px;color:#9bb5a4;line-height:1.5}
.note b{color:#eef6ef} .note h3{color:#b8f25a;font:700 24px "Barlow Condensed";letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
.note li{margin-left:20px}
.safe{position:relative}
.safe i{position:absolute;left:0;right:0;background:repeating-linear-gradient(135deg,rgba(255,90,90,.28) 0 10px,rgba(255,90,90,.12) 10px 20px);border:2px dashed rgba(255,120,120,.8);
 display:grid;place-items:center;font:700 16px Figtree;font-style:normal;color:#fff;text-shadow:0 1px 3px #000;border-radius:6px}
"""

def fig(src, w, h, title, sub, extra=""):
    return f'<figure><div class="safe" style="width:{w}px">{extra}<img src="{src}" width="{w}" height="{h}"></div><figcaption><b>{title}</b><span>{sub}</span></figcaption></figure>'

def render(name, body, w, h):
    p = f"{OUT}/_{name}.html"
    open(p, "w").write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}body{{width:{w}px;height:{h}px;overflow:hidden}}</style></head><body>{body}</body></html>')
    subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    f"--window-size={w},{h}", "--virtual-time-budget=3000", f"--screenshot={OUT}/{name}.png", f"file://{p}"],
                   check=True, capture_output=True)
    print("png", f"{OUT}/{name}.png")

def contacto():
    wa = [("whatsapp-f5-neon", "F5 · Rombo", "Neón · sin escudo → iniciales"),
          ("whatsapp-f7-neon", "F7 · 1-3-2-1", "Neón (marca)"),
          ("whatsapp-f7-equipo-rojo-negro", "F7 · 1-3-2-1", "Equipo · rojo y negro"),
          ("whatsapp-f8-neon", "F8 · 1-3-3-1", "Neón (marca)"),
          ("whatsapp-f9-equipo-bordo-celeste", "F9 · 1-3-3-2", "Equipo · bordó y celeste"),
          ("whatsapp-f11-neon", "F11 · 4-2-3-1", "Neón (marca)"),
          ("whatsapp-f11-equipo-azul-amarillo", "F11 · 4-3-3", "Equipo · azul y amarillo")]
    st = [("story-f5-neon", "F5 · Rombo", "Neón"), ("story-f7-neon", "F7 · 1-3-2-1", "Neón"),
          ("story-f7-equipo-rojo-negro", "F7 · 1-3-2-1", "Rojo y negro"), ("story-f8-neon", "F8 · 1-3-3-1", "Neón"),
          ("story-f9-equipo-bordo-celeste", "F9 · 1-3-3-2", "Bordó y celeste"),
          ("story-f11-equipo-azul-amarillo", "F11 · 4-3-3", "Azul y amarillo")]
    og = [("og-f7-neon", "Link · F7", "Neón"), ("og-f8-neon", "Link · F8", "Neón"),
          ("og-f9-equipo-bordo-celeste", "Link · F9", "Bordó y celeste"), ("og-f11-equipo-azul-amarillo", "Link · F11", "Azul y amarillo")]
    s = 352/1080
    zonas = f'<i style="top:0;height:{250*s}px">sin info · 250 px</i><i style="bottom:0;height:{300*s}px;top:auto">sin info · 300 px</i>'
    body = f'''<header>{LOGO}<div><h1>Mi Vestuario · <em>Alineación para compartir</em></h1>
<p>Desde la Pizarra: WhatsApp / feed 1080×1350 · Story 1080×1920 · Link 1200×630 · F5, F7, F8, F9 y F11 · datos y equipos ficticios · “Foto ejemplo” = silueta dibujada, no es una persona</p></div></header>
<h2>WhatsApp / feed 4:5 <span>1080×1350 · también sirve como post de Instagram</span></h2>
<div class="row" style="gap:28px">{"".join(fig(f"{a}.png", 304, 380, b, c) for a, b, c in wa)}</div>
<h2>Story de Instagram <span>1080×1920 · arriba 250 px y abajo 300 px libres para stickers (marcado en rojo en la primera)</span></h2>
<div class="row" style="gap:40px">{"".join(fig(f"{a}.png", 352, 626, b, c, zonas if i == 0 else "") for i, (a, b, c) in enumerate(st))}</div>
<h2>Link del partido (Open Graph) <span>1200×630 · lo que aparece al pegar el link en WhatsApp · sin fotos ni nombres: número + puesto</span></h2>
<div class="row" style="gap:28px">{"".join(fig(f"{a}.png", 556, 292, b, c) for a, b, c in og)}</div>
<div class="row" style="margin-top:34px;gap:36px;align-items:stretch">
<div class="note" style="width:1138px"><h3>Cómo leerlas</h3><ul>
<li><b>Imagen de cada jugador:</b> foto → avatar → iniciales (la misma regla <i>imagenDe</i> de las cards). En cada formación hay de los tres.</li>
<li><b>Menores de 18:</b> nunca foto. Juanchi (F7), Valen (F8), Ian (F9) y Enzo (F11) con avatar; Thiago, Lolo y Mateo tienen una foto cargada en los datos de prueba y el template la baja a iniciales del apodo; Dani y Benja iniciales.</li>
<li><b>Número grande</b> = dorsal. Abajo, el puesto del slot (ARQ, DEF, VOL…). Sin dorsal, no se muestra.</li>
<li><b>Formaciones:</b> se usan las por defecto de la app (F8 1-3-3-1, F9 1-3-3-2). Las 15 formaciones de la app tienen posiciones en el SPEC.</li>
<li><b>DT</b> con acabado Pizarra (el mismo de la card DT del mes).</li></ul></div>
<div class="note" style="width:1138px"><h3>Link público = mismas reglas que /vivo</h3>
Hoy el link público muestra apodo, número y puesto, y <b>nunca</b> fotos, nombres reales ni menores. La imagen del link va un paso más allá: <b>solo número y puesto</b> (la ve cualquiera que reciba el link, aunque no lo abra). El lugar de un menor queda con el puesto y sin número. Sin banco ni DT.<br><br>
<b>Si dos chips se pisan</b>, se achican todos por igual (nunca se mueven). Peor caso F11 3-5-2: chips de 109 px.</div></div>
<div style="height:60px"></div>'''
    render("00-alineacion-todas", body, 2440, H)

def antes_despues():
    body = f'''<header>{LOGO}<div><h1>Compartir desde la Pizarra · <em>antes y después</em></h1>
<p>Izquierda: lo que genera hoy <i>Compartir</i> (reconstruido con el mismo código de pizarra-viva.tsx). Derecha: la propuesta. Mismo partido y mismo plantel.</p></div></header>
<div class="row" style="gap:60px">
 <div style="width:1010px">
  <h2 style="padding-left:0;color:#ff8a8a">Hoy</h2>
  <div class="row" style="padding:0;gap:30px">
   {fig("_hoy-whatsapp-f7.png", 600, 315, "“Compartir en WhatsApp”", "1200×630 · F7 armado en 1-3-2-1")}
   {fig("_hoy-story-f11.png", 270, 480, "“Historia de Instagram”", "1080×1920 · F11 armado en 4-3-3")}
  </div>
  <div class="note" style="margin-top:26px;border-color:#5a2a2a"><h3 style="color:#ff8a8a">Por qué se ve mal</h3><ul>
   <li><b>Faltan jugadores:</b> siempre dibuja con la primera formación de la modalidad, no la elegida. En el F7 desaparece el 2 (DF); en el F11 4-3-3 faltan 4 de 11.</li>
   <li><b>WhatsApp apaisado 1200×630:</b> la cancha queda en una franja de 280 px y los jugadores son círculos de 44 px. Sin dibujo de cancha.</li>
   <li><b>Dice “Con el escudo del equipo”</b> en vez de dibujar el escudo. Sin marca cuando hay escudo.</li>
   <li><b>Título repetido</b> (“vs Racing del Bajo” dos veces) y no figura el nombre del equipo.</li>
   <li>Sin fecha, hora, cancha, esquema, banco ni DT. La story dice siempre “Así salimos hoy”.</li>
   <li>Fondo verde plano, fuente del sistema (sans-serif), sin fotos ni avatares: nada de la marca ni de las cards.</li></ul></div>
 </div>
 <div style="width:1010px">
  <h2 style="padding-left:0">Propuesta</h2>
  <div class="row" style="padding:0;gap:30px">
   {fig("whatsapp-f7-neon.png", 452, 565, "WhatsApp / feed", "1080×1350 · F7 1-3-2-1")}
   {fig("story-f11-equipo-azul-amarillo.png", 318, 565, "Story", "1080×1920 · F11 4-3-3, los 11")}
  </div>
  <div class="note" style="margin-top:26px"><h3>Qué cambia</h3><ul>
   <li>Usa la formación del plan que se está viendo: están los 7 y los 11.</li>
   <li>Formato 4:5 (ocupa más pantalla en el chat), cancha en perspectiva, chips estilo FUT con foto / avatar / iniciales.</li>
   <li>Escudo, equipo, rival, día, hora, cancha, F7 · esquema, banco y DT. Marca chica abajo.</li></ul></div>
 </div>
</div>
<h2>Así llega al chat <span>tamaño real aproximado de la miniatura en un celular</span></h2>
<div class="row" style="gap:60px;align-items:stretch">
 <div style="width:1010px;background:#0b141a;border-radius:24px;padding:34px;display:flex;justify-content:flex-end;align-items:flex-start">
  <div style="background:#005c4b;border-radius:14px;padding:6px;width:342px"><img src="_hoy-whatsapp-f7.png" width="330" height="173" style="border-radius:10px;box-shadow:none">
  <p style="font-size:17px;padding:6px 6px 2px;color:#e9edef">vs Racing del Bajo</p></div></div>
 <div style="width:1010px;background:#0b141a;border-radius:24px;padding:34px;display:flex;justify-content:flex-end;align-items:flex-start">
  <div style="background:#005c4b;border-radius:14px;padding:6px;width:342px"><img src="whatsapp-f7-neon.png" width="330" height="412" style="border-radius:10px;box-shadow:none">
  <p style="font-size:17px;line-height:1.35;padding:6px 6px 2px;color:#e9edef">Así salimos el sábado vs Racing del Bajo ⚽ Mirá la formación: mivestuario.com.ar/vivo?t=…</p></div></div>
</div><div style="height:50px"></div>'''
    render("00-antes-despues", body, 2200, 1820)

def main():
    contacto(); antes_despues()

if __name__ == "__main__":
    main()
