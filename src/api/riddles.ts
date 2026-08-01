import { createHash } from "node:crypto";
import { fetchJson } from "./httpJson.js";

const RIDDLES_URL = "https://raw.githubusercontent.com/nkilm/riddles-api/main/data/riddles.json";

const MIN_QUESTION_LENGTH = 15;
const MIN_ANSWER_LENGTH = 1;

// Le jeu de donnees est issu d'un scraping : quelques reponses sont en fait des
// invitations a commenter l'article d'origine plutot qu'une solution.
const SCRAPING_ARTEFACT = /comment section|please tell us|let us know|scroll down|click here/i;

export interface RiddleEntry {
  slug: string;
  question: string;
  answer: string;
}

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Empreinte de la question plutot qu'un index : l'adresse d'une enigme reste
// valable meme si le jeu de donnees est reordonne en amont.
function slugFor(question: string): string {
  return createHash("sha1").update(question).digest("hex").slice(0, 8);
}

export async function listRiddles(): Promise<RiddleEntry[]> {
  const brut = await fetchJson<{ riddle: string; answer: string }[]>(RIDDLES_URL);

  const parQuestion = new Map<string, RiddleEntry>();
  for (const entry of brut) {
    const question = tidy(entry.riddle ?? "");
    const answer = tidy(entry.answer ?? "");

    if (question.length < MIN_QUESTION_LENGTH) continue;
    if (answer.length < MIN_ANSWER_LENGTH) continue;
    if (SCRAPING_ARTEFACT.test(answer)) continue;
    if (parQuestion.has(question)) continue;

    parQuestion.set(question, { slug: slugFor(question), question, answer });
  }

  return [...parQuestion.values()];
}
