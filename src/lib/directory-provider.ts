export type DirectorySearchInput = {
  industry: string;
  country: string;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  limit: number;
};

export type DirectoryCompany = {
  externalId?: string;
  source: string;
  sourceUrl?: string;
  companyName: string;
  industry?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
};

const companyWords = ["Meister", "Nord", "Altstadt", "Hansa", "Rhein", "City", "Profi", "Muster"];
const streets = ["Hauptstrasse", "Industrieweg", "Marktstrasse", "Bahnhofstrasse", "Ring"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function searchMockDirectory(
  input: DirectorySearchInput
): Promise<DirectoryCompany[]> {
  const limit = Math.min(Math.max(input.limit, 1), 50);
  const city = input.city?.trim() || "Koeln";
  const state = input.state?.trim() || "NRW";
  const postalCode = input.postalCode?.trim() || "50667";
  const industry = input.industry.trim();

  return Array.from({ length: limit }, (_, index) => {
    const word = companyWords[index % companyWords.length];
    const street = streets[index % streets.length];
    const companyName = `${word} ${industry} ${city} ${index + 1} GmbH`;
    const domain = `${slugify(word)}-${slugify(industry)}-${slugify(city)}-${index + 1}.de`;

    return {
      externalId: `mock-${slugify(industry)}-${slugify(city)}-${index + 1}`,
      source: "mock-directory",
      sourceUrl: `https://example.local/mock/${slugify(industry)}/${slugify(city)}/${index + 1}`,
      companyName,
      industry,
      street: `${street} ${index + 3}`,
      postalCode,
      city,
      state,
      country: input.country || "Deutschland",
      phone: `+49 221 100${String(index + 1).padStart(3, "0")}`,
      email: `info@${domain}`,
      website: `https://www.${domain}`
    };
  });
}

export async function searchDirectory(provider: string, input: DirectorySearchInput) {
  if (provider !== "mock-directory") {
    throw new Error("Dieser Provider ist noch nicht implementiert.");
  }

  return searchMockDirectory(input);
}
