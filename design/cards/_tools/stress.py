import sys; sys.path.insert(0, "/workspace/mivestuario/cards/_tools")
import build as b
tests = [("01-figura-del-partido", dict(NOMBRE="Mati Echeverry", RIVAL="Social y Deportivo Villa Pueyrredón", STAT="12")),
         ("03-asistidor-del-mes", dict(TITULO="MÁS ASISTENCIAS DEL MES", NOMBRE="WWWWWWWWWWWWWW", EQUIPO="Club Atlético y Social Los Pibes de Barracas")),
         ("02-goleador-del-mes", dict(TITULO="MÁS GOLES DEL MES", NOMBRE="Florencia Pazo", STAT="11", TIENE_FOTO="no", FOTO_SRC="")),
         ("09-dt-del-mes", dict(NOMBRE="Valentina R.", STAT="10"))]
import os
os.makedirs("/workspace/mivestuario/cards/_tools/stress", exist_ok=True)
for slug, over in tests:
    c = next(x for x in b.CARDS if x["slug"] == slug)
    d = b.example_data(c); d.update(over)
    t = b.base_t(c); t["deco"] = b.deco_html(c.get("deco",""), ex=c["ex"])
    h = b.fill(b.page(b.card_markup(t), "solo-card", "t").replace("{{CSS_HREF}}", "../../html/cards.css"), d)
    p = f"/workspace/mivestuario/cards/_tools/stress/{slug}.html"; open(p,"w").write(h)
    b.render(p, p.replace(".html",".png"), 720, 1000)
