# Table de donjon

Aide de jeu mobile pour le MJ. Six boutons : salle, monstre, danger, butin, arme, énigme.
Chaque tirage a sa propre adresse, donc on peut y revenir avec le bouton retour du
navigateur ou en gardant le lien.

## Règle de contenu

Aucun texte de jeu n'est écrit à la main, et il n'y a aucune traduction automatique.
Chaque nom, chaque définition, chaque description est reprise telle quelle de sa
source. L'application ne fait que combiner ces fragments : seuls les libellés
d'interface (Décor, Occupant, Danger, Butin) et la ponctuation sont écrits ici.

Le contenu 5e est donc en anglais, langue native des sources. Le décor de salle est
en français, langue native de la sienne.

## Sources

| Source | Contenu | Licence |
| --- | --- | --- |
| `api.open5e.com/v1/monsters` | 322 monstres SRD, avec leurs environnements | OGL 1.0a |
| `api.open5e.com/v1/sections` | 11 pièges et 3 maladies SRD | OGL 1.0a |
| `5e-bits/5e-database` (SRD 5.2) | 14 poisons | CC BY 4.0 |
| `api.open5e.com/v1/magicitems` | 237 objets magiques SRD | OGL 1.0a |
| `api.open5e.com/v1/weapons` | 37 armes SRD | OGL 1.0a |
| `fr.wikipedia.org`, Glossaire de l'architecture | 535 termes d'architecture | CC BY-SA 4.0 |
| `nkilm/riddles-api` | 533 énigmes avec leur réponse | MIT |

Le filtre `document__slug=wotc-srd` restreint volontairement Open5e au SRD, pour
éviter de mélanger des documents sous d'autres licences.

Le glossaire d'architecture est généraliste, pas médiéval : « Béton » ou
« Acoustique architecturale » peuvent tomber comme décor. Les filtrer reviendrait à
choisir le contenu à la main, ce que la règle interdit.

## Utilisation

```
npm install
npm run build:data     # interroge les API et écrit web/data.json
npm run build:single   # écrit out/table-de-donjon.html, autonome
npm run serve          # sert web/ sur le réseau local
```

Deux façons de l'utiliser sur le téléphone.

**Fichier unique, recommandé.** `npm run build:single` produit
`out/table-de-donjon.html` : un seul fichier de 359 Ko qui contient le CSS, le code
et les données. On le copie sur le téléphone par câble, mail ou cloud, on l'ouvre,
et c'est tout. Aucun serveur, aucun réseau, rien à relancer avant une partie. Ajouté
à l'écran d'accueil, il se comporte comme une appli.

**Serveur local.** `npm run serve` affiche une adresse en `192.168.x.x` à ouvrir
depuis le téléphone sur le même réseau. Pratique pour itérer, mais cela suppose que
le téléphone soit sur le même sous-réseau et que la box n'isole pas les clients
entre eux, ce qui n'est pas toujours le cas.

## Construction du bundle

`build:data` télécharge tout une seule fois et écrit un `web/data.json` autonome de
345 Ko. Le front ne fait ensuite aucun appel réseau : pas de latence en session, et
l'appli fonctionne même sans connexion.

`cache/` conserve les réponses HTTP brutes, indexées par empreinte de l'URL, ce qui
rend la construction rejouable hors ligne.

## Composition d'une salle

Un tirage de salle assemble, dans cet ordre et à partir de la même graine :

1. un lieu, tiré parmi les environnements réellement présents sur les monstres
2. deux termes d'architecture distincts, avec leur définition
3. un occupant, tiré parmi les monstres dont les environnements contiennent ce lieu
4. un danger, une fois sur deux : piège, poison ou maladie
5. un butin : un objet magique, ou à défaut une arme
6. une énigme, environ une fois sur trois

## Tests

```
npm test
```

Vérifie sur 200 graines que chaque tirage est reproductible, que les salles ont bien
deux décors distincts, que l'occupant correspond au lieu tiré, et que la salle donne
soit un butin soit une arme mais jamais les deux.

## Adresses

- `#/salle/<graine>` : salle tirée de la graine
- `#/monstre/<graine>` : monstre tiré de la graine
- `#/monstre/@<slug>` : un monstre précis, par exemple `#/monstre/@goblin`

La fiche d'une énigme masque la réponse derrière un bouton, pour pouvoir lire
l'énoncé à voix haute sans se la dévoiler.

Même schéma pour `piege`, `butin` et `arme`. Depuis une salle, chaque élément est
cliquable et ouvre sa fiche complète.
