import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "3SC Connect <onboarding@resend.dev>";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload) {
  // If EMAIL_DEV_TO is set, always redirect there (dev and prod)
  const to = process.env.EMAIL_DEV_TO ?? payload.to;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      console.error("[sendEmail] Resend error:", error);
    } else {
      console.log(`[sendEmail] Sent "${payload.subject}" → ${to}`);
    }
  } catch (err) {
    // Never throw — email is non-blocking
    console.error("[sendEmail] Failed:", err);
  }
}
