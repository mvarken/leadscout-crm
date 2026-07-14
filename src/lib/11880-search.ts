import { DirectoryCompany } from "@/lib/directory-provider";

function slugify11880(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function build11880SearchUrl(industry: string, location?: string | null) {
  const industrySlug = slugify11880(industry);
  const locationSlug = location ? slugify11880(location) : "";

  if (!industrySlug) return "https://www.11880.com/";
  if (!locationSlug) return `https://www.11880.com/suche/${industrySlug}`;

  return `https://www.11880.com/suche/${industrySlug}/${locationSlug}`;
}

type JsonLdListItem = {
  position?: number;
  item?: {
    name?: string;
    url?: string;
    email?: string;
    telephone?: string;
    address?: {
      postalCode?: string;
      addressLocality?: string;
      addressRegion?: string;
      streetAddress?: string;
    };
  };
};

function parseSearchResultsJsonLd(html: string) {
  const scripts: string[] = [];
  const scriptPattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = scriptPattern.exec(html);

  while (match) {
    scripts.push(match[1]);
    match = scriptPattern.exec(html);
  }

  for (const script of scripts) {
    try {
      const data = JSON.parse(script);
      const itemList = data?.mainEntity?.itemListElement;

      if (Array.isArray(itemList)) {
        return itemList as JsonLdListItem[];
      }
    } catch {
      // Ignore unrelated JSON-LD blocks.
    }
  }

  return [];
}

export function parse11880SearchResults(input: {
  html: string;
  industry: string;
  country: string;
  limit: number;
}): DirectoryCompany[] {
  return parseSearchResultsJsonLd(input.html)
    .map((listItem) => {
      const item = listItem.item;
      if (!item?.name) return null;

      return {
        externalId: item.url,
        source: "11880 Vorschau",
        sourceUrl: item.url,
        companyName: item.name,
        industry: input.industry,
        street: item.address?.streetAddress,
        postalCode: item.address?.postalCode,
        city: item.address?.addressLocality,
        state: item.address?.addressRegion,
        country: input.country,
        phone: item.telephone,
        email: item.email
      };
    })
    .filter(Boolean)
    .slice(0, input.limit) as DirectoryCompany[];
}

export async function search11880Preview(input: {
  industry: string;
  location?: string | null;
  country?: string;
  limit?: number;
}) {
  const url = build11880SearchUrl(input.industry, input.location);
  const response = await fetch(url, {
    headers: {
      "user-agent": "LeadScout CRM local preview"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`11880 konnte nicht geladen werden (${response.status}).`);
  }

  const html = await response.text();

  return {
    url,
    companies: parse11880SearchResults({
      html,
      industry: input.industry,
      country: input.country ?? "Deutschland",
      limit: Math.min(Math.max(input.limit ?? 10, 1), 10)
    })
  };
}
