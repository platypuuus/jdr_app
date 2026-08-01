import { fetchJson } from "./httpJson.js";

const SRD_DOCUMENT = "wotc-srd";

interface Page<T> {
  next: string | null;
  results: T[];
}

async function fetchAllPages<T>(firstUrl: string): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = firstUrl;
  while (url !== null) {
    const page: Page<T> = await fetchJson<Page<T>>(url);
    results.push(...page.results);
    url = page.next;
  }
  return results;
}

export interface MonsterEntry {
  slug: string;
  name: string;
  size: string;
  type: string;
  challengeRating: string;
  hitPoints: number;
  armorClass: number;
  environments: string[];
}

export async function listMonsters(): Promise<MonsterEntry[]> {
  const results = await fetchAllPages<{
    slug: string;
    name: string;
    size: string;
    type: string;
    challenge_rating: string;
    hit_points: number;
    armor_class: number;
    environments: string[] | null;
  }>(`https://api.open5e.com/v1/monsters/?limit=500&document__slug=${SRD_DOCUMENT}`);

  return results.map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    size: entry.size,
    type: entry.type,
    challengeRating: entry.challenge_rating,
    hitPoints: entry.hit_points,
    armorClass: entry.armor_class,
    environments: entry.environments ?? [],
  }));
}

export interface MagicItemEntry {
  slug: string;
  name: string;
  type: string;
  rarity: string;
  desc: string;
  requiresAttunement: boolean;
}

// Certaines descriptions embarquent un tableau markdown dont la ligne de separation
// est un bloc de tirets sans espace, intraduisible et illisible une fois affiche.
const TABLE_SEPARATOR_ROW = /^\s*\|[\s|:-]*\|\s*$/gm;

function cleanDescription(desc: string): string {
  return desc.replace(TABLE_SEPARATOR_ROW, "").replace(/\n{3,}/g, "\n\n").trim();
}

export async function listMagicItems(): Promise<MagicItemEntry[]> {
  const results = await fetchAllPages<{
    slug: string;
    name: string;
    type: string;
    rarity: string;
    desc: string;
    requires_attunement: string;
  }>(`https://api.open5e.com/v1/magicitems/?limit=500&document__slug=${SRD_DOCUMENT}`);

  return results.map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    type: entry.type,
    rarity: entry.rarity,
    desc: cleanDescription(entry.desc),
    requiresAttunement: entry.requires_attunement.trim().length > 0,
  }));
}

export interface WeaponEntry {
  slug: string;
  name: string;
  category: string;
  cost: string;
  weight: string;
  damageDice: string;
  damageType: string;
  properties: string[];
}

export async function listWeapons(): Promise<WeaponEntry[]> {
  const results = await fetchAllPages<{
    slug: string;
    name: string;
    category: string;
    cost: string;
    weight: string;
    damage_dice: string;
    damage_type: string;
    properties: string[] | null;
  }>(`https://api.open5e.com/v1/weapons/?limit=500&document__slug=${SRD_DOCUMENT}`);

  return results.map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    category: entry.category,
    cost: entry.cost,
    weight: entry.weight,
    damageDice: entry.damage_dice,
    damageType: entry.damage_type,
    properties: entry.properties ?? [],
  }));
}

export interface TrapEntry {
  slug: string;
  name: string;
  kind: string;
  desc: string;
}

const SAMPLE_TRAPS_HEADING = "## Sample Traps";
const TRAP_KIND_PATTERN = /^_(.+)_$/;
const TRAP_DESC_PARAGRAPHS = 2;
const COMBINING_MARKS = /[̀-ͯ]/g;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseTrapBlock(block: string): TrapEntry | null {
  const [heading, ...rest] = block.split("\n");
  const name = heading?.trim();
  if (name === undefined || name.length === 0) return null;

  const paragraphs = rest
    .join("\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const kindMatch = paragraphs[0]?.match(TRAP_KIND_PATTERN);
  const kind = kindMatch?.[1] ?? "";
  const body = kindMatch ? paragraphs.slice(1) : paragraphs;

  const desc = body
    .slice(0, TRAP_DESC_PARAGRAPHS)
    .join(" ")
    .replace(/[*_#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (desc.length === 0) return null;

  return { slug: slugify(name), name, kind, desc };
}

export async function listTraps(): Promise<TrapEntry[]> {
  const sections = await fetchAllPages<{ name: string; desc: string }>(
    "https://api.open5e.com/v1/sections/?limit=200"
  );
  const trapSection = sections.find((section) => section.name === "Traps");
  if (trapSection === undefined) {
    throw new Error("Section 'Traps' introuvable sur Open5e");
  }

  const samplesIndex = trapSection.desc.indexOf(SAMPLE_TRAPS_HEADING);
  if (samplesIndex === -1) {
    throw new Error("Sous-section 'Sample Traps' introuvable");
  }

  return trapSection.desc
    .slice(samplesIndex)
    .split("\n### ")
    .slice(1)
    .map(parseTrapBlock)
    .filter((trap): trap is TrapEntry => trap !== null);
}
