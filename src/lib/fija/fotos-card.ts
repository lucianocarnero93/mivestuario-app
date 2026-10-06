import { loadFotosCard } from "./cloud";
import { useFija } from "./store";

let pedido = "";

export function pedirFotosCard(code: string) {
  const limpio = code.trim();
  if (!limpio || pedido === limpio) return;
  pedido = limpio;
  void loadFotosCard({ data: limpio })
    .then((rows) => {
      useFija.setState((state) => {
        const fotos = { ...(state.fotosCard ?? {}) };
        for (const row of rows) fotos[row.memberId] = row.photoCard;
        if (state.activeId && state.miFotoCard) fotos[state.activeId] = state.miFotoCard;
        return { fotosCard: fotos };
      });
    })
    .catch(() => {
      if (pedido === limpio) pedido = "";
    });
}
