# Mi Vestuario · Cards de premios (estilo FUT) — SPEC para implementar

> Es un entregable de diseño. No se tocó código de la app. Las reglas usan los campos reales de `src/lib/fija/types.ts`. Si algo no existe en la app, está marcado **⚠️ FALTA DATO**.

## 0. Archivos

| Ruta | Qué es |
|---|---|
| `png/01…09-*.png` | Una card por tipo, 720×1000, fondo transparente, con datos de ejemplo |
| `png/story-figura-del-partido.png`, `png/story-goleador-del-mes.png` | Stories 1080×1920 para Instagram |
| `png/00-todas.png` | Hoja de contacto con todo |
| `html/cards.css` | Tokens, tiers y layout (fuente de verdad visual) |
| `html/0X-*.html`, `html/story-*.html` | Templates con `{{PLACEHOLDERS}}` |
| `html/ejemplos/*.html` | Los mismos templates ya llenos (los que generaron los PNG) |
| `_tools/build.py` | Script que arma templates, ejemplos y PNG (Chrome headless) |
| `avatar/avatar.js` | **Nuevo.** Dibujo del avatar (fuente de verdad, sin dependencias, Node y navegador). Ver §9 |
| `avatar/svg/parts/<capa>/<opción>.svg` | **Nuevo.** Las 52 partes del avatar sueltas, con colores por variables CSS |
| `avatar/catalog.json` | **Nuevo.** Opciones, orden de capas y fórmulas de colores derivados |
| `avatar/html/` | **Nuevo.** Pantallas, hojas, `cards-avatar.css` (estados foto / avatar / iniciales) y `probador.html` |
| `avatar/build.py` | **Nuevo.** Arma partes, HTML y PNG del avatar. `--todo` rearma también lo de arriba |
| `png/avatar/` | **Nuevo.** 01 ejemplos · 02 opciones · 03 capas · 04 pantallas · 05 cards foto/avatar/iniciales · 06 recorte de foto · `cards/` · `pantallas/` |

**Ya existe en la app:** `src/lib/fija/tarjeta.ts` (card en canvas 1080×1350, `dibujarTarjeta`, hoy sin uso en rutas) y `src/lib/fija/stories.ts` (story en canvas 1080×1920). **Recomendación:** implementar estas cards con Canvas 2D en un archivo nuevo (ej. `src/lib/fija/premios.ts` + `premios-dibujo.ts`), copiando las coordenadas de `cards.css`. Así no se suman dependencias. Reusar de `tarjeta.ts`: `nombreEnTarjeta`, `fotoEnTarjeta`, `puestoEnTarjeta`, `recortar`, `cubrir`, `cargar`, `logo`, `enviar`. Alternativa: componente React + `html-to-image` (dependencia nueva, solo si se prefiere HTML).

---

## 1. Datos comunes a todas las cards

| Placeholder | De dónde sale |
|---|---|
| `NOMBRE` | `nombreEnTarjeta(member)`: `nick` → `name` → "Jugador". Se muestra en MAYÚSCULAS |
| `INICIALES` | `initials(member.name \|\| member.nick)` de `format.ts` (2 letras) |
| `EQUIPO` | `club.name` |
| `EQUIPO_INICIALES` | `initials(club.name)` |
| `ESCUDO_SRC` / `TIENE_ESCUDO` | `club.crest` (data URL 256×256). `"si"` si empieza con `data:image/`, si no `"no"` |
| `FOTO_SRC` / `TIENE_FOTO` | Sale de `imagenDe(member)` (§9.2): `TIENE_FOTO` = `"si"` (foto), `"avatar"` o `"no"` (iniciales). `FOTO_SRC` = data URL de la foto o del SVG del avatar. **No** usar la foto del equipo como reemplazo en los premios |
| `PUESTO` | Cards de partido: `puestoEnTarjeta(event, memberId)` (ARQ, DEF, VOL, DEL, ALA, PIV, SUP). Cards del mes: el puesto que más se repite en las formaciones del mes. DT: `"DT"`. Si no hay, se oculta |
| `DORSAL` | `member.number != null ? "#"+number : ocultar` |
| `RIVAL` | `sheet.opponent` (si está vacío, `event.title`) |
| `FECHA` | `event.startsAt` en `dd/mm/aaaa`, zona `America/Argentina/Buenos_Aires` |
| `RESULTADO` | `${sheet.goalsFor}-${sheet.goalsAgainst}` |
| `MES` / `ANIO` | Mes con mayúscula inicial ("Septiembre") y año, en zona Buenos Aires |
| `STAT` | El número grande. Siempre una estadística real del premio, **nunca un rating inventado** |

**Partido válido para premios:** `event.kind === "partido"`, no está en `droppedEventIds`, tiene `MatchSheet` y `event.resultPending !== true`.

**Mes:** usar el mismo criterio que `mesDe()` de `figura.ts` (`event.startsAt` en zona BA, formato `YYYY-MM`). Los premios del mes se entregan con el mes cerrado: se calculan el día 1 para el mes anterior y quedan fijos. Durante el mes, como mucho se muestra "va ganando…", sin card.

