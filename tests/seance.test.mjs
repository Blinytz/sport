import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STATUT, ETAPE, abandonner, annulerDerniereEtape, basculerPause, demarrerSeance,
  detailEtapes, ecart, ecartFinal, ecoule, nombrePasses, nombreValides, passer,
  theoriqueCumule, valider, vueSeance,
} from '../js/domaine/seance.js';

const T0 = 1_800_000_000_000;
let compteur = 0;
const identifiant = () => `id-${(compteur += 1)}`;

function sessionTest(durees = [180, 180, 180]) {
  return {
    id: 'session-1',
    nom: 'Session Push',
    exercices: durees.map((d, i) => ({
      id: `ex-${i}`,
      nom: `Exercice ${i + 1}`,
      repetitions: '30',
      dureeSecondes: d,
      musclesPrincipaux: [],
      musclesSecondaires: [],
      notes: '',
    })),
  };
}

const lancer = (durees) => demarrerSeance(sessionTest(durees), {
  maintenant: T0, dureeDefaut: 180, identifiant,
});

test('une séance sans exercice ne se lance pas', () => {
  assert.throws(
    () => demarrerSeance({ id: 'x', nom: 'Vide', exercices: [] },
      { maintenant: T0, identifiant }),
    /sans exercice/,
  );
});

test('la séance emporte une copie des exercices et résout les durées par défaut', () => {
  const session = sessionTest([180, 180]);
  session.exercices[1].dureeSecondes = null;
  const seance = demarrerSeance(session, { maintenant: T0, dureeDefaut: 120, identifiant });

  assert.equal(seance.exercices[1].dureeSecondes, 120);
  session.exercices[0].nom = 'Renommé après coup';
  assert.equal(seance.exercices[0].nom, 'Exercice 1');
});

test('le temps écoulé se recalcule depuis l’horloge, jamais par décrément', () => {
  const seance = lancer();
  assert.equal(ecoule(seance, T0), 0);
  assert.equal(ecoule(seance, T0 + 65_000), 65_000);
});

test('valider avance d’un exercice et enregistre le temps réel', () => {
  const apres = valider(lancer(), T0 + 150_000);
  assert.equal(apres.etapes.length, 1);
  assert.equal(apres.etapes[0].statut, ETAPE.VALIDE);
  assert.equal(apres.etapes[0].a, 150_000);
  assert.equal(apres.statut, STATUT.EN_COURS);
});

test('l’écart est le temps réel moins le temps théorique des exercices passés', () => {
  // Deux exercices de 3 min bouclés en 2 min chacun : 2 minutes d'avance.
  let seance = lancer([180, 180, 180]);
  seance = valider(seance, T0 + 120_000);
  assert.equal(ecart(seance), -60_000);
  seance = valider(seance, T0 + 240_000);
  assert.equal(ecart(seance), -120_000);
});

test('l’écart devient positif quand on traîne', () => {
  let seance = lancer([180, 180, 180]);
  seance = valider(seance, T0 + 200_000);
  assert.equal(ecart(seance), 20_000);
  seance = valider(seance, T0 + 441_000);
  assert.equal(ecart(seance), 81_000);
});

test('l’écart reste figé entre deux validations', () => {
  const seance = valider(lancer(), T0 + 120_000);
  assert.equal(vueSeance(seance, T0 + 130_000).ecart, -60_000);
  assert.equal(vueSeance(seance, T0 + 200_000).ecart, -60_000);
});

test('le compte à rebours de l’exercice courant repart à sa propre durée', () => {
  const seance = valider(lancer([180, 60, 180]), T0 + 120_000);
  const vue = vueSeance(seance, T0 + 130_000);

  assert.equal(vue.index, 1);
  assert.equal(vue.numero, 2);
  assert.equal(vue.total, 3);
  assert.equal(vue.surExercice, 10_000);
  assert.equal(vue.restant, 50_000);
  assert.equal(vue.depasse, false);
});

test('le compte à rebours passe en négatif au lieu de s’arrêter', () => {
  const vue = vueSeance(lancer([60]), T0 + 75_000);
  assert.equal(vue.restant, -15_000);
  assert.equal(vue.depasse, true);
  assert.equal(vue.progression, 1);
});

