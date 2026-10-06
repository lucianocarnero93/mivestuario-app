import { loadCrest, loadFotosCard } from "./cloud";
import { useFija } from "./store";

let pedido = "";

export function traerImagenesEquipo(code: string, forzar = false) {
  const limpio = code.trim();
  if (!limpio) return;
  if (!forzar && pedido === limpio) return;
  pedido = limpio;
  void Promise.all([loadCrest({ data: limpio }), loadFotosCard({ data: limpio })])
    .then(([escudo, rows]) => {
      useFija.setState((state) => {
        if (state.club?.inviteCode.trim() !== limpio) return state;
        const fotos = { ...(state.fotosCard ?? {}) };
        const porId = new Map(rows.map((row) => [row.memberId, row]));
        for (const row of rows) fotos[row.memberId] = row.photoCard;
        if (state.activeId && state.miFotoCard) fotos[state.activeId] = state.miFotoCard;
        return {
          fotosCard: fotos,
          club: state.club ? { ...state.club, crest: escudo.crest } : state.club,
          members: state.members.map((person) => {
            const row = porId.get(person.id);
            if (person.menor) return { ...person, photo: null };
            if (!row?.photo) return person;
            return { ...person, photo: row.photo };
          }),
        };
      });
    })
    .catch(() => {
      if (pedido === limpio) pedido = "";
    });
}

export function pedirFotosCard(code: string) {
  traerImagenesEquipo(code);
}
