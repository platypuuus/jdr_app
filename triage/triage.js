const scene = document.getElementById("scene");
const compteur = document.getElementById("compteur");
const barre = document.getElementById("barre");
const nbGardees = document.getElementById("nbGardees");
const nbJetees = document.getElementById("nbJetees");
const boutonGarder = document.getElementById("garder");
const boutonJeter = document.getElementById("jeter");
const boutonAnnuler = document.getElementById("annuler");

let candidates = [];
let decisions = {};
// Pile des slugs decides dans l'ordre, pour pouvoir revenir en arriere.
let historique = [];

function el(balise, classe, texte) {
  const noeud = document.createElement(balise);
  if (classe) noeud.className = classe;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
}

function aTrier() {
  return candidates.filter((e) => decisions[e.slug] === undefined);
}

function compter(valeur) {
  return Object.values(decisions).filter((d) => d === valeur).length;
}

function rendre() {
  const gardees = compter("garde");
  const jetees = compter("jete");
  const decidees = gardees + jetees;

  nbGardees.textContent = gardees;
  nbJetees.textContent = jetees;
  compteur.textContent = `${decidees} / ${candidates.length}`;
  barre.style.width = candidates.length === 0 ? "0" : `${(decidees / candidates.length) * 100}%`;
  boutonAnnuler.disabled = historique.length === 0;

  const restantes = aTrier();
  const courante = restantes[0];

  if (courante === undefined) {
    boutonGarder.disabled = true;
    boutonJeter.disabled = true;
    const fini = el("p", "fini");
    fini.append("Tri terminé. ", el("strong", null, `${gardees} énigmes gardées`), ".");
    fini.append(el("br"));
    fini.append("Relance npm run build:data pour les publier.");
    scene.replaceChildren(fini);
    return;
  }

  boutonGarder.disabled = false;
  boutonJeter.disabled = false;

  const carte = el("div", "carte");
  carte.append(el("span", "langue", courante.langue === "fr" ? "français" : "anglais"));
  carte.append(el("p", "question", courante.question));
  carte.append(el("p", "reponse", courante.reponse));
  scene.replaceChildren(carte);
}

async function decider(valeur) {
  const courante = aTrier()[0];
  if (courante === undefined) return;

  decisions[courante.slug] = valeur;
  historique.push(courante.slug);
  rendre();

  await fetch("/api/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: courante.slug, decision: valeur }),
  });
}

async function annuler() {
  const dernier = historique.pop();
  if (dernier === undefined) return;

  delete decisions[dernier];
  rendre();

  await fetch("/api/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: dernier, decision: null }),
  });
}

boutonGarder.addEventListener("click", () => decider("garde"));
boutonJeter.addEventListener("click", () => decider("jete"));
boutonAnnuler.addEventListener("click", annuler);

document.addEventListener("keydown", (evenement) => {
  if (evenement.key === "ArrowRight") decider("garde");
  else if (evenement.key === "ArrowLeft") decider("jete");
  else if (evenement.key === "ArrowUp") annuler();
  else return;
  evenement.preventDefault();
});

async function demarrer() {
  const reponse = await fetch("/api/etat");
  if (!reponse.ok) {
    scene.replaceChildren(el("p", "attente", "Lance d'abord npm run build:data."));
    return;
  }
  const etat = await reponse.json();
  candidates = etat.candidates;
  decisions = etat.decisions;
  rendre();
}

demarrer();