test('valider le dernier exercice termine la séance', () => {
  let seance = lancer([180, 180]);
  seance = valider(seance, T0 + 100_000);
  seance = valider(seance, T0 + 200_000);

  assert.equal(seance.statut, STATUT.TERMINEE);
  assert.equal(seance.fin, T0 + 200_000);
  assert.equal(ecartFinal(seance), -160_000);
});

test('le temps d’une séance close ne bouge plus', () => {
  let seance = lancer([60]);
  seance = valider(seance, T0 + 40_000);
  assert.equal(ecoule(seance, T0 + 999_000), 40_000);
  assert.equal(vueSeance(seance, T0 + 999_000).ecart, -20_000);
});

test('la pause suspend le chronomètre et le reprend là où il était', () => {
  let seance = lancer();
  seance = basculerPause(seance, T0 + 30_000);
  assert.equal(ecoule(seance, T0 + 90_000), 30_000);

  seance = basculerPause(seance, T0 + 90_000);
  assert.equal(seance.pauseCumulee, 60_000);
  assert.equal(ecoule(seance, T0 + 100_000), 40_000);
});

test('valider pendant une pause reprend d’abord le chronomètre', () => {
  let seance = basculerPause(lancer(), T0 + 30_000);
  seance = valider(seance, T0 + 90_000);

  assert.equal(seance.pauseDepuis, null);
  assert.equal(seance.etapes[0].a, 30_000);
});

test('passer un exercice avance sans le compter comme validé', () => {
  let seance = lancer([180, 180]);
  seance = passer(seance, T0 + 10_000);
  seance = valider(seance, T0 + 100_000);

  assert.equal(nombreValides(seance), 1);
  assert.equal(nombrePasses(seance), 1);
  assert.equal(seance.statut, STATUT.TERMINEE);
});

test('annuler la dernière étape revient à l’exercice précédent sans réécrire le temps', () => {
  let seance = lancer([180, 180]);
  seance = valider(seance, T0 + 100_000);
  seance = valider(seance, T0 + 200_000);
  assert.equal(seance.statut, STATUT.TERMINEE);

  seance = annulerDerniereEtape(seance);
  assert.equal(seance.statut, STATUT.EN_COURS);
  assert.equal(seance.fin, null);
  assert.equal(vueSeance(seance, T0 + 210_000).index, 1);
  assert.equal(ecoule(seance, T0 + 210_000), 210_000);
});

test('abandonner clôt la séance sans la marquer terminée', () => {
  const seance = abandonner(valider(lancer(), T0 + 60_000), T0 + 90_000);
  assert.equal(seance.statut, STATUT.ABANDONNEE);
  assert.equal(vueSeance(seance, T0 + 500_000).close, true);
});

test('une séance close refuse toute nouvelle transition', () => {
  const seance = abandonner(lancer(), T0 + 10_000);
  assert.throws(() => valider(seance, T0 + 20_000), /terminée/);
  assert.throws(() => passer(seance, T0 + 20_000), /terminée/);
  assert.throws(() => basculerPause(seance, T0 + 20_000), /terminée/);
});

test('theoriqueCumule additionne les durées des exercices passés', () => {
  const seance = lancer([180, 60, 120]);
  assert.equal(theoriqueCumule(seance, 0), 0);
  assert.equal(theoriqueCumule(seance, 2), 240_000);
  assert.equal(theoriqueCumule(seance, 3), 360_000);
});

test('la vue expose le restant théorique de toute la séance', () => {
  const vue = vueSeance(lancer([180, 180]), T0 + 60_000);
  assert.equal(vue.theoriqueTotal, 360_000);
  assert.equal(vue.restantTheorique, 300_000);
});

test('detailEtapes donne le temps réellement passé sur chaque exercice', () => {
  let seance = lancer([180, 180]);
  seance = valider(seance, T0 + 120_000);
  seance = valider(seance, T0 + 300_000);

  const detail = detailEtapes(seance);
  assert.equal(detail[0].duree, 120_000);
  assert.equal(detail[0].ecartExercice, -60_000);
  assert.equal(detail[1].duree, 180_000);
  assert.equal(detail[1].ecartExercice, 0);
});

test('un rechargement ne fait pas dériver le chronomètre', () => {
  let seance = lancer([180, 180]);
  seance = valider(seance, T0 + 120_000);

  const relu = JSON.parse(JSON.stringify(seance));
  assert.deepEqual(vueSeance(relu, T0 + 200_000), vueSeance(seance, T0 + 200_000));
});
