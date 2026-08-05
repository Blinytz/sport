// Ce fichier a un seul sujet : les données de l'utilisateur ne disparaissent
// jamais lors d'une mise à jour. Chaque test décrit une façon de les perdre,
// et vérifie qu'elle est fermée.

import test from 'node:test';
import assert from 'node:assert/strict';

import { CLE_ETAT, CLE_SECOURS, createStore, migrer } from '../js/store.js';

function stockageMemoire(contenu = {}) {
  const m = new Map(Object.entries(contenu));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _voir: (k) => (m.has(k) ? m.get(k) : null),
  };
}

/** Une sauvegarde comme celle du téléphone : ajouts personnels partout. */
function sauvegardeUtilisateur() {
  return {
    version: 2,
    sessions: [
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000001',
        nom: 'Session Push',
        description: '',
        recompense: { forfait: 42, paliers: [{ minutes: 2, eclats: 5 }] },
        exercices: [
          {
            id: 'aaaaaaaa-0000-4000-8000-0000000000a1',
            nom: 'Pompes',
            repetitions: '30',
            dureeSecondes: null,
            musclesPrincipaux: ['pectoraux'],
            musclesSecondaires: ['triceps'],
            notes: '',
          },
        ],
      },
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000002',
        nom: 'Mobilité du matin',
        description: 'Ajoutée à la main',
        recompense: { forfait: 15, paliers: [{ minutes: 3, eclats: 4 }] },
        exercices: [
          {
            id: 'aaaaaaaa-0000-4000-8000-0000000000b1',
            nom: 'Chat-vache',
            repetitions: '10 lents',
            dureeSecondes: 90,
            musclesPrincipaux: ['bas-du-dos'],
            musclesSecondaires: [],
            notes: 'Respirer en cadence',
          },
          {
            id: 'aaaaaaaa-0000-4000-8000-0000000000b2',
            nom: 'Fentes marchées',
            repetitions: '12x2',
            dureeSecondes: 120,
            musclesPrincipaux: ['jambes', 'fessiers'],
            musclesSecondaires: ['abdos'],
            notes: '',
          },
        ],
      },
    ],
    etiquettes: [
      { id: 'pectoraux', nom: 'Pectoraux', couleur: '#c0392b' },
      { id: 'triceps', nom: 'Triceps', couleur: '#2980b9' },
      { id: 'jambes', nom: 'Jambes', couleur: '#16a085' },
      { id: 'abdos', nom: 'Abdos', couleur: '#d35400' },
      { id: 'bas-du-dos', nom: 'Bas du dos', couleur: '#8e44ad' },
      { id: 'fessiers', nom: 'Fessiers', couleur: '#b7950b' },
    ],
    historique: [{
      id: 'seance-1', nom: 'Session Push', statut: 'terminee', etapes: [], exercices: [],
    }],
    mouvements: [{ seanceId: 'seance-1', montant: 42 }],
    seanceEnCours: null,
    reglages: { dureeExerciceDefaut: 150, theme: 'sombre' },
  };
}

const avec = (etat) => stockageMemoire({ [CLE_ETAT]: JSON.stringify(etat) });

test('une sauvegarde personnelle traverse le chargement sans rien perdre', () => {
  const store = createStore({ storage: avec(sauvegardeUtilisateur()) });

  assert.equal(store.etatIllisible(), false);
  assert.deepEqual(store.sessions().map((s) => s.nom), ['Session Push', 'Mobilité du matin']);
  assert.deepEqual(
    store.etiquettes().map((e) => e.nom),
    ['Pectoraux', 'Triceps', 'Jambes', 'Abdos', 'Bas du dos', 'Fessiers'],
  );
  assert.equal(store.historique().length, 1);
  assert.equal(store.reglages().dureeExerciceDefaut, 150);
});

test('les sessions ajoutées gardent identifiant, barème et exercices', () => {
  const store = createStore({ storage: avec(sauvegardeUtilisateur()) });
  const mobilite = store.sessions()[1];

  assert.equal(mobilite.id, 'aaaaaaaa-0000-4000-8000-000000000002');
  assert.equal(mobilite.description, 'Ajoutée à la main');
  assert.equal(mobilite.recompense.forfait, 15);
  assert.deepEqual(mobilite.recompense.paliers, [{ minutes: 3, eclats: 4 }]);
  assert.deepEqual(mobilite.exercices.map((e) => e.nom), ['Chat-vache', 'Fentes marchées']);
  assert.equal(mobilite.exercices[0].dureeSecondes, 90);
  assert.equal(mobilite.exercices[0].notes, 'Respirer en cadence');
  assert.deepEqual(mobilite.exercices[1].musclesPrincipaux, ['jambes', 'fessiers']);
});

