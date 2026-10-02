import { parsearJSON } from "./json.ts";

export const MODELO_IA = "google/gemini-3-flash-preview";

/** Error de la IA con el estado HTTP que debe devolver la función (429 límite, 402 sin créditos, 500 resto). */
export class ErrorIA extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Llama al Lovable AI Gateway y devuelve la respuesta ya parseada como JSON. */
export async function pedirJSON(system: string, user: string): Promise<unknown> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODELO_IA, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new ErrorIA("Límite de peticiones excedido. Inténtalo en unos segundos.", 429);
    if (res.status === 402) throw new ErrorIA("Créditos de IA agotados.", 402);
    console.error("AI error:", res.status, await res.text());
    throw new ErrorIA("Error del servicio de IA", 500);
  }

  const data = await res.json();
  const contenido = data.choices?.[0]?.message?.content;
  const parsed = parsearJSON(contenido);
  if (parsed === null) {
    // Sin el contenido: puede llevar datos de salud.
    console.error("Respuesta de IA sin JSON válido, longitud:", typeof contenido === "string" ? contenido.length : 0);
    throw new ErrorIA("Error procesando respuesta de IA", 500);
  }
  return parsed;
}
