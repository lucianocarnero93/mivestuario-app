/** Al enganchar Google, la contraseña que había deja de servir.
 *  El hook corre después de que Better Auth crea la sesión de ese enganche,
 *  así que se borran las sesiones anteriores y esa queda. */

export type CuentaAuth = {
  id: string;
  providerId: string;
  createdAt?: Date | string;
};

export type SesionAuth = {
  token: string;
  createdAt?: Date | string;
};

export type AdaptadorCuentas = {
  findAccounts: (userId: string) => Promise<CuentaAuth[]>;
  deleteAccount: (id: string) => Promise<unknown>;
  listSessions: (userId: string) => Promise<SesionAuth[]>;
  deleteSession: (token: string) => Promise<unknown>;
};

function instante(value: Date | string | undefined): number {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : 0;
  }
  const time = Date.parse(String(value ?? ""));
  return Number.isFinite(time) ? time : 0;
}

export async function cortarClaveAlVincularGoogle(
  acc: { id?: string; providerId?: string; userId?: string; createdAt?: Date | string } | null | undefined,
  adapter: AdaptadorCuentas,
): Promise<void> {
  if (!acc || acc.providerId !== "google" || !acc.userId) return;
  const cuentas = await adapter.findAccounts(acc.userId);
  const claves = cuentas.filter((cuenta) => cuenta.providerId === "credential");
  if (claves.length === 0) return;
  for (const clave of claves) await adapter.deleteAccount(clave.id);
  const google = cuentas.find((cuenta) => cuenta.providerId === "google" && (!acc.id || cuenta.id === acc.id));
  const desde = instante(acc.createdAt ?? google?.createdAt);
  if (!desde) {
    const sesiones = await adapter.listSessions(acc.userId);
    for (const sesion of sesiones) await adapter.deleteSession(sesion.token);
    return;
  }
  const sesiones = await adapter.listSessions(acc.userId);
  for (const sesion of sesiones) {
    if (instante(sesion.createdAt) < desde) await adapter.deleteSession(sesion.token);
  }
}