**Empates:** reciben card todos los empatados (`figuraDe` y `goleadorDelMes` ya devuelven `ids[]`).

**Cálculo:** todo sale de datos que ya existen y se calcula en el cliente. No hace falta guardar nada. Como opción, guardar en localStorage `premiosVistos` para mostrar la marca "Nuevo".

**Menores (`member.menor`):** no hay foto (la app ya no la pide ni la guarda) y el nombre es el apodo o "Jugador". **Regla:** sus cards se ven solo dentro de la app, sin botón de compartir ni story. Sí pueden usar avatar (§9).

---

## 2. Cards

| # | Card | Tier / acabado | STAT (número grande) |
|---|---|---|---|
| 1 | Figura del partido | **Neón** (lima sobre verde) | votos |
| 2 | Goleador/a del mes | **Oro** | goles del mes |
| 3 | Asistidor/a del mes | **Esmeralda** | asistencias del mes |
| 4 | Valla invicta | **Hielo** (celeste) | 0 goles en contra |
| 5 | Presente siempre | **Plata** | partidos con Voy |
| 6 | Hat-trick | **Fuego** | goles en el partido |
| 7 | Debut | **Bronce** | "1°" |
| 8 | Capitán/a (opcional) | **Cancha** (verde césped + brazalete C) | PJ |
| 9 | DT del mes | **Pizarra** (oscura especial, foil lima) | partidos ganados |

### 1 · Figura del partido — `01-figura-del-partido.html`
- **Cuándo:** `figuraDe(figuraVotes, event.id)` devuelve ganador/es en un partido válido.
- ⚠️ **FALTA DATO (cierre de votación):** la votación no tiene cierre. **Propuesta:** la card queda fija 48 h después de `event.startsAt` (o de `resultClosedAt` si existe) y pide mínimo 2 votos. Antes de eso: "Votación abierta".
- **Muestra:** título `FIGURA DEL PARTIDO` · `vs. {{RIVAL}} · {{FECHA}}` · STAT = `votos` (label "VOTOS") · Goles / Asist. de la fila de `sheet.players` del jugador (0 si no tiene fila) · Result.
- **Story:** sí (`story-figura-del-partido.html`). Frase "`{{NOMBRE}}`, figura". Sub "`{{EQUIPO}} {{RESULTADO}} {{RIVAL}}`".

### 2 · Goleador/a del mes — `02-goleador-del-mes.html`
- **Cuándo:** `goleadorDelMes(sheets, events, fechaDelMes)` (ya existe; pide ≥1 gol). Si hay empate, card para cada uno.
- **Muestra:** `{{TITULO}}` (ver §3) · `{{MES}} {{ANIO}}` · STAT = goles · PJ = planillas del mes donde aparece en `sheet.players` · Prom. = goles/PJ con 1 decimal y coma ("1,5") · Asist. del mes.
- ⚠️ El PJ es aproximado: `sheet.players` solo guarda titulares y a quien tuvo alguna estadística (los suplentes sin goles no quedan). Se puede sumar `event.suplentes` para mejorarlo.
- **Story:** sí. Frase "`{{NOMBRE}}`, `{{TITULO_CORTO}}`" (ej. "Flor, goleadora del mes"). Sub "`{{STAT}}` goles en `{{MES_MIN}}`".

### 3 · Asistidor/a del mes — `03-asistidor-del-mes.html`
- **Cuándo:** igual que el goleador, pero sumando `assists`. Hace falta una función nueva `asistidorDelMes()`, copia de `goleadorDelMes` con `row.assists`. Pide ≥1 asistencia.
- **Muestra:** `{{TITULO}}` · mes · STAT = asistencias · PJ · Prom. · Goles.

### 4 · Valla invicta — `04-valla-invicta.html`
- **Cuándo:** partido válido con `sheet.goalsAgainst === 0`. El arquero es `event.lineup["ARQ"]`: las 15 formaciones de `formations.ts` tienen el slot `ARQ`. Sin formación cargada, no hay card.
- ⚠️ **FALTA DATO (parcial):** la formación es la de antes del partido. No hay cambios ni rotación de arquero (en F5 es común). **Propuesta opcional:** `MatchSheet.arqueroId?: string`, que el DT corrige en la planilla. Si existe, manda sobre `lineup.ARQ`.
- **Muestra:** `VALLA INVICTA` · `vs. {{RIVAL}} · {{FECHA}}` · STAT = `0` ("GOLES EN CONTRA") · Result. · Vallas = partidos con valla invicta de ese jugador en el mismo `tournamentId` (si no hay torneo, en el año) · PJ arco = planillas donde fue `lineup.ARQ`.

