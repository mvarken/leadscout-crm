import { describe, expect, it } from "vitest";
import {
  directoryProviderDefinitions,
  getDirectoryProviderDefinition,
  searchDirectory
} from "@/lib/directory-provider";
import {
  build11880SearchUrl,
  parse11880DetailWebsite,
  parse11880SearchResults
} from "@/lib/11880-search";
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

  it("adds 11880 websites from html result buttons", () => {
    const html = `
      <script type="application/ld+json">${JSON.stringify({
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
                name: "Staudengärtnerei David Müller",
                url: "https://www.11880.com/branchenbuch/bonn/132381072B54173993/staudengaertnerei-david-mueller.html",
                telephone: "(0228) 22790077"
              }
            }
          ]
        }
      })}</script>
      <li class="result-list-entry search-result-list-item" data-name="Staudeng&auml;rtnerei David M&uuml;ller">
        <a href="/branchenbuch/bonn/132381072B54173993/staudengaertnerei-david-mueller.html" class="result-list-entry-title entry-detail-link">
          Staudengärtnerei David Müller
        </a>
        <a class="customerButton" itemprop="url" href="http://www.dachstauden.com/" title="Online Shop">
          Online Shop
        </a>
      </li>
    `;

    const results = parse11880SearchResults({
      html,
      industry: "Dachdecker",
      country: "Deutschland",
      limit: 10
    });

    expect(results[0].website).toBe("http://www.dachstauden.com/");
  });

  it("derives 11880 websites from email domains when no website button exists", () => {
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
              name: "Dr.med.dent. Ulrich Thaler Zahnarzt",
              url: "https://www.11880.com/branchenbuch/brueggen-niederrhein/111915897B41348960/dr-med-dent-ulrich-thaler-zahnarzt.html",
              email: "info@praxis-thaler.de",
              telephone: "(02163) 95710"
            }
          }
        ]
      }
    })}</script>`;

    const results = parse11880SearchResults({
      html,
      industry: "Zahnarzt",
      country: "Deutschland",
      limit: 10
    });

    expect(results[0].website).toBe("https://praxis-thaler.de");
  });

  it("reads 11880 websites from visible domain text", () => {
    const html = `
      <script type="application/ld+json">${JSON.stringify({
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
                name: "Dr.med.dent. Ulrich Thaler Zahnarzt",
                url: "https://www.11880.com/branchenbuch/brueggen-niederrhein/111915897B41348960/dr-med-dent-ulrich-thaler-zahnarzt.html"
              }
            }
          ]
        }
      })}</script>
      <li class="result-list-entry search-result-list-item" data-name="Dr.med.dent. Ulrich Thaler Zahnarzt">
        <a href="/branchenbuch/brueggen-niederrhein/111915897B41348960/dr-med-dent-ulrich-thaler-zahnarzt.html" class="result-list-entry-title entry-detail-link">
          Dr.med.dent. Ulrich Thaler Zahnarzt
        </a>
        <span>praxis-thaler.de</span>
      </li>
    `;

    const results = parse11880SearchResults({
      html,
      industry: "Zahnarzt",
      country: "Deutschland",
      limit: 10
    });

    expect(results[0].website).toBe("https://praxis-thaler.de");
  });

  it("reads websites from 11880 detail pages", () => {
    const html = `
      <a rel="noopener" href="http://www.praxis-thaler.de" target="_blank">
        <div class="mobile-action-bar__icon icon icon-website"></div>
        <div class="mobile-action-bar__label">Website</div>
        <meta itemprop="url" content="http://www.praxis-thaler.de" />
      </a>
    `;

    expect(parse11880DetailWebsite(html)).toBe("http://www.praxis-thaler.de");
  });
});
