import type { Modality } from "./types.ts";

export type Momento = "con-pelota" | "perdida" | "sin-pelota" | "recuperacion" | "parada";
export type LineaRol = "ARQ" | "DEF" | "VOL" | "DEL";
export type LineaBloque = "arq" | "def" | "med" | "del";

export type AjusteLinea = { linea: LineaBloque; dy?: number; ancho?: number; dx?: number };
export type AjusteActor = { id: string; dx?: number; dy?: number };
export type PelotaSpec = { x: number; y: number } | { actor: string };

export type CuadroModelo = {
  texto: string;
  pelota: PelotaSpec;
  lineas?: AjusteLinea[];
  actores?: AjusteActor[];
};

export type ActorPedido = { id: string; linea: Exclude<LineaBloque, "arq">; lado: number };

export type FuenteModelo = { nombre: string; url: string };

export type Modelo = {
  id: string;
  nombre: string;
  momento: Momento;
  cuando: string;
  claves: [string, string, string];
  lineas: Record<LineaRol, string>;
  actores: ActorPedido[];
  cuadros: [CuadroModelo, CuadroModelo, CuadroModelo];
  fuentes: FuenteModelo[];
  noAplica: Partial<Record<Modality, string>>;
};

export const MOMENTOS: { id: Momento; label: string }[] = [
  { id: "con-pelota", label: "Con la pelota" },
  { id: "perdida", label: "Cuando la perdemos" },
  { id: "sin-pelota", label: "Sin la pelota" },
  { id: "recuperacion", label: "Cuando la recuperamos" },
  { id: "parada", label: "Pelota parada" },
];

const PERARNAU = { nombre: "Martí Perarnau, Herr Pep", url: "https://libreria.tirant.com/es/libro/herr-pep-marti-perarnau-9788415242635" };
const COX = { nombre: "Michael Cox, The Mixer", url: "https://www.harpercollins.co.uk/products/the-mixer-the-story-of-premier-league-tactics-from-route-one-to-false-nines-michael-cox" };
const WILSON = { nombre: "Jonathan Wilson, Inverting the Pyramid", url: "https://openlibrary.org/works/OL19953961W" };
const USSF = { nombre: "U.S. Soccer, Player Development Initiatives", url: "https://www.epysa.org/u-s-soccer-player-development-initiatives/" };
const TAMARIT = { nombre: "Xavier Tamarit, ¿Qué es la Periodización Táctica?", url: "https://shop.mcsports.es/es/libros/23-que-es-la-periodizacion-tactica-9788461199303.html" };
const FA = { nombre: "The FA, England DNA: Transition", url: "https://www.thefa.com/bootroom/resources/england-dna/how-we-play/transition" };
const UEFA_PRESS = { nombre: "UEFA, Setting the press", url: "https://www.uefa.com/uefachampionsleague/news/028a-1a1bf5c2d303-4a5106d81f09-1000--champions-league-performance-insights-setting-the-press/" };
const UEFA_REPORT = { nombre: "UEFA, Champions League Technical Report", url: "https://uefatechnicalreports.com/" };
const FIFA = { nombre: "FIFA Training Centre, Defending corners", url: "https://www.fifatrainingcentre.com/en/game/game-analysis/set-plays/corners/defending-corners-zonal-or-player-to-player.php" };

function cuadro(
  texto: string,
  pelota: PelotaSpec,
  lineas?: AjusteLinea[],
  actores?: AjusteActor[],
): CuadroModelo {
  return { texto, pelota, lineas, actores };
}

