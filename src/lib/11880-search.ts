import { DirectoryCompany } from "@/lib/directory-provider";
import { normalizeWebsite, websiteFromEmail } from "@/lib/lead-utils";

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

type HtmlResultEntry = {
  companyName?: string;
  sourceUrl?: string;
  website?: string;
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalizeText(value?: string | null) {
  return decodeHtml(value ?? "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalize11880Url(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("/")) return `https://www.11880.com${value}`;
  return value;
}

function is11880OwnedUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "11880.com" || hostname.endsWith(".11880.com") || hostname.includes("11880-")
    );
  } catch {
    return true;
  }
}

function isExternalWebsite(value: string) {
  return /^https?:\/\//i.test(value) && !is11880OwnedUrl(value);
}

function findWebsiteText(html: string) {
  const text = decodeHtml(html.replace(/<[^>]+>/g, " "));
  const matches = text.match(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/gi) ?? [];
  const domain = matches.find((candidate) => {
    const lower = candidate.toLowerCase();
    const tld = lower.split(".").at(-1);
    return (
      !lower.startsWith("dr.") &&
      Boolean(tld && ["de", "com", "net", "org", "info", "eu"].includes(tld)) &&
      !is11880OwnedUrl(`https://${candidate}`)
    );
  });

  return domain;
}

export function parse11880DetailWebsite(html: string) {
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][\s\S]*?<\/a>/gi;
  let anchorMatch = anchorPattern.exec(html);

  while (anchorMatch) {
    const anchorHtml = anchorMatch[0];
    const href = decodeHtml(anchorMatch[1]);
    if (
      isExternalWebsite(href) &&
      (/icon-website/i.test(anchorHtml) ||
        />\s*Website\s*</i.test(anchorHtml) ||
        /itemprop=["']url["']/i.test(anchorHtml))
    ) {
      return normalizeWebsite(href);
    }

    anchorMatch = anchorPattern.exec(html);
  }

  return null;
}

export async function fetch11880DetailWebsite(sourceUrl?: string | null) {
  if (!sourceUrl) return null;

  try {
    const url = new URL(sourceUrl);
    if (url.hostname !== "www.11880.com" || !url.pathname.includes("/branchenbuch/")) {
      return null;
    }

    const response = await fetch(url, {
      headers: {
        "user-agent": "LeadScout CRM local preview"
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) return null;
    return parse11880DetailWebsite(await response.text());
  } catch {
    return null;
  }
}

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

function parseHtmlResultEntries(html: string): HtmlResultEntry[] {
  const entries: HtmlResultEntry[] = [];
  const entryPattern = /<li\b(?=[^>]*\bresult-list-entry\b)[\s\S]*?<\/li>/gi;
  let entryMatch = entryPattern.exec(html);

  while (entryMatch) {
    const entryHtml = entryMatch[0];
    const nameMatch = /\bdata-name=["']([^"']+)["']/i.exec(entryHtml);
    const detailMatch =
      /<a\b[^>]*class=["'][^"']*\bentry-detail-link\b[^"']*["'][^>]*href=["']([^"']+)["']/i.exec(
        entryHtml
      );
    const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let anchorMatch = anchorPattern.exec(entryHtml);
    let website: string | undefined;

    while (anchorMatch) {
      const href = decodeHtml(anchorMatch[1]);
      if (isExternalWebsite(href)) {
        website = href;
        break;
      }
      anchorMatch = anchorPattern.exec(entryHtml);
    }

    entries.push({
      companyName: nameMatch ? decodeHtml(nameMatch[1]) : undefined,
      sourceUrl: normalize11880Url(detailMatch?.[1]) ?? undefined,
      website: website ?? findWebsiteText(entryHtml)
    });

    entryMatch = entryPattern.exec(html);
  }

  return entries;
}

export function parse11880SearchResults(input: {
  html: string;
  industry: string;
  country: string;
  limit: number;
}): DirectoryCompany[] {
  const htmlEntries = parseHtmlResultEntries(input.html);
  const websiteByCompanyName = new Map(
    htmlEntries
      .filter((entry) => entry.companyName && entry.website)
      .map((entry) => [normalizeText(entry.companyName), entry.website])
  );
  const websiteBySourceUrl = new Map(
    htmlEntries
      .filter((entry) => entry.sourceUrl && entry.website)
      .map((entry) => [entry.sourceUrl, entry.website])
  );

  return parseSearchResultsJsonLd(input.html)
    .map((listItem) => {
      const item = listItem.item;
      if (!item?.name) return null;
      const sourceUrl = normalize11880Url(item.url);
      const website =
        (sourceUrl ? websiteBySourceUrl.get(sourceUrl) : undefined) ??
        websiteByCompanyName.get(normalizeText(item.name)) ??
        websiteFromEmail(item.email);

      return {
        externalId: sourceUrl ?? item.url,
        source: "11880 Vorschau",
        sourceUrl: sourceUrl ?? item.url,
        companyName: item.name,
        industry: input.industry,
        street: item.address?.streetAddress,
        postalCode: item.address?.postalCode,
        city: item.address?.addressLocality,
        state: item.address?.addressRegion,
        country: input.country,
        phone: item.telephone,
        email: item.email,
        website: normalizeWebsite(website)
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
