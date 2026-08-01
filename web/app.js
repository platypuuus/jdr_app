import { TYPES, nouvelleGraine, tirerElement, tirerSalle } from "./tirage.js";

const TITRES = {
  salle: "Salle",
  monstre: "Monstre",
  piege: "Piège",
  butin: "Butin",
  arme: "Arme",
};

const scene = document.getElementById("scene");
const barre = document.getElementById("barre");
const titre = document.getElementById("titre");
const boutonLien = document.getElementById("lien");

let data = null;

/* ---------- routage ---------- */

function lireRoute() {
  const brut = location.hash.replace(/^#\/?/, "");
  if (brut.length === 0) return null;
  const [type, ...reste] = brut.split("/");
  const ref = decodeURIComponent(reste.join("/"));
  if (!TYPES.includes(type) || ref.length === 0) return null;
  return ref.startsWith("@") ? { type, slug: ref.slice(1) } : { type, graine: ref };
}

function aller(type, ref) {
  location.hash = `#/${type}/${encodeURIComponent(ref)}`;
}

/* ---------- fabrication du DOM ---------- */

function el(balise, classe, texte) {
  const noeud = document.createElement(balise);
  if (classe) noeud.className = classe;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
}

function etiquettes(paires) {
  const conteneur = el("div", "etiquettes");
  for (const [cle, valeur] of paires) {
    if (valeur === undefined || valeur === null || `${valeur}`.length === 0) continue;
    const tag = el("span", "etiquette");
    tag.append(el("strong", null, `${valeur}`), ` ${cle}`);
    conteneur.append(tag);
  }
  return conteneur;
}

function carte(titreTexte, sousTitre) {
  const bloc = el("section", "carte");
  bloc.append(el("h2", null, titreTexte));
  if (sousTitre) bloc.append(el("p", "vo", sousTitre));
  return bloc;
}

function rubrique(texte) {
  return el("p", "rubrique", texte);
}

function lienCarte(nom, meta, type, slug, peril) {
  const bouton = el("button", peril ? "lien-carte peril" : "lien-carte");
  bouton.type = "button";
  bouton.append(el("span", "nom", nom));
  if (meta) bouton.append(el("div", "meta", meta));
  bouton.addEventListener("click", () => aller(type, `@${slug}`));
  return bouton;
}

/* ---------- vues de detail ---------- */

function vueMonstre(monstre) {
  const bloc = carte(monstre.nom, null);
  bloc.append(
    etiquettes([
      ["FP", monstre.fp],
      ["PV", monstre.pv],
      ["CA", monstre.ca],
      ["", monstre.taille],
      ["", monstre.type],
    ])
  );
  if (monstre.lieux.length > 0) {
    bloc.append(rubrique("Lieux"), etiquettes(monstre.lieux.map((lieu) => ["", lieu])));
  }
  return bloc;
}

function vuePiege(piege) {
  const bloc = carte(piege.nom, null);
  if (piege.nature) bloc.append(etiquettes([["", piege.nature]]));
  bloc.append(el("p", "texte", piege.texte));
  return bloc;
}

function vueButin(butin) {
  const bloc = carte(butin.nom, null);
  bloc.append(
    etiquettes([
      ["", butin.type],
      ["", butin.rarete],
      ["", butin.harmonisation ? "harmonisation requise" : ""],
    ])
  );
  bloc.append(el("p", "texte", butin.texte));
  return bloc;
}

function vueArme(arme) {
  const bloc = carte(arme.nom, null);
  bloc.append(
    etiquettes([
      ["", arme.categorie],
      ["dégâts", `${arme.degats} ${arme.typeDegats}`],
      ["", arme.cout],
      ["", arme.poids],
    ])
  );
  if (arme.proprietes.length > 0) {
    bloc.append(rubrique("Propriétés"), etiquettes(arme.proprietes.map((p) => ["", p])));
  }
  return bloc;
}

/* ---------- vue salle ---------- */

function vueSalle(graine) {
  const salle = tirerSalle(data, graine);
  const fragment = document.createDocumentFragment();

  const entete = carte(salle.decors[0].terme, null);
  entete.append(etiquettes([["", salle.lieu]]));
  const liste = el("dl", "definition");
  for (const decor of salle.decors) {
    liste.append(el("dt", null, decor.terme), el("dd", null, decor.definition));
  }
  entete.append(rubrique("Décor"), liste);
  fragment.append(entete);

  fragment.append(rubrique("Occupant"));
  fragment.append(
    lienCarte(
      salle.occupant.nom,
      `FP ${salle.occupant.fp} | ${salle.occupant.pv} PV | CA ${salle.occupant.ca} | ${salle.occupant.taille} ${salle.occupant.type}`,
      "monstre",
      salle.occupant.slug,
      false
    )
  );

  fragment.append(rubrique("Danger"));
  if (salle.piege) {
    fragment.append(lienCarte(salle.piege.nom, salle.piege.nature, "piege", salle.piege.slug, true));
  } else {
    fragment.append(el("p", "vide", "Aucun piège."));
  }

  fragment.append(rubrique("Butin"));
  if (salle.butin) {
    fragment.append(
      lienCarte(salle.butin.nom, `${salle.butin.type} | ${salle.butin.rarete}`, "butin", salle.butin.slug, false)
    );
  } else {
    fragment.append(
      lienCarte(salle.arme.nom, `${salle.arme.categorie} | ${salle.arme.degats} ${salle.arme.typeDegats}`, "arme", salle.arme.slug, false)
    );
  }

  return fragment;
}

/* ---------- rendu ---------- */

const COLLECTIONS = {
  monstre: () => data.monstres,
  piege: () => data.pieges,
  butin: () => data.butins,
  arme: () => data.armes,
};

const VUES = {
  monstre: vueMonstre,
  piege: vuePiege,
  butin: vueButin,
  arme: vueArme,
};

function piedDePage() {
  const pied = el("p", "pied");
  pied.append("Sources : ");
  data.sources.forEach((source, index) => {
    if (index > 0) pied.append(" | ");
    const lien = el("a", null, source.nom);
    lien.href = source.url;
    lien.target = "_blank";
    lien.rel = "noopener";
    pied.append(lien);
  });
  return pied;
}

function vueAccueil() {
  const bloc = carte("Table de donjon", null);
  bloc.append(
    etiquettes([
      ["salles", data.salles.length],
      ["monstres", data.monstres.length],
      ["pièges", data.pieges.length],
      ["butins", data.butins.length],
      ["armes", data.armes.length],
    ])
  );
  bloc.append(el("p", "texte", "Choisis une catégorie en bas. Chaque tirage a son adresse : reviens dessus quand tu veux."));
  return bloc;
}

function rendre() {
  const route = lireRoute();
  scene.replaceChildren();
  scene.scrollTop = 0;

  for (const bouton of barre.querySelectorAll("button")) {
    bouton.setAttribute("aria-current", route !== null && bouton.dataset.type === route.type ? "true" : "false");
  }

  if (route === null) {
    titre.textContent = "Table de donjon";
    scene.append(vueAccueil(), piedDePage());
    return;
  }

  titre.textContent = TITRES[route.type];

  if (route.type === "salle") {
    scene.append(vueSalle(route.graine), piedDePage());
    return;
  }

  const entree = route.slug
    ? COLLECTIONS[route.type]().find((item) => item.slug === route.slug)
    : tirerElement(data, route.type, route.graine);

  if (entree === undefined) {
    scene.append(el("p", "vide", "Introuvable."), piedDePage());
    return;
  }

  scene.append(VUES[route.type](entree), piedDePage());
}

/* ---------- evenements ---------- */

barre.addEventListener("click", (evenement) => {
  const bouton = evenement.target.closest("button[data-type]");
  if (bouton === null) return;
  aller(bouton.dataset.type, nouvelleGraine());
});

boutonLien.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    boutonLien.textContent = "copie";
  } catch {
    boutonLien.textContent = location.hash;
  }
  setTimeout(() => {
    boutonLien.textContent = "lien";
  }, 1500);
});

window.addEventListener("hashchange", rendre);

// La version fichier unique injecte les donnees dans window plutot que de les servir.
async function chargerDonnees() {
  if (window.DONNEES_INTEGREES !== undefined) return window.DONNEES_INTEGREES;
  const reponse = await fetch("data.json");
  if (!reponse.ok) return null;
  return reponse.json();
}

async function demarrer() {
  data = await chargerDonnees();
  if (data === null) {
    scene.replaceChildren(el("p", "vide", "data.json introuvable. Lance 'npm run build:data'."));
    return;
  }
  rendre();
}

demarrer();
