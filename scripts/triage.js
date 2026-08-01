import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import {
  DECISIONS_PATH,
  readCandidates,
  readDecisions,
  writeDecisions,
} from "../src/build/enigmes.js";

const ROOT = "triage";
const PORT = Number(process.env.PORT ?? 8099);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function envoyerJson(reponse, code, corps) {
  reponse.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  reponse.end(JSON.stringify(corps));
}

async function lireCorps(requete) {
  const morceaux = [];
  for await (const morceau of requete) morceaux.push(morceau);
  return JSON.parse(Buffer.concat(morceaux).toString("utf-8"));
}

const server = createServer(async (requete, reponse) => {
  const url = new URL(requete.url ?? "/", "http://localhost");

  if (url.pathname === "/api/etat") {
    try {
      const [candidates, decisions] = await Promise.all([readCandidates(), readDecisions()]);
      envoyerJson(reponse, 200, { candidates, decisions });
    } catch {
      envoyerJson(reponse, 404, { erreur: "candidats absents, lance npm run build:data" });
    }
    return;
  }

  if (url.pathname === "/api/decision" && requete.method === "POST") {
    const { slug, decision } = await lireCorps(requete);
    const decisions = await readDecisions();
    if (decision === null) delete decisions[slug];
    else decisions[slug] = decision;
    await writeDecisions(decisions);
    envoyerJson(reponse, 200, { enregistrees: Object.keys(decisions).length });
    return;
  }

  const relative = url.pathname === "/" ? "index.html" : normalize(url.pathname).replace(/^[/\\]+/, "");
  try {
    const corps = await readFile(join(ROOT, relative));
    reponse.writeHead(200, { "Content-Type": TYPES[extname(relative)] ?? "application/octet-stream" });
    reponse.end(corps);
  } catch {
    reponse.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    reponse.end("404");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Tri des enigmes : http://localhost:${PORT}`);
  console.log(`Chaque decision est ecrite dans ${DECISIONS_PATH}, tu peux fermer et reprendre.`);
  console.log("Fleche droite = garder, fleche gauche = jeter, fleche haut = annuler.");
});
