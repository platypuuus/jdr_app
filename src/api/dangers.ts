import { fetchJson } from "./httpJson.js";

const SECTIONS_URL = "https://api.open5e.com/v1/sections/?limit=200";
const POISONS_URL =
  "https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2024/en/5e-SRD-Poisons.json";

const DESC_PARAGRAPHS = 2;
const COMBINING_MARKS = /[̀-ͯ]/g;

export interface DangerEntry {
  slug: string;
  name: string;
  kind: string;
  desc: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function tidy(text: string): string {
  return text
    .replace(/[*_#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface NamedBlock {
  name: string;
  paragraphs: string[];
}

function splitNamedBlocks(text: string): NamedBlock[] {
  return text
    .split("\n### ")
    .slice(1)
    .map((block) => {
      const [heading, ...rest] = block.split("\n");
      return {
        name: heading?.trim() ?? "",
        paragraphs: rest
          .join("\n")
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter((paragraph) => paragraph.length > 0),
      };
    })
    .filter((block) => block.name.length > 0);
}

async function fetchSection(name: string): Promise<string> {
  const page = await fetchJson<{ results: { name: string; desc: string }[] }>(SECTIONS_URL);
  const section = page.results.find((entry) => entry.name === name);
  if (section === undefined) {
    throw new Error(`Section "${name}" introuvable sur Open5e`);
  }
  return section.desc;
}

function sliceFrom(text: string, heading: string): string {
  const index = text.indexOf(heading);
  if (index === -1) throw new Error(`Sous-section "${heading}" introuvable`);
  return text.slice(index);
}

// "Pits" regroupe quatre pieges distincts dans un seul bloc, chacun introduit par
// un intitule en gras et italique. Les separer triple la variete des fosses.
const VARIANT_PATTERN = /\*\*_([^_]+)_\*\*\.\s*([\s\S]*?)(?=\n\n\*\*_|$)/g;
const TRAP_KIND_PATTERN = /^_(.+)_$/;

function expandVariants(block: NamedBlock, kind: string): DangerEntry[] {
  const body = block.paragraphs.join("\n\n");
  const variants = [...body.matchAll(VARIANT_PATTERN)];
  if (variants.length === 0) return [];

  return variants.flatMap((variant) => {
    const name = variant[1]?.trim();
    const desc = tidy(variant[2] ?? "");
    if (name === undefined || name.length === 0 || desc.length === 0) return [];
    return [{ slug: slugify(name), name, kind, desc }];
  });
}

export async function listTraps(): Promise<DangerEntry[]> {
  const text = sliceFrom(await fetchSection("Traps"), "## Sample Traps");

  return splitNamedBlocks(text).flatMap((block) => {
    const kindMatch = block.paragraphs[0]?.match(TRAP_KIND_PATTERN);
    const kind = kindMatch?.[1] ?? "";
    const body = kindMatch ? block.paragraphs.slice(1) : block.paragraphs;

    const variants = expandVariants({ ...block, paragraphs: body }, kind);
    if (variants.length > 0) return variants;

    const desc = tidy(body.slice(0, DESC_PARAGRAPHS).join(" "));
    if (desc.length === 0) return [];
    return [{ slug: slugify(block.name), name: block.name, kind, desc }];
  });
}

export async function listDiseases(): Promise<DangerEntry[]> {
  const text = sliceFrom(await fetchSection("Diseases"), "## Sample Diseases");

  return splitNamedBlocks(text).flatMap((block) => {
    const desc = tidy(block.paragraphs.slice(0, DESC_PARAGRAPHS).join(" "));
    if (desc.length === 0) return [];
    return [{ slug: slugify(block.name), name: block.name, kind: "Disease", desc }];
  });
}

export async function listPoisons(): Promise<DangerEntry[]> {
  const poisons = await fetchJson<
    { index: string; name: string; type: string; description: string }[]
  >(POISONS_URL);

  return poisons.map((poison) => ({
    slug: poison.index,
    name: poison.name,
    kind: `Poison, ${poison.type}`,
    desc: tidy(poison.description),
  }));
}

export async function listDangers(): Promise<DangerEntry[]> {
  const [traps, diseases, poisons] = await Promise.all([
    listTraps(),
    listDiseases(),
    listPoisons(),
  ]);
  return [...traps, ...diseases, ...poisons];
}
