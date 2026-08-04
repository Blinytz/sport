import test from 'node:test';
import assert from 'node:assert/strict';

import { demarrerSeance, passer, valider, abandonner } from '../js/domaine/seance.js';
import {
  RECOMPENSE_DEFAUT, calculerRecompense, cleIdempotence, collectable, detailRecompense,
  normaliserPaliers, normaliserRecompense, palierAtteint, palierSuivant,
} from '../js/domaine/recompense.js';

const T0 = 1_800_000_000_000;
let compteur = 0;
const identifiant = () => `id-${(compteur += 1)}`;

const PALIERS = [
  { minutes: 2, eclats: 5 },
  { minutes: 5, eclats: 12 },
  { minutes: 10, eclats: 25 },
];

function seanceDe(durees, recompense = { forfait: 40, paliers: PALIERS }) {
  return demarrerSeance({
    id: 'session-1',
    nom: 'Session Push',
    recompense,
    exercices: durees.map((d, i) => ({
      id: `ex-${i}`, nom: `Exercice ${i + 1}`, repetitions: '30',
      dureeSecondes: d, musclesPrincipaux: [], musclesSecondaires: [], notes: '',
    })),
  }, { maintenant: T0, dureeDefaut: 180, identifiant });
}

/** Boucle chaque exercice en `parExercice` ms. */
function courir(seance, parExercice, sauts = []) {
  let courante = seance;
  for (let i = 0; i < seance.exercices.length; i += 1) {
    const quand = T0 + (i + 1) * parExercice;
    courante = sauts.includes(i) ? passer(courante, quand) : valider(courante, quand);
  }
  return courante;
}

test('la séance fige le barème de sa session à son lancement', () => {
  const session = {
    id: 's1',
    nom: 'Push',
    recompense: { forfait: 40, paliers: PALIERS },
    exercices: [{ id: 'e1', nom: 'Pompes', dureeSecondes: 180, musclesPrincipaux: [], musclesSecondaires: [] }],
  };
  const seance = demarrerSeance(session, { maintenant: T0, dureeDefaut: 180, identifiant });

  session.recompense.forfait = 9999;
  assert.equal(seance.bareme.forfait, 40, 'relever le forfait ne revalorise pas une séance en cours');
});

test('une séance abandonnée ne rapporte rien', () => {
  const calcul = calculerRecompense(abandonner(seanceDe([180, 180]), T0 + 60_000));
  assert.equal(calcul.total, 0);
  assert.equal(calcul.motif, 'seance_non_terminee');
});

test('une séance entièrement validée touche le forfait complet', () => {
  // 3 × 3 min bouclés en 3 min chacun : aucune avance, donc aucun palier.
  const seance = courir(seanceDe([180, 180, 180]), 180_000);
  const calcul = calculerRecompense(seance);

  assert.equal(calcul.forfait, 40);
  assert.equal(calcul.bonus, 0);
  assert.equal(calcul.total, 40);
});

test('le forfait est versé au prorata des exercices validés', () => {
  // 4 exercices, 2 passés : la moitié du forfait.
  const seance = courir(seanceDe([180, 180, 180, 180]), 180_000, [1, 3]);
  const calcul = calculerRecompense(seance);

  assert.equal(calcul.valides, 2);
  assert.equal(calcul.forfait, 20, 'sauter la moitié ne paie pas une séance entière');
});

test('le palier atteint le plus haut s’applique, et lui seul', () => {
  // 4 × 3 min bouclés en 1 min : 8 minutes d'avance → palier 5 min.
  const seance = courir(seanceDe([180, 180, 180, 180]), 60_000);
  const calcul = calculerRecompense(seance);

  assert.equal(calcul.avance, 480_000);
  assert.equal(calcul.palier.minutes, 5);
  assert.equal(calcul.bonus, 12, 'les paliers ne s’additionnent pas');
  assert.equal(calcul.total, 52);
});

test('une avance sous le premier seuil ne donne aucun bonus', () => {
  // 2 × 3 min bouclés en 2:30 : 1 minute d'avance, premier palier à 2 min.
  const seance = courir(seanceDe([180, 180]), 150_000);
  const calcul = calculerRecompense(seance);

  assert.equal(calcul.avance, 60_000);
  assert.equal(calcul.bonus, 0);
  assert.equal(calcul.prochainPalier.minutes, 2);
});

test('le palier maximal se décroche avec assez d’avance', () => {
  const seance = courir(seanceDe(Array(8).fill(180)), 10_000);
  const calcul = calculerRecompense(seance);

  assert.equal(calcul.palier.minutes, 10);
  assert.equal(calcul.bonus, 25);
  assert.equal(calcul.prochainPalier, null);
});

