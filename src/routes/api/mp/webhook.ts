import { createFileRoute } from "@tanstack/react-router";
import { marcarPagoMp } from "@/lib/fija/mercadopago";

export const Route = createFileRoute("/api/mp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let paymentId = url.searchParams.get("id") ?? "";
        let topic = url.searchParams.get("topic") ?? url.searchParams.get("type") ?? "";
        try {
          const body = (await request.json()) as { type?: string; data?: { id?: string | number } };
          topic = body.type || topic;
          if (body.data?.id) paymentId = String(body.data.id);
        } catch {
          // Mercado Pago a veces avisa solo por query.
        }
        if ((topic === "payment" || url.searchParams.get("topic") === "payment") && paymentId) {
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          const rows = await sql.query<{ data: { accessToken?: string } | string }>(
            "select data from vestuario_docs where collection = $1 limit 30",
            ["mp-cuentas"],
          );
          for (const row of rows) {
            const data = typeof row.data === "string" ? safe(row.data) : row.data;
            if (!data?.accessToken) continue;
            const payment = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { authorization: `Bearer ${data.accessToken}` },
            });
            if (!payment.ok) continue;
            const pago = (await payment.json()) as {
              status?: string;
              external_reference?: string;
              transaction_amount?: number;
            };
            await marcarPagoMp(pago.external_reference ?? "", paymentId, pago.status ?? "", pago.transaction_amount ?? 0);
            break;
          }
        }
        return new Response("ok");
      },
    },
  },
});

function safe(value: string): { accessToken?: string } | null {
  try {
    return JSON.parse(value) as { accessToken?: string };
  } catch {
    return null;
  }
}
