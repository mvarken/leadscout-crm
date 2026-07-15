import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

type SendLeadEmailInput = {
  to: string;
  subject: string;
  text: string;
};

const SMTP_ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM"] as const;

type EffectiveSmtpSettings = {
  enabled: boolean;
  host?: string | null;
  port: number;
  secure: boolean;
  user?: string | null;
  password?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
};

function smtpPort(value?: string | null) {
  return Number.parseInt(value ?? "", 10);
}

function smtpSecure(value?: string | null, port = 587) {
  const text = value?.toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return port === 465;
}

function smtpFrom(settings: EffectiveSmtpSettings) {
  const from = settings.fromEmail?.trim();
  const fromName = settings.fromName?.trim();
  if (!from) return null;
  return fromName ? `${fromName} <${from}>` : from;
}

async function getEffectiveSmtpSettings(): Promise<EffectiveSmtpSettings> {
  const stored = await prisma.smtpSettings.findUnique({ where: { id: "default" } });
  if (stored) return stored;

  const envPort = smtpPort(process.env.SMTP_PORT);
  return {
    enabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
    host: process.env.SMTP_HOST,
    port: Number.isNaN(envPort) ? 587 : envPort,
    secure: smtpSecure(process.env.SMTP_SECURE, envPort),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    fromEmail: process.env.SMTP_FROM,
    fromName: process.env.SMTP_FROM_NAME,
    replyTo: process.env.SMTP_REPLY_TO
  };
}

export async function getSmtpSettingsForForm() {
  return prisma.smtpSettings.findUnique({ where: { id: "default" } });
}

export async function getSmtpStatus() {
  const settings = await getEffectiveSmtpSettings();
  const missing = [
    !settings.enabled ? "Aktivierung" : null,
    !settings.host?.trim() ? "SMTP-Server" : null,
    !settings.fromEmail?.trim() ? "Absender E-Mail" : null,
    Number.isNaN(settings.port) ? "Port" : null
  ].filter(Boolean) as string[];

  const envMissing = SMTP_ENV_KEYS.filter((key) => !process.env[key]?.trim());

  return {
    configured: missing.length === 0,
    missing: Array.from(new Set(missing)),
    envFallbackAvailable: envMissing.length === 0
  };
}

export async function sendLeadEmail({ to, subject, text }: SendLeadEmailInput) {
  await sendEmail({ to, subject, text });
}

export async function sendSmtpTestEmail(to: string) {
  await sendEmail({
    to,
    subject: "LeadScout CRM SMTP-Test",
    text: [
      "Hallo,",
      "",
      "das ist eine Testmail aus LeadScout CRM.",
      "Wenn diese E-Mail angekommen ist, funktioniert der SMTP-Versand grundsaetzlich.",
      "",
      "Hinweis: SPF, DKIM und DMARC sollten fuer die Absenderdomain trotzdem sauber eingerichtet sein.",
      "",
      "LeadScout CRM"
    ].join("\n")
  });
}

async function sendEmail({ to, subject, text }: SendLeadEmailInput) {
  const settings = await getEffectiveSmtpSettings();
  const status = await getSmtpStatus();
  const from = smtpFrom(settings);

  if (!status.configured || !from || Number.isNaN(settings.port)) {
    throw new Error("SMTP ist noch nicht vollstaendig eingerichtet.");
  }

  const user = settings.user?.trim();
  const pass = settings.password?.trim();
  const transporter = nodemailer.createTransport({
    host: settings.host ?? undefined,
    port: settings.port,
    secure: settings.secure,
    auth: user && pass ? { user, pass } : undefined
  });

  await transporter.sendMail({
    from,
    to,
    replyTo: settings.replyTo?.trim() || from,
    subject,
    text
  });
}
