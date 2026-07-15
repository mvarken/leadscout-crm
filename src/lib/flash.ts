import { cookies } from "next/headers";

export type FlashType = "success" | "warning" | "error";

export type FlashMessage = {
  type: FlashType;
  message: string;
};

const FLASH_COOKIE = "leadscout_flash";

export function setFlash(type: FlashType, message: string) {
  cookies().set(FLASH_COOKIE, encodeURIComponent(JSON.stringify({ type, message })), {
    maxAge: 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export function getFlash(): FlashMessage | null {
  const value = cookies().get(FLASH_COOKIE)?.value;
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<FlashMessage>;
    if (
      parsed.message &&
      (parsed.type === "success" || parsed.type === "warning" || parsed.type === "error")
    ) {
      return {
        type: parsed.type,
        message: parsed.message
      };
    }
  } catch {
    return null;
  }

  return null;
}
