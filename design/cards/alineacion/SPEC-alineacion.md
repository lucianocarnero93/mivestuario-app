# SPEC · Alineación para compartir

> Entregable de diseño: imágenes, templates y reglas. **No se tocó el código de la app.** Campos reales de `src/lib/fija/types.ts`; lo que no existe está marcado **⚠️ FALTA DATO**.
> En Drive: carpeta **Alineación para compartir** (https://drive.google.com/drive/folders/14cV67-Egdmzdyc30tMFhq6D4cpABspac).

### 10.1 Qué genera hoy Compartir (leído del código)

- **Dónde:** Pizarra (`/cancha`) → pestaña **Compartir** → `Compartir()` en `components/fija/pizarra-viva.tsx` (función `armar(story)`). Dibuja en un canvas propio; **no usa** `tarjeta.ts`, `stories.ts`, `lienzo.ts` ni `premios-dibujo.ts`.
- **Botones:** "Compartir en WhatsApp" → PNG **1200×630** apaisado. "Historia de Instagram" → PNG **1080×1920**. Comparte con `navigator.share({ files, title })` sin texto; si no puede, descarga `formacion.png` / `historia.png`.
- **Qué dibuja:** fondo verde plano `#0c5a2a`; título en `sans-serif` (fuente del sistema): en WhatsApp `event.title` dos veces (blanco 54px y lima 36px), en la story "Así salimos hoy" (siempre "hoy") + `event.title`. Cada jugador es un círculo lima (radio 22px / 36px) con el dorsal (o 2 letras del apodo) y el apodo abajo. Sin dibujo de cancha. Abajo: `crest ? "Con el escudo del equipo" : "Armado en Mi Vestuario"`.
- **Por qué se ve mal:**
  1. **Faltan jugadores (bug):** usa `FORMATIONS[event.modality][0]` (la primera formación) en vez de la del plan (`plan.formacion || event.formacion`). Los slots que no existen en la primera se saltean: en F7 1-3-2-1 desaparece `DF`; en F11 4-3-3 faltan `MC3`, `EI`, `DC`, `ED` (4 de 11); en 3-5-2 faltan `DFC` y `MCO`. Los que quedan salen en la posición de otra formación.
  2. WhatsApp en 1200×630: la cancha queda en una franja de 280px (y 240→520) y los chips son de 44px; en el chat no se lee nada.
  3. Escribe "Con el escudo del equipo" en vez de dibujar el escudo, y entonces no lleva marca.
  4. No figuran el nombre del equipo, día, hora, cancha, modalidad, esquema, banco ni DT. Título repetido.
  5. Nada de la marca: sin Barlow/Figtree, sin fotos ni avatares, sin el lenguaje de las cards.
- Reconstrucción con el mismo código: `png/alineacion/_hoy-*.png` y comparación en `png/alineacion/00-antes-despues.png`.

### 10.2 Archivos

| Ruta | Qué es |
|---|---|
| `alineacion/whatsapp.html` · `story.html` · `og.html` | Templates con `{{PLACEHOLDERS}}` (cabecera) + `{{DATOS_JSON}}` (titulares, banco, DT) |
| `alineacion/alineacion.js` | **Fuente de verdad del layout**: formaciones (copia de `formations.ts`), líneas, perspectiva, tamaño de chips, temas, regla de imagen. Sin dependencias (Node y navegador) |
| `alineacion/alineacion.css` | Tokens, chip, cabecera, banco y medidas de los 3 formatos |
| `alineacion/posiciones.json` · `posiciones.js` | x/y/ancho/alto/k de cada slot: las 15 formaciones de la app + 4 propuestas de F6/F10, en los 3 formatos (salida de `layout()`; se rearma con `node alineacion/posiciones.js`). Mismas cifras que las tablas de 10.4 |
| `alineacion/ejemplos/*.html` | Templates llenos con datos ficticios (generan los PNG) |
| `alineacion/build.py` · `hoja.py` | Arma templates, ejemplos, PNG (Chrome headless), QA (chips que se pisan, textos cortados, zonas seguras), hoja de contacto y antes/después |
| `alineacion/_antes/antes.html` | Reconstrucción de la imagen de hoy (código de `armar()` copiado tal cual) |
| `png/alineacion/whatsapp-*.png` · `story-*.png` · `og-*.png` | 17 piezas: F5, F7, F8, F9 y F11 (todas las modalidades de la app); tema marca (neón) y tema equipo (rojo/negro, bordó/celeste, azul/amarillo). F8 y F9 en los tres formatos |
| `png/alineacion/00-alineacion-todas.png` · `00-antes-despues.png` | Hoja de contacto y antes/después (incluye cómo llega al chat) |

`python3 alineacion/build.py` rearma todo (~30 s). Los PNG pasan el QA sin avisos (`png/alineacion/_qa.json`).

### 10.3 Formatos y layout (px del lienzo; exportar a 1× — ya son tamaño final)

**WhatsApp / feed 4:5 · 1080×1350** (también sirve como post de Instagram; ocupa más alto en el chat que el 1200×630 de hoy)

| Bloque | Posición |
|---|---|
| Cabecera | x 48–1032, y 40–236. Escudo 150×150 (con brillo del acento). Columna de textos desde x≈228: kicker "ASÍ SALIMOS" (Figtree 800 24px, espaciado .22em, color acento) · EQUIPO (Barlow 800 78px, achica hasta 46) · "vs RIVAL" (Barlow 700 48px, "vs" en acento, achica hasta 32) · `día dd/mm · hh:mm` (Figtree 700 26px fg) + ` · cancha` (Figtree 600 muted), achica hasta 20 y después "…". A la derecha: pastilla `F7` (Barlow 800 64px sobre acento, radio 16) y abajo el esquema (Barlow 700 40px) |
| Cancha | trapecio: arriba y 292, ancho 700 · abajo y 1124, ancho 1010 · centro x 540 |
| Banco + DT | panel x 40–1040, y 1150–1300, radio 22. "BANCO" (Figtree 800 19px, .24em, muted) y círculos de 84px (aro de 4px con el degradé del marco), dorsal en burbuja de 34px, apodo Barlow 700 25px. Separador y columna "DT" a la derecha |
| Marca | y 1306, centrada: logo 34px + "Armado en **Mi Vestuario** · mivestuario.com.ar" (Figtree 600 22px; URL en lima) |

**Story de Instagram · 1080×1920** — nada importante arriba de y 250 ni debajo de y 1620 (stickers e interfaz de IG). Arriba solo decoración (luces de estadio).

| Bloque | Posición |
|---|---|
| Cabecera | x 48–1032, y 262–452 (igual que WhatsApp, sin la línea de fecha) |
| Pastillas | y 466: `Sáb 10/10 · 15:00` (en acento) y `cancha` (Figtree 700 25px, máx. 440px c/u) |
| Cancha | arriba y 562, ancho 720 · abajo y 1352, ancho 1010 |
| Banco + DT | y 1392–1562 |
| Marca | y 1578 (termina en ~1612) |

**Link / Open Graph · 1200×630** (ver §10.12)

| Bloque | Posición |
|---|---|
| Columna izquierda | x 60–600: logo + "MI VESTUARIO" (y 50) · escudo 120 + kicker + EQUIPO 64px · "vs RIVAL" 50px · fecha/hora/cancha 25px · pastilla `F7` + esquema · al pie "Resultado y formación en el link · mivestuario.com.ar" |
| Cancha | centro x 892, arriba y 60 ancho 430, abajo y 596 ancho 540. Jugadores como discos con **número y puesto**; sin fotos, nombres, banco ni DT |

### 10.4 Cancha y posiciones (algoritmo, `alineacion.js`)

Se parte de los slots de `FORMATIONS[modality]` que ya usa la app (`x`, `y` en % de la cancha 5:7, `y` grande = arco propio). Nunca usar la primera formación: `forma = FORMATIONS[event.modality].find(f => f.id === (plan.formacion || event.formacion)) ?? FORMATIONS[event.modality][0]`.

1. **Líneas:** ordenar los slots por `y` de mayor a menor y cortar una línea nueva cuando la distancia con el anterior es **> 9**. Excepción (laterales sueltos): una línea formada solo por jugadores abiertos (`|x − 50| ≥ 30`) que queda a ≤ 12 de la línea de atrás (y esa no es la del arquero) se suma a la de atrás; el escalón del paso 2 los deja apenas adelantados y no se agrega una fila. (4-4-2 → ARQ / 4 / 4 / 2; 4-2-3-1 → ARQ / 4 / 2 / 3 / 1; F9 1-3-3-2 → ARQ / 4 con laterales adelantados / 3 / 1.)
2. **Filas parejas:** la línea *i* de *n* va a `t = tArq − i·(tArq − tAtk)/(n−1)` con `tArq = 0,90` y `tAtk = 0,085` (t = 0 fondo lejano, 1 fondo cercano). Dentro de la línea, escalón suave: `t += (slot.y − promedio)/100 · 0,55` (los laterales quedan apenas más arriba).
3. **Ancho:** `u = 0,5 + (slot.x − 50)/100 · 0,94`.
4. **Proyección** (trapecio de §10.3): `w(t) = wFar + (wNear − wFar)·t` · `x = cx + (u − 0,5)·w(t)` · `y = top + t·(bottom − top)`.
5. **Tamaño del chip:** ancho base por modalidad — WhatsApp F5 180 · F7 170 · F8 156 · F9 146 · F11 136 (story: 176 · 166 · 152 · 142 · 132; OG discos: 64 · 60 · 56 · 54 · 52). Propuesta F6 / F10: WhatsApp 175 / 140 · story 171 / 136 · OG 62 / 53. Alto = ancho × 1,28. Escala por profundidad `s = 0,88 + 0,12·t`.
6. **Sin pisarse:** para cada par de chips a y b: `fx = |xa − xb| / ((wa + wb)/2 + 8)` y `fy = |ya − yb| / ((ha + hb)/2 + 8)`. Si `fx < 1` y `fy < 1` se pisan: `k = min(k, max(fx, fy))`. Todos los chips se multiplican por el mismo `k` (nunca se mueven). Peor caso: F11 3-5-2, `k = 0,90` en WhatsApp (chips de 109–121px) y `k = 0,88` en story. El resto de las formaciones queda entre 0,95 y 1 (columna k de las tablas).
7. **Orden de dibujo:** de arriba hacia abajo (el más cercano tapa al de atrás).

Líneas de la cancha con **perspectiva real** (para que el círculo central y las áreas no se vean planas): un punto de cancha `(u, v)` va a `t = (1/z − r)/(1 − r)` con `r = wFar/wNear` y `z = 1/r + (1 − 1/r)·v`. Medidas en unidades de cancha (las de `pitch.tsx`): área 0,622 × 0,138 · área chica 0,40 × 0,0615 · círculo central radio 0,133 (u) × 0,092 (v) · semicírculo del área 62% del central (no va en el OG). Césped: 14 franjas alternadas `#1d5c36` / `#195231`, 3,5% de margen fuera de las líneas, el fondo lejano se funde (opacidad .35 → 1 en el primer 22%), luz radial arriba y sombra difusa abajo. Líneas `rgba(232,243,234,.62)` 3,2px (con brillo lima suave en el tema marca).

**Modalidades y formaciones que ofrece la app** (`types.ts`: `Modality = "f5" | "f7" | "f8" | "f9" | "f11"`; `formations.ts`). La primera de cada lista es la que se usa por defecto cuando el partido no tiene formación (`?? FORMATIONS[modality][0]`). **F6 y F10 no existen en la app**: abajo van como propuesta, por si se suman, con las mismas reglas.

| Modalidad | Formaciones (`id`) | Por defecto |
|---|---|---|
| F5 | 1-2-2 (`diamante`) · Rombo (`rombo`) · 1-1-1-2 (`1-1-1-2`) | 1-2-2 |
| F6 | ❌ no existe en la app. Propuesta: 1-2-2-1 (`1-2-2-1`) · 1-2-1-2 (`1-2-1-2`) | — |
| F7 | 1-2-3-1 (`1-2-3-1`) · 1-3-2-1 (`1-3-2-1`) | 1-2-3-1 |
| F8 | 1-3-3-1 clásica (`clasica`) · 1-2-3-2 ofensiva (`ofensiva`) · 1-3-2-2 equilibrada (`equilibrada`) | 1-3-3-1 clásica |
| F9 | 1-3-3-2 clásica (`clasica`) · 1-4-3-1 defensiva (`defensiva`) · 1-3-4-1 ofensiva (`ofensiva`) | 1-3-3-2 clásica |
| F10 | ❌ no existe en la app. Propuesta: 1-4-3-2 (`1-4-3-2`) · 1-3-4-2 (`1-3-4-2`) | — |
| F11 | 4-4-2 clásica (`4-4-2`) · 4-3-3 ofensiva (`4-3-3`) · 4-2-3-1 moderna (`4-2-3-1`) · 3-5-2 con carrileros (`3-5-2`) | 4-4-2 clásica |

Posiciones resultantes para **todas** las formaciones en los tres formatos: `x,y` = centro del chip en px del lienzo, entre paréntesis el ancho (alto = ancho × 1,28; en el OG es el diámetro del disco). Slots de adelante hacia atrás. Mismos datos en `posiciones.json`.

**WhatsApp / feed 1080×1350**

| Formación | k | Slots |
|---|---|---|
| F5 · 1-2-2 (`diamante`) | 1 | EI 403,363 (160) · ED 677,363 (160) · LI 364,702 (169) · LD 716,702 (169) · ARQ 540,1041 (178) |
| F5 · Rombo (`rombo`) | 0.97 | PIV 540,363 (156) · AI 327,589 (162) · AD 753,589 (162) · DEF 540,815 (168) · ARQ 540,1041 (173) |
| F5 · 1-1-1-2 (`1-1-1-2`) | 0.97 | EI 417,363 (156) · ED 663,363 (156) · VOL 540,589 (162) · DEF 540,815 (168) · ARQ 540,1041 (173) |
| F6 · 1-2-2-1 (`1-2-2-1`) — *propuesta* | 1 | DC 540,363 (156) · MI 357,589 (161) · MD 723,589 (161) · LI 372,815 (167) · LD 708,815 (167) · ARQ 540,1041 (173) |
| F6 · 1-2-1-2 (`1-2-1-2`) — *propuesta* | 1 | EI 417,363 (156) · ED 663,363 (156) · VOL 540,589 (161) · LI 372,815 (167) · LD 708,815 (167) · ARQ 540,1041 (173) |
| F7 · 1-2-3-1 (`1-2-3-1`) | 1 | DC 540,363 (151) · MI 327,586 (157) · MD 753,586 (157) · MC 540,595 (157) · LI 372,815 (162) · LD 708,815 (162) · ARQ 540,1041 (168) |
| F7 · 1-3-2-1 (`1-3-2-1`) | 1 | DC 540,363 (151) · MI 403,589 (157) · MD 677,589 (157) · LI 271,812 (162) · LD 809,812 (162) · DF 540,821 (163) · ARQ 540,1041 (168) |
| F8 · 1-3-3-1 (`clasica`) | 1 | DC 540,363 (139) · MI 342,583 (144) · MD 738,583 (144) · MC 540,601 (144) · LI 271,812 (149) · LD 809,812 (149) · DF 540,821 (149) · ARQ 540,1041 (154) |
| F8 · 1-2-3-2 (`ofensiva`) | 1 | DC1 438,363 (139) · DC2 642,363 (139) · MI 297,586 (144) · MD 783,586 (144) · MC 540,595 (144) · LI 372,815 (149) · LD 708,815 (149) · ARQ 540,1041 (154) |
| F8 · 1-3-2-2 (`equilibrada`) | 1 | DC1 438,363 (139) · DC2 642,363 (139) · MI 388,589 (144) · MD 692,589 (144) · LI 271,812 (149) · LD 809,812 (149) · DF 540,821 (149) · ARQ 540,1041 (154) |
| F9 · 1-3-3-2 (`clasica`) | 1 | DC 540,363 (130) · MI 342,586 (135) · MD 738,586 (135) · MC 540,595 (135) · LI 257,787 (139) · LD 823,787 (139) · DFI 438,842 (140) · DFD 642,842 (140) · ARQ 540,1041 (144) |
| F9 · 1-4-3-1 (`defensiva`) | 1 | DC 540,363 (130) · MI 342,583 (135) · MD 738,583 (135) · MC 540,601 (135) · LI 238,806 (139) · LD 842,806 (139) · DFI 405,824 (140) · DFD 675,824 (140) · ARQ 540,1041 (144) |
| F9 · 1-3-4-1 (`ofensiva`) | 1 | DC 540,363 (130) · MI 266,584 (135) · MD 814,584 (135) · MC1 448,593 (135) · MC2 632,593 (135) · LI 330,812 (139) · LD 750,812 (139) · DF 540,821 (140) · ARQ 540,1041 (144) |
| F10 · 1-4-3-2 (`1-4-3-2`) — *propuesta* | 1 | DC1 458,363 (125) · DC2 622,363 (125) · MI 342,583 (129) · MD 738,583 (129) · MC 540,601 (129) · LI 239,801 (133) · LD 841,801 (133) · DFI 422,829 (134) · DFD 658,829 (134) · ARQ 540,1041 (138) |
| F10 · 1-3-4-2 (`1-3-4-2`) — *propuesta* | 1 | DC1 458,363 (125) · DC2 622,363 (125) · MI 267,580 (129) · MD 813,580 (129) · MC1 448,598 (129) · MC2 632,598 (129) · DFI 355,812 (134) · DFD 725,812 (134) · DFC 540,821 (134) · ARQ 540,1041 (138) |
| F11 · 4-4-2 (`4-4-2`) | 1 | DC1 458,363 (121) · DC2 622,363 (121) · MI 267,580 (125) · MD 813,580 (125) · MC1 448,598 (126) · MC2 632,598 (126) · LI 239,801 (130) · LD 841,801 (130) · DFI 405,829 (130) · DFD 675,829 (130) · ARQ 540,1041 (134) |
| F11 · 4-3-3 (`4-3-3`) | 1 | DC 540,351 (121) · EI 348,369 (121) · ED 732,369 (121) · MC1 373,583 (125) · MC3 707,583 (125) · MC2 540,601 (126) · LI 239,801 (130) · LD 841,801 (130) · DFI 405,829 (130) · DFD 675,829 (130) · ARQ 540,1041 (134) |
| F11 · 4-2-3-1 (`4-2-3-1`) | 0.99 | DC 540,363 (119) · MI 332,532 (123) · MCO 540,532 (123) · MD 748,532 (123) · MC1 444,702 (126) · MC2 636,702 (126) · LI 232,858 (129) · LD 848,858 (129) · DFI 401,885 (130) · DFD 679,885 (130) · ARQ 540,1041 (133) |
| F11 · 3-5-2 (`3-5-2`) | 0.90 | DC1 458,363 (109) · DC2 622,363 (109) · MCO 540,532 (112) · MI 237,693 (115) · MD 843,693 (115) · MC1 443,711 (116) · MC2 637,711 (116) · DFI 351,868 (118) · DFD 729,868 (118) · DFC 540,877 (119) · ARQ 540,1041 (121) |

**Story 1080×1920**

| Formación | k | Slots |
|---|---|---|
| F5 · 1-2-2 (`diamante`) | 1 | EI 400,629 (157) · ED 680,629 (157) · LI 362,951 (165) · LD 718,951 (165) · ARQ 540,1273 (174) |
| F5 · Rombo (`rombo`) | 0.95 | PIV 540,629 (148) · AI 323,844 (154) · AD 757,844 (154) · DEF 540,1058 (159) · ARQ 540,1273 (165) |
| F5 · 1-1-1-2 (`1-1-1-2`) | 0.95 | EI 414,629 (148) · ED 666,629 (148) · VOL 540,844 (154) · DEF 540,1058 (159) · ARQ 540,1273 (165) |
| F6 · 1-2-2-1 (`1-2-2-1`) — *propuesta* | 0.98 | DC 540,629 (149) · MI 354,844 (154) · MD 726,844 (154) · LI 370,1058 (159) · LD 710,1058 (159) · ARQ 540,1273 (165) |
| F6 · 1-2-1-2 (`1-2-1-2`) — *propuesta* | 0.98 | EI 414,629 (149) · ED 666,629 (149) · VOL 540,844 (154) · LI 370,1058 (159) · LD 710,1058 (159) · ARQ 540,1273 (165) |
| F7 · 1-2-3-1 (`1-2-3-1`) | 1 | DC 540,629 (148) · MI 324,841 (153) · MD 756,841 (153) · MC 540,850 (153) · LI 370,1058 (159) · LD 710,1058 (159) · ARQ 540,1273 (164) |
| F7 · 1-3-2-1 (`1-3-2-1`) | 0.97 | DC 540,629 (144) · MI 401,844 (149) · MD 679,844 (149) · LI 269,1055 (154) · LD 811,1055 (154) · DF 540,1064 (155) · ARQ 540,1273 (160) |
| F8 · 1-3-3-1 (`clasica`) | 1 | DC 540,629 (135) · MI 339,838 (140) · MD 741,838 (140) · MC 540,855 (141) · LI 269,1055 (145) · LD 811,1055 (145) · DF 540,1064 (145) · ARQ 540,1273 (150) |
| F8 · 1-2-3-2 (`ofensiva`) | 1 | DC1 435,629 (135) · DC2 645,629 (135) · MI 293,841 (140) · MD 787,841 (140) · MC 540,850 (140) · LI 370,1058 (145) · LD 710,1058 (145) · ARQ 540,1273 (150) |
| F8 · 1-3-2-2 (`equilibrada`) | 1 | DC1 435,629 (135) · DC2 645,629 (135) · MI 385,844 (140) · MD 695,844 (140) · LI 269,1055 (145) · LD 811,1055 (145) · DF 540,1064 (145) · ARQ 540,1273 (150) |
| F9 · 1-3-3-2 (`clasica`) | 1 | DC 540,629 (126) · MI 339,841 (131) · MD 741,841 (131) · MC 540,850 (131) · LI 255,1032 (135) · LD 825,1032 (135) · DFI 437,1084 (136) · DFD 643,1084 (136) · ARQ 540,1273 (140) |
| F9 · 1-4-3-1 (`defensiva`) | 1 | DC 540,629 (126) · MI 339,838 (131) · MD 741,838 (131) · MC 540,855 (131) · LI 236,1050 (135) · LD 844,1050 (135) · DFI 404,1067 (136) · DFD 676,1067 (136) · ARQ 540,1273 (140) |
| F9 · 1-3-4-1 (`ofensiva`) | 1 | DC 540,629 (126) · MI 262,839 (131) · MD 818,839 (131) · MC1 447,848 (131) · MC2 633,848 (131) · LI 328,1055 (136) · LD 752,1055 (136) · DF 540,1064 (136) · ARQ 540,1273 (140) |
| F10 · 1-4-3-2 (`1-4-3-2`) — *propuesta* | 1 | DC1 456,629 (121) · DC2 624,629 (121) · MI 339,838 (125) · MD 741,838 (125) · MC 540,855 (126) · LI 236,1045 (130) · LD 844,1045 (130) · DFI 421,1071 (130) · DFD 659,1071 (130) · ARQ 540,1273 (134) |
| F10 · 1-3-4-2 (`1-3-4-2`) — *propuesta* | 1 | DC1 456,629 (121) · DC2 624,629 (121) · MI 262,835 (125) · MD 818,835 (125) · MC1 447,852 (126) · MC2 633,852 (126) · DFI 354,1055 (130) · DFD 726,1055 (130) · DFC 540,1064 (130) · ARQ 540,1273 (134) |
| F11 · 4-4-2 (`4-4-2`) | 1 | DC1 456,629 (118) · DC2 624,629 (118) · MI 262,835 (122) · MD 818,835 (122) · MC1 447,852 (122) · MC2 633,852 (122) · LI 236,1045 (126) · LD 844,1045 (126) · DFI 404,1071 (126) · DFD 676,1071 (126) · ARQ 540,1273 (130) |
| F11 · 4-3-3 (`4-3-3`) | 1 | DC 540,618 (117) · EI 343,635 (118) · ED 737,635 (118) · MC1 370,838 (122) · MC3 710,838 (122) · MC2 540,855 (122) · LI 236,1045 (126) · LD 844,1045 (126) · DFI 404,1071 (126) · DFD 676,1071 (126) · ARQ 540,1273 (130) |
| F11 · 4-2-3-1 (`4-2-3-1`) | 0.98 | DC 540,629 (115) · MI 328,790 (118) · MCO 540,790 (118) · MD 752,790 (118) · MC1 443,951 (121) · MC2 637,951 (121) · LI 230,1099 (124) · LD 850,1099 (124) · DFI 401,1125 (125) · DFD 679,1125 (125) · ARQ 540,1273 (128) |
| F11 · 3-5-2 (`3-5-2`) | 0.88 | DC1 456,629 (104) · DC2 624,629 (104) · MCO 540,790 (107) · MI 233,942 (109) · MD 847,942 (109) · MC1 442,960 (110) · MC2 638,960 (110) · DFI 350,1109 (112) · DFD 730,1109 (112) · DFC 540,1118 (112) · ARQ 540,1273 (115) |

**Link / OG 1200×630 (discos)**

| Formación | k | Slots |
|---|---|---|
| F5 · 1-2-2 (`diamante`) | 1 | EI 811,114 (58) · ED 973,114 (58) · LI 794,317 (61) · LD 990,317 (61) · ARQ 892,521 (63) |
| F5 · Rombo (`rombo`) | 1 | PIV 892,114 (58) · AI 771,249 (60) · AD 1013,249 (60) · DEF 892,385 (61) · ARQ 892,521 (63) |
| F5 · 1-1-1-2 (`1-1-1-2`) | 1 | EI 819,114 (58) · ED 965,114 (58) · VOL 892,249 (60) · DEF 892,385 (61) · ARQ 892,521 (63) |
| F6 · 1-2-2-1 (`1-2-2-1`) — *propuesta* | 1 | DC 892,114 (56) · MI 788,249 (58) · MD 996,249 (58) · LI 801,385 (60) · LD 983,385 (60) · ARQ 892,521 (61) |
| F6 · 1-2-1-2 (`1-2-1-2`) — *propuesta* | 1 | EI 819,114 (56) · ED 965,114 (56) · VOL 892,249 (58) · LI 801,385 (60) · LD 983,385 (60) · ARQ 892,521 (61) |
| F7 · 1-2-3-1 (`1-2-3-1`) | 1 | DC 892,114 (55) · MI 771,247 (56) · MD 1013,247 (56) · MC 892,253 (56) · LI 801,385 (58) · LD 983,385 (58) · ARQ 892,521 (59) |
| F7 · 1-3-2-1 (`1-3-2-1`) | 1 | DC 892,114 (55) · MI 814,249 (56) · MD 970,249 (56) · LI 746,383 (58) · LD 1038,383 (58) · DF 892,389 (58) · ARQ 892,521 (59) |
| F8 · 1-3-3-1 (`clasica`) | 1 | DC 892,114 (51) · MI 780,245 (52) · MD 1004,245 (52) · MC 892,257 (52) · LI 746,383 (54) · LD 1038,383 (54) · DF 892,389 (54) · ARQ 892,521 (55) |
| F8 · 1-2-3-2 (`ofensiva`) | 1 | DC1 831,114 (51) · DC2 953,114 (51) · MI 754,247 (52) · MD 1030,247 (52) · MC 892,253 (52) · LI 801,385 (54) · LD 983,385 (54) · ARQ 892,521 (55) |
| F8 · 1-3-2-2 (`equilibrada`) | 1 | DC1 831,114 (51) · DC2 953,114 (51) · MI 806,249 (52) · MD 978,249 (52) · LI 746,383 (54) · LD 1038,383 (54) · DF 892,389 (54) · ARQ 892,521 (55) |
| F9 · 1-3-3-2 (`clasica`) | 1 | DC 892,114 (49) · MI 780,247 (50) · MD 1004,247 (50) · MC 892,253 (51) · LI 738,367 (52) · LD 1046,367 (52) · DFI 837,403 (52) · DFD 947,403 (52) · ARQ 892,521 (53) |
| F9 · 1-4-3-1 (`defensiva`) | 1 | DC 892,114 (49) · MI 780,245 (50) · MD 1004,245 (50) · MC 892,257 (51) · LI 728,379 (52) · LD 1056,379 (52) · DFI 819,391 (52) · DFD 965,391 (52) · ARQ 892,521 (53) |
| F9 · 1-3-4-1 (`ofensiva`) | 1 | DC 892,114 (49) · MI 737,246 (50) · MD 1047,246 (50) · MC1 840,252 (51) · MC2 944,252 (51) · LI 778,383 (52) · LD 1006,383 (52) · DF 892,389 (52) · ARQ 892,521 (53) |
| F10 · 1-4-3-2 (`1-4-3-2`) — *propuesta* | 1 | DC1 843,114 (48) · DC2 941,114 (48) · MI 780,245 (50) · MD 1004,245 (50) · MC 892,257 (50) · LI 728,376 (51) · LD 1056,376 (51) · DFI 828,394 (51) · DFD 956,394 (51) · ARQ 892,521 (52) |
| F10 · 1-3-4-2 (`1-3-4-2`) — *propuesta* | 1 | DC1 843,114 (48) · DC2 941,114 (48) · MI 737,243 (50) · MD 1047,243 (50) · MC1 840,255 (50) · MC2 944,255 (50) · DFI 792,383 (51) · DFD 992,383 (51) · DFC 892,389 (51) · ARQ 892,521 (52) |
| F11 · 4-4-2 (`4-4-2`) | 1 | DC1 843,114 (47) · DC2 941,114 (47) · MI 737,243 (49) · MD 1047,243 (49) · MC1 840,255 (49) · MC2 944,255 (49) · LI 728,376 (50) · LD 1056,376 (50) · DFI 819,394 (50) · DFD 965,394 (50) · ARQ 892,521 (51) |
| F11 · 4-3-3 (`4-3-3`) | 1 | DC 892,106 (47) · EI 778,118 (47) · ED 1006,118 (47) · MC1 797,245 (49) · MC3 987,245 (49) · MC2 892,257 (49) · LI 728,376 (50) · LD 1056,376 (50) · DFI 819,394 (50) · DFD 965,394 (50) · ARQ 892,521 (51) |
| F11 · 4-2-3-1 (`4-2-3-1`) | 1 | DC 892,114 (47) · MI 773,215 (48) · MCO 892,215 (48) · MD 1011,215 (48) · MC1 839,317 (49) · MC2 945,317 (49) · LI 726,410 (50) · LD 1058,410 (50) · DFI 818,428 (50) · DFD 966,428 (50) · ARQ 892,521 (51) |
| F11 · 3-5-2 (`3-5-2`) | 1 | DC1 843,114 (47) · DC2 941,114 (47) · MCO 892,215 (48) · MI 724,311 (49) · MD 1060,311 (49) · MC1 839,323 (49) · MC2 945,323 (49) · DFI 790,417 (50) · DFD 994,417 (50) · DFC 892,423 (50) · ARQ 892,521 (51) |

### 10.5 El chip (mini card FUT) — medidas en unidades del ancho W (1em = W/10)

- **Forma:** la misma silueta de la card de premios (muesca arriba, punta abajo) estirada a W × 1,28W. Marco con el degradé metálico del tema, cuerpo con el degradé del tema, rayas diagonales sutiles, brillo diagonal (screen 26% blanco), línea interior 1,4px y halo (`drop-shadow 0 0 .9em glow`) + sombra en el piso (elipse negra 60%).
- **Imagen:** foto → `cover` en (3%, 2%) 94% × 64%, foco 50% 26%, se funde abajo (62%→100%). Avatar → caja (16%, 4%) 82% × 62%, `contain` apoyado abajo, fundido 80%→100% (así el dorsal no tapa la cara). Iniciales → silueta (cabeza + hombros) color `silueta` del tema + iniciales Barlow 800 3,1em sobre el pecho.
- **Dorsal:** arriba a la izquierda (8%, 5%), Barlow 800 **3,3em**, color `num` con sombra. Sin dorsal: no se dibuja.
- **Nombre:** cinta trapecio a 63,5% (alto 15,5%, x 3%–97%) en color acento, Barlow 800 **2,05em** MAYÚSCULAS en `ribbonInk`. Achica hasta 0,95em; después "…".
- **Puesto:** a 80,5%, Barlow 700 1,45em, espaciado .14em, `inkSoft`. Es el `label` del slot (ARQ, DEF, VOL, DEL, ALA, PIV, LI, DF, MC, EI, MCO, CAR…).
- En F11 (W 136 en WhatsApp) el nombre sale a ~25px y el dorsal a ~40px: se leen con la imagen abierta en el celular. En la miniatura del chat se leen la cabecera (equipo, rival, F7) y la forma de la formación.
- **Banco:** círculo de 84px (aro del marco), dorsal en burbuja acento, apodo debajo. Entran 7; si hay más, 6 + burbuja "+N más". Sin banco: se oculta esa columna. **DT:** mismo círculo con acabado **Pizarra** (`#b8f25a → #3a5c46 → #0b1c12`, el de la card DT del mes) y burbuja "DT".

### 10.6 Temas

| Variable | Neón (marca, default) | Equipo (`Club.colores`) |
|---|---|---|
| Marco | `#f6ffd9 → #b8f25a → #6aa824 → #d9ff9a` | `acento` aclarado 72% → `acento` → oscurecido 42% → aclarado 40% |
| Cuerpo | `#24603a → #0f2c1b → #061109` | `cuerpo` aclarado 12% → oscurecido 38% → 78% |
| Cinta / texto cinta | `#b8f25a` / `#0c1a10` | `acento` / `#0c1a10` si contraste ≥ 4,5, si no blanco |
| Dorsal | `#b8f25a` | `acento` si contraste ≥ 3 con el cuerpo, si no `acento` aclarado 82% |
| Fondo (brillo arriba) | `#24603a` | `cuerpo` |

`acento` = `secondary` si tiene contraste ≥ 3 con `#0b1c12`, si no `secondary` aclarado 45%. `cuerpo` = `primary`, salvo que sea casi negro (luminancia < 0,02): entonces `mix(primary, secondary, .28)` (negro con un toque del secundario, como en el ejemplo rojo y negro). El césped queda verde en los dos temas. Fórmulas exactas en `tema()` de `alineacion.js` (`mix`, `contraste` WCAG). Sin `Club.colores` → siempre neón.

### 10.7 Datos: de dónde sale cada cosa

| Placeholder / campo | De dónde sale |
|---|---|
| `EQUIPO`, `EQUIPO_INICIALES` | `club.name`, `initials(club.name)` |
| `ESCUDO_SRC`, `TIENE_ESCUDO` | `club.crest` (data URL). `"si"` si empieza con `data:image/` |
| `RIVAL` | ⚠️ **FALTA DATO**: antes del partido no hay rival estructurado. Hoy: `event.title` sin el "vs " inicial (el placeholder del editor es "vs Los del Bajo": `title.replace(/^\s*vs\.?\s+/i, "")`). Si ya hay planilla, `sheet.opponent`. `event.rival` **no** sirve: es "cómo juega el rival" (texto de la charla) |
| `FECHA`, `HORA` | `event.startsAt` en `America/Argentina/Buenos_Aires`: "Sáb 10/10" y "15:00" |
| `CANCHA` | `event.place` (si está vacío, se oculta con su " · ") |
| `FORMATO` | `MODALITY_SHORT[event.modality]` (F5…F11) |
| `ESQUEMA` | `forma.name` sin lo que va entre paréntesis ("4-4-2 (clásica)" → "4-4-2"; F5 "Rombo" queda "Rombo") |
| `KICKER` | "ASÍ SALIMOS". Si se comparte el plan B o C: "PLAN B" / "PLAN C" (`planId`) |
| Titulares | `planVisible(event, planId).lineup` → `{ slotKey: memberId }`. Slot vacío: no se dibuja chip |
| `numero` | `member.number` (null → sin dorsal) |
| `nombre` | `nombreEnTarjeta(member)` (apodo → nombre → "Jugador"; menores: apodo o "Jugador") |
| Imagen | `imagenDe(member, fotosCard[member.id])` de `imagen.ts`: foto nítida 512 → foto 128 → avatar → iniciales |
| Puesto | `slot.label` de la formación elegida |
| Banco | `event.suplentes` filtrado igual que `armarFormacionPublica` (`vivo.ts`): sin titulares y, si hay `convocados`, solo convocados |
| DT | `members.filter(m => m.role === "dt")`. Si el DT también juega (`juega`), igual va en DT. El ayudante no va (decisión abierta) |
| Colores | ⚠️ **FALTA DATO** `Club.colores` (ya propuesto en §8 / §9.3) |
| No va | `event.tactics`, `event.notas`, audios, jugadas, video: son internos del plantel (como dice hoy la pantalla) |

### 10.8 Reglas de respaldo

- Imagen: foto → avatar → iniciales (§9.2). En el chip la foto no usa la del equipo como reemplazo.
- Sin escudo: escudo con `EQUIPO_INICIALES` (silueta de escudo con el degradé del marco, Barlow 800 52px).
- Textos de cabecera: una línea, se achican hasta el mínimo de §10.3 y después "…". Nombre del chip: hasta 0,95em y "…" (prueba: "WWWWWWWWWW" entra achicado; "Juan Cruz" entra en F11).
- Sin dorsal o sin cancha: se oculta (nunca "–"). Sin banco: se oculta la columna.
- En canvas, medir con `measureText` en un loop (como `[data-fit]`) y cortar con `recortar()` de `lienzo.ts`.

### 10.9 Menores de 18 (`member.menor`)

- **Nunca foto** en ninguna de las tres piezas, aunque llegue una en los datos (el template la baja a avatar o iniciales). Ya lo garantiza `imagenDe()`; repetir la regla al dibujar.
- Nombre: apodo (o "Jugador"), nunca el nombre real. Iniciales del apodo (`inicialesDe`). Propuesta: si el apodo es una sola palabra, 2 letras ("Thiago" → "TH") en vez de 1.
- No se marcan como menores en la imagen.
- **Link (OG):** igual que `/vivo` hoy, no aparecen: su lugar queda como disco vacío con el puesto, sin número.

### 10.10 Cómo implementarlo (recomendación)

- **Canvas 2D, sin dependencias nuevas**, en un archivo nuevo `src/lib/fija/alineacion-dibujo.ts`, con el mismo enfoque que `premios-dibujo.ts`:
  - De `lienzo.ts`: `cargar`, `cubrir`, `caja`, `recortar`, `logo`, `png`, `enviar`.
  - De `premios-dibujo.ts` (exportarlas): `prepararFuentes`, `lienzo`, `gradiente`, `rayas`, `brillos`, `foto`, `avatar`, `silueta`, `marca`, y los paths `MARCO` / `CUERPO` / `INTERIOR` (el chip es la card escalada con `ctx.scale(W/720, 1.28W/1000)`).
  - De `premios-tokens.ts`: `TIERS.pizarra` para el DT.
  - Portar de `alineacion.js` (~150 líneas útiles): `lineas`, `layout`, `proyectar`, `tDeV`, `pitchSvg` → mismas cuentas con `moveTo/lineTo`, y `tema()`.
  - Avatar: `avatarSvg()` de `src/lib/fija/avatar.ts` (o el port completo de `avatar/avatar.js`, §9.5) → `cargar(dataUrl)` → `drawImage`.
- Cada chip se dibuja en un canvas aparte (W × 1,28W a 2×) con la máscara del cuerpo (`clip()` con el path) y se pega en su `(x − W/2, y − 0,64W)`. Sombra del piso y halo con `shadowBlur`.
- **Fuentes:** `__root.tsx` hoy carga Barlow Condensed 500–800 y Figtree 400–700, así que **800 sí está** (el aviso de que faltaba quedó viejo). Igual, antes de dibujar hay que pedir cada peso: `document.fonts.load('800 80px "Barlow Condensed"')`, `('700 40px "Barlow Condensed"')`, `('600 26px Figtree')`, `('700 26px Figtree')` (Google Fonts baja un peso recién cuando se usa). El kicker usa Figtree 800: no está cargado → usar 700 o sumar 800 a la URL.
- **Arreglo mínimo inmediato** (aunque no se haga el diseño nuevo): en `armar()`, cambiar `FORMATIONS[event.modality][0]` por la formación del plan; hoy faltan jugadores.
- Rendimiento: 11 chips + banco ≈ 20 `drawImage`; las fotos 512 ya vienen en `fotosCard`. Mostrar "Armando la imagen…" mientras carga.

### 10.11 Compartir: pantalla, archivo y texto

- **Pantalla Compartir** (misma pestaña): vista previa de la imagen de WhatsApp + botones **"Mandar por WhatsApp"** (1080×1350) · **"Story de Instagram"** (1080×1920) · **"Copiar link"** (solo si el partido tiene link público). Si el equipo tiene colores: selector "Colores: Mi Vestuario / Del equipo". Usa el plan que se está mirando.
- Aviso arriba de los botones (reemplaza el de hoy): "La imagen lleva la formación, el banco y el DT. No lleva indicaciones, audios ni jugadas."
- Envío: `enviar(blob, archivo, texto, { copiarTexto: true })` de `lienzo.ts`.
- **Archivo:** `mi-vestuario-formacion-{equipo}-vs-{rival}-{aaaa-mm-dd}-{whatsapp|story}.png` (minúsculas, sin tildes, espacios → "-"). Ej.: `mi-vestuario-formacion-los-pibes-fc-vs-racing-del-bajo-2026-10-10-whatsapp.png`.
- **Texto para WhatsApp:** `Así salimos {cuándo} vs {RIVAL} ⚽ Mirá la formación: {link}`
  - `{cuándo}`: "hoy" / "mañana" / "el sábado" (si es dentro de los próximos 6 días) / "el 24/10".
  - `{link}`: `vivoUrl(event.liveToken)` si el DT abrió el link público. Si no hay link: `Así salimos el sábado vs Racing del Bajo ⚽ Armado en Mi Vestuario`.
  - Ej.: "Así salimos el sábado vs Racing del Bajo ⚽ Mirá la formación: https://www.mivestuario.com.ar/vivo?t=…"
- **Story:** Instagram ignora el texto; se copia igual al portapapeles por si lo pegan.

### 10.12 Imagen del link público (Open Graph)

- **Hoy no existe ninguna** `og:image`: `__root.tsx` solo pone `title` y `description` (el `public/og.jpg` no está referenciado) y `/vivo` se arma en el cliente. Al pegar el link en WhatsApp no sale imagen.
- **Qué muestra:** cabecera (escudo, equipo, vs rival, fecha · hora · cancha, F7 · esquema) y la cancha con **número + puesto**. **Sin fotos, sin avatares, sin apodos ni nombres, sin menores, sin banco ni DT** (más estricto que `/vivo`, porque la ve cualquiera que reciba el link aunque no lo abra). Template `og.html`.
- **Meta en `/vivo`** (con `head()` + loader del lado del servidor que lea el marcador por token): `og:title` "Los Pibes FC vs Racing del Bajo" · `og:description` "Sáb 10/10 · 15:00 · Complejo El Potrero. Formación y resultado en Mi Vestuario." · `og:image` 1200×630 · `og:image:width/height` · `twitter:card = summary_large_image`. Si el link no está activo: imagen genérica de la marca.
- **Archivo:** JPEG calidad ~85 (≈75–90 KB; el PNG pesa ~500 KB y WhatsApp puede no mostrar imágenes pesadas). Recomendado < 300 KB.
- **Cómo generarla (decisión técnica):** (a) endpoint `/api/og/vivo?t=` que dibuja del lado del servidor (Node + `@napi-rs/canvas` portando el mismo código, o `satori` + `resvg`; dependencia nueva) con caché por `token + lineupUpdatedAt`; o (b) el celular del DT la dibuja al publicar la formación/abrir el link y la sube (hoy no hay storage de archivos; en `vestuario_docs` no conviene). Recomendado (a).

### 10.13 Faltantes de datos encontrados

| Tema | Estado | Propuesta |
|---|---|---|
| Rival antes del partido | ⚠️ solo dentro de `event.title` ("vs …"); `sheet.opponent` recién con planilla | `ClubEvent.opponent?: string` (campo "Rival" en el editor del partido) |
| Escudo del rival | ❌ no existe | No hace falta: se muestra solo el nombre |
| Colores del equipo | ❌ (`Club` solo tiene `crest`) | `Club.colores` (§9.3) |
| Avatar en `Member` | ⚠️ `imagenDe()` lo acepta, pero `types.ts` no tiene `Member.avatar` y `avatar.ts` es una versión simple (piel y pelo) | `Member.avatar` + port de `avatar.js` (§9) |
| Formación usada al compartir | ❌ bug: siempre la primera | `plan.formacion \|\| event.formacion` |
| Banco | ✅ `event.suplentes`, pero Compartir no lo usa | filtrar como `armarFormacionPublica` |
| Capitán | ❌ no existe | si se suma (`Club.capitanId`), brazalete "C" en el chip |
| `og:image` del link | ❌ no existe | §10.12 |
| Kicker en Figtree 800 | ⚠️ no se carga | usar 700 o sumar 800 a la URL de fuentes |
| F6 y F10 | ❌ no existen (`Modality` = f5, f7, f8, f9, f11) | si se suman: formaciones y posiciones propuestas en 10.4 |
| Nombre de F9 "1-3-3-2 (clásica)" | ⚠️ sus slots son ARQ + 4 atrás (LI, DFI, DFD, LD) + 3 + 1 DC: no coincide con el nombre | revisar nombre o slots en `formations.ts`; la imagen muestra el nombre tal cual |

### 10.14 Decisiones abiertas

1. **Fotos fuera del equipo:** la story es pública y la imagen de WhatsApp puede reenviarse. ¿Fotos sí por defecto? Propuesta: switch "Con fotos" en Compartir, prendido en WhatsApp y apagado en la story (ahí avatar o iniciales). Primera vez: "La imagen sale con las fotos del plantel."
2. **Menores en la story** (pública): propuesta, igual que en WhatsApp (apodo + avatar/iniciales, sin foto). Alternativa más estricta: solo dorsal y puesto.
3. **¿Quién comparte?** Hoy la pestaña Compartir la ve todo el plantel (los jugadores, solo con la formación publicada). Propuesta: seguir así.
4. **Ayudante y DT que juega:** ¿el ayudante aparece junto al DT? ¿El DT que juega aparece en los dos lados? Propuesta: solo DT; si juega, aparece en cancha y en DT.
5. **Plan B/C:** ¿se pueden compartir? Propuesta: sí, con kicker "PLAN B".
6. **OG:** endpoint del servidor (recomendado) o imagen subida desde el celular (§10.12).
7. **Rival estructurado** (`ClubEvent.opponent`) o seguir sacándolo del título.
8. **Iniciales de una palabra:** 1 letra (como hoy) o 2 ("TH").
9. **F6 y F10:** ¿se suman como modalidades? Si sí, ya hay formaciones y posiciones propuestas (10.4).
