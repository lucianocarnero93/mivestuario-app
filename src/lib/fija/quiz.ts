import type { ClubEvent, QuizPregunta, QuizRespuesta } from "./types.ts";

export const QUIZ_CIERRE_MIN = 60;
export const META_PLANTEL = 0.8;

export function armarQuiz(event: ClubEvent): QuizPregunta[] {
  const porMomento = (momento: QuizPregunta["momento"]) =>
    (event.consignas ?? []).filter((item) => item.momento === momento);
  const armar = (momento: QuizPregunta["momento"], situacion: string, otras: string[]): QuizPregunta | null => {
    const propia = porMomento(momento)[0];
    if (!propia) return null;
    const opciones = [propia.texto, ...otras].slice(0, 3);
    return { id: `q-${momento}`, momento, situacion, opciones, correcta: 0, consignaId: propia.id };
  };
  return [
    armar("perdida", "La perdimos en su campo. ¿Qué hacemos?", ["Volvemos todos atrás", "Esperamos en mitad de cancha"]),
    armar("sin", "Ellos tienen la pelota. ¿Qué hacemos?", ["Salimos a presionar de a uno", "Nos paramos en el área"]),
    armar("pelota", "Córner en contra. ¿Dónde vas?", ["Quedate en el medio", "Salí a jugar"]),
  ].filter((item): item is QuizPregunta => item !== null);
}

export function puedeResponder(event: ClubEvent, at: string): boolean {
  const cierra = event.quiz?.cierra;
  if (!cierra) return false;
  return Date.parse(at) <= Date.parse(cierra);
}

export function responderQuiz(
  event: ClubEvent,
  memberId: string,
  preguntaId: string,
  opcion: number,
  at: string,
): QuizRespuesta[] | null {
  if (!puedeResponder(event, at)) return null;
  const pregunta = event.quiz?.preguntas.find((item) => item.id === preguntaId);
  if (!pregunta || opcion < 0 || opcion >= pregunta.opciones.length) return null;
  const previas = event.quizRespuestas ?? [];
  if (previas.some((item) => item.memberId === memberId && item.preguntaId === preguntaId)) return null;
  return [...previas, { memberId, preguntaId, opcion, at }];
}

export function resultadoQuiz(event: ClubEvent, memberId: string): { aciertos: number; de: number } {
  const preguntas = event.quiz?.preguntas ?? [];
  const mias = (event.quizRespuestas ?? []).filter((item) => item.memberId === memberId);
  const aciertos = mias.filter((item) => preguntas.find((pregunta) => pregunta.id === item.preguntaId)?.correcta === item.opcion).length;
  return { aciertos, de: preguntas.length };
}

export function metaPlantel(event: ClubEvent, convocados: number): {
  vieron: number;
  entendieron: number;
  respondieron: number;
  total: number;
  llegamos: boolean;
  faltan: number;
} {
  const total = Math.max(convocados, 1);
  const vistos = event.vistos ?? [];
  const entendieron = vistos.filter((item) => item.entendido).length;
  const respondieron = new Set((event.quizRespuestas ?? []).map((item) => item.memberId)).size;
  const meta = Math.ceil(total * META_PLANTEL);
  const cuenta = Math.max(entendieron, respondieron);
  return {
    vieron: vistos.length,
    entendieron,
    respondieron,
    total,
    llegamos: cuenta >= meta,
    faltan: Math.max(0, meta - cuenta),
  };
}
