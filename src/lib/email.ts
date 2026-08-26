import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "./env";

let cached: Transporter | null = null;

function transporter(): Transporter {
  if (cached) return cached;
  const env = getEnv();
  cached = nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    connectionTimeout: 8_000,
    socketTimeout: 8_000,
  });
  return cached;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const env = getEnv();
  try {
    await transporter().sendMail({
      from: `Le Sillage <${env.GMAIL_USER}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}