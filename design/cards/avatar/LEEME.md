# Avatar · Mi Vestuario

Sistema de avatar plano (busto de frente) para las cards y la app. Especificación completa: `../SPEC.md` §9.

| Archivo | Qué es |
|---|---|
| `avatar.js` | Dibujo del avatar. Fuente de verdad. Sin dependencias. `MVAvatar.svg(avatar, {primary, secondary}, opts)` |
| `render.js` | CLI para Node: JSON por stdin → SVG por stdout (lo usa `build.py`) |
| `export_parts.js` | Escribe `svg/parts/<capa>/<opción>.svg` (colores por variables CSS) y `catalog.json` |
| `data.py` | Personas y equipos ficticios de los ejemplos |
| `build.py` | Arma todo: partes, HTML (`html/`) y PNG (`../png/avatar/`) |
| `assets/foto-ejemplo.svg` / `.jpg` | Foto de ejemplo (silueta dibujada, no es una persona real) |
| `html/cards-avatar.css` | Estados de la foto en la card: `data-foto="si" | "avatar" | "no"` |
| `html/mockup.css` | Estilos de las pantallas (tokens de `src/styles.css` de la app) |
| `html/probador.html` | Abrir en el navegador para probar combinaciones |
| `svg/ejemplos/` | Los 12 avatares de ejemplo en SVG + `ejemplos.json` |

```bash
python3 avatar/build.py                 # todo lo del avatar (≈40 s)
python3 avatar/build.py cards pantallas # solo algunas piezas: grid opciones capas cards pantallas recorte
python3 avatar/build.py --todo          # además rearma las 9 cards, las 2 stories y 00-todas.png
```

Requiere `node` y `google-chrome` (headless). Pillow para la foto de ejemplo.
