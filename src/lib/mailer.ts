import nodemailer from "nodemailer";

type SendLeadEmailInput = {
  to: string;
  subject: string;
  text: string;
};

const SMTP_ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM"] as const;

function smtpPort() {
  return Number.parseInt(process.env.SMTP_PORT ?? "", 10);
}

function smtpSecure() {
  const value = process.env.SMTP_SECURE?.toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return smtpPort() === 465;
}

function smtpFrom() {
  const from = process.env.SMTP_FROM?.trim();
  const fromName = process.env.SMTP_FROM_NAME?.trim();
  if (!from) return null;
  return fromName ? `${fromName} <${from}>` : from;
}

export function getSmtpStatus() {
  const missing = SMTP_ENV_KEYS.filter((key) => !process.env[key]?.trim());
  const port = smtpPort();

  if (Number.isNaN(port)) {
    missing.push("SMTP_PORT");
  }

  return {
    configured: missing.length === 0,
    missing: Array.from(new Set(missing))
  };
}

export async function sendLeadEmail({ to, subject, text }: SendLeadEmailInput) {
  const status = getSmtpStatus();
  const from = smtpFrom();
  const port = smtpPort();

  if (!status.configured || !from || Number.isNaN(port)) {
    throw new Error("SMTP ist noch nicht vollstaendig eingerichtet.");
  }

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: smtpSecure(),
    auth: user && pass ? { user, pass } : undefined
  });

  await transporter.sendMail({
    from,
    to,
    replyTo: process.env.SMTP_REPLY_TO?.trim() || from,
    subject,
    text
  });
}
