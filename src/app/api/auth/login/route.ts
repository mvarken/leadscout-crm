import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearLoginRateLimit, checkLoginRateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { loginSchema, safeRedirectPath } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";

function rateLimitKey(request: NextRequest, email: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.ip || "unknown";
  return `${ip}:${email}`;
}

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte E-Mail und Passwort pruefen." }, { status: 400 });
  }

  const { email, password, next } = parsed.data;
  const key = rateLimitKey(request, email);
  const limit = checkLoginRateLimit(key);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Zu viele Versuche. Bitte in ${limit.retryAfterSeconds} Sekunden erneut versuchen.`
      },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user?.active ? await verifyPassword(user.passwordHash, password) : false;

  if (!user || !valid) {
    return NextResponse.json({ error: "E-Mail oder Passwort ist falsch." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  await createSession(user.id);
  clearLoginRateLimit(key);

  return NextResponse.json({ redirectTo: safeRedirectPath(next) });
}
