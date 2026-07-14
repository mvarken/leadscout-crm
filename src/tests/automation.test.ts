import { BlocklistType, WordpressStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { normalizeBlocklistValue } from "@/lib/blocklist";
import { calculateLeadScore } from "@/lib/lead-score";

describe("automation helpers", () => {
  it("calculates lead scores from technical and contact signals", () => {
    expect(
      calculateLeadScore({
        wordpressStatus: WordpressStatus.DETECTED,
        httpsEnabled: false,
        hasImpressum: false,
        hasPrivacyPolicy: false,
        websiteReachable: true,
        email: "info@example.de",
        phone: "+49 221 123456"
      })
    ).toBe(90);
  });

  it("does not allow negative lead scores", () => {
    expect(
      calculateLeadScore({
        wordpressStatus: WordpressStatus.NOT_DETECTED,
        httpsEnabled: true,
        hasImpressum: true,
        hasPrivacyPolicy: true,
        websiteReachable: false,
        email: null,
        phone: null
      })
    ).toBe(0);
  });

  it("normalizes blocklist values by type", () => {
    expect(normalizeBlocklistValue(BlocklistType.DOMAIN, "https://www.example.de/kontakt")).toBe(
      "example.de"
    );
    expect(normalizeBlocklistValue(BlocklistType.EMAIL, " INFO@EXAMPLE.DE ")).toBe(
      "info@example.de"
    );
    expect(normalizeBlocklistValue(BlocklistType.PHONE, "+49 (0) 221 123 456")).toBe(
      "+490221123456"
    );
    expect(normalizeBlocklistValue(BlocklistType.COMPANY, " Muster GmbH ")).toBe("muster gmbh");
  });
});
