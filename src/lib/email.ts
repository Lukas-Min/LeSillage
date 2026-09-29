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

// The header logo that renderOrderEmailHtml links to. Sent as an inline
// attachment instead, because mail apps often hold back images fetched from a
// website ("Display images?") — an attached one shows straight away.
const LOGO_SRC = /src="https?:\/\/[^"]+\/logo\/mark\.png"/;
const LOGO_CID = "logo@lesillagemanila";
let logo: Promise<Buffer | null> | null = null;

function loadLogo(): Promise<Buffer | null> {
  // Fetched from the site itself: public/ files aren't in the serverless
  // bundle. Kept per instance; a failed fetch is retried on the next email.
  logo ??= fetch(`${getEnv().APP_URL.replace(/\/$/, "")}/logo/mark.png`)
    .then(async (response) => (response.ok ? Buffer.from(await response.arrayBuffer()) : null))
    .catch(() => null)
    .then((buffer) => {
      if (!buffer) logo = null;
      return buffer;
    });
  return logo;
}

/** Exported for tests. */
export async function withInlineLogo(html: string | undefined) {
  if (!html || !LOGO_SRC.test(html)) return { html, attachments: undefined };
  const image = await loadLogo();
  // Can't load it: keep the linked image, which still works once images are allowed.
  if (!image) return { html, attachments: undefined };
  return {
    html: html.replace(new RegExp(LOGO_SRC.source, "g"), `src="cid:${LOGO_CID}"`),
    attachments: [{ filename: "le-sillage-manila.png", content: image, cid: LOGO_CID, contentType: "image/png" }],
  };
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Extra headers, e.g. List-Unsubscribe on marketing email. */
  headers?: Record<string, string>;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const env = getEnv();
  try {
    const { html, attachments } = await withInlineLogo(message.html);
    await transporter().sendMail({
      from: `Le Sillage Manila <${env.GMAIL_USER}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html,
      attachments,
      replyTo: message.replyTo,
      headers: message.headers,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}
