import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../js/store.js';
import { createFinancesSport, ErreurEclats } from '../js/eclats-sport.js';
import { createRegistre, APP_ID } from '../js/eclats-registre.js';
import { demarrerSeance, valider, passer, abandonner } from '../js/domaine/seance.js';
import { cleIdempotence } from '../js/domaine/recompense.js';

const T0 = 1_800_000_000_000;
let compteur = 0;
// UUID déterministes : le registre commun n'accepte que cette forme en
// `p_reference_id`, les identifiants de test doivent donc la respecter.
const identifiant = () => `00000000-0000-4000-8000-${String((compteur += 1)).padStart(12, '0')}`;

function stockageMemoire() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

/** Registre simulé : compte les appels pour prouver l'idempotence. */
function registreFactice({ connecte = true } = {}) {
  const appels = [];
  return {
    appels,
    estConnecte: () => connecte,
    solde: async () => 500,
    recompenser: async (args) => {
      appels.push(args);
      return { movement_id: `mv-${appels.length}`, balance_after: 500 + args.montant };
    },
  };
}

const PALIERS = [{ minutes: 2, eclats: 5 }, { minutes: 5, eclats: 12 }];

function seanceTerminee({
  durees = [180, 180], temps = [60_000, 120_000], sauts = [],
  recompense = { forfait: 40, paliers: PALIERS },
} = {}) {
  let seance = demarrerSeance({
    id: 'session-1',
    nom: 'Session Push',
    recompense,
    exercices: durees.map((d, i) => ({
      id: `ex-${i}`, nom: `Exercice ${i + 1}`, repetitions: '30',
      dureeSecondes: d, musclesPrincipaux: [], musclesSecondaires: [], notes: '',
    })),
  }, { maintenant: T0, dureeDefaut: 180, identifiant });

  temps.forEach((t, i) => {
    seance = sauts.includes(i) ? passer(seance, T0 + t) : valider(seance, T0 + t);
  });
  return seance;
}

function contexte(options = {}) {
  const store = createStore({ storage: stockageMemoire() });
  const registre = registreFactice(options);
  const finances = createFinancesSport({ store, registre, maintenant: () => T0 });
  return { store, registre, finances };
}

test('collecter crédite le registre puis marque la séance', async () => {
  const { store, registre, finances } = contexte();
  const seance = seanceTerminee();
  store.archiverSeance(seance);

  const { calcul } = await finances.collecter(seance.id);

  assert.equal(registre.appels.length, 1);
  assert.equal(registre.appels[0].montant, calcul.total);
  assert.equal(registre.appels[0].referenceType, 'seance_sport');
  assert.equal(registre.appels[0].referenceId, seance.id);
  assert.equal(store.seance(seance.id).recompense.collectee, true);
  assert.equal(store.mouvementPour(seance.id).montant, calcul.total);
});

test('collecter deux fois n’écrit qu’un seul mouvement', async () => {
  const { store, registre, finances } = contexte();
  const seance = seanceTerminee();
  store.archiverSeance(seance);

  await finances.collecter(seance.id);
  await assert.rejects(() => finances.collecter(seance.id), /déjà été collectée/);
  assert.equal(registre.appels.length, 1);
});

test('une collecte interrompue après le registre ne recrédite pas au second essai', async () => {
  const { store, registre, finances } = contexte();
  const seance = seanceTerminee();
  store.archiverSeance(seance);

  // Le registre a répondu, mais la séance n'a pas été marquée : c'est le
  // scénario d'une coupure entre les deux écritures.
  store.enregistrerMouvement({ seanceId: seance.id, montant: 45, mouvementId: 'mv-1' });

  await finances.collecter(seance.id);
  assert.equal(registre.appels.length, 0, 'le miroir local suffit à savoir que c’est payé');
  assert.equal(store.seance(seance.id).recompense.mouvementId, 'mv-1');
});

test('la clé d’idempotence part au registre', async () => {
  const { store, registre, finances } = contexte();
  const seance = seanceTerminee();
  store.archiverSeance(seance);

  await finances.collecter(seance.id);
  assert.equal(registre.appels[0].idempotencyKey, `sport:seance:${seance.id}:versement`);
});

test('une séance abandonnée ne se collecte pas', async () => {
  const { store, finances } = contexte();
  const seance = abandonner(seanceTerminee({ temps: [60_000] }), T0 + 90_000);
  store.archiverSeance(seance);

  await assert.rejects(() => finances.collecter(seance.id), ErreurEclats);
  await assert.rejects(() => finances.collecter(seance.id), /jusqu’au bout/);
});

test('hors connexion, rien n’est écrit ni promis', async () => {
  const { store, registre, finances } = contexte({ connecte: false });
  const seance = seanceTerminee();
  store.archiverSeance(seance);

  await assert.rejects(() => finances.collecter(seance.id), /Connectez-vous/);
  assert.equal(registre.appels.length, 0);
  assert.equal(store.seance(seance.id).recompense, null);
  assert.equal(store.mouvementPour(seance.id), null);
});

test('une séance introuvable est refusée proprement', async () => {
  const { finances } = contexte();
  await assert.rejects(() => finances.collecter('inexistante'), /introuvable/);
});