test('le retard ne retire jamais d’Éclats', () => {
  const seance = courir(seanceDe([180, 180]), 400_000);
  const calcul = calculerRecompense(seance);

  assert.equal(calcul.avance, 0);
  assert.equal(calcul.bonus, 0);
  assert.equal(calcul.total, 40);
});

test('un exercice passé annule le bonus malgré une avance énorme', () => {
  const seance = courir(seanceDe([180, 180, 180, 180]), 10_000, [2]);
  const calcul = calculerRecompense(seance);

  assert.ok(calcul.avance > 600_000);
  assert.equal(calcul.bonus, 0, 'sauter fabriquerait de l’avance payée');
  assert.equal(calcul.palier, null);
  assert.equal(calcul.motif, 'bonus_annule_exercice_passe');
  assert.equal(calcul.forfait, 30);
});

test('chaque session a son propre forfait', () => {
  const douce = calculerRecompense(courir(seanceDe([180], { forfait: 10, paliers: [] }), 180_000));
  const dure = calculerRecompense(courir(seanceDe([180], { forfait: 90, paliers: [] }), 180_000));

  assert.equal(douce.total, 10);
  assert.equal(dure.total, 90);
});

test('palierAtteint et palierSuivant encadrent une avance', () => {
  assert.equal(palierAtteint(PALIERS, 0), null);
  assert.equal(palierAtteint(PALIERS, 119_000), null);
  assert.equal(palierAtteint(PALIERS, 120_000).eclats, 5, 'pile 2 min : le seuil est inclusif');
  assert.equal(palierAtteint(PALIERS, 240_000).eclats, 5, '4 min : encore le palier 2');
  assert.equal(palierAtteint(PALIERS, 400_000).eclats, 12, '6 min 40 : palier 5 franchi');
  assert.equal(palierAtteint(PALIERS, 900_000).eclats, 25);

  assert.equal(palierSuivant(PALIERS, 0).minutes, 2);
  assert.equal(palierSuivant(PALIERS, 240_000).minutes, 5);
  assert.equal(palierSuivant(PALIERS, 400_000).minutes, 10);
  assert.equal(palierSuivant(PALIERS, 900_000), null);
});

test('les paliers sont rangés et débarrassés des doublons de seuil', () => {
  const propres = normaliserPaliers([
    { minutes: 10, eclats: 25 },
    { minutes: 2, eclats: 5 },
    { minutes: 2, eclats: 7 },
    { minutes: 0, eclats: 3 },
    { minutes: 'x', eclats: 4 },
  ]);

  assert.deepEqual(propres, [{ minutes: 2, eclats: 7 }, { minutes: 10, eclats: 25 }]);
});

test('un barème absurde est ramené dans des bornes saines', () => {
  assert.deepEqual(normaliserRecompense(undefined), RECOMPENSE_DEFAUT);
  assert.equal(normaliserRecompense({ forfait: -5 }).forfait, 40);
  assert.equal(normaliserRecompense({ forfait: 1e9 }).forfait, 100_000);
  assert.equal(normaliserRecompense({ forfait: 0 }).forfait, 0);
  assert.deepEqual(normaliserRecompense({ forfait: 10, paliers: [] }).paliers, []);
  assert.equal(normaliserRecompense({ paliers: Array(20).fill({ minutes: 1, eclats: 1 }) })
    .paliers.length, 1);
});

test('un barème absent retombe sur le secours fourni', () => {
  const seance = courir(seanceDe([180], { forfait: 40, paliers: [] }), 180_000);
  delete seance.bareme;

  assert.equal(calculerRecompense(seance, { forfait: 7, paliers: [] }).total, 7);
});

test('collectable refuse une séance non terminée, déjà collectée ou nulle', () => {
  const enCours = seanceDe([180, 180]);
  assert.equal(collectable(enCours), false);

  const finie = courir(enCours, 100_000);
  assert.equal(collectable(finie), true);
  assert.equal(collectable({ ...finie, recompense: { collectee: true } }), false);

  const gratuite = courir(seanceDe([180], { forfait: 0, paliers: [] }), 180_000);
  assert.equal(collectable(gratuite), false);
});

test('la clé d’idempotence est stable et propre à la séance', () => {
  assert.equal(cleIdempotence('abc'), 'sport:seance:abc:versement');
  assert.notEqual(cleIdempotence('abc'), cleIdempotence('abd'));
});

test('le détail du calcul explique le montant', () => {
  const complete = detailRecompense(calculerRecompense(courir(seanceDe([180, 180]), 30_000)));
  assert.match(complete[0], /Séance complète : 40 ✦/);
  assert.match(complete[1], /Palier 5 min d'avance : \+12 ✦/);

  const partielle = detailRecompense(
    calculerRecompense(courir(seanceDe([180, 180]), 30_000, [0])),
  );
  assert.match(partielle[0], /1\/2 exercices validés : 20 ✦ sur 40 ✦/);
  assert.match(partielle[1], /bonus annulé/);
});
