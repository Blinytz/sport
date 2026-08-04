import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ajouterEtiquette, basculer, couleurEtiquette, etiquettesInitiales,
  identifiantEtiquette, nomDejaPris, nomEtiquette, retirerEtiquette, usages,
} from '../js/domaine/etiquettes.js';
import { deplacer, dupliquerSession, repartitionMuscles } from '../js/domaine/session.js';

const exercice = (principaux = [], secondaires = []) => ({
  id: 'e1', nom: 'Pompes', repetitions: '30', dureeSecondes: null,
  musclesPrincipaux: principaux, musclesSecondaires: secondaires, notes: '',
});

test('un identifiant d’étiquette est débarrassé des accents', () => {
  assert.equal(identifiantEtiquette('Épaules'), 'epaules');
  assert.equal(identifiantEtiquette('Bas du dos'), 'bas-du-dos');
  assert.equal(identifiantEtiquette('  '), 'muscle');
});

test('deux étiquettes de noms proches gardent des identifiants distincts', () => {
  assert.equal(identifiantEtiquette('Épaules', ['epaules']), 'epaules-2');
  assert.equal(identifiantEtiquette('Épaules', ['epaules', 'epaules-2']), 'epaules-3');
});

test('on peut créer une étiquette qui n’était pas dans le classeur', () => {
  const apres = ajouterEtiquette(etiquettesInitiales(), 'Mollets');
  assert.equal(apres.length, 8);
  assert.equal(apres[7].id, 'mollets');
  assert.ok(apres[7].couleur);
});

test('un doublon de nom est refusé : deux étiquettes identiques seraient illisibles', () => {
  assert.throws(() => ajouterEtiquette(etiquettesInitiales(), 'Abdos'), /existe déjà/);
  assert.throws(() => ajouterEtiquette(etiquettesInitiales(), '  abdos '), /existe déjà/);
  assert.throws(() => ajouterEtiquette(etiquettesInitiales(), ''), /besoin d’un nom/);
});

test('nomDejaPris ignore l’étiquette qu’on est en train de renommer', () => {
  const liste = etiquettesInitiales();
  assert.equal(nomDejaPris(liste, 'Abdos'), true);
  assert.equal(nomDejaPris(liste, 'Abdos', 'abdos'), false);
});

test('nomEtiquette et couleurEtiquette tolèrent un identifiant inconnu', () => {
  const liste = etiquettesInitiales();
  assert.equal(nomEtiquette(liste, 'abdos'), 'Abdos');
  assert.equal(nomEtiquette(liste, 'fantome'), 'fantome');
  assert.ok(couleurEtiquette(liste, 'fantome'));
});

test('un exercice accepte plusieurs muscles de chaque côté', () => {
  let ex = exercice();
  ex = basculer(ex, 'pectoraux', 'principal');
  ex = basculer(ex, 'epaules', 'principal');
  ex = basculer(ex, 'triceps', 'secondaire');
  ex = basculer(ex, 'abdos', 'secondaire');

  assert.deepEqual(ex.musclesPrincipaux, ['pectoraux', 'epaules']);
  assert.deepEqual(ex.musclesSecondaires, ['triceps', 'abdos']);
});

test('cocher un muscle en principal le retire des secondaires', () => {
  let ex = exercice([], ['triceps']);
  ex = basculer(ex, 'triceps', 'principal');

  assert.deepEqual(ex.musclesPrincipaux, ['triceps']);
  assert.deepEqual(ex.musclesSecondaires, []);
});

test('recliquer sur un muscle déjà coché le retire', () => {
  let ex = exercice(['pectoraux']);
  ex = basculer(ex, 'pectoraux', 'principal');
  assert.deepEqual(ex.musclesPrincipaux, []);
});

test('usages compte les exercices concernés avant une suppression', () => {
  const sessions = [{
    exercices: [exercice(['pectoraux'], ['triceps']), exercice(['triceps'])],
  }];
  assert.equal(usages(sessions, 'triceps'), 2);
  assert.equal(usages(sessions, 'jambes'), 0);
});

test('retirer une étiquette la retire aussi de tous les exercices', () => {
  const sessions = [{
    exercices: [exercice(['pectoraux'], ['triceps']), exercice(['triceps'])],
  }];
  const apres = retirerEtiquette(sessions, 'triceps');

  assert.deepEqual(apres[0].exercices[0].musclesSecondaires, []);
  assert.deepEqual(apres[0].exercices[1].musclesPrincipaux, []);
  assert.deepEqual(apres[0].exercices[0].musclesPrincipaux, ['pectoraux']);
});

test('la répartition compte un muscle secondaire pour moitié', () => {
  const repartition = repartitionMuscles([
    exercice(['pectoraux'], ['triceps']),
    exercice(['pectoraux'], ['triceps']),
    exercice(['triceps']),
  ]);
  assert.deepEqual(repartition, [
    { id: 'pectoraux', valeur: 2 },
    { id: 'triceps', valeur: 2 },
  ]);
});

test('deplacer réordonne sans jamais sortir de la liste', () => {
  const liste = ['a', 'b', 'c'];
  assert.deepEqual(deplacer(liste, 0, 1), ['b', 'a', 'c']);
  assert.deepEqual(deplacer(liste, 2, -1), ['a', 'c', 'b']);
  assert.equal(deplacer(liste, 0, -1), liste);
  assert.equal(deplacer(liste, 2, 1), liste);
});

test('dupliquer une session ne partage aucun identifiant', () => {
  let n = 0;
  const identifiant = () => `neuf-${(n += 1)}`;
  const source = { id: 's1', nom: 'Push', exercices: [exercice(), exercice()] };
  const copie = dupliquerSession(source, identifiant);

  assert.equal(copie.nom, 'Push (copie)');
  assert.notEqual(copie.id, source.id);
  assert.ok(copie.exercices.every((e) => e.id.startsWith('neuf-')));
  assert.equal(source.exercices[0].id, 'e1', 'la source est intacte');
});
