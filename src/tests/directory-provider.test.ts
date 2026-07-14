import { describe, expect, it } from "vitest";
import {
  directoryProviderDefinitions,
  getDirectoryProviderDefinition,
  searchDirectory,
  searchMockDirectory
} from "@/lib/directory-provider";
import { parseDirectoryCsv } from "@/lib/manual-import";

describe("directory provider", () => {
  it("returns normalized mock companies for a search", async () => {
    const results = await searchMockDirectory({
      industry: "Dachdecker",
      city: "Bonn",
      state: "NRW",
      postalCode: "53111",
      country: "Deutschland",
      limit: 3
    });

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      source: "mock-directory",
      industry: "Dachdecker",
      city: "Bonn",
      state: "NRW",
      postalCode: "53111",
      country: "Deutschland"
    });
    expect(results[0].email).toContain("@");
    expect(results[0].website).toMatch(/^https:\/\/www\./);
  });

  it("caps mock result count at 50", async () => {
    const results = await searchMockDirectory({
      industry: "Sanitaer",
      country: "Deutschland",
      limit: 100
    });

    expect(results).toHaveLength(50);
  });

  it("keeps 11880 prepared but not implemented", () => {
    expect(getDirectoryProviderDefinition("11880-com")).toMatchObject({
      name: "11880 Vorbereitung",
      implemented: false
    });
    expect(directoryProviderDefinitions.some((provider) => provider.key === "mock-directory")).toBe(
      true
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
});
