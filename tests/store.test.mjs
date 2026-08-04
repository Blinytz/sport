import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore, etatInitial, migrer, REGLAGES_DEFAUT } from '../js/store.js';
import { SESSIONS_INITIALES } from '../js/domaine/donnees-initiales.js';

function stockageMemoire() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _brut: m,
  };
}

test('le premier lancement pose les quatre séances du classeur', () => {
  const store = createStore({ storage: stockageMemoire() });
  const sessions = store.sessions();

  assert.equal(sessions.length, 4);
  assert.deepEqual(sessions.map((s) => s.nom), SESSIONS_INITIALES.map((s) => s.nom));
  assert.ok(sessions.every((s) => s.exercices.every((e) => e.id)));
});

test('les étiquettes musculaires initiales viennent du classeur', () => {
  const store = createStore({ storage: stockageMemoire() });
  const noms = store.etiquettes().map((e) => e.nom);

  assert.deepEqual(noms, ['Pectoraux', 'Triceps', 'Épaules', 'Jambes', 'Abdos', 'Dos', 'Biceps']);
  assert.ok(store.etiquettes().every((e) => e.couleur));
});

test('les répétitions restent le texte exact du classeur', () => {
  const store = createStore({ storage: stockageMemoire() });
  const push = store.sessions().find((s) => s.nom === 'Session Push');
  const reps = push.exercices.map((e) => e.repetitions);

  assert.ok(reps.includes('2min'));
  assert.ok(reps.includes('5x2'));
  assert.ok(reps.includes('(40+40)x2'));
  assert.ok(reps.includes('10x2-10x2'));
});

test('une durée non fixée reste nulle : c’est le réglage global qui tranche', () => {
  const store = createStore({ storage: stockageMemoire() });
  const tous = store.sessions().flatMap((s) => s.exercices);
  assert.ok(tous.every((e) => e.dureeSecondes === null));
});

test('enregistrerSession crée puis met à jour', () => {
  const store = createStore({ storage: stockageMemoire() });
  const creee = store.enregistrerSession({ nom: 'Mobilité', exercices: [{ nom: 'Chat-vache' }] });

  assert.equal(store.sessions().length, 5);
  assert.ok(creee.id);

  store.enregistrerSession({ ...creee, nom: 'Mobilité douce' });
  assert.equal(store.sessions().length, 5);
  assert.equal(store.session(creee.id).nom, 'Mobilité douce');
});

test('supprimer une session laisse l’historique intact', () => {
  const store = createStore({ storage: stockageMemoire() });
  const cible = store.sessions()[0];
  store.archiverSeance({ id: 'seance-1', sessionId: cible.id, nom: cible.nom, statut: 'terminee' });

  store.supprimerSession(cible.id);
  assert.equal(store.session(cible.id), null);
  assert.equal(store.historique().length, 1);
  assert.equal(store.seance('seance-1').nom, cible.nom);
});

test('la séance en cours survit à un rechargement', () => {
  const stockage = stockageMemoire();
  const store = createStore({ storage: stockage });
  store.definirSeanceEnCours({ id: 'seance-1', nom: 'Session Push', debut: 42, etapes: [] });

  const relu = createStore({ storage: stockage });
  assert.equal(relu.seanceEnCours().id, 'seance-1');
  assert.equal(relu.seanceEnCours().debut, 42);
});

test('archiver vide l’emplacement courant sans dupliquer la séance', () => {
  const store = createStore({ storage: stockageMemoire() });
  store.definirSeanceEnCours({ id: 'seance-1', statut: 'en-cours' });
  store.archiverSeance({ id: 'seance-1', statut: 'terminee' });
  store.archiverSeance({ id: 'seance-1', statut: 'terminee' });

  assert.equal(store.seanceEnCours(), null);
  assert.equal(store.historique().length, 1);
});

test('un mouvement d’Éclats n’est enregistré qu’une fois par séance', () => {
  const store = createStore({ storage: stockageMemoire() });
  store.enregistrerMouvement({ seanceId: 'seance-1', montant: 42 });
  store.enregistrerMouvement({ seanceId: 'seance-1', montant: 999 });

  assert.equal(store.mouvements().length, 1);
  assert.equal(store.mouvementPour('seance-1').montant, 42);
});

test('les réglages bornent la durée par défaut et le barème', () => {
  const store = createStore({ storage: stockageMemoire() });
  assert.equal(store.reglages().dureeExerciceDefaut, REGLAGES_DEFAUT.dureeExerciceDefaut);

  store.majReglages({ dureeExerciceDefaut: 0 });
  assert.equal(store.reglages().dureeExerciceDefaut, 5);

  store.majReglages({ recompenseDefaut: { forfait: -3 } });
  assert.equal(store.reglages().recompenseDefaut.forfait, 40);

  store.majReglages({ theme: 'clair' });
  assert.equal(store.reglages().theme, 'clair');
  assert.equal(store.reglages().dureeExerciceDefaut, 5, 'un réglage voisin n’est pas écrasé');
});

test('chaque session porte son propre barème, prérempli par les réglages', () => {
  const store = createStore({ storage: stockageMemoire() });
  assert.equal(store.sessions()[0].recompense.forfait, 40);

  store.majReglages({ recompenseDefaut: { forfait: 75 } });
  const creee = store.enregistrerSession({ nom: 'Mobilité', exercices: [] });

  assert.equal(creee.recompense.forfait, 75);
  assert.equal(store.sessions()[0].recompense.forfait, 40, 'les sessions existantes ne bougent pas');
});

test('export et import font l’aller-retour', () => {
  const store = createStore({ storage: stockageMemoire() });
  store.enregistrerSession({ nom: 'Gainage', exercices: [{ nom: 'Planche' }] });
  const paquet = store.exporter();

  const autre = createStore({ storage: stockageMemoire() });
  autre.importer(paquet);

  assert.equal(autre.sessions().length, 5);
  assert.ok(autre.sessions().some((s) => s.nom === 'Gainage'));
});

test('une sauvegarde illisible est refusée au lieu d’écraser les données', () => {
  const store = createStore({ storage: stockageMemoire() });
  assert.throws(() => store.importer({ nimporte: 'quoi' }), /illisible/);
  assert.equal(store.sessions().length, 4);
});

test('un état corrompu dans le stockage ne bloque pas le démarrage', () => {
  const stockage = stockageMemoire();
  stockage.setItem('sport_etat_v1', '{ ceci n’est pas du JSON');
  assert.equal(createStore({ storage: stockage }).sessions().length, 4);
});

test('migrer complète une sauvegarde partielle sans rien perdre', () => {
  const migre = migrer({ sessions: [{ nom: 'Test', exercices: [] }], champInconnu: 7 });

  assert.equal(migre.sessions.length, 1);
  assert.equal(migre.champInconnu, 7);
  assert.deepEqual(migre.historique, []);
  assert.equal(migre.reglages.dureeExerciceDefaut, 180);
  assert.equal(migre.etiquettes.length, etatInitial().etiquettes.length);
});

test('réinitialiser repose le contenu d’amorçage', () => {
  const store = createStore({ storage: stockageMemoire() });
  store.supprimerSession(store.sessions()[0].id);
  store.reinitialiser();
  assert.equal(store.sessions().length, 4);
});
