import { DirectoryCompany } from "@/lib/directory-provider";

const headerAliases: Record<keyof Omit<DirectoryCompany, "source" | "country">, string[]> = {
  externalId: ["id", "externalid", "externe id", "quelle id"],
  sourceUrl: ["sourceurl", "quell-url", "quelle url", "eintrags-url", "url quelle"],
  companyName: ["firma", "firmenname", "name", "unternehmen", "company", "companyname"],
  industry: ["branche", "gewerk", "industry", "kategorie"],
  street: ["strasse", "straße", "street", "adresse", "anschrift"],
  postalCode: ["plz", "postleitzahl", "zip", "zipcode", "postalcode"],
  city: ["stadt", "ort", "city"],
  state: ["bundesland", "landkreis", "region", "state"],
  phone: ["telefon", "telefonnummer", "phone", "tel"],
  email: ["email", "e-mail", "mail"],
  website: ["website", "webseite", "homepage", "domain", "url"]
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
}

function detectDelimiter(firstLine: string) {
  const delimiters = [";", ",", "\t"];
  return delimiters
    .map((delimiter) => ({
      delimiter,
      count: firstLine.split(delimiter).length
    }))
    .sort((first, second) => second.count - first.count)[0].delimiter;
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function mapHeaders(headers: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping = new Map<keyof Omit<DirectoryCompany, "source" | "country">, number>();

  Object.entries(headerAliases).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.map(normalizeHeader).includes(header)
    );
    if (index >= 0) mapping.set(field as keyof Omit<DirectoryCompany, "source" | "country">, index);
  });

  return mapping;
}

export function parseDirectoryCsv(input: {
  csv: string;
  source: string;
  fallbackIndustry?: string | null;
  fallbackCountry: string;
  limit: number;
}): DirectoryCompany[] {
  const lines = input.csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  const mapping = mapHeaders(headers);
  const limit = Math.min(Math.max(input.limit, 1), 500);

  return lines
    .slice(1)
    .map((line, index) => {
      const cells = parseCsvLine(line, delimiter);
      const read = (field: keyof Omit<DirectoryCompany, "source" | "country">) => {
        const cellIndex = mapping.get(field);
        return cellIndex === undefined ? undefined : cells[cellIndex]?.trim() || undefined;
      };

      return {
        externalId: read("externalId") ?? `manual-${index + 1}`,
        source: input.source,
        sourceUrl: read("sourceUrl"),
        companyName: read("companyName") ?? "",
        industry: read("industry") ?? input.fallbackIndustry ?? undefined,
        street: read("street"),
        postalCode: read("postalCode"),
        city: read("city"),
        state: read("state"),
        country: input.fallbackCountry,
        phone: read("phone"),
        email: read("email"),
        website: read("website")
      };
    })
    .filter((company) => company.companyName.length > 0)
    .slice(0, limit);
}