### 5 · Presente siempre — `05-presente-siempre.html`
- **Cuándo:** se toman los partidos válidos del mes ya jugados (`startsAt < ahora`) donde la persona estaba convocada (`event.convocados` incluye su id; si no hay `convocados`, todos los que tienen `juega`). Si son **≥3** (propuesta) y en todos tiene `Rsvp.status === "voy"`, gana la card.
- ⚠️ "Voy" no es lo mismo que asistencia real: la app no guarda quién fue. Para controlar, se puede pedir que también figure en la formación, en `suplentes` o en `sheet.players`.
- **Muestra:** `PRESENTE SIEMPRE` · mes · STAT = cantidad de partidos, label "DE {{PARTIDOS_MES}}" · Voy `x/x` · Jugados · Racha = partidos seguidos con Voy hasta fin de mes (histórico). Decoración: un ✓ por partido (máx. 8).

### 6 · Hat-trick — `06-hat-trick.html`
- **Cuándo:** en un partido válido, la fila de `sheet.players` tiene `goals >= 3`.
- **Muestra:** `HAT-TRICK` · `vs. {{RIVAL}} · {{FECHA}}` · STAT = goles · Result. · Asist. · Goles año (goles del año calendario). Decoración: una pelota por gol (máx. 5).
- Opcional: título `PÓKER` con 4 goles y `MANITA` con 5 o más (mismo tier).

### 7 · Debut — `07-debut.html`
- **Cuándo:** el primer partido válido (ordenado por `startsAt`) donde la persona aparece en `sheet.players` o en `event.suplentes`. **Solo si** el equipo ya tenía al menos 1 partido válido antes. Si no, todo el plantel "debutaría" en el primer partido cargado.
- ⚠️ **FALTA DATO (parcial):** `Member` no tiene fecha de alta. Se puede usar `Invite.createdAt` del jugador como referencia, o agregar `Member.joinedAt`.
- **Muestra:** `DEBUT` · `vs. {{RIVAL}} · {{FECHA}}` · STAT = `1°`, label "PARTIDO" · Result. · Goles · Asist. Etiqueta "PRIMER PARTIDO".

### 8 · Capitán/a — `08-capitan.html` (OPCIONAL)
- ⚠️ **FALTA DATO:** la app no guarda capitanía (los roles son `dt | ayudante | jugador`). **Propuesta:** `Club.capitanId?: string | null` + `capitanAt` (gana la copia más nueva, como en `profileAt`). Lo asigna el DT desde `equipo.tsx`. Si se quiere por partido: `ClubEvent.capitanId`.
- **Cuándo (con el dato):** cuando el DT asigna la capitanía. La card dura mientras la tenga.
- **Muestra:** `{{TITULO}}` (CAPITANA / CAPITÁN / CAPITANÍA) · `{{TORNEO}}` (`Tournament.name` activo; si no hay, el nombre del equipo) · STAT = PJ en el torneo · Goles · Asist. · Ganados (planillas donde jugó y `goalsFor > goalsAgainst`). Brazalete "C" lima.

### 9 · DT del mes — `09-dt-del-mes.html`
- **Cuándo:** el `Member` con `role === "dt"`. Récord del mes = `teamRecord(planillasDelMes)`. **Propuesta:** se entrega si `played >= 2` y además `won/played >= 0,5` o el equipo no perdió (`lost === 0`). El ayudante no entra (se podría hacer después una card "Cuerpo técnico").
- **Muestra:** `DT DEL MES` (neutro) · mes · STAT = ganados · PJ · E / P · Goles `gf-ga`. Sin dorsal; puesto "DT".

---

## 3. Títulos con género

⚠️ **FALTA DATO:** `Member` no tiene género ni forma de trato. **No adivinar por el nombre.**

**Propuesta:** un campo nuevo en el perfil, elegido por cada persona: `Member.trato?: "femenino" | "masculino" | "neutro"`. La pregunta: *"¿Cómo querés que te nombremos en los premios?"* con las opciones Goleadora / Goleador / Neutro. El DT puede completarlo solo para jugadores sin cuenta (`accountId` vacío). Se sincroniza con `profileAt`. **Si no está cargado, se usa el neutro.**

| Card | femenino | masculino | neutro (default) |
|---|---|---|---|
| Goleador/a | GOLEADORA DEL MES | GOLEADOR DEL MES | MÁS GOLES DEL MES |
| Asistidor/a | ASISTIDORA DEL MES | ASISTIDOR DEL MES | MÁS ASISTENCIAS DEL MES |
| Capitán/a | CAPITANA | CAPITÁN | CAPITANÍA |
| Story goleador (`TITULO_CORTO`) | goleadora del mes | goleador del mes | más goles del mes |
| Figura, DT, Valla invicta, Hat-trick, Debut, Presente siempre | — | — | ya son neutros |

---

## 4. Reglas de respaldo