test('les étiquettes créées à la main survivent et ne sont pas remplacées', () => {
  const store = createStore({ storage: avec(sauvegardeUtilisateur()) });
  const ids = store.etiquettes().map((e) => e.id);

  assert.ok(ids.includes('bas-du-dos'));
  assert.ok(ids.includes('fessiers'));
  assert.ok(!ids.includes('epaules'), 'les sept d’origine ne se réinvitent pas');
});

test('une liste d’étiquettes volontairement vide reste vide', () => {
  const etat = { ...sauvegardeUtilisateur(), etiquettes: [] };
  assert.deepEqual(createStore({ storage: avec(etat) }).etiquettes(), []);
});

test('les champs inconnus d’une version plus récente sont conservés', () => {
  const etat = { ...sauvegardeUtilisateur(), reglageFutur: { actif: true } };
  etat.sessions[1].champInconnu = 'à garder';
  etat.sessions[1].exercices[0].charge = '24 kg';

  const store = createStore({ storage: avec(etat) });
  assert.deepEqual(store.instantane().reglageFutur, { actif: true });
  assert.equal(store.sessions()[1].champInconnu, 'à garder');
  assert.equal(store.sessions()[1].exercices[0].charge, '24 kg');
});

test('un aller-retour par le stockage ne dérive pas', () => {
  const stockage = avec(sauvegardeUtilisateur());
  const premier = createStore({ storage: stockage });
  premier.majReglages({ theme: 'clair' });

  const second = createStore({ storage: stockage });
  assert.deepEqual(
    second.sessions().map((s) => `${s.nom}:${s.exercices.length}`),
    premier.sessions().map((s) => `${s.nom}:${s.exercices.length}`),
  );
  assert.equal(second.etiquettes().length, 6);
  assert.equal(second.reglages().theme, 'clair');
});

// ---- Les façons de tout perdre, désormais fermées ----

test('une sauvegarde illisible n’est JAMAIS remplacée par le contenu d’amorçage', () => {
  const brut = '{ ceci n’est pas du JSON';
  const stockage = stockageMemoire({ [CLE_ETAT]: brut });
  const store = createStore({ storage: stockage });

  assert.equal(store.etatIllisible(), true);
  // L'écriture est refusée : le brut d'origine est toujours là, intact.
  store.enregistrerSession({ nom: 'Tentative', exercices: [] });
  assert.equal(stockage._voir(CLE_ETAT), brut);
  assert.equal(stockage._voir(CLE_SECOURS), brut);
});

test('une sauvegarde sans liste de sessions est mise de côté, pas écrasée', () => {
  const brut = JSON.stringify({ version: 2, historique: [], etiquettes: [] });
  const stockage = stockageMemoire({ [CLE_ETAT]: brut });
  const store = createStore({ storage: stockage });

  assert.equal(store.etatIllisible(), true);
  store.majReglages({ theme: 'clair' });
  assert.equal(stockage._voir(CLE_ETAT), brut, 'rien n’a été réécrit');
  assert.equal(stockage._voir(CLE_SECOURS), brut);
});

test('une session aux exercices abîmés bloque l’écriture au lieu de les vider', () => {
  const etat = sauvegardeUtilisateur();
  etat.sessions[1].exercices = 'perdu';
  const brut = JSON.stringify(etat);
  const stockage = stockageMemoire({ [CLE_ETAT]: brut });
  const store = createStore({ storage: stockage });

  assert.equal(store.etatIllisible(), true);
  store.enregistrerSession({ nom: 'Tentative', exercices: [] });
  assert.equal(stockage._voir(CLE_ETAT), brut);
});

test('migrer refuse une sauvegarde inutilisable au lieu de renvoyer un état vide', () => {
  assert.throws(() => migrer(null), /illisible/);
  assert.throws(() => migrer('texte'), /illisible/);
  assert.throws(() => migrer([]), /illisible/);
  assert.throws(() => migrer({ version: 2 }), /sessions absente/);
  assert.throws(() => migrer({ sessions: 'non' }), /sessions absente/);
});

test('la sauvegarde de secours est récupérable telle quelle', () => {
  const brut = '{ abîmé mais précieux';
  const store = createStore({ storage: stockageMemoire({ [CLE_ETAT]: brut }) });
  assert.equal(store.secours(), brut);
});

test('importer une sauvegarde valide débloque un état illisible', () => {
  const stockage = stockageMemoire({ [CLE_ETAT]: 'illisible' });
  const store = createStore({ storage: stockage });
  assert.equal(store.etatIllisible(), true);

  store.importer({ etat: sauvegardeUtilisateur() });

  assert.equal(store.etatIllisible(), false);
  assert.equal(store.sessions().length, 2);
  store.majReglages({ theme: 'clair' });
  assert.equal(JSON.parse(stockage._voir(CLE_ETAT)).reglages.theme, 'clair');
});

test('un import refusé laisse les données en place', () => {
  const stockage = avec(sauvegardeUtilisateur());
  const store = createStore({ storage: stockage });

  assert.throws(() => store.importer({ etat: { sessions: 'non' } }), /illisible/);
  assert.equal(store.sessions().length, 2, 'les sessions d’origine sont intactes');
  assert.equal(JSON.parse(stockage._voir(CLE_ETAT)).sessions.length, 2);
});

