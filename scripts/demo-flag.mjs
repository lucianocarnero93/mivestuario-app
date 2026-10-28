/**
 * True solo en un build de demo.
 * Producción siempre es false, aunque alguien deje VITE_DEMO prendido.
 */
export function esBuildDemo(env) {
  if (!env || env.VERCEL_ENV === "production") return false;
  if (env.VITE_DEMO === "1") return true;
  const ref = env.VERCEL_GIT_COMMIT_REF;
  if (env.VERCEL_ENV !== "preview" || typeof ref !== "string") return false;
  return ref.startsWith("demo/") || ref === "feature/modelos-tacticos";
}
