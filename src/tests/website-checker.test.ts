import { WordpressStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildHttpUrl,
  buildHttpsUrl,
  detectLegalPages,
  detectWordpress,
  findEmail,
  findPhone,
  normalizeWebsiteUrl
} from "@/lib/website-checker";

describe("website checker helpers", () => {
  it("normalizes website urls for http and https checks", () => {
    expect(normalizeWebsiteUrl("example.de")).toBe("https://example.de");
    expect(buildHttpsUrl("http://example.de/path")).toBe("https://example.de/path");
    expect(buildHttpUrl("https://example.de/path")).toBe("http://example.de/path");
  });

  it("detects wordpress signals", () => {
    expect(
      detectWordpress(
        '<link href="/wp-content/themes/theme/style.css"><script src="/wp-includes/js/a.js">'
      )
    ).toBe(WordpressStatus.DETECTED);
    expect(detectWordpress('<link href="/wp-content/themes/theme/style.css">')).toBe(
      WordpressStatus.LIKELY
    );
    expect(detectWordpress("<html></html>")).toBe(WordpressStatus.NOT_DETECTED);
  });

  it("detects legal pages and contact details", () => {
    const html = `
      <a href="/impressum">Impressum</a>
      <a href="/datenschutz">Datenschutz</a>
      <a href="/kontakt">Kontakt</a>
      <a href="mailto:info@example.de">Mail</a>
      Telefon +49 221 123456
    `;

    expect(detectLegalPages(html)).toEqual({
      hasImpressum: true,
      hasPrivacyPolicy: true,
      hasContactPage: true
    });
    expect(findEmail(html)).toBe("info@example.de");
    expect(findPhone(html)).toBe("+49 221 123456");
  });
});
