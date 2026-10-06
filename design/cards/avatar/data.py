"""Datos de ejemplo (ficticios) para las piezas del avatar."""

TEAMS = {
    "pasaje":   dict(name="Deportivo Pasaje", ini="DP", primary="#1f6f3f", secondary="#b8f25a"),
    "villa":    dict(name="Villa Real FC",    ini="VR", primary="#7a1626", secondary="#f4efe6"),
    "halcones": dict(name="Los Halcones",     ini="LH", primary="#0a3d8f", secondary="#f2c200"),
    "ribera":   dict(name="Atlético Ribera",  ini="AR", primary="#1a1a1a", secondary="#e63946"),
    "norte":    dict(name="Sportivo Norte",   ini="SN", primary="#5fa8dc", secondary="#ffffff"),
    "ferro":    dict(name="Ferro del Oeste",  ini="FO", primary="#0e6b3a", secondary="#ffffff"),
    "taller":   dict(name="Taller FC",        ini="TF", primary="#e8772e", secondary="#1b1b1b"),
}

def team(key):
    t = TEAMS[key]
    return {"primary": t["primary"], "secondary": t["secondary"]}

# 12 personas: 6 mujeres / 6 varones · 4 jugadoras + 2 DT / 4 jugadores + 2 DT · los 8 tonos de piel
PEOPLE = [
    dict(id="flor",  name="Flor Acosta",    nick="Flor",  rol="Jugadora", puesto="DEL", num=9,  team="pasaje",
         cfg=dict(skin="t2", hair="largo",   hairColor="colorado",       facial="ninguno", extras=[],                    shirtPattern="lisa",     collar="redondo")),
    dict(id="sofi",  name="Sofi Medina",    nick="Sofi",  rol="Arquera",  puesto="ARQ", num=1,  team="halcones",
         cfg=dict(skin="t7", hair="afro",    hairColor="negro",          facial="ninguno", extras=["vincha"],            shirtPattern="franja",   collar="v")),
    dict(id="cami",  name="Cami Paz",       nick="Cami",  rol="Jugadora", puesto="VOL", num=10, team="pasaje",
         cfg=dict(skin="t4", hair="colita",  hairColor="castano-oscuro", facial="ninguno", extras=[],                    shirtPattern="lisa",     collar="redondo")),
    dict(id="ana",   name="Ana Benítez",    nick="Ana",   rol="Jugadora", puesto="DEF", num=4,  team="ribera",
         cfg=dict(skin="t8", hair="trenzas", hairColor="negro",          facial="ninguno", extras=[],                    shirtPattern="bastones", collar="redondo")),
    dict(id="vero",  name="Vero Sosa",      nick="Vero",  rol="DT",       puesto="DT",  num=None, team="pasaje",
         cfg=dict(skin="t3", hair="melena",  hairColor="castano-oscuro", facial="ninguno", extras=["anteojos"],          shirtPattern="lisa",     collar="campera")),
    dict(id="marta", name="Marta Quiroga",  nick="Marta", rol="DT",       puesto="DT",  num=None, team="norte",
         cfg=dict(skin="t5", hair="rodete",  hairColor="canoso",         facial="ninguno", extras=["anteojos"],          shirtPattern="bastones", collar="polo")),
    dict(id="nico",  name="Nico Barrios",   nick="Nico",  rol="Jugador",  puesto="DEL", num=11, team="pasaje",
         cfg=dict(skin="t1", hair="corto",   hairColor="rubio",          facial="barba-corta", extras=[],                shirtPattern="lisa",     collar="redondo")),
    dict(id="mati",  name="Mati Romero",    nick="Mati",  rol="Jugador",  puesto="DEF", num=5,  team="villa",
         cfg=dict(skin="t6", hair="rapado",  hairColor="negro",          facial="bigote",  extras=[],                    shirtPattern="banda",    collar="v")),
    dict(id="luqui", name="Luqui Giménez",  nick="Luqui", rol="Jugador",  puesto="VOL", num=8,  team="ferro",
         cfg=dict(skin="t3", hair="rulos",   hairColor="castano",        facial="ninguno", extras=["vincha"],            shirtPattern="mitades",  collar="redondo")),
    dict(id="joaco", name="Joaco Ledesma",  nick="Joaco", rol="Jugador",  puesto="DEL", num=7,  team="taller",
         cfg=dict(skin="t7", hair="rastas",  hairColor="negro",          facial="candado", extras=[],                    shirtPattern="lisa",     collar="v")),
    dict(id="ruben", name="Rubén Ferreyra", nick="Rubén", rol="DT",       puesto="DT",  num=None, team="halcones",
         cfg=dict(skin="t2", hair="pelado",  hairColor="canoso",         facial="barba",   extras=["anteojos"],          shirtPattern="lisa",     collar="campera")),
    dict(id="gus",   name="Gus Ortiz",      nick="Gus",   rol="DT",       puesto="DT",  num=None, team="ribera",
         cfg=dict(skin="t5", hair="medio",   hairColor="canoso",         facial="bigote",  extras=[],                    shirtPattern="lisa",     collar="polo")),
]

def person(pid):
    return next(p for p in PEOPLE if p["id"] == pid)
