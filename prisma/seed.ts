import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} muss gesetzt sein.`);
  }
  return value;
}

async function main() {
  const name = requireEnv("ADMIN_NAME");
  const email = requireEnv("ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("ADMIN_PASSWORD");

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD muss mindestens 12 Zeichen lang sein.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: Role.ADMIN,
      active: true
    },
    create: {
      name,
      email,
      passwordHash,
      role: Role.ADMIN,
      active: true
    }
  });

  console.log(`Admin-Benutzer wurde angelegt oder aktualisiert: ${email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed fehlgeschlagen.");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
