# Mi Vestuario App

Guía corta para leer el proyecto sin perderse. Las funciones son las mismas de siempre. Los nombres en el código se dejaron iguales para que la app no se rompa. Acá están traducidos.

## Qué hace la app

Un vestuario de fútbol amateur en el celular.

1. La persona entra con Google.
2. El DT crea el equipo y le pasa un código a los jugadores.
3. El jugador entra con ese código.
4. El DT arma la convocatoria, la formación y la planilla.
5. Todos ven las estadísticas. Solo el DT y el ayudante las editan.

## Dónde está cada cosa

| Carpeta o archivo | En criollo |
|---|---|
| `src/routes/index.tsx` | Pantalla de inicio |
| `src/routes/agenda.tsx` | Partidos y entrenamientos |
| `src/routes/cancha.tsx` | Pizarra para armar la formación |
| `src/routes/stats.tsx` | Goleadores, asistencias, tarjetas y torneos |
| `src/routes/chat.tsx` | Charla del equipo |
| `src/routes/equipo.tsx` | Plantel, invitar y roles |
| `src/routes/seguridad.tsx` | GPS, nube y salir del equipo |
| `src/routes/login.tsx` | Botón de Google |
| `src/lib/fija/store.ts` | La memoria. Cada función tiene un comentario arriba que dice qué hace |
| `src/lib/fija/types.ts` | El diccionario de datos |
| `src/lib/fija/cloud.ts` | Copia del equipo en la base |
| `src/components/fija/` | Las piezas visuales (logo, cancha, planilla) |

No hace falta leer `src/lib/auth` ni `src/lib/db.ts`. Eso es el ingreso y la base. Si se toca, se rompe el login.

## Puestos

- **DT**: arma formación, carga el partido, invita y nombra al ayudante.
- **Ayudante**: puede hacer lo mismo que el DT en la cancha y en la planilla.
- **Jugador**: mira y confirma si va. No edita.

## Un partido, de punta a punta

1. `createEvent` crea el partido.
2. `setSpot` ubica a cada jugador en la cancha.
3. `publishLineup` avisa al grupo.
4. `setRsvp` guarda el "voy" o "no voy".
5. `saveMatchSheet` anota el resultado y las tarjetas.
6. `stats.tsx` suma todo. Si el torneo se cierra con `finishTournament`, queda el historial y también el total del equipo.