- **Imagen de la persona:** foto → avatar → iniciales (§9.2). Con avatar: `data-foto="avatar"` (estilos en `avatar/html/cards-avatar.css`). Sin foto ni avatar: `data-foto="no"`, silueta (cabeza + hombros) en el color del tier, con las INICIALES grandes sobre el pecho (136px).
- **Sin escudo:** escudo con `EQUIPO_INICIALES` (34px).
- **Nombre largo:** empieza en 96px y baja de a 2px hasta 56px. Si igual no entra, va "…". Entran 14 caracteres anchos ("WWWWWWWWWWWWWW") en 56px; nombres comunes de 14 ("MATI ECHEVERRY") entran achicándose apenas. Antes de esto, `nombreEnTarjeta` corta en 24.
- **Número grande:** 168px. Si tiene más de 2 caracteres, baja hasta 96px.
- **Título de la cinta:** 38px; baja hasta 26px si hace falta (caso "MÁS ASISTENCIAS DEL MES").
- **Contexto (rival/mes) y equipo:** una sola línea, con "…".
- **Sin dorsal / sin puesto:** se oculta la línea (no mostrar "–").
- En canvas, `recortar()` de `tarjeta.ts` ya hace el "…". Para achicar, medir con `measureText` en un loop, igual que el script `[data-fit]` de los templates.

## 5. Tokens

**Fuentes:** Barlow Condensed 700/800 (números, nombres, títulos) y Figtree 600/700 (contexto, equipo, labels). Ya se cargan en `__root.tsx`. En canvas, esperar `document.fonts.ready` (como hace `tarjeta.ts`).

**Marca:** void `#061109` · bg `#0b1c12` · surface `#132a1c` · fg `#eef6ef` · muted `#9bb5a4` · accent `#b8f25a` · accent-fg `#0c1a10`.

**Tiers** (todos en `cards.css`, `.tier-*`):

| Tier | Marco (degradé metálico) | Fondo (arriba→abajo) | Texto / número | Cinta (fondo / texto) |
|---|---|---|---|---|
| neon | `#f6ffd9 → #b8f25a → #6aa824` | `#24603a → #0f2c1b → #061109` | `#eef6ef` / `#b8f25a` | `#b8f25a` / `#0c1a10` |
| oro | `#fff7d1 → #d8a93a → #8a6115` | `#fbedb4 → #e6c463 → #b98a2b` | `#0b1c12` / `#0b1c12` | `#0b1c12` / `#f6d97b` |
| esmeralda | `#d9fff3 → #4fd1a5 → #127256` | `#13614c → #0a3328 → #041610` | `#eafff7` / `#6ff0c2` | `#5ee0b3` / `#03140e` |
| hielo | `#eefaff → #8fd3f0 → #2f7896` | `#1b4f5e → #0c2a33 → #051318` | `#eef9ff` / `#9fe3ff` | `#9fe3ff` / `#06202a` |
| plata | `#ffffff → #b6c2bb → #5d6b63` | `#f4f7f5 → #cfd8d3 → #97a59d` | `#0b1c12` / `#0b1c12` | `#0b1c12` / `#e9efeb` |
| fuego | `#fff0c4 → #ff9a3d → #a8320f` | `#5a2410 → #2a0f07 → #120604` | `#fff4ea` / `#ffb547` | `#ff9a3d` / `#1d0a03` |
| bronce | `#ffe6cc → #c98a55 → #6e3e1c` | `#f1c9a1 → #cf9561 → #94582c` | `#1e1008` / `#1e1008` | `#2a170b` / `#f6cfa6` |
| cancha | `#f4f6e6 → #e8ead8 → #8d9c86` | `#1fa552 → #147a3a → #0a4a22` + franjas de césped | `#ffffff` / `#ffffff` | `#e8ead8` / `#0b3a1c` |
| pizarra | `#b8f25a → #3a5c46 → #0b1c12` (foil) | `#16251c → #0a120d → #030604` + jugada en tiza | `#eef6ef` / `#b8f25a` | `#b8f25a` / `#0c1a10` |

**Efectos:** un brillo radial (`--glow`) detrás de la foto, rayas diagonales sutiles cada 40px a 118°, un brillo diagonal (`screen`, 22% blanco), una línea interior (`--trim`, 2px).

## 6. Layout de la card (720×1000; exportar en canvas 1440×2000 con `ctx.scale(2,2)`)

| Elemento | Posición (px) |
|---|---|
| Silueta exterior / interior / línea | paths en `cards.css` (`.frame`, `.body`) y `TRIM` en `build.py`. Muesca arriba al centro, punta abajo |
| Columna izquierda | x 44, ancho 160, centrada. Número grande arriba (y≈58), label, puesto 50px, dorsal 30px, separador, escudo 84×96 (termina ≈ y 470). Pelotas o ✓ en y 494 |
| Foto | x 196, y 38, 500×560. `cover`, foco 50% 20%, se funde abajo (máscara 72%→100%) |
| Cinta del título | y 566, alto 60, x 40–680, trapecio. Texto 38px, espaciado .09em |
| Contexto | y 636, 24px Figtree 600 |
| Nombre | y 670, alto 100, 96px Barlow 800 (achica hasta 56) |
| Equipo | y 774, 20px Figtree 700, espaciado .16em, mayúsculas |
| Stats | y 812, x 92–628, línea arriba. 3 columnas: valor 42px, label 15px |
| Marca | y 906 centrada: logo 30px + "MI VESTUARIO" 17px |

