import { createHash } from "node:crypto";
import { fetchText } from "./httpJson.js";

// Eugene Rolland, "Devinettes ou enigmes populaires de la France", 1877.
// Domaine public. Texte issu de la reconnaissance optique du scan d'archive.org,
// d'ou les filtres de lisibilite plus bas.
const ROLLAND_OCR_URL =
  "https://archive.org/download/devinettesoueni01parigoog/devinettesoueni01parigoog_djvu.txt";

const NUMERO = /^\d{1,4}\s*\.?$/;
const REPONSE = /^[—–-]\s*(.+)$/;
// Apres la reponse, l'auteur enchaine sur des rapprochements avec des langues
// etrangeres, qui n'ont rien a faire dans une aide de jeu.
const APPAREIL_CRITIQUE = /^(Cf\.|Variante|Voy\.|\(|N\.|Note)/i;
const LOCALITE = /^[A-ZÀ-Þ][^.?!]{2,28}\.$/;

const LETTRES_ATTENDUES = /^[A-Za-zÀ-ÿ0-9 ,;:.!?'’«»"\-–]+$/;
const ARTEFACT_OCR = /[\^~`|_{}\[\]<>@#$%*\\]|\d\d\d/;
const MOT_CASSE = /\b[a-zà-ÿ]*[bcdfghjklmnpqrstvxzw]{4,}[a-zà-ÿ]*\b|\bw/i;

const QUESTION_MIN = 20;
const QUESTION_MAX = 260;
const REPONSE_MIN = 2;
const REPONSE_MAX = 45;
const MINIMUM_MOTS_COURANTS = 4;

// Les devinettes en patois regional et les lignes trop abimees par l'OCR ne
// contiennent quasiment aucun mot outil du francais standard. Compter ces mots
// est un test de lisibilite mesurable, pas un jugement sur le contenu.
const MOTS_COURANTS = new Set(
  (
    "le la les un une des du de et est qui que quoi quel quelle ce cette on il elle je " +
    "mon ma mes son sa ses dans sur sous par pour avec sans comme plus moins tout toute tous " +
    "ne pas jamais toujours a au aux en y se me te lui leur mais ou donc quand " +
    "chose bete arbre eau feu terre nuit jour monde homme femme"
  ).split(" ")
);

export interface FrenchRiddle {
  slug: string;
  question: string;
  reponse: string;
}

function compterMotsCourants(texte: string): number {
  return texte
    .toLowerCase()
    .split(/[^a-zà-ÿ'’-]+/)
    .filter((mot) => MOTS_COURANTS.has(mot.replace(/’/g, "'"))).length;
}

// L'OCR rend regulierement le point d'interrogation par un P ou un i isole en fin
// de phrase, et laisse trainer une apostrophe de fin de ligne.
function restaurer(texte: string): string {
  return texte
    .replace(/^[a-d]\)\s*/, "")
    .replace(/\s+[PÎîïfi]\s*$/, " ?")
    .replace(/\s*['"»]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Un chiffre isole au milieu d'une phrase est toujours une lettre mal reconnue
// ("il 7 a" pour "il y a"). On ecarte l'entree plutot que de deviner la lettre.
const CHIFFRE_ISOLE = /(^|\s)\d(\s|$)/;

function decouperEnEntrees(texte: string): string[][] {
  const entrees: string[][] = [];
  let courante: string[] | null = null;

  for (const brute of texte.split("\n")) {
    const ligne = brute.replace(/\s+/g, " ").trim();
    if (NUMERO.test(ligne)) {
      if (courante !== null) entrees.push(courante);
      courante = [];
      continue;
    }
    if (courante !== null && ligne.length > 0) courante.push(ligne);
  }
  if (courante !== null) entrees.push(courante);
  return entrees;
}

function lireEntree(entree: string[]): FrenchRiddle | null {
  let question: string[] = [];
  let reponseBrute: string | null = null;

  for (const ligne of entree) {
    if (APPAREIL_CRITIQUE.test(ligne)) break;
    const trouvee = ligne.match(REPONSE);
    if (trouvee?.[1] !== undefined) {
      reponseBrute = trouvee[1];
      break;
    }
    question.push(ligne);
  }
  if (reponseBrute === null) return null;

  if (question.length > 1 && LOCALITE.test(question[0] ?? "")) question = question.slice(1);

  const texte = restaurer(question.join(" "));
  const reponse = restaurer(reponseBrute.replace(/\s*\(.*$/, "").replace(/[.,;]+$/, ""));
  if (texte.length === 0 || reponse.length === 0) return null;

  return { slug: createHash("sha1").update(texte).digest("hex").slice(0, 8), question: texte, reponse };
}

function estLisible(devinette: FrenchRiddle): boolean {
  const { question, reponse } = devinette;
  if (question.length < QUESTION_MIN || question.length > QUESTION_MAX) return false;
  if (reponse.length < REPONSE_MIN || reponse.length > REPONSE_MAX) return false;
  if (!LETTRES_ATTENDUES.test(question) || !LETTRES_ATTENDUES.test(reponse)) return false;
  if (ARTEFACT_OCR.test(question) || ARTEFACT_OCR.test(reponse)) return false;
  if (CHIFFRE_ISOLE.test(question) || CHIFFRE_ISOLE.test(reponse)) return false;
  if (MOT_CASSE.test(question) || MOT_CASSE.test(reponse)) return false;
  return compterMotsCourants(question) >= MINIMUM_MOTS_COURANTS;
}

export async function listFrenchRiddles(): Promise<FrenchRiddle[]> {
  const ocr = await fetchText(ROLLAND_OCR_URL);

  const retenues = new Map<string, FrenchRiddle>();
  for (const entree of decouperEnEntrees(ocr)) {
    const devinette = lireEntree(entree);
    if (devinette === null || !estLisible(devinette)) continue;
    if (retenues.has(devinette.question)) continue;
    retenues.set(devinette.question, devinette);
  }
  return [...retenues.values()];
}
