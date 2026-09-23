
/**
 * Providers de autenticación que se muestran en la pantalla de login.
 * Solo Google. Sin broker, sin Grok, sin X.
 */
export type AuthProvider = {
  providerId: string;
  label: string;
};

export const AUTH_PROVIDERS: readonly AuthProvider[] = [
  { providerId: "google", label: "Google" },
];