**Story 1080×1920:** fondo verde con brillo del tier y líneas de cancha. Header con logo en y 210. Kicker (equipo · fecha) en y 284. Card escalada ×1,15 en (126, 350) → hasta y≈1500. Frase 76px en y 1534 (achica hasta 48). Sub 36px en y 1628. URL `mivestuario.com.ar` lima en y 1712. Arriba (<200px) y abajo (>1760px) no hay info clave, por la interfaz de IG.

## 7. Dónde mostrarlas

1. **Estadísticas (`stats.tsx`):** las cajas "Figura del partido" y "Goleador del mes" ya existen. Al tocarlas se abre la card. Sumar las cajas Asistidor/a y DT del mes.
2. **Partido / fecha (`partido.tsx`, `FiguraPartido`):** cuando cierra la votación, card de la figura. En el mismo partido, también Hat-trick, Valla invicta y Debut.
3. **Perfil del jugador (plantel en `equipo.tsx`):** "Vitrina" con las cards ganadas en mini (180×250, escala 0,25), de la más nueva a la más vieja.
4. **Aviso al equipo:** opcional, un `InboxItem` nuevo de tipo `"premio"` (hay que sumarlo a `InboxKind`) o un mensaje automático en la charla. Opcional también: push "¡Sos la figura vs. X!".
5. **Botón Compartir** (en la card abierta): menú *Story (1080×1920)* / *Card (1440×2000)*. Se usa `enviar()` de `tarjeta.ts` (`navigator.share` con archivo, o descarga). Texto sugerido:
   - Figura: `"{NOMBRE} fue la figura vs. {RIVAL} ({RESULTADO}). Mi Vestuario"`
   - Goleador/a: `"{NOMBRE}, {titulo corto}: {N} goles en {mes}."`
   - Archivo: `mi-vestuario-{tipo}-{nick}.png`

## 8. Resumen de lo que falta en los datos

| Tema | Estado | Propuesta |
|---|---|---|
| Género / trato para los títulos | ❌ no existe | `Member.trato`, elegido por cada persona; neutro por defecto |
| Capitán/a | ❌ no existe | `Club.capitanId` (+`capitanAt`) o `ClubEvent.capitanId` |
| Cierre de la votación de figura | ❌ no existe | queda fija a las 48 h y pide ≥2 votos |
| Arquero real del partido | ⚠️ solo `lineup.ARQ` previo | opcional `MatchSheet.arqueroId` |
| Asistencia real (Presente siempre) | ⚠️ solo `Rsvp` "voy" | cruzar con formación, suplentes o planilla |
| Fecha de alta (Debut) | ⚠️ no existe | `Invite.createdAt` o `Member.joinedAt` |
| PJ exacto | ⚠️ los suplentes sin estadísticas no quedan en `sheet.players` | sumar `event.suplentes` |
| Puesto fijo del jugador | ⚠️ solo existe por partido (slot de la formación) | el que más se repite en el período |
| Avatar | ❌ no existe | `Member.avatar` (JSON chico, §9.3) |
| Colores del equipo | ❌ no existe (`Club` solo tiene `crest`) | `Club.colores = { primary, secondary }`, lo elige el DT |
| Foto con calidad de card | ⚠️ hoy 128×128 (se ve pixelada en una card de 1440 px) | 512×512 guardada aparte del equipo (§9.6) |

---

## 9. Foto, avatar e iniciales (nuevo)

> Aprobado: la card muestra la imagen de la persona con este orden: **1) foto** si la subió · **2) avatar** que arma en la app (estilo FIFA) · **3) iniciales**. **No hay avatares generados con IA ni a partir de fotos.** Piezas: `png/avatar/` y fuentes en `avatar/`.

