import { Resend } from "resend";

export async function POST(request: Request) {
  const { name, email, message } = (await request.json()) as {
    name?: string;
    email?: string;
    message?: string;
  };

  if (!name || !email || !message) {
    return Response.json(
      { ok: false, error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: process.env.CONTACT_TO_EMAIL!,
    replyTo: email,
    subject: `Nuevo mensaje de contacto de ${name}`,
    text: message,
  });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
