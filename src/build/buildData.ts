import { mkdir, writeFile } from "node:fs/promises";
import { listArchitectureTerms } from "../api/architecture.js";
import { listMagicItems, listMonsters, listTraps, listWeapons } from "../api/open5e.js";

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
  const [architecture, monsters, traps, magicItems, weapons] = await Promise.all([
    listArchitectureTerms(),
    listMonsters(),
    listTraps(),
    listMagicItems(),
    listWeapons(),
  ]);
  console.log(
    `  architecture: ${architecture.length} | monstres: ${monsters.length} | pieges: ${traps.length} | butins: ${magicItems.length} | armes: ${weapons.length}`
  );

  const bundle: Bundle = {
    genereLe: new Date().toISOString(),
    sources: [
      {
        nom: "Open5e (SRD 5.1)",
        url: "https://api.open5e.com",
        licence: "OGL 1.0a / Wizards of the Coast SRD",
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
    pieges: traps.map((trap) => ({
      slug: trap.slug,
      nom: trap.name,
      nature: trap.kind,
      texte: trap.desc,
    })),
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
