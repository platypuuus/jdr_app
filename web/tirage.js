export const TYPES = ["salle", "monstre", "piege", "butin", "arme", "enigme"];

const PROBA_PIEGE = 0.5;
const PROBA_BUTIN = 0.6;
const PROBA_ENIGME = 0.35;
const NOMBRE_DECORS = 2;

function hashSeed(texte) {
  let h = 1779033703 ^ texte.length;
  for (let i = 0; i < texte.length; i++) {
    h = Math.imul(h ^ texte.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createPrng(graine) {
  let a = hashSeed(graine);
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, liste) {
  return liste[Math.floor(rng() * liste.length)];
}

export function pickDistinct(rng, liste, nombre) {
  const reste = [...liste];
  const tires = [];
  for (let i = 0; i < nombre && reste.length > 0; i++) {
    tires.push(reste.splice(Math.floor(rng() * reste.length), 1)[0]);
  }
  return tires;
}

export function nouvelleGraine() {
  return Math.random().toString(36).slice(2, 8);
}

export function tirerElement(data, type, graine) {
  const collections = {
    monstre: data.monstres,
    piege: data.pieges,
    butin: data.butins,
    arme: data.armes,
    enigme: data.enigmes,
  };
  return pick(createPrng(`${type}:${graine}`), collections[type]);
}

export function tirerSalle(data, graine) {
  const rng = createPrng(`salle:${graine}`);
  const lieu = pick(rng, data.lieux);
  const decors = pickDistinct(rng, data.salles, NOMBRE_DECORS);
  const surPlace = data.monstres.filter((monstre) => monstre.lieux.includes(lieu));
  const occupant = pick(rng, surPlace.length > 0 ? surPlace : data.monstres);
  const piege = rng() < PROBA_PIEGE ? pick(rng, data.pieges) : null;
  const prendreButin = rng() < PROBA_BUTIN;
  const butin = prendreButin ? pick(rng, data.butins) : null;
  const arme = prendreButin ? null : pick(rng, data.armes);
  const enigme = rng() < PROBA_ENIGME ? pick(rng, data.enigmes) : null;
  return { lieu, decors, occupant, piege, butin, arme, enigme };
}
