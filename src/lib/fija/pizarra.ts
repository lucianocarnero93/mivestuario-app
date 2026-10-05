export const ETIQUETAS = ["Presionar", "Cubrir", "Achicar", "Salir jugando", "No lo persigas"] as const;

export type Etiqueta = (typeof ETIQUETAS)[number];

export type Indicacion = {
  etiqueta: string;
  nota: string;
};

export function etiquetaValida(value: string): Etiqueta | "" {
  return ETIQUETAS.find((item) => item === value) ?? "";
}

export function leyendaDe(
  indicaciones: Record<string, Indicacion> | undefined,
  ids: string[],
  nombres: { id: string; nick: string; name: string }[],
): { id: string; nick: string; etiqueta: string; nota: string }[] {
  const enCancha = new Set(ids);
  const byId = new Map(nombres.map((person) => [person.id, person]));
  return Object.entries(indicaciones ?? {})
    .filter(([id, item]) => enCancha.has(id) && (item.etiqueta || item.nota))
    .map(([id, item]) => {
      const person = byId.get(id);
      return {
        id,
        nick: person?.nick || person?.name || "Jugador",
        etiqueta: item.etiqueta,
        nota: item.nota,
      };
    });
}