test('réinitialiser reste possible depuis un état illisible', () => {
  const stockage = stockageMemoire({ [CLE_ETAT]: 'illisible' });
  const store = createStore({ storage: stockage });

  store.reinitialiser();
  assert.equal(store.etatIllisible(), false);
  assert.equal(store.sessions().length, 4);
  assert.equal(JSON.parse(stockage._voir(CLE_ETAT)).sessions.length, 4);
});

test('un vrai premier lancement pose bien le contenu d’amorçage', () => {
  const store = createStore({ storage: stockageMemoire() });
  assert.equal(store.etatIllisible(), false);
  assert.equal(store.sessions().length, 4);
});

test('supprimer toutes les sessions ne les fait pas revenir au rechargement', () => {
  const stockage = avec(sauvegardeUtilisateur());
  const premier = createStore({ storage: stockage });
  for (const s of [...premier.sessions()]) premier.supprimerSession(s.id);
  assert.equal(premier.sessions().length, 0);

  assert.equal(createStore({ storage: stockage }).sessions().length, 0);
});

// ---- Témoin : un état réellement écrit par la version publiée ----
//
// `tests/temoins/etat-v2-publie.json` a été produit en passant par l'API du
// store de la version publiée (commit ca356c0), avec des ajouts comme ceux
// qu'on fait depuis le téléphone : deux étiquettes créées, une session ajoutée,
// un exercice ajouté à une session d'origine et son forfait relevé.
//
// Ce fichier ne doit pas être régénéré à la légère : c'est la preuve qu'une
// mise à jour relit sans perte ce qui existait avant elle.

test('l’état écrit par la version publiée est relu sans perte', async () => {
  const { readFile } = await import('node:fs/promises');
  const brut = await readFile(
    new URL('./temoins/etat-v2-publie.json', import.meta.url), 'utf8',
  );
  const stockage = stockageMemoire({ [CLE_ETAT]: brut });
  const store = createStore({ storage: stockage });

  assert.equal(store.etatIllisible(), false, 'aucun mode dégradé');
  assert.equal(store.secours(), null, 'aucune mise de côté : la lecture a réussi');

  const parNom = Object.fromEntries(store.sessions().map((s) => [s.nom, s]));
  assert.deepEqual(Object.keys(parNom).sort(), [
    'Calisthénie', 'Mobilité du matin', 'Session Alt', 'Session Pull', 'Session Push',
  ]);

  // La session ajoutée à la main, intacte jusqu'aux notes.
  const mobilite = parNom['Mobilité du matin'];
  assert.equal(mobilite.description, 'Ajoutée à la main sur le téléphone');
  assert.equal(mobilite.recompense.forfait, 15);
  assert.deepEqual(mobilite.recompense.paliers, [{ minutes: 3, eclats: 4 }]);
  assert.deepEqual(mobilite.exercices.map((e) => e.nom), ['Chat-vache', 'Fentes marchées']);
  assert.equal(mobilite.exercices[0].dureeSecondes, 90);
  assert.equal(mobilite.exercices[0].notes, 'Respirer en cadence');
  assert.deepEqual(mobilite.exercices[1].musclesPrincipaux, ['jambes', 'fessiers']);

  // L'exercice ajouté à une session d'origine, et son forfait relevé.
  assert.equal(parNom['Session Push'].exercices.length, 22);
  assert.equal(parNom['Session Push'].exercices.at(-1).nom, 'Gainage dynamique');
  assert.equal(parNom['Session Push'].recompense.forfait, 55);

  // Les étiquettes créées à la main, en plus des sept d'origine.
  const etiquettes = store.etiquettes().map((e) => e.nom);
  assert.equal(etiquettes.length, 9);
  assert.ok(etiquettes.includes('Bas du dos'));
  assert.ok(etiquettes.includes('Fessiers'));

  assert.equal(store.reglages().dureeExerciceDefaut, 150);
  assert.equal(store.reglages().theme, 'clair');
});

test('les identifiants ne sont pas régénérés au passage de version', async () => {
  const { readFile } = await import('node:fs/promises');
  const brut = await readFile(
    new URL('./temoins/etat-v2-publie.json', import.meta.url), 'utf8',
  );
  const attendu = JSON.parse(brut);
  const store = createStore({ storage: stockageMemoire({ [CLE_ETAT]: brut }) });

  assert.deepEqual(
    store.sessions().map((s) => s.id),
    attendu.sessions.map((s) => s.id),
    'un identifiant qui change casserait l’historique et les Éclats déjà versés',
  );
  assert.deepEqual(
    store.sessions().flatMap((s) => s.exercices.map((e) => e.id)),
    attendu.sessions.flatMap((s) => s.exercices.map((e) => e.id)),
  );
});
