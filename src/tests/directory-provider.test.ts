import { describe, expect, it } from "vitest";
import {
  directoryProviderDefinitions,
  getDirectoryProviderDefinition,
  searchDirectory
} from "@/lib/directory-provider";
import { build11880SearchUrl, parse11880SearchResults } from "@/lib/11880-search";
import { parseDirectoryCsv } from "@/lib/manual-import";

describe("directory provider", () => {
  it("keeps 11880 prepared but not implemented", () => {
    expect(getDirectoryProviderDefinition("11880-com")).toMatchObject({
      name: "11880 Vorbereitung",
      implemented: false,
      supportsSearch: false
    });
    expect(directoryProviderDefinitions.map((provider) => provider.key).sort()).toEqual(
      ["11880-com", "manual-import"].sort()
    );
  });

  it("does not run unimplemented prepared providers", async () => {
    await expect(
      searchDirectory("11880-com", {
        industry: "Dachdecker",
        country: "Deutschland",
        limit: 1
      })
    ).rejects.toThrow("noch nicht fuer Abrufe implementiert");
  });

  it("parses semicolon separated directory csv files", () => {
    const results = parseDirectoryCsv({
      csv: [
        "Firma;Branche;Strasse;PLZ;Stadt;Telefon;E-Mail;Homepage",
        "Muster Dach GmbH;Dachdecker;Hauptstrasse 1;50667;Koeln;+49 221 123;info@example.de;https://example.de"
      ].join("\n"),
      source: "Testimport",
      fallbackCountry: "Deutschland",
      limit: 10
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      source: "Testimport",
      companyName: "Muster Dach GmbH",
      industry: "Dachdecker",
      postalCode: "50667",
      city: "Koeln",
      email: "info@example.de",
      website: "https://example.de"
    });
  });

  it("uses fallback industry for csv imports", () => {
    const results = parseDirectoryCsv({
      csv: ["Firma,Stadt", "Beispiel GmbH,Bonn"].join("\n"),
      source: "Testimport",
      fallbackIndustry: "Sanitaer",
      fallbackCountry: "Deutschland",
      limit: 10
    });

    expect(results[0].industry).toBe("Sanitaer");
  });

  it("builds 11880 search urls", () => {
    expect(build11880SearchUrl("Dachdecker", "Köln")).toBe(
      "https://www.11880.com/suche/dachdecker/koeln"
    );
    expect(build11880SearchUrl("Friseur", null)).toBe("https://www.11880.com/suche/friseur");
  });

  it("parses 11880 json-ld search results", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@context": "http://schema.org",
      "@type": "SearchResultsPage",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            item: {
              "@type": "LocalBusiness",
              name: "Muster Dach GmbH",
              url: "https://www.11880.com/branchenbuch/muster.html",
              email: "info@muster.de",
              telephone: "(0228) 123456",
              address: {
                "@type": "PostalAddress",
                postalCode: "53111",
                addressLocality: "Bonn",
                addressRegion: "Nordrhein-Westfalen",
                streetAddress: "Hauptstr. 1"
              }
            }
          }
        ]
      }
    })}</script>`;

    const results = parse11880SearchResults({
      html,
      industry: "Dachdecker",
      country: "Deutschland",
      limit: 10
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      source: "11880 Vorschau",
      companyName: "Muster Dach GmbH",
      industry: "Dachdecker",
      street: "Hauptstr. 1",
      postalCode: "53111",
      city: "Bonn",
      email: "info@muster.de",
      phone: "(0228) 123456"
    });
  });
});
