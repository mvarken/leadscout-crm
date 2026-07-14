import { describe, expect, it } from "vitest";
import {
  companyNameLooksSimilar,
  normalizeDomain,
  normalizeEmail,
  normalizePhone,
  normalizeWebsite,
  websiteFromEmail
} from "@/lib/lead-utils";

describe("lead utilities", () => {
  it("normalizes domains from common website inputs", () => {
    expect(normalizeDomain("https://www.example.de/kontakt")).toBe("example.de");
    expect(normalizeDomain("example.de")).toBe("example.de");
    expect(normalizeDomain("")).toBeNull();
  });

  it("normalizes email and phone values", () => {
    expect(normalizeEmail(" INFO@EXAMPLE.DE ")).toBe("info@example.de");
    expect(normalizePhone("+49 (0) 221 123 456")).toBe("+490221123456");
  });

  it("normalizes website values and derives them from emails", () => {
    expect(normalizeWebsite("praxis-thaler.de")).toBe("https://praxis-thaler.de");
    expect(normalizeWebsite("http://example.de")).toBe("http://example.de");
    expect(websiteFromEmail("info@praxis-thaler.de")).toBe("https://praxis-thaler.de");
  });

  it("detects similar company names for duplicate checks", () => {
    expect(companyNameLooksSimilar("Meyer Dachdecker GmbH", "Meyer Dachdecker")).toBe(true);
    expect(companyNameLooksSimilar("Meyer Dachdecker", "Schmidt Sanitär")).toBe(false);
  });
});
