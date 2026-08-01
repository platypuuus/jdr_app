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