test('le montant envoyé est recalculé, pas repris d’un affichage', async () => {
  const { store, registre, finances } = contexte();
  const seance = seanceTerminee();
  // Un montant fantaisiste posé dans la séance ne doit pas atteindre le registre.
  store.archiverSeance({ ...seance, recompense: { total: 99_999, collectee: false } });

  await finances.collecter(seance.id);
  assert.equal(registre.appels[0].montant, 45, '40 ✦ de forfait + 5 ✦ au palier 2 min');
});

test('le barème parti au registre est celui figé dans la séance', async () => {
  const { store, registre, finances } = contexte();
  const seance = seanceTerminee({ recompense: { forfait: 12, paliers: [] } });
  store.archiverSeance(seance);
  // La session est relevée après coup : la séance déjà courue ne doit pas suivre.
  store.majReglages({ recompenseDefaut: { forfait: 9999 } });

  await finances.collecter(seance.id);
  assert.equal(registre.appels[0].montant, 12);
  assert.equal(registre.appels[0].metadata.forfait, 12);
  assert.equal(registre.appels[0].metadata.palier, null);
});

test('un barème nul rend la séance non collectable', async () => {
  const { store, finances } = contexte();
  const seance = seanceTerminee({ recompense: { forfait: 0, paliers: [] } });
  store.archiverSeance(seance);

  await assert.rejects(() => finances.collecter(seance.id), /aucun Éclat/);
});

test('eclatsACollecter additionne les séances terminées non collectées', async () => {
  const { store, finances } = contexte();
  const enAvance = seanceTerminee();
  const enRetard = seanceTerminee({ temps: [200_000, 400_000] });
  store.archiverSeance(enAvance);
  store.archiverSeance(enRetard);

  assert.equal(finances.eclatsACollecter(), 45 + 40);
  await finances.collecter(enAvance.id);
  assert.equal(finances.eclatsACollecter(), 40);
});

test('un exercice passé fait tomber le bonus dans le montant versé', async () => {
  const { store, registre, finances } = contexte();
  const seance = seanceTerminee({ sauts: [1] });
  store.archiverSeance(seance);

  await finances.collecter(seance.id);
  assert.equal(registre.appels[0].montant, 20, 'la moitié du forfait, aucun bonus');
});

test('soldeDisponible ne parle au registre que si l’on est connecté', async () => {
  assert.equal(await contexte({ connecte: false }).finances.soldeDisponible(), null);
  assert.equal(await contexte().finances.soldeDisponible(), 500);
});

test('le client du registre ne sait pas dépenser', () => {
  const registre = createRegistre({ fetch: async () => ({ ok: true, text: async () => '0' }), storage: stockageMemoire() });

  assert.equal(APP_ID, 'sport');
  assert.equal(typeof registre.recompenser, 'function');
  assert.equal(registre.depenser, undefined);
  assert.equal(registre.rembourser, undefined);
});

test('aucune clé secrète n’est embarquée', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../js/eclats-registre.js', import.meta.url), 'utf8');

  assert.ok(source.includes('sb_publishable_'), 'seule la clé publique est présente');
  assert.ok(!/service_role|sb_secret_|SUPABASE_SERVICE/i.test(source));
});

test('les identifiants sont des UUID, même sans crypto.randomUUID', async () => {
  const { identifiant, UUID } = await import('../js/store.js');
  // `globalThis.crypto` est un accesseur dans Node : on garde le descripteur
  // pour le restaurer, et l'objet lui-même pour continuer à tirer de l'aléa.
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const vraiCrypto = globalThis.crypto;
  const remplacer = (valeur) => Object.defineProperty(globalThis, 'crypto', {
    value: valeur, configurable: true, writable: true,
  });

  try {
    assert.match(identifiant(), UUID, 'contexte sécurisé');

    // Contexte non sécurisé (http:// sur le réseau local, depuis un téléphone) :
    // `randomUUID` disparaît, `getRandomValues` reste.
    remplacer({ getRandomValues: (t) => vraiCrypto.getRandomValues(t) });
    assert.match(identifiant(), UUID, 'repli getRandomValues');

    // Dernier recours : plus aucune API crypto.
    remplacer(undefined);
    assert.match(identifiant(), UUID, 'repli Math.random');

    const cent = new Set(Array.from({ length: 100 }, () => identifiant()));
    assert.equal(cent.size, 100, 'aucune collision sur cent tirages');
  } finally {
    Object.defineProperty(globalThis, 'crypto', original);
  }
});

test('un identifiant de séance non-UUID part en metadata, pas en référence', async () => {
  const { store, registre, finances } = contexte();
  const seance = seanceTerminee();
  // Séance héritée d'une version antérieure, à l'identifiant maison.
  const ancienne = { ...seance, id: 'id-abc-123' };
  store.archiverSeance(ancienne);

  await finances.collecter(ancienne.id);

  assert.equal(registre.appels[0].referenceId, null, 'le registre refuserait un uuid invalide');
  assert.equal(registre.appels[0].metadata.seance, 'id-abc-123');
});

test('un identifiant de séance UUID sert bien de référence', async () => {
  const { store, registre, finances } = contexte();
  const seance = seanceTerminee();
  store.archiverSeance(seance);

  await finances.collecter(seance.id);
  assert.equal(registre.appels[0].referenceId, seance.id);
});

test('la clé d’idempotence dépasse la longueur minimale exigée par le registre', () => {
  const seance = seanceTerminee();
  assert.ok(cleIdempotence(seance.id).length >= 8);
});
