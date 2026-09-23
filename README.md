# Mi Vestuario App

PWA para organizar fútbol amateur (5, 8, 9 y 11) con estética de vestuario: convocatorias, pizarra táctica, estadísticas y charla técnica.

## Roles

- **DT** y **Ayudante de Campo**: mismos permisos de edición (formación, planilla y convocatorias)
- **Creador del equipo**: crear/editar el equipo, invitar jugadores y designar DT / ayudante
- **Jugador**: ver, confirmar o rechazar asistencia. Stats en solo lectura.

El DT y el ayudante editan. El jugador mira y confirma si va. Para leer el código en criollo, abrí [LEEME.md](LEEME.md).

## Convocatorias y alertas

- El DT envía la convocatoria del próximo partido. El plantel recibe una alerta interna para confirmar.
- Los plazos son editables (por defecto 24 h segunda alerta, 48 h botón de WhatsApp de reclamo).
- Publicar o actualizar la formación dispara un aviso a todos.
- En **Charla → Técnica** el DT publica comunicados grupales con alerta inmediata.

## Estadísticas

En **Stats** está el rendimiento del plantel (ganados, empatados, perdidos), goleadores, asistencias y tarjetas. El DT o el ayudante cargan el resultado y los números de cada jugador desde la planilla.

## Invitaciones

**Invitar al equipo** abre el selector nativo (WhatsApp, Telegram, etc.) con un enlace de invitación. Si el teléfono no permite compartir, se copia el enlace.

## PWA (PWABuilder)

`public/manifest.json` cubre los miembros que pide PWABuilder:

| Miembro | Valor |
|---|---|
| `id` | `/mi-vestuario` — estable, no depende de `start_url` |
| `background_color` / `theme_color` | `#f3eee6` |
| `orientation` | `portrait` |
| `lang` / `dir` | `es-AR` / `ltr` |
| `scope` | `/` |
| `categories` | `sports`, `utilities` |
| `screenshots` | 3 narrow (1080×1920) + 2 wide (1280×720) |
| `iarc_rating_id` | UUID de ejemplo de PWABuilder. Reemplazalo por el certificado real de [IARC](https://www.globalratings.com/) |
| `display_override` | `window-controls-overlay` → `tabbed` → `standalone` |
| `edge_side_panel` | Panel lateral de Edge, ancho preferido 430 |
| `scope_extensions` | Array vacío (un solo origen) |
| `launch_handler` | Reusa la instancia abierta (`focus-existing`) |
| `shortcuts` | Inicio, Agenda, Pizarra, Stats, Equipo |
| `file_handlers` | Abre `.json` / `.cancha.json` del plantel |
| `share_target` | Recibe texto/URL en el chat (`GET /chat`) |
| `protocol_handlers` | `web+vestuario` |
