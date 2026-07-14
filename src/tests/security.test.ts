import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/rate-limit";
import { safeRedirectPath } from "@/lib/validation";

describe("security helpers", () => {
  it("accepts only local redirect paths", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("https://example.com")).toBe("/dashboard");
    expect(safeRedirectPath("//example.com")).toBe("/dashboard");
    expect(safeRedirectPath("\\evil")).toBe("/dashboard");
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("very-secure-password");

    expect(hash).not.toContain("very-secure-password");
    await expect(verifyPassword(hash, "very-secure-password")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });

  it("limits repeated login attempts", () => {
    const key = `test:${crypto.randomUUID()}`;
    clearLoginRateLimit(key);

    for (let index = 0; index < 8; index += 1) {
      expect(checkLoginRateLimit(key).allowed).toBe(true);
    }

    expect(checkLoginRateLimit(key).allowed).toBe(false);
    clearLoginRateLimit(key);
  });
});
