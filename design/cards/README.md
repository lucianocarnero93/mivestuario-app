# Diseños de referencia · Cards de premios, avatares y alineación

Esto es **referencia de diseño**, no código de la app. Nada de acá se importa ni se compila: sirve para copiar medidas, colores, textos y reglas al implementar las cards de premios, el avatar y la imagen de alineación en `src/`. La especificación completa está en [`SPEC.md`](SPEC.md).

## Qué hay en cada carpeta

| Carpeta / archivo | Qué es |
|---|---|
| `SPEC.md` | Especificación para implementar: datos de cada card, reglas, tokens, avatar (§9) y alineación para compartir (§10) |
| `html/` | Templates de las 9 cards y las 2 stories con `{{PLACEHOLDERS}}`. `cards.css` es la fuente de verdad visual (tokens, tiers, layout) |
| `html/ejemplos/` | Los mismos templates llenos con datos ficticios (de acá salen los PNG) |
| `png/` | Exportes: `01…09-*.png` (cards), `story-*.png` (stories) y `00-todas.png` (hoja con todo) |
| `png/avatar/` | Hojas del avatar (ejemplos, opciones, capas, pantallas, recorte de foto), `cards/` (cada card en versión foto / avatar / iniciales) y `pantallas/` (mockups del creador, 390×844 @2x) |
| `avatar/` | Sistema de avatar: `avatar.js`, capas SVG sueltas (`svg/parts/`), ejemplos (`svg/ejemplos/`), `catalog.json`, HTML de pantallas y scripts. Ver `avatar/LEEME.md` |
| `alineacion/` | Alineación para compartir desde la Pizarra: templates, `alineacion.js` (fuente de verdad del layout), posiciones, ejemplos y scripts. Ver más abajo |
| `png/alineacion/` | Exportes de la alineación (WhatsApp, story y OG), hoja `00-alineacion-todas.png` y `00-antes-despues.png` |
| `_tools/` | Scripts que generan las cards: `build.py`, `sheet.py` (hoja `00-todas.png`) y `stress.py` (prueba con nombres y equipos largos; su salida está en `_tools/stress/`) |

## Tamaños de los PNG

- **Cards:** 720×1000, fondo transparente.
- **Stories:** 1080×1920 (fondo opaco, listas para Instagram).
- Las hojas de resumen (`00-todas.png`, `png/avatar/0X-*.png`) y las pantallas (780×1688) tienen otros tamaños: son solo para mirar.

## Avatar: fuente de verdad

`avatar/avatar.js` es la fuente de verdad del dibujo del avatar. Las capas de `avatar/svg/parts/` y `catalog.json` se generan desde ahí (`avatar/export_parts.js`). **Si una capa SVG suelta difiere de lo que dibuja `avatar.js`, manda `avatar.js`.**

## Alineación para compartir

`alineacion/` tiene el rediseño de la imagen que sale de Pizarra → Compartir (detalle completo en la §10 de `SPEC.md` y en `alineacion/SPEC-alineacion.md`):

- `whatsapp.html`, `story.html` y `og.html`: templates con `{{PLACEHOLDERS}}` y `{{DATOS_JSON}}`; `alineacion.css` con tokens y medidas.
- `alineacion.js`: fuente de verdad del layout (formaciones, perspectiva, chips, temas). `posiciones.json` / `posiciones.js`: coordenadas de cada slot en los 3 formatos.
- `ejemplos/`: templates llenos con datos ficticios (F5, F7, F8, F9 y F11; tema marca y tema equipo), de donde salen los PNG de `png/alineacion/`.
- `_antes/antes.html`: reconstrucción de la imagen que genera hoy la app (`png/alineacion/_hoy-*.png` y `00-antes-despues.png`).

Formatos:

- **WhatsApp / feed 4:5:** 1080×1350.
- **Story de Instagram:** 1080×1920.
- **Link (OG):** 1200×630.

> ⚠️ `alineacion/build.py` y `hoja.py` tienen rutas fijas del box (`/workspace/mivestuario/cards`, `/workspace/mivestuario/cards/_tools/build.py` y `/workspace/mivestuario/cards/png/alineacion`). Para correrlos desde el repo, cambiá esas rutas por las de `design/cards` antes.

## Cómo regenerar

Requiere `python3`, `google-chrome` (headless) y, para el avatar, `node` (y Pillow para la foto de ejemplo).

`_tools/build.py` arma, para cada una de las 9 cards y las 2 stories:

1. el template en `html/<slug>.html` (con `{{PLACEHOLDERS}}`, enlazando `cards.css`),
2. el ejemplo lleno en `html/ejemplos/<slug>.html` (datos ficticios y una foto de ejemplo dibujada en SVG),
3. el PNG en `png/<slug>.png` con Chrome headless (`--screenshot`, fondo transparente, escala 1): 720×1000 las cards y 1080×1920 las stories.

> ⚠️ `_tools/build.py`, `sheet.py` y `stress.py` tienen la ruta de origen fija (`ROOT = "/workspace/mivestuario/cards"`). Para correrlos desde el repo, cambiá esa ruta por la de `design/cards` antes.

```bash
cd design/cards
python3 _tools/build.py             # templates, ejemplos y PNG de las 9 cards + 2 stories
python3 avatar/build.py             # partes SVG, HTML y PNG del avatar
python3 avatar/build.py --todo      # todo lo del avatar + build.py + hoja 00-todas.png
```

El ESLint y el Prettier de la app ignoran `design/`, y `tsconfig.json` solo incluye `src` y `server`.
