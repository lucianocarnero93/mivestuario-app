import type { Modality } from "./types";

export type Slot = { key: string; label: string; x: number; y: number };

export const MODALITIES: Modality[] = ["f5", "f8", "f9", "f11"];

export const MODALITY_LABEL: Record<Modality, string> = {
  f5: "Fútbol 5",
  f8: "Fútbol 8",
  f9: "Fútbol 9",
  f11: "Fútbol 11",
};

export const MODALITY_SHORT: Record<Modality, string> = {
  f5: "F5",
  f8: "F8",
  f9: "F9",
  f11: "F11",
};

export const FORMATIONS: Record<Modality, Slot[]> = {
  f5: [
    { key: "ARQ", label: "ARQ", x: 50, y: 84 },
    { key: "LI", label: "DEF", x: 26, y: 58 },
    { key: "LD", label: "DEF", x: 74, y: 58 },
    { key: "EI", label: "DEL", x: 28, y: 26 },
    { key: "ED", label: "DEL", x: 72, y: 26 },
  ],
  f8: [
    { key: "ARQ", label: "ARQ", x: 50, y: 86 },
    { key: "LI", label: "LI", x: 18, y: 68 },
    { key: "DF", label: "DF", x: 50, y: 70 },
    { key: "LD", label: "LD", x: 82, y: 68 },
    { key: "MI", label: "VOL", x: 24, y: 44 },
    { key: "MC", label: "VOL", x: 50, y: 48 },
    { key: "MD", label: "VOL", x: 76, y: 44 },
    { key: "DC", label: "DEL", x: 50, y: 22 },
  ],
  f9: [
    { key: "ARQ", label: "ARQ", x: 50, y: 86 },
    { key: "LI", label: "LI", x: 16, y: 64 },
    { key: "DFI", label: "DF", x: 38, y: 76 },
    { key: "DFD", label: "DF", x: 62, y: 76 },
    { key: "LD", label: "LD", x: 84, y: 64 },
    { key: "MI", label: "VOL", x: 24, y: 44 },
    { key: "MC", label: "VOL", x: 50, y: 46 },
    { key: "MD", label: "VOL", x: 76, y: 44 },
    { key: "DC", label: "DEL", x: 50, y: 20 },
  ],
  f11: [
    { key: "ARQ", label: "ARQ", x: 50, y: 88 },
    { key: "LI", label: "LI", x: 14, y: 68 },
    { key: "DFI", label: "DF", x: 34, y: 74 },
    { key: "DFD", label: "DF", x: 66, y: 74 },
    { key: "LD", label: "LD", x: 86, y: 68 },
    { key: "MI", label: "VOL", x: 18, y: 44 },
    { key: "MC", label: "VOL", x: 50, y: 52 },
    { key: "MD", label: "VOL", x: 82, y: 44 },
    { key: "EI", label: "EI", x: 22, y: 24 },
    { key: "DC", label: "DC", x: 50, y: 20 },
    { key: "ED", label: "ED", x: 78, y: 24 },
  ],
};