export const MODELOS: Modelo[] = [
  {
    id: "salida-corta",
    nombre: "Salida corta desde el fondo",
    momento: "con-pelota",
    cuando: "Cuando el rival presiona con pocos y tenemos tiempo para salir jugando.",
    claves: ["Centrales bien abiertos", "El volante baja de frente", "Pase al libre, no al marcado"],
    lineas: {
      ARQ: "Vos, arquero: dá la pelota al que está libre, no al marcado.",
      DEF: "Vos, defensor: abrite bien y ofrecé el pase corto.",
      VOL: "Vos, volante: bajá de frente a pedirla entre los dos.",
      DEL: "Vos, delantero: quedate abierto por si la salida se estira.",
    },
    actores: [
      { id: "volante", linea: "med", lado: 50 },
      { id: "lateral", linea: "def", lado: 18 },
    ],
    cuadros: [
      cuadro("Salimos cortos. Los de abajo se abren y el volante ofrece.", { x: 50, y: 78 }, [
        { linea: "def", ancho: 1.12, dy: -2 },
        { linea: "med", dy: 4 },
      ]),
      cuadro("El volante baja a pedirla de frente. El arquero la da al de afuera.", { actor: "volante" }, [
        { linea: "def", ancho: 1.16 },
      ], [
        { id: "volante", dy: 14 },
        { id: "lateral", dx: -6 },
      ]),
      cuadro("Si está libre el de arriba, el pase sale. Si no, volvemos a abrir.", { actor: "lateral" }, [
        { linea: "med", dy: -6 },
        { linea: "del", dy: -4, ancho: 1.08 },
      ], [{ id: "volante", dy: -8 }]),
    ],
    fuentes: [PERARNAU, COX, USSF],
    noAplica: {},
  },
  {
    id: "salida-larga",
    nombre: "Salida larga al 9 y segunda pelota",
    momento: "con-pelota",
    cuando: "Cuando nos aprietan arriba con muchos o la cancha está pesada.",
    claves: ["Pelota larga al 9", "Volantes cerca para el rebote", "Atacar el espacio de atrás"],
    lineas: {
      ARQ: "Vos, arquero: buscá al 9 cuando no haya pase corto.",
      DEF: "Vos, defensor: ganá el rebote y no persigas solo.",
      VOL: "Vos, volante: quedate cerca del 9 para la segunda pelota.",
      DEL: "Vos, delantero: clavala y dejala para el que llega.",
    },
    actores: [
      { id: "nueve", linea: "del", lado: 50 },
      { id: "volante", linea: "med", lado: 42 },
    ],
    cuadros: [
      cuadro("No hay pase corto. El arquero mira al 9.", { x: 50, y: 80 }, [
        { linea: "def", ancho: 0.9, dy: 2 },
        { linea: "del", dy: -2 },
      ]),
      cuadro("Pelota larga al 9. Los volantes ya están cerca.", { actor: "nueve" }, [
        { linea: "med", dy: -10 },
      ], [{ id: "nueve", dy: -6 }]),
      cuadro("Segunda pelota: el que llega ataca el espacio de atrás.", { x: 58, y: 28 }, [
        { linea: "med", dy: -8 },
        { linea: "del", dy: -4 },
      ], [{ id: "volante", dy: -10, dx: 6 }]),
    ],
    fuentes: [COX, WILSON],
    noAplica: { f5: "En el F5 no queda gente para la segunda pelota." },
  },
  {
    id: "desdoble",
    nombre: "Ataque por banda con desdoble",
    momento: "con-pelota",
    cuando: "Cuando el rival defiende cerrado por el medio y deja libres las bandas.",
    claves: ["Abiertos en la banda", "El lateral pasa por afuera", "Centro atrás"],
    lineas: {
      ARQ: "Vos, arquero: si vuelve, la tenés vos. No salgas de más.",
      DEF: "Vos, defensor: si sos el lateral, pasá por afuera. El otro cierra.",
      VOL: "Vos, volante: el de la banda va para adentro cuando pasa el lateral.",
      DEL: "Vos, delantero: atacá el primer palo cuando llegue el centro.",
    },
    actores: [
      { id: "lateral", linea: "def", lado: 16 },
      { id: "extremo", linea: "med", lado: 18 },
      { id: "nueve", linea: "del", lado: 50 },
    ],
    cuadros: [
      cuadro("Nos abrimos. La banda queda libre.", { actor: "extremo" }, [
        { linea: "med", ancho: 1.12 },
        { linea: "def", ancho: 1.08 },
      ]),
      cuadro("El lateral pasa por afuera. El de la banda va para adentro.", { actor: "lateral" }, [
        { linea: "def", dx: -4 },
      ], [
        { id: "lateral", dy: -16, dx: -8 },
        { id: "extremo", dx: 14, dy: -4 },
      ]),
      cuadro("Centro atrás. El 9 ataca el primer palo.", { x: 18, y: 22 }, [{ linea: "del", dy: -4 }], [
        { id: "nueve", dx: -10, dy: -4 },
      ]),
    ],
    fuentes: [COX, WILSON],
    noAplica: { f5: "En el F5 no hay banda para que el lateral pase por afuera." },
  },
  {
    id: "tercer-hombre",
    nombre: "Tercer hombre",
    momento: "con-pelota",
    cuando: "Cuando nos marcan de cerca y el pase directo no entra.",
    claves: ["El 9 baja a apoyar", "Toque de primera", "El tercero llega de frente"],
    lineas: {
      ARQ: "Vos, arquero: quedate atento si el pase se corta.",
      DEF: "Vos, defensor: sostené la salida. No suban los dos juntos.",
      VOL: "Vos, volante: tocá de primera y dejá llegar al tercero.",
      DEL: "Vos, delantero: bajá a apoyar y soltá de una.",
    },
    actores: [
      { id: "nueve", linea: "del", lado: 50 },
      { id: "volante", linea: "med", lado: 50 },
      { id: "tercero", linea: "med", lado: 74 },
    ],
    cuadros: [
      cuadro("El 9 baja a apoyar. El pase directo no entra.", { actor: "nueve" }, [{ linea: "del", dy: 6 }], [
        { id: "nueve", dy: 12 },
      ]),
      cuadro("Toque de primera. El tercero ya arrancó.", { actor: "volante" }, [], [
        { id: "volante", dy: 4 },
        { id: "tercero", dy: -12, dx: -6 },
      ]),
      cuadro("El tercero llega de frente y define la pared.", { actor: "tercero" }, [{ linea: "med", dy: -4 }], [
        { id: "tercero", dy: -8 },
        { id: "nueve", dy: -10 },
      ]),
    ],
    fuentes: [PERARNAU],
    noAplica: {},
  },
  {
    id: "presion-perdida",
    nombre: "Presión alta tras pérdida",
    momento: "perdida",
    cuando: "Cuando perdemos la pelota en campo rival y estamos cerca.",
    claves: ["El más cercano va ya", "Los de al lado tapan pases", "Si no sale, a ordenarse"],
    lineas: {
      ARQ: "Vos, arquero: si no la ganan arriba, ordená la vuelta.",
      DEF: "Vos, defensor: si estás cerca, andá ya. Si no, taponá el pase.",
      VOL: "Vos, volante: el de al lado tapa la salida. No mires.",
      DEL: "Vos, delantero: si la perdiste vos, sos el primero en ir a buscarla.",
    },
    actores: [
      { id: "cercano", linea: "del", lado: 50 },
      { id: "lado", linea: "med", lado: 22 },
      { id: "lado2", linea: "med", lado: 78 },
    ],
    cuadros: [
      cuadro("Perdimos la pelota arriba. El más cercano va enseguida.", { actor: "cercano" }, [
        { linea: "del", dy: -4 },
        { linea: "med", dy: -2 },
      ], [{ id: "cercano", dy: -4 }]),
      cuadro("Los de al lado tapan los pases. No lo dejen girar.", { actor: "cercano" }, [], [
        { id: "lado", dy: -12, dx: 10 },
        { id: "lado2", dy: -10, dx: -8 },
        { id: "cercano", dy: -2 },
      ]),
      cuadro("Si no la ganamos rápido, volvemos todos juntos a ordenarnos.", { x: 50, y: 36 }, [
        { linea: "del", dy: 16, ancho: 0.82 },
        { linea: "med", dy: 10, ancho: 0.86 },
        { linea: "def", dy: 4, ancho: 0.9 },
      ]),
    ],
    fuentes: [COX, FA, TAMARIT],
    noAplica: {},
  },
  {
    id: "repliegue",
    nombre: "Repliegue y bloque bajo",
    momento: "perdida",
    cuando: "Cuando el rival es más rápido o vamos ganando y hay que cuidar el resultado.",
    claves: ["Volver por adentro", "Cerrar el medio", "Juntos y cortos"],
    lineas: {
      ARQ: "Vos, arquero: dirigí la línea y no te quedes solo.",
      DEF: "Vos, defensor: volvé por adentro y cerrá el medio.",
      VOL: "Vos, volante: juntate con la defensa. Cortitos.",
      DEL: "Vos, delantero: volvé a ayudar. No te quedes mirando.",
    },
    actores: [{ id: "nueve", linea: "del", lado: 50 }],
    cuadros: [
      cuadro("La perdimos. El primer paso es volver por adentro.", { x: 62, y: 40 }, [
        { linea: "del", dy: 8 },
        { linea: "med", dy: 4 },
      ]),
      cuadro("Cerramos el medio. Nadie persigue a la banda solo.", { x: 50, y: 46 }, [
        { linea: "del", dy: 12, ancho: 0.84 },
        { linea: "med", dy: 8, ancho: 0.8 },
        { linea: "def", ancho: 0.88, dy: 2 },
      ]),
      cuadro("Bloque bajo, juntos y cortos. Que no filtran por adentro.", { x: 50, y: 52 }, [
        { linea: "del", dy: 18, ancho: 0.78 },
        { linea: "med", dy: 12, ancho: 0.76 },
        { linea: "def", dy: 4, ancho: 0.84 },
      ], [{ id: "nueve", dy: 6 }]),
    ],
    fuentes: [WILSON, UEFA_REPORT, TAMARIT],
    noAplica: {},
  },
  {
    id: "bloque-medio",
    nombre: "Bloque medio",
    momento: "sin-pelota",
    cuando: "Cuando queremos esperar sin regalar la espalda y salir rápido al recuperar.",
    claves: ["Esperar en el medio", "Poca distancia entre líneas", "Salta el más cercano"],
    lineas: {
      ARQ: "Vos, arquero: salí solo si el pase es claro.",
      DEF: "Vos, defensor: esperá en el medio, sin regalar la espalda.",
      VOL: "Vos, volante: poca distancia con la defensa. Salta el más cercano.",
      DEL: "Vos, delantero: taponá el pase de adelante y no persigas de más.",
    },
    actores: [
      { id: "salto", linea: "med", lado: 50 },
      { id: "nueve", linea: "del", lado: 50 },
    ],
    cuadros: [
      cuadro("Esperamos en el medio. Las líneas quedan cortas.", { x: 68, y: 38 }, [
        { linea: "del", dy: 8, ancho: 0.9 },
        { linea: "med", dy: 2, ancho: 0.92 },
        { linea: "def", dy: -4 },
      ]),
      cuadro("Salta el más cercano. El de al lado no lo acompaña de más.", { x: 64, y: 34 }, [], [
        { id: "salto", dy: -10, dx: 8 },
        { id: "nueve", dy: -4 },
      ]),
      cuadro("Si no la recupera, vuelve a la línea. Otra vez cortos.", { x: 50, y: 40 }, [
        { linea: "del", dy: 6, ancho: 0.88 },
        { linea: "med", dy: 2, ancho: 0.88 },
      ]),
    ],
    fuentes: [UEFA_PRESS, WILSON],
    noAplica: { f5: "En el F5 el bloque medio no tiene tres líneas." },
  },
  {
    id: "basculacion",
    nombre: "Basculación: todos para el lado de la pelota",
    momento: "sin-pelota",
    cuando: "Cuando el rival ataca mucho por una banda.",
    claves: ["Nos corremos juntos", "Sale uno, el de al lado cubre", "Cambio de frente: todos al otro lado"],
    lineas: {
      ARQ: "Vos, arquero: movete con el bloque, sin salir a la banda.",
      DEF: "Vos, defensor: nos corremos juntos para el lado de la pelota.",
      VOL: "Vos, volante: si sale uno, el de al lado cubre.",
      DEL: "Vos, delantero: con el cambio de frente, todos al otro lado.",
    },
    actores: [{ id: "salto", linea: "med", lado: 20 }],
    cuadros: [
      cuadro("La pelota está de un lado. Nos corremos todos juntos.", { x: 22, y: 42 }, [
        { linea: "def", dx: -10 },
        { linea: "med", dx: -10 },
        { linea: "del", dx: -8 },
        { linea: "arq", dx: -4 },
      ]),
      cuadro("Sale uno a presionar. El de al lado cubre su lugar.", { x: 18, y: 38 }, [{ linea: "med", dx: -8 }], [
        { id: "salto", dy: -10, dx: -6 },
      ]),
      cuadro("Cambio de frente: todos al otro lado, juntos.", { x: 82, y: 40 }, [
        { linea: "def", dx: 12 },
        { linea: "med", dx: 12 },
        { linea: "del", dx: 10 },
        { linea: "arq", dx: 4 },
      ]),
    ],
    fuentes: [UEFA_PRESS, WILSON],
    noAplica: { f5: "En el F5 el bloque es tan corto que no bascula por banda." },
  },
  {
    id: "contraataque",
    nombre: "Contraataque",
    momento: "recuperacion",
    cuando: "Cuando la recuperamos atrás y el rival quedó con muchos arriba.",
    claves: ["Primer pase adelante", "El 9 pica al espacio", "Llegar con tres"],
    lineas: {
      ARQ: "Vos, arquero: el primer pase es adelante, no al costado.",
      DEF: "Vos, defensor: soltá rápido y después acompañá.",
      VOL: "Vos, volante: llegá con el 9. Somos tres.",
      DEL: "Vos, delantero: picá al espacio apenas recuperamos.",
    },
    actores: [
      { id: "nueve", linea: "del", lado: 50 },
      { id: "volante", linea: "med", lado: 36 },
      { id: "segundo", linea: "med", lado: 68 },
    ],
    cuadros: [
      cuadro("La recuperamos atrás. El primer pase es adelante.", { x: 40, y: 70 }, [
        { linea: "def", dy: 2 },
        { linea: "del", dy: 4 },
      ]),
      cuadro("El 9 pica al espacio. No la pida a los pies.", { actor: "nueve" }, [], [
        { id: "nueve", dy: -12 },
        { id: "volante", dy: -8 },
      ]),
      cuadro("Llegamos con tres. El que no llega, no frena la jugada.", { x: 54, y: 24 }, [
        { linea: "med", dy: -8 },
      ], [
        { id: "segundo", dy: -12 },
        { id: "volante", dy: -6 },
      ]),
    ],
    fuentes: [COX, FA, TAMARIT],
    noAplica: {},
  },
  {
    id: "corner-favor",
    nombre: "Córner a favor: primer palo, segundo palo y borde",
    momento: "parada",
    cuando: "En cada córner a favor, para que nadie llegue al mismo lugar.",
    claves: ["Uno a cada palo", "Uno en el borde", "Dos quedan atrás"],
    lineas: {
      ARQ: "Vos, arquero: quedate en el arco. Esta pelota no es tuya.",
      DEF: "Vos, defensor: si te toca, quedás atrás. No entremos todos.",
      VOL: "Vos, volante: uno al palo y otro en el borde del área.",
      DEL: "Vos, delantero: primer palo o segundo, y atacá el centro.",
    },
    actores: [
      { id: "palo1", linea: "del", lado: 38 },
      { id: "palo2", linea: "med", lado: 66 },
      { id: "borde", linea: "med", lado: 50 },
      { id: "atras", linea: "def", lado: 22 },
    ],
    cuadros: [
      cuadro("Córner a favor. Uno a cada palo, uno en el borde, dos atrás.", { x: 8, y: 8 }, [
        { linea: "def", dy: 4, ancho: 0.9 },
      ], [
        { id: "palo1", dx: -8, dy: -8 },
        { id: "palo2", dx: 8, dy: -6 },
        { id: "borde", dy: -2 },
        { id: "atras", dy: 6 },
      ]),
      cuadro("El centro va al primer palo. El del borde espera el rechazo.", { x: 36, y: 16 }, [], [
        { id: "palo1", dy: -4 },
        { id: "borde", dy: -4 },
      ]),
      cuadro("Si no entra, el del borde es la segunda. Los de atrás no suben.", { x: 50, y: 22 }, [], [
        { id: "borde", dy: -6 },
        { id: "atras", dy: 4 },
      ]),
    ],
    fuentes: [UEFA_REPORT, FIFA],
    noAplica: {},
  },
  {
    id: "corner-contra",
    nombre: "Córner en contra: palos, zona y uno arriba",
    momento: "parada",
    cuando: "En cada córner en contra.",
    claves: ["Uno en cada palo", "Zona en el área chica", "Uno queda arriba"],
    lineas: {
      ARQ: "Vos, arquero: mandá los palos y quedate con el que cierra.",
      DEF: "Vos, defensor: uno en cada palo y el resto en zona.",
      VOL: "Vos, volante: ocupá la zona del área chica. No persigas marcas.",
      DEL: "Vos, delantero: uno queda arriba para salir.",
    },
    actores: [
      { id: "arriba", linea: "del", lado: 50 },
      { id: "zona", linea: "med", lado: 50 },
      { id: "palo", linea: "def", lado: 36 },
    ],
    cuadros: [
      cuadro("Córner en contra: uno en cada palo, el resto en zona. Uno queda arriba.", { x: 92, y: 8 }, [
        { linea: "def", dy: -6, ancho: 0.82 },
        { linea: "med", dy: 8, ancho: 0.78 },
        { linea: "arq", dy: -2 },
      ], [{ id: "arriba", dy: -8, dx: 8 }]),
      cuadro("El centro entra. La zona no sale a marcar afuera.", { x: 58, y: 18 }, [], [
        { id: "zona", dy: 6 },
        { id: "palo", dx: -4, dy: 2 },
      ]),
      cuadro("Si la ganamos, el que quedó arriba ya puede salir.", { actor: "arriba" }, [], [
        { id: "arriba", dy: -6 },
      ]),
    ],
    fuentes: [FIFA, UEFA_REPORT],
    noAplica: {},
  },
];

export function modeloPorId(id: string): Modelo | undefined {
  return MODELOS.find((item) => item.id === id);
}

export function aplicaEn(modelo: Modelo, modalidad: Modality): boolean {
  return !modelo.noAplica[modalidad];
}

export function semanaIso(fecha: Date): number {
  const copia = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = copia.getUTCDay() || 7;
  copia.setUTCDate(copia.getUTCDate() + 4 - dia);
  const enero = new Date(Date.UTC(copia.getUTCFullYear(), 0, 1));
  return Math.ceil(((copia.getTime() - enero.getTime()) / 86_400_000 + 1) / 7);
}

export function modeloDeLaSemana(fecha = new Date()): Modelo {
  const n = Math.max(1, semanaIso(fecha));
  return MODELOS[(n - 1) % MODELOS.length] ?? MODELOS[0];
}

export function textoDeRol(modelo: Modelo, linea: LineaBloque): string {
  if (linea === "arq") return modelo.lineas.ARQ;
  if (linea === "def") return modelo.lineas.DEF;
  if (linea === "med") return modelo.lineas.VOL;
  return modelo.lineas.DEL;
}
