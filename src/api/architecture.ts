import { fetchJson } from "./httpJson.js";

const WIKIPEDIA_ENDPOINT = "https://fr.wikipedia.org/w/api.php";
const GLOSSARY_TITLE = "Glossaire de l'architecture";

const ENTRY_PATTERN = /^([A-ZÀ-Ý][A-Za-zÀ-ÿ'’\- ]{2,30})\s*:\s+(.{40,300})$/;

interface ExtractResponse {
  query: { pages: Record<string, { title: string; extract?: string }> };
}

export interface ArchitectureEntry {
  terme: string;
  definition: string;
}

async function fetchExtract(title: string): Promise<string> {
  const url = `${WIKIPEDIA_ENDPOINT}?action=query&prop=extracts&explaintext=1&format=json&titles=${encodeURIComponent(title)}`;
  const payload = await fetchJson<ExtractResponse>(url);
  const page = Object.values(payload.query.pages)[0];
  const extract = page?.extract;
  if (extract === undefined || extract.length === 0) {
    throw new Error(`Extrait Wikipedia vide pour "${title}"`);
  }
  return extract;
}

function parseGlossary(extract: string): ArchitectureEntry[] {
  const entries = new Map<string, string>();

  for (const line of extract.split("\n")) {
    const match = line.trim().match(ENTRY_PATTERN);
    if (match === null) continue;

    const terme = match[1]?.trim();
    const definition = match[2]?.trim();
    if (terme === undefined || definition === undefined) continue;
    // Renvois internes du glossaire ("Voir X"), sans contenu descriptif exploitable.
    if (/^voir\b/i.test(definition)) continue;

    entries.set(terme, definition);
  }

  return [...entries].map(([terme, definition]) => ({ terme, definition }));
}

export async function listArchitectureTerms(): Promise<ArchitectureEntry[]> {
  return parseGlossary(await fetchExtract(GLOSSARY_TITLE));
}