> En Drive: carpeta **Avatares** (https://drive.google.com/drive/folders/1c193PWIIaM466V-B7eVH-YmUMV2Tiy3D) — hojas 01–06 sueltas, subcarpetas *Cards (foto - avatar - iniciales)* y *Pantallas 390x844*.

### 9.1 Qué hay hoy en la app (leído del código, sin tocarlo)

- **Subir foto de perfil ya existe.** `routes/equipo.tsx` usa `CrestPicker` con "Elegir mi foto" y "Quitar foto". `readCrestFile` (`lib/fija/crest.ts`) la recorta **cuadrada 128×128**, JPEG calidad 0,7, máximo 30.000 caracteres (data URL). Sirve para DT, ayudante y jugador.
- **Dónde se guarda:** `Member.photo` (`types.ts`), dentro de los datos del equipo que se sincronizan (`cloud.ts` descarta fotos de más de 40.000 caracteres). Además se copia por cuenta en la colección `retratos` (`savePortrait` / `loadPortrait`), y `applySharedPhoto` la reusa si la persona entra a otro equipo. No hay bucket de archivos: todo es data URL en `vestuario_docs` (jsonb). Límite total del equipo: `MAX_BYTES = 350.000`.
- **Menores:** no se pide foto ("No pedimos foto si sos menor de 18."). `setMyPhoto` no hace nada, `guardMember` borra la foto y `savePortrait` borra el retrato en el servidor.
- **Dónde se ve:** `PlayerAvatar` (`stat-blocks.tsx`, en plantel y estadísticas; si no hay foto, iniciales), la cancha (`pitch.tsx`) y `tarjeta.ts` (`fotoEnTarjeta`: foto propia → foto del equipo → silueta).
- **Google:** al entrar con Google llega `user.image` (`profileImageUrl`). Solo se usa en `gates.tsx`, no como foto del jugador. Mantenerlo así: no importar esa foto sin que la persona la elija.
- **No existe:** avatar, colores del equipo (`Club` solo tiene `crest`), foto con tamaño suficiente para una card.

### 9.2 Regla única: qué imagen va

```ts
type Imagen =
  | { tipo: "foto"; src: string }
  | { tipo: "avatar"; avatar: Avatar }
  | { tipo: "iniciales"; texto: string };

export function imagenDe(member: Member): Imagen {
  if (!member.menor && member.photo?.startsWith("data:image/")) return { tipo: "foto", src: member.photo };
  if (member.avatar) return { tipo: "avatar", avatar: normalizarAvatar(member.avatar) };
  return { tipo: "iniciales", texto: initials(member.name || member.nick) };
}
```

- La misma regla en todos lados: plantel (`PlayerAvatar`), cancha, cards de premios, `tarjeta.ts` y stories.
- En los premios **no** se usa la foto del equipo (`fotoEquipo`) como reemplazo.
- Si la persona tiene foto **y** avatar, va la foto. Al tocar "Quitar foto", aparece el avatar sin hacer nada más.
- Templates: `TIENE_FOTO` = `"si"` | `"avatar"` | `"no"` y `FOTO_SRC` = data URL de la foto o del SVG del avatar.

### 9.3 Avatar: datos

```ts
export type Avatar = {
  v: 1;
  skin: "t1" | "t2" | "t3" | "t4" | "t5" | "t6" | "t7" | "t8";
  hair: "pelado" | "rapado" | "corto" | "medio" | "largo" | "colita" | "rodete"
      | "trenzas" | "rulos" | "afro" | "melena" | "rastas";
  hairColor: "negro" | "castano-oscuro" | "castano" | "rubio" | "colorado" | "canoso";
  facial: "ninguno" | "barba-corta" | "barba" | "bigote" | "candado";
  extras: ("vincha" | "anteojos")[];
  shirtPattern: "lisa" | "bastones" | "banda" | "franja" | "mitades";
  collar: "redondo" | "v" | "polo" | "campera";
};
// Member.avatar?: Avatar | null         → se guarda con profileAt (gana la copia más nueva)
// Club.colores?: { primary: string; secondary: string } | null   → lo elige el DT
```

Ejemplo: `{"v":1,"skin":"t4","hair":"colita","hairColor":"castano-oscuro","facial":"ninguno","extras":[],"shirtPattern":"lisa","collar":"redondo"}` (~150 bytes).

- **Los colores no se guardan en el avatar:** la camiseta y la vincha salen de `Club.colores`. Si el equipo no tiene colores: verde `#1f6f3f` + lima `#b8f25a`. Si la persona juega en dos equipos, la camiseta cambia sola.
- **Dónde:** en `Member` (viaja con el equipo, como `nick`) y una copia por cuenta en `retratos` (campo `avatar`) para reusarlo en otros equipos, igual que `applySharedPhoto`.
- **Validar:** cualquier valor desconocido vuelve al default (`normalize()` en `avatar.js`). `v` permite cambiar el formato más adelante.
- **Default** la primera vez: `t3`, `corto`, `castano-oscuro`, sin barba, sin extras, `lisa`, `redondo`. DT y ayudante arrancan con `collar: "campera"`.
- **"Al azar"** cambia piel, pelo, color, barba y extras. Nunca la camiseta.
- **Menores pueden tener avatar** (no es una foto ni un dato de la cara real).

| Opción | Valores (etiqueta en la app) |
|---|---|
| Piel (8) | t1 `#f7dcc8` · t2 `#efc4a3` · t3 `#e0aa83` · t4 `#c98d63` · t5 `#ad7148` · t6 `#8d5636` · t7 `#6e3f26` · t8 `#4b2a1a`. En la app solo muestras de color (sin nombres) |
| Pelo (12) | Pelado · Rapado · Corto · Medio · Largo · Colita · Rodete · Trenzas · Rulos · Afro · Melena · Rastas. Ninguno es "de mujer" o "de varón" |
| Color de pelo (6) | Negro `#1d1715` · Castaño oscuro `#3b2519` · Castaño `#70462b` · Rubio `#d4a95c` · Colorado `#b0502b` · Canoso `#bcb7af` |
| Barba y bigote (5) | Nada · Barba de días · Barba · Bigote · Candado |
| Extras (combinables) | Vincha (color secundario del equipo) · Anteojos |
| Camiseta: diseño (5) | Lisa · Bastones · Banda · Franja · Mitades (primario + secundario) |
| Camiseta: cuello (4) | Redondo · En V · Polo · Campera (para DT y ayudantes) |

Total: 460.800 combinaciones, sin contar colores de equipo. Hoja: `png/avatar/02-opciones.png`. Ejemplos (6 mujeres, 6 varones, jugadoras/es y DT): `png/avatar/01-avatares-ejemplo.png`.

### 9.4 Capas SVG

Lienzo único de 0 a 400; se muestra el cuadrado `viewBox="20 24 360 360"`. Todas las partes usan ese lienzo, así que se apilan sin mover nada. Orden (de atrás hacia adelante):

| # | Capa | Archivos en `avatar/svg/parts/` | Notas |
|---|---|---|---|
| 0 | fondo | — | Solo en círculos de la app: `mix(secondary, #0b1c12, .74)`. En cards, transparente |
| 1 | pelo-atras | `pelo-atras/<hair>.svg` (9; pelado, rapado y corto no tienen) | Lo que cae detrás de la cabeza y los hombros |
| 2 | cuello | `cuello/cuello.svg` | Cuello + sombra bajo el mentón |
| 3 | camiseta | `camiseta/<diseño>-<cuello>.svg` (20) | Cuerpo + diseño recortado con la forma del cuello + terminación |
| 4 | cabeza | `cabeza/cabeza.svg` | Orejas, cara y sombra lateral |
| 5 | cara | `cara/cara.svg` | Ojos, cejas (color del pelo), nariz, cachetes |
| 6 | barba | `barba/<facial>.svg` (4) | |
| 7 | boca | `boca/boca.svg`, `boca/boca-con-barba.svg` | Va sobre la barba |
| 8 | pelo-adelante | `pelo-adelante/<hair>.svg` (12) | Flequillo, mechones, trenzas |
| 9 | vincha | `vincha/vincha.svg` | |
| 10 | anteojos | `anteojos/anteojos.svg` | |

**Colores:** las partes usan variables CSS con valor por defecto (`fill="var(--mv-skin, #e0aa83)"`). Base: `--mv-skin`, `--mv-hair`, `--mv-primary`, `--mv-secondary`. Derivadas (`mix(a,b,t)` = a + (b−a)·t por canal; "claro" = luminancia del pelo > 0,45):

| Variable | Fórmula |
|---|---|
| `--mv-skin-shade` / `--mv-skin-deep` | `mix(skin, #3b1a0e, .20)` / `.34` |
| `--mv-lip` / `--mv-mouth` | `mix(skin, #5c1f1c, .42 si la piel es clara, si no .50)` / `mix(skin, #2a0c0a, .62)` |
| `--mv-hair-dark` / `--mv-hair-light` | `mix(hair, #000, claro ? .20 : .28)` / `mix(hair, #fff, claro ? .28 : .16)` |
| `--mv-brow` | `claro ? mix(hair, #2a1a10, .38) : mix(hair, #000, .10)` |
| `--mv-stubble` / `--mv-buzz` | `mix(skin, hair, claro ? .30 : .24)` / `mix(skin, hair, .72)` |
| `--mv-primary-dark` / `--mv-secondary-dark` / `--mv-band` | `mix(primary, #000, .24)` / `mix(secondary, #000, .20)` / `secondary` |

Todo esto está en `avatar/catalog.json`. Hoja visual: `png/avatar/03-capas.png` (armada con los archivos sueltos, así que prueba que encajan).

### 9.5 Cómo dibujarlo en la app (recomendación)

- **Portar `avatar/avatar.js` a `src/lib/fija/avatar.ts`**: una función pura `avatarSvg(avatar, colores, { uid, fondo? }): string`, sin dependencias (~400 líneas, solo arma texto SVG). Es el mismo enfoque de `tarjeta.ts` y `stories.ts`: todo en el cliente, sin servidor y sin librerías nuevas. Las partes sueltas quedan como referencia (o para quien prefiera componer por archivos).
- **En la UI** (`PlayerAvatar`, cancha, perfil): `<img src={"data:image/svg+xml;utf8," + encodeURIComponent(svg)}>`. Con `img` los `id` de los `clipPath` no chocan entre avatares; si se mete el SVG inline, pasar un `uid` distinto por persona.
- **En canvas** (cards de premios, `tarjeta.ts`, `stories.ts`): `cargar(dataUrlDelSvg)` (ya existe en `tarjeta.ts`) y `ctx.drawImage`. Exportar a 2× como el resto. El avatar no tiene texto, así que no depende de las fuentes.
- **Posición en la card (720×1000):** caja de 480×480 en (206, 82), es decir `.foto` + (10, 44). Fundido abajo del 82% al 100% y sombra suave. En canvas: dibujar el avatar en un canvas aparte, aplicar un `createLinearGradient` con `globalCompositeOperation = "destination-in"` y pegarlo.
- **Rendimiento:** el SVG pesa ~3–7 KB y se arma en <1 ms; se puede memoizar por `JSON.stringify(avatar) + colores`.
- `tarjeta.ts` hoy pasa de la foto directo a `silueta()`: con la regla nueva, `retrato()` recibe la `Imagen` y dibuja el avatar en el medio.

### 9.6 Foto: reglas de subida

| Tema | Regla |
|---|---|
| Formato | Siempre **cuadrada**. Se recorta en el celular (mover y zoom, guía circular para la cara) y se comprime en canvas como hoy (`readCrestFile`). Respetar la rotación EXIF |
| Tamaño mínimo | 400 px del lado corto de la original. Si no: "Esa foto es muy chica. Probá con otra." |
| Tamaño guardado | **512×512 JPEG calidad 0,8** (~35–70 KB) para cards. Si pasa 120 KB, bajar calidad hasta 0,6. Hoy es 128×128 y en una card de 1440 px se ve pixelada |
| Miniatura | 128×128 (como hoy) para plantel y cancha |
| Quitar | "Quitar foto" siempre visible (ya existe). Borra también la copia en `retratos` (ya lo hace `savePortrait(null)`) |
| En la card | `object-fit: cover` en la caja de 500×560 (de un cuadrado se pierde ~5% por lado), foco `50% 30%`, máscara ovalada `radial-gradient(ellipse 60% 66% at 50% 40%, #000 56%, rgba(0,0,0,.6) 76%, transparent 100%)`. No se recorta el fondo de la foto (eso pediría IA): se funde con la card |

⚠️ **Decisión técnica (espacio):** una foto de 512 en base64 son ~50.000–90.000 caracteres. No entra en los datos del equipo (límite total 350.000 y `cloud.ts` corta en 40.000 por foto). **Propuesta:** `Member.photo` sigue siendo la miniatura de 128; la de 512 va aparte, por cuenta (colección `retratos`, campo `photoCard`, o un storage de archivos) y se baja solo al dibujar una card. Mientras tanto, la card puede usar la de 128 (se ve blanda) o caer al avatar.

Guía visual: `png/avatar/06-recorte-foto.png` y pantalla `png/avatar/pantallas/17-recortar-foto.png`.

### 9.7 Privacidad

- **Menores de 18:** sin foto (ya es así), **sin botón de compartir ni story** en sus cards, que se ven solo dentro del equipo. Pueden armar avatar. En "Tu imagen" la opción "Subir foto" aparece bloqueada con el texto que ya existe.
- **La foto la ve solo el equipo:** plantel, formación y cards dentro de la app. El link público del partido (`vivo.tsx`, `partido.tsx`) no muestra fotos ni nombres; seguir así, tampoco avatares.
- Si un adulto comparte su card, la foto sale de la app: la primera vez, avisar en el botón "Tu card sale con tu foto." (propuesta).
- Al borrar la cuenta se borran la foto y el avatar (`eliminar-cuenta.tsx` ya menciona la foto; sumar el avatar).
- No hay reconocimiento de caras, ni IA, ni se manda la foto a terceros. No se usa la foto de Google sin que la persona la elija.

### 9.8 Pantallas (`png/avatar/pantallas/`, 390×844 @2x; hoja: `png/avatar/04-creador-pantallas.png`)

| # | Pantalla | Qué muestra |
|---|---|---|
| 10 | Tu imagen | Mini card actual + "Subir foto" / "Armar mi avatar" + el orden foto → avatar → iniciales |
| 11 | Tu imagen (menor) | "Subir foto" bloqueada ("No pedimos foto si sos menor de 18.") + "Armar mi avatar" |
| 12–15 | Mi avatar | Vista grande arriba, pestañas **Piel / Pelo / Cara / Camiseta**, grillas de opciones, "Al azar" y **Guardar** |
| 16 | Equipo | El plantel con foto, avatares e iniciales mezclados + aviso "Avatar guardado. Ya se ve en la formación." |
| 17 | Recortar foto | Recorte cuadrado con guía circular + vista previa (plantel, formación, card) |

Se entra desde Equipo (donde hoy está "Elegir mi foto"). El creador ocupa toda la pantalla, sin barra de abajo. Si cierra con ✕ y cambió algo: "¿Salir sin guardar?" Salir / Seguir.

### 9.9 Decisiones abiertas

1. **Colores del equipo:** sumar `Club.colores` (lo elige el DT en Equipo, con muestras + selector). ¿El diseño de camiseta también lo fija el DT para todo el equipo, o cada uno elige el suyo (como en los mockups)?
2. **Foto de 512 para cards:** dónde guardarla (§9.6).
3. **Jugadores sin cuenta:** ¿el DT les puede armar el avatar? Propuesta: sí, solo si `accountId` está vacío (igual que `trato`).
4. **Menores con avatar:** propuesta sí (confirmar).
5. ¿Usar la misma regla en `tarjeta.ts` y en la cancha? Propuesta: sí, todo con `imagenDe()`.
6. Aviso al compartir una card con foto (§9.7).
7. Opciones para sumar más adelante: hiyab o pañuelo deportivo, gorra, pecas, más colores de pelo (teñidos).
