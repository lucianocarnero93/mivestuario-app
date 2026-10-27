/**
 * True solo en un build de demo.
 * Producción siempre es false, aunque alguien deje VITE_DEMO prendido.
 */
export function esBuildDemo(env) {
  if (!env || env.VERCEL_ENV === "production") return false;
  if (env.VITE_DEMO === "1") return true;
  return env.VERCEL_ENV === "preview" && typeof env.VERCEL_GIT_COMMIT_REF === "string" && env.VERCEL_GIT_COMMIT_REF.startsWith("demo/");
}
