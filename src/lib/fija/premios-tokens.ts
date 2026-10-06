import type { Tier } from "./premios.ts";

export type Pintura = {
  frame: [string, string, string, string];
  body: [string, string, string];
  ink: string;
  inkSoft: string;
  stat: string;
  ribbonBg: string;
  ribbonInk: string;
  glow: string;
  trim: string;
  pattern: string;
  crestBg: string;
  crestInk: string;
  silhouette: string;
};

function pintura(
  frame: [string, string, string, string],
  body: [string, string, string],
  ink: string,
  inkSoft: string,
  stat: string,
  ribbonBg: string,
  ribbonInk: string,
  glow: string,
  trim: string,
  pattern: string,
  crestBg: string,
  crestInk: string,
  silhouette: string,
): Pintura {
  return { frame, body, ink, inkSoft, stat, ribbonBg, ribbonInk, glow, trim, pattern, crestBg, crestInk, silhouette };
}

export const TIERS: Record<Tier, Pintura> = {
  neon: pintura(
    ["#f6ffd9", "#b8f25a", "#6aa824", "#d9ff9a"],
    ["#24603a", "#0f2c1b", "#061109"],
    "#eef6ef",
    "#b9d4c2",
    "#b8f25a",
    "#b8f25a",
    "#0c1a10",
    "rgba(184,242,90,.42)",
    "rgba(184,242,90,.55)",
    "rgba(184,242,90,.07)",
    "#0b1c12",
    "#b8f25a",
    "#2c6a42",
  ),
  oro: pintura(
    ["#fff7d1", "#d8a93a", "#8a6115", "#ffe28a"],
    ["#fbedb4", "#e6c463", "#b98a2b"],
    "#0b1c12",
    "#4a3a10",
    "#0b1c12",
    "#0b1c12",
    "#f6d97b",
    "rgba(255,248,214,.75)",
    "rgba(11,28,18,.35)",
    "rgba(120,84,10,.10)",
    "#0b1c12",
    "#f6d97b",
    "#c9a24a",
  ),
  esmeralda: pintura(
    ["#d9fff3", "#4fd1a5", "#127256", "#9ff5d6"],
    ["#13614c", "#0a3328", "#041610"],
    "#eafff7",
    "#a9dccb",
    "#6ff0c2",
    "#5ee0b3",
    "#03140e",
    "rgba(94,224,179,.40)",
    "rgba(94,224,179,.55)",
    "rgba(94,224,179,.07)",
    "#041610",
    "#6ff0c2",
    "#1c7a5e",
  ),
  hielo: pintura(
    ["#eefaff", "#8fd3f0", "#2f7896", "#c7ecff"],
    ["#1b4f5e", "#0c2a33", "#051318"],
    "#eef9ff",
    "#a8cfdc",
    "#9fe3ff",
    "#9fe3ff",
    "#06202a",
    "rgba(159,227,255,.38)",
    "rgba(159,227,255,.55)",
    "rgba(159,227,255,.07)",
    "#051318",
    "#9fe3ff",
    "#2b6a7c",
  ),
  plata: pintura(
    ["#ffffff", "#b6c2bb", "#5d6b63", "#e9efeb"],
    ["#f4f7f5", "#cfd8d3", "#97a59d"],
    "#0b1c12",
    "#33463b",
    "#0b1c12",
    "#0b1c12",
    "#e9efeb",
    "rgba(255,255,255,.85)",
    "rgba(11,28,18,.30)",
    "rgba(40,60,50,.08)",
    "#0b1c12",
    "#e9efeb",
    "#aab6af",
  ),
  fuego: pintura(
    ["#fff0c4", "#ff9a3d", "#a8320f", "#ffd27a"],
    ["#5a2410", "#2a0f07", "#120604"],
    "#fff4ea",
    "#f0bfa0",
    "#ffb547",
    "#ff9a3d",
    "#1d0a03",
    "rgba(255,154,61,.45)",
    "rgba(255,181,71,.55)",
    "rgba(255,154,61,.07)",
    "#120604",
    "#ffb547",
    "#7a3418",
  ),
  bronce: pintura(
    ["#ffe6cc", "#c98a55", "#6e3e1c", "#f2c398"],
    ["#f1c9a1", "#cf9561", "#94582c"],
    "#1e1008",
    "#4a2a14",
    "#1e1008",
    "#2a170b",
    "#f6cfa6",
    "rgba(255,232,206,.70)",
    "rgba(30,16,8,.35)",
    "rgba(90,45,15,.10)",
    "#2a170b",
    "#f6cfa6",
    "#b97c4a",
  ),
  cancha: pintura(
    ["#f4f6e6", "#e8ead8", "#8d9c86", "#ffffff"],
    ["#1fa552", "#147a3a", "#0a4a22"],
    "#ffffff",
    "#d8f0df",
    "#ffffff",
    "#e8ead8",
    "#0b3a1c",
    "rgba(232,234,216,.40)",
    "rgba(232,243,234,.55)",
    "rgba(255,255,255,.06)",
    "#0b3a1c",
    "#e8ead8",
    "#2aa95a",
  ),
  pizarra: pintura(
    ["#b8f25a", "#3a5c46", "#0b1c12", "#7ff0c8"],
    ["#16251c", "#0a120d", "#030604"],
    "#eef6ef",
    "#9bb5a4",
    "#b8f25a",
    "#b8f25a",
    "#0c1a10",
    "rgba(184,242,90,.22)",
    "rgba(184,242,90,.45)",
    "rgba(232,234,216,.05)",
    "#24402f",
    "#b8f25a",
    "#24382b",
  ),
};
