import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyserDuree, bornerDuree, formaterDuree, formaterEcart,
  formaterSaisieDuree, sensEcart,
} from '../js/domaine/duree.js';

test('formaterDuree affiche des minutes et des secondes', () => {
  assert.equal(formaterDuree(0), '0:00');
  assert.equal(formaterDuree(9000), '0:09');
  assert.equal(formaterDuree(180000), '3:00');
  assert.equal(formaterDuree(392000), '6:32');
});

test('formaterDuree passe aux heures au-delà de soixante minutes', () => {
  assert.equal(formaterDuree(3723000), '1:02:03');
});

test('formaterDuree ignore le signe : c’est formaterEcart qui le porte', () => {
  assert.equal(formaterDuree(-392000), '6:32');
  assert.equal(formaterEcart(-392000), '−6:32');
  assert.equal(formaterEcart(261000), '+4:21');
});

test('sensEcart tolère la seconde près pour ne pas clignoter autour de zéro', () => {
  assert.equal(sensEcart(-392000), 'avance');
  assert.equal(sensEcart(261000), 'retard');
  assert.equal(sensEcart(400), 'pile');
  assert.equal(sensEcart(-400), 'pile');
});

test('analyserDuree accepte les formats qu’on tape vraiment', () => {
  assert.equal(analyserDuree('3:00'), 180);
  assert.equal(analyserDuree('2:30'), 150);
  assert.equal(analyserDuree('3min'), 180);
  assert.equal(analyserDuree('2min 30'), 150);
  assert.equal(analyserDuree('45'), 45);
  assert.equal(analyserDuree('45s'), 45);
  assert.equal(analyserDuree(''), null);
  assert.equal(analyserDuree('trois minutes'), null);
});

test('bornerDuree empêche une durée nulle ou délirante d’entrer dans les données', () => {
  assert.equal(bornerDuree(180), 180);
  assert.equal(bornerDuree(0), 5);
  assert.equal(bornerDuree(-10), 5);
  assert.equal(bornerDuree(999999), 5400);
  assert.equal(bornerDuree('abc'), 180);
  assert.equal(bornerDuree(null, 90), 90);
});

test('formaterSaisieDuree prérempli un champ modifiable', () => {
  assert.equal(formaterSaisieDuree(180), '3:00');
  assert.equal(formaterSaisieDuree(65), '1:05');
});
