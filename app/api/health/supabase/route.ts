import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      console.error("Health check de Supabase falló:", error);
      return Response.json(
        { ok: false, error: "Error de conexión" },
        { status: 500 },
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Health check de Supabase falló:", error);
    return Response.json(
      { ok: false, error: "Error de conexión" },
      { status: 500 },
    );
  }
}
