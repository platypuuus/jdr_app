import { mkdir, readFile, writeFile } from "node:fs/promises";
import { listEnglishRiddles } from "../api/englishRiddles.js";
import { listFrenchRiddles } from "../api/frenchRiddles.js";

export const CANDIDATES_PATH = "data/enigmes-candidates.json";
export const DECISIONS_PATH = "data/enigmes-decisions.json";

export type Decision = "garde" | "jete";

export interface Enigme {
  slug: string;
  question: string;
  reponse: string;
  langue: "fr" | "en";
}

export async function listCandidates(): Promise<Enigme[]> {
  const [francaises, anglaises] = await Promise.all([listFrenchRiddles(), listEnglishRiddles()]);

  return [
    ...francaises.map((e): Enigme => ({ ...e, langue: "fr" })),
    ...anglaises.map((e): Enigme => ({ ...e, langue: "en" })),
  ];
}

export async function readDecisions(): Promise<Record<string, Decision>> {
  try {
    return JSON.parse(await readFile(DECISIONS_PATH, "utf-8")) as Record<string, Decision>;
  } catch {
    return {};
  }
}

export async function writeDecisions(decisions: Record<string, Decision>): Promise<void> {
  await mkdir("data", { recursive: true });
  await writeFile(DECISIONS_PATH, JSON.stringify(decisions, null, 2), "utf-8");
}

export async function writeCandidates(candidates: readonly Enigme[]): Promise<void> {
  await mkdir("data", { recursive: true });
  await writeFile(CANDIDATES_PATH, JSON.stringify(candidates, null, 2), "utf-8");
}

export async function readCandidates(): Promise<Enigme[]> {
  return JSON.parse(await readFile(CANDIDATES_PATH, "utf-8")) as Enigme[];
}

// Tant qu'aucune enigme n'a ete triee, on les garde toutes : l'application reste
// utilisable avant que le tri ait commence.
export function appliquerDecisions(
  candidates: readonly Enigme[],
  decisions: Record<string, Decision>
): Enigme[] {
  const triees = Object.values(decisions).length > 0;
  if (!triees) return [...candidates];
  return candidates.filter((enigme) => decisions[enigme.slug] === "garde");
}
