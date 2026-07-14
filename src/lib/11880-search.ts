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
