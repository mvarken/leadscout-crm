import { describe, expect, it } from "vitest";
import { searchMockDirectory } from "@/lib/directory-provider";

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
});
