import { createHash } from "node:crypto";
import { fetchJson } from "./httpJson.js";

const RIDDLES_URL = "https://raw.githubusercontent.com/nkilm/riddles-api/main/data/riddles.json";

const MIN_QUESTION_LENGTH = 15;
const MIN_ANSWER_LENGTH = 1;

// Le jeu de donnees est issu d'un scraping : quelques reponses sont en fait des
// invitations a commenter l'article d'origine plutot qu'une solution.
const SCRAPING_ARTEFACT = /comment section|please tell us|let us know|scroll down|click here/i;

// Une enigme dont la solution tient a l'orthographe, aux lettres ou a la
// prononciation d'un mot anglais ne survit pas a une traduction a la volee.
const JEU_DE_MOTS = [
  /\b(letters?|alphabet|vowels?|consonants?|syllables?)\b/i,
  /\b(words?|spell(s|ed|ing)?|written|writing)\b/i,
  /\b(named?|pronounce[ds]?|sounds? like|rhymes?|anagrams?|palindromes?)\b/i,
];

export interface EnglishRiddle {
  slug: string;
  question: string;
  reponse: string;
}

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function reposeSurUnJeuDeMots(question: string, reponse: string): boolean {
  return JEU_DE_MOTS.some((motif) => motif.test(question) || motif.test(reponse));
}

export async function listEnglishRiddles(): Promise<EnglishRiddle[]> {
  const brut = await fetchJson<{ riddle: string; answer: string }[]>(RIDDLES_URL);

  const parQuestion = new Map<string, EnglishRiddle>();
  for (const entry of brut) {
    const question = tidy(entry.riddle ?? "");
    const reponse = tidy(entry.answer ?? "");

    if (question.length < MIN_QUESTION_LENGTH) continue;
    if (reponse.length < MIN_ANSWER_LENGTH) continue;
    if (SCRAPING_ARTEFACT.test(reponse)) continue;
    if (reposeSurUnJeuDeMots(question, reponse)) continue;
    if (parQuestion.has(question)) continue;

    parQuestion.set(question, {
      slug: createHash("sha1").update(question).digest("hex").slice(0, 8),
      question,
      reponse,
    });
  }
  return [...parQuestion.values()];
}
