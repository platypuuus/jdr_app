import { readFile } from "node:fs/promises";
import { tirerElement, tirerSalle } from "../web/tirage.js";

const data = JSON.parse(await readFile("web/data.json", "utf-8"));
const graines = Array.from({ length: 200 }, (_, i) => `graine-${i}`);

let echecs = 0;

function verifier(intitule, condition) {
  if (!condition) {
    console.log(`ECHEC : ${intitule}`);
    echecs++;
  }
}

const cle = (salle) =>
  [
    salle.lieu,
    salle.decors.map((d) => d.terme).join(","),
    salle.occupant.slug,
    salle.piege?.slug ?? "-",
    salle.butin?.slug ?? "-",
    salle.arme?.slug ?? "-",
  ].join("|");

const cles = new Set();
let avecEnigme = 0;
for (const graine of graines) {
  const a = tirerSalle(data, graine);
  const b = tirerSalle(data, graine);
  verifier(`salle reproductible pour ${graine}`, cle(a) === cle(b));
  verifier(`salle ${graine} : 2 decors distincts`, a.decors.length === 2 && a.decors[0].terme !== a.decors[1].terme);
  verifier(`salle ${graine} : occupant coherent avec le lieu`, a.occupant.lieux.includes(a.lieu));
  verifier(`salle ${graine} : butin ou arme, jamais les deux`, (a.butin === null) !== (a.arme === null));
  if (a.enigme !== null) avecEnigme++;
  cles.add(cle(a));
}
console.log(`salles avec enigme : ${avecEnigme}/200`);
verifier(`variete des salles (${cles.size}/200 tirages distincts)`, cles.size > 190);

verifier(
  "toutes les enigmes ont question et reponse",
  data.enigmes.every((e) => e.question.length > 0 && e.reponse.length > 0 && e.slug.length > 0)
);
verifier(
  "slugs d'enigmes uniques",
  new Set(data.enigmes.map((e) => e.slug)).size === data.enigmes.length
);

for (const type of ["monstre", "piege", "butin", "arme", "enigme"]) {
  const vus = new Set();
  for (const graine of graines) {
    const a = tirerElement(data, type, graine);
    const b = tirerElement(data, type, graine);
    verifier(`${type} reproductible pour ${graine}`, a.slug === b.slug);
    vus.add(a.slug);
  }
  console.log(`${type} : ${vus.size} valeurs distinctes sur 200 tirages`);
}

console.log(echecs === 0 ? "\nTOUS LES TESTS PASSENT" : `\n${echecs} ECHECS`);
process.exitCode = echecs === 0 ? 0 : 1;
