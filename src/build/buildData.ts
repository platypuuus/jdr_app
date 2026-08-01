import { mkdir, writeFile } from "node:fs/promises";
import { listArchitectureTerms } from "../api/architecture.js";
import { listDangers } from "../api/dangers.js";
import { listMagicItems, listMonsters, listWeapons } from "../api/open5e.js";
import { listFrenchRiddles } from "../api/frenchRiddles.js";

const OUT_PATH = "web/data.json";

interface Bundle {
  genereLe: string;
  sources: { nom: string; url: string; licence: string }[];
  salles: { terme: string; definition: string }[];
  lieux: string[];
  monstres: {
    slug: string;
    nom: string;
    taille: string;
    type: string;
    fp: string;
    pv: number;
    ca: number;
    lieux: string[];
  }[];
  pieges: { slug: string; nom: string; nature: string; texte: string }[];
  enigmes: { slug: string; question: string; reponse: string }[];
  butins: {
    slug: string;
    nom: string;
    type: string;
    rarete: string;
    texte: string;
    harmonisation: boolean;
  }[];
  armes: {
    slug: string;
    nom: string;
    categorie: string;
    degats: string;
    typeDegats: string;
    cout: string;
    poids: string;
    proprietes: string[];
  }[];
}

async function main(): Promise<void> {
  console.log("Recuperation des sources (cache disque actif)...");
  const [architecture, monsters, dangers, magicItems, weapons, riddles] = await Promise.all([
    listArchitectureTerms(),
    listMonsters(),
    listDangers(),
    listMagicItems(),
    listWeapons(),
    listFrenchRiddles(),
  ]);
  const parNature = dangers.reduce<Record<string, number>>((total, danger) => {
    const famille = danger.kind.split(",")[0] ?? danger.kind;
    return { ...total, [famille]: (total[famille] ?? 0) + 1 };
  }, {});
  console.log(
    `  architecture: ${architecture.length} | monstres: ${monsters.length} | dangers: ${dangers.length} | butins: ${magicItems.length} | armes: ${weapons.length} | enigmes: ${riddles.length}`
  );
  console.log(`  dangers par nature: ${JSON.stringify(parNature)}`);

  const bundle: Bundle = {
    genereLe: new Date().toISOString(),
    sources: [
      {
        nom: "Open5e (SRD 5.1)",
        url: "https://api.open5e.com",
        licence: "OGL 1.0a / Wizards of the Coast SRD",
      },
      {
        nom: "SRD 5.2 (poisons)",
        url: "https://github.com/5e-bits/5e-database",
        licence: "CC BY 4.0 / Wizards of the Coast",
      },
      {
        nom: "E. Rolland, Devinettes populaires de la France (1877)",
        url: "https://archive.org/details/devinettesoueni01parigoog",
        licence: "domaine public",
      },
      {
        nom: "Wikipedia FR, Glossaire de l'architecture",
        url: "https://fr.wikipedia.org/wiki/Glossaire_de_l%27architecture",
        licence: "CC BY-SA 4.0",
      },
    ],
    salles: architecture.map((entry) => ({ terme: entry.terme, definition: entry.definition })),
    lieux: [...new Set(monsters.flatMap((monster) => monster.environments))].sort(),
    monstres: monsters.map((monster) => ({
      slug: monster.slug,
      nom: monster.name,
      taille: monster.size,
      type: monster.type,
      fp: monster.challengeRating,
      pv: monster.hitPoints,
      ca: monster.armorClass,
      lieux: monster.environments,
    })),
    pieges: dangers.map((danger) => ({
      slug: danger.slug,
      nom: danger.name,
      nature: danger.kind,
      texte: danger.desc,
    })),
    enigmes: riddles,
    butins: magicItems.map((item) => ({
      slug: item.slug,
      nom: item.name,
      type: item.type,
      rarete: item.rarity,
      texte: item.desc,
      harmonisation: item.requiresAttunement,
    })),
    armes: weapons.map((weapon) => ({
      slug: weapon.slug,
      nom: weapon.name,
      categorie: weapon.category,
      degats: weapon.damageDice,
      typeDegats: weapon.damageType,
      cout: weapon.cost,
      poids: weapon.weight,
      proprietes: weapon.properties,
    })),
  };

  await mkdir("web", { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(bundle), "utf-8");
  console.log(`\nEcrit : ${OUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
