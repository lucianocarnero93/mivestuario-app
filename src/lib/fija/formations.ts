import type { Modality } from "./types";

export type Slot = { key: string; label: string; x: number; y: number };

export type Formation = {
  id: string;
  name: string;
  slots: Slot[];
};

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

export const FORMATIONS: Record<Modality, Formation[]> = {
  f5: [
    {
      id: "diamante",
      name: "1-2-1 (diamante)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 84 },
        { key: "LI", label: "DEF", x: 26, y: 58 },
        { key: "LD", label: "DEF", x: 74, y: 58 },
        { key: "EI", label: "DEL", x: 28, y: 26 },
        { key: "ED", label: "DEL", x: 72, y: 26 },
      ],
    },
  ],
  f8: [
    {
      id: "clasica",
      name: "1-3-3-1 (clásica)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 86 },
        { key: "LI", label: "LI", x: 18, y: 68 },
        { key: "DF", label: "DF", x: 50, y: 70 },
        { key: "LD", label: "LD", x: 82, y: 68 },
        { key: "MI", label: "VOL", x: 24, y: 44 },
        { key: "MC", label: "VOL", x: 50, y: 48 },
        { key: "MD", label: "VOL", x: 76, y: 44 },
        { key: "DC", label: "DEL", x: 50, y: 22 },
      ],
    },
    {
      id: "ofensiva",
      name: "1-2-3-2 (ofensiva)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 86 },
        { key: "LI", label: "DEF", x: 30, y: 72 },
        { key: "LD", label: "DEF", x: 70, y: 72 },
        { key: "MI", label: "VOL", x: 18, y: 50 },
        { key: "MC", label: "VOL", x: 50, y: 52 },
        { key: "MD", label: "VOL", x: 82, y: 50 },
        { key: "DC1", label: "DEL", x: 35, y: 24 },
        { key: "DC2", label: "DEL", x: 65, y: 24 },
      ],
    },
    {
      id: "equilibrada",
      name: "1-3-2-2 (equilibrada)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 86 },
        { key: "LI", label: "LI", x: 18, y: 68 },
        { key: "DF", label: "DF", x: 50, y: 70 },
        { key: "LD", label: "LD", x: 82, y: 68 },
        { key: "MI", label: "VOL", x: 30, y: 44 },
        { key: "MD", label: "VOL", x: 70, y: 44 },
        { key: "DC1", label: "DEL", x: 35, y: 22 },
        { key: "DC2", label: "DEL", x: 65, y: 22 },
      ],
    },
  ],
  f9: [
    {
      id: "clasica",
      name: "1-3-3-2 (clásica)",
      slots: [
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
    },
    {
      id: "defensiva",
      name: "1-4-3-1 (defensiva)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 86 },
        { key: "LI", label: "LI", x: 14, y: 68 },
        { key: "DFI", label: "DF", x: 34, y: 72 },
        { key: "DFD", label: "DF", x: 66, y: 72 },
        { key: "LD", label: "LD", x: 86, y: 68 },
        { key: "MI", label: "VOL", x: 24, y: 42 },
        { key: "MC", label: "VOL", x: 50, y: 46 },
        { key: "MD", label: "VOL", x: 76, y: 42 },
        { key: "DC", label: "DEL", x: 50, y: 20 },
      ],
    },
    {
      id: "ofensiva",
      name: "1-3-4-1 (ofensiva)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 86 },
        { key: "LI", label: "DEF", x: 25, y: 72 },
        { key: "DF", label: "DEF", x: 50, y: 74 },
        { key: "LD", label: "DEF", x: 75, y: 72 },
        { key: "MI", label: "VOL", x: 14, y: 46 },
        { key: "MC1", label: "VOL", x: 38, y: 48 },
        { key: "MC2", label: "VOL", x: 62, y: 48 },
        { key: "MD", label: "VOL", x: 86, y: 46 },
        { key: "DC", label: "DEL", x: 50, y: 20 },
      ],
    },
  ],
  f11: [
       {
      id: "4-4-2",
      name: "4-4-2 (clásica)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 88 },
        { key: "LI", label: "LI", x: 14, y: 68 },
        { key: "DFI", label: "DF", x: 34, y: 74 },
        { key: "DFD", label: "DF", x: 66, y: 74 },
        { key: "LD", label: "LD", x: 86, y: 68 },
        { key: "MI", label: "MI", x: 14, y: 46 },
        { key: "MC1", label: "MC", x: 38, y: 50 },
        { key: "MC2", label: "MC", x: 62, y: 50 },
        { key: "MD", label: "MD", x: 86, y: 46 },
        { key: "DC1", label: "DC", x: 38, y: 20 },
        { key: "DC2", label: "DC", x: 62, y: 20 },
      ],
    },
    {
      id: "4-3-3",
      name: "4-3-3 (ofensiva)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 88 },
        { key: "LI", label: "LI", x: 14, y: 68 },
        { key: "DFI", label: "DF", x: 34, y: 74 },
        { key: "DFD", label: "DF", x: 66, y: 74 },
        { key: "LD", label: "LD", x: 86, y: 68 },
        { key: "MC1", label: "VOL", x: 28, y: 48 },
        { key: "MC2", label: "VOL", x: 50, y: 52 },
        { key: "MC3", label: "VOL", x: 72, y: 48 },
        { key: "EI", label: "EI", x: 22, y: 22 },
        { key: "DC", label: "DC", x: 50, y: 18 },
        { key: "ED", label: "ED", x: 78, y: 22 },
      ],
    },
    {
      id: "4-2-3-1",
      name: "4-2-3-1 (moderna)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 88 },
        { key: "LI", label: "LI", x: 14, y: 68 },
        { key: "DFI", label: "DF", x: 34, y: 74 },
        { key: "DFD", label: "DF", x: 66, y: 74 },
        { key: "LD", label: "LD", x: 86, y: 68 },
        { key: "MC1", label: "VOL", x: 38, y: 56 },
        { key: "MC2", label: "VOL", x: 62, y: 56 },
        { key: "MI", label: "EI", x: 22, y: 36 },
        { key: "MCO", label: "MCO", x: 50, y: 36 },
        { key: "MD", label: "ED", x: 78, y: 36 },
        { key: "DC", label: "DC", x: 50, y: 18 },
      ],
    },
    {
      id: "3-5-2",
      name: "3-5-2 (con carrileros)",
      slots: [
        { key: "ARQ", label: "ARQ", x: 50, y: 88 },
        { key: "DFI", label: "DF", x: 28, y: 72 },
        { key: "DFC", label: "DF", x: 50, y: 74 },
        { key: "DFD", label: "DF", x: 72, y: 72 },
        { key: "MI", label: "CAR", x: 12, y: 46 },
        { key: "MC1", label: "VOL", x: 38, y: 50 },
        { key: "MC2", label: "VOL", x: 62, y: 50 },
        { key: "MD", label: "CAR", x: 88, y: 46 },
        { key: "MCO", label: "MCO", x: 50, y: 32 },
        { key: "DC1", label: "DC", x: 38, y: 18 },
        { key: "DC2", label: "DC", x: 62, y: 18 },
      ],
    },
  ],
};