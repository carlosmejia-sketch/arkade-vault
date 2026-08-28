import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 },
    );
  }

  const { name, email, message } = body;

  if (!name || !email || !message) {
    return Response.json(
      { ok: false, error: "Faltan campos requeridos." },
      { status: 400 },
    );
  }

  if (name.length > 80 || message.length > 2000) {
    return Response.json(
      { ok: false, error: "Nombre o mensaje demasiado largo." },
      { status: 400 },
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return Response.json(
      { ok: false, error: "Formato de email inválido." },
      { status: 400 },
    );
  }

  const safeName = name.replace(/[\r\n]+/g, " ").trim();

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.CONTACT_TO_EMAIL!,
      replyTo: email,
      subject: `Nuevo mensaje de contacto de ${safeName}`,
      text: message,
    });

    if (error) {
      console.error("Error al enviar email de contacto:", error);
      return Response.json(
        { ok: false, error: "No se pudo enviar el mensaje." },
        { status: 500 },
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Error inesperado al enviar email de contacto:", err);
    return Response.json(
      { ok: false, error: "No se pudo enviar el mensaje." },
      { status: 500 },
    );
  }
}
