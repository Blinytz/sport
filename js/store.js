// Persistance locale de Sport : unique point d'écriture des données.
//
// Tout vit dans le navigateur. Du registre commun, on ne conserve qu'un MIROIR
// des versements confirmés (identifiant de mouvement + montant), afin de ne
// jamais recompter deux fois un gain déjà crédité.
//
// Fabrique injectable pour rester testable hors navigateur.

import { SESSIONS_INITIALES } from './domaine/donnees-initiales.js';
import { etiquettesInitiales } from './domaine/etiquettes.js';
import { normaliserSession } from './domaine/session.js';
import { RECOMPENSE_DEFAUT, normaliserRecompense } from './domaine/recompense.js';
import { DUREE_EXERCICE_DEFAUT, bornerDuree } from './domaine/duree.js';

export const CLE_ETAT = 'sport_etat_v1';
export const VERSION_ETAT = 2;

export const REGLAGES_DEFAUT = {
  dureeExerciceDefaut: DUREE_EXERCICE_DEFAUT,
  theme: 'sombre',
  garderEcranAllume: true,
  signalFinExercice: true,
  confirmerSuppression: true,
  // Ne sert qu'à préremplir une session nouvellement créée : le barème qui
  // compte est celui porté par chaque session.
  recompenseDefaut: { ...RECOMPENSE_DEFAUT },
};

function reglagesInitiaux() {
  return { ...REGLAGES_DEFAUT, recompenseDefaut: normaliserRecompense(RECOMPENSE_DEFAUT) };
}

export function etatInitial() {
  return {
    version: VERSION_ETAT,
    sessions: SESSIONS_INITIALES.map((s) => normaliserSession(s, identifiant)),
    etiquettes: etiquettesInitiales(),
    seanceEnCours: null,
    historique: [],
    mouvements: [],
    reglages: reglagesInitiaux(),
  };
}

export function createStore({ storage, cle = CLE_ETAT } = {}) {
  const store = storage
    || (typeof globalThis !== 'undefined' && globalThis.localStorage)
    || memoryStorage();

  let etat = lire();
  const abonnes = new Set();

  function lire() {
    try {
      const brut = store.getItem(cle);
      if (!brut) return etatInitial();
      return migrer(JSON.parse(brut));
    } catch {
      return etatInitial();
    }
  }

  function ecrire() {
    store.setItem(cle, JSON.stringify(etat));
    for (const f of abonnes) f(etat);
  }

  function abonner(f) { abonnes.add(f); return () => abonnes.delete(f); }
  function instantane() { return etat; }

  /** Toute modification passe par ici : un seul point d'écriture. */
  function transformer(f) {
    const suivant = f(etat);
    if (suivant && suivant !== etat) {
      etat = suivant;
      ecrire();
    }
    return etat;
  }

  // ---- Sessions ----

  function sessions() { return etat.sessions; }

  function session(id) { return etat.sessions.find((s) => s.id === id) || null; }

  function enregistrerSession(brute) {
    const propre = normaliserSession(brute, identifiant, etat.reglages.recompenseDefaut);
    transformer((e) => {
      const existe = e.sessions.some((s) => s.id === propre.id);
      return {
        ...e,
        sessions: existe
          ? e.sessions.map((s) => (s.id === propre.id ? propre : s))
          : [...e.sessions, propre],
      };
    });
    return propre;
  }

  /**
   * Supprimer une session ne touche pas à l'historique : les séances déjà
   * courues portent leur propre copie des exercices et restent lisibles.
   */
  function supprimerSession(id) {
    transformer((e) => ({ ...e, sessions: e.sessions.filter((s) => s.id !== id) }));
  }

  function reordonnerSessions(ids) {
    transformer((e) => ({
      ...e,
      sessions: ids.map((id) => e.sessions.find((s) => s.id === id)).filter(Boolean),
    }));
  }

  // ---- Étiquettes ----

  function etiquettes() { return etat.etiquettes; }

  function remplacerEtiquettes(liste, sessionsMisesAJour) {
    transformer((e) => ({
      ...e,
      etiquettes: liste,
      sessions: sessionsMisesAJour || e.sessions,
    }));
    return etat.etiquettes;
  }

  // ---- Séance en cours ----

  function seanceEnCours() { return etat.seanceEnCours; }

  function definirSeanceEnCours(seance) {
    transformer((e) => ({ ...e, seanceEnCours: seance }));
    return seance;
  }

  /** Clôture : la séance quitte l'emplacement courant pour l'historique. */
  function archiverSeance(seance) {
    transformer((e) => ({
      ...e,
      seanceEnCours: null,
      historique: [seance, ...e.historique.filter((s) => s.id !== seance.id)],
    }));
    return seance;
  }

  function historique() { return etat.historique; }

  function seance(id) {
    if (etat.seanceEnCours?.id === id) return etat.seanceEnCours;
    return etat.historique.find((s) => s.id === id) || null;
  }

  function remplacerSeanceArchivee(maj) {
    transformer((e) => ({
      ...e,
      historique: e.historique.map((s) => (s.id === maj.id ? maj : s)),
    }));
    return maj;
  }

  function supprimerSeance(id) {
    transformer((e) => ({ ...e, historique: e.historique.filter((s) => s.id !== id) }));
  }

  // ---- Réglages ----

  function reglages() { return etat.reglages; }

  function majReglages(champs) {
    transformer((e) => ({
      ...e,
      reglages: {
        ...e.reglages,
        ...champs,
        dureeExerciceDefaut: champs.dureeExerciceDefaut != null
          ? bornerDuree(champs.dureeExerciceDefaut)
          : e.reglages.dureeExerciceDefaut,
        recompenseDefaut: normaliserRecompense(
          champs.recompenseDefaut
            ? { ...e.reglages.recompenseDefaut, ...champs.recompenseDefaut }
            : e.reglages.recompenseDefaut,
        ),
      },
    }));
    return etat.reglages;
  }

  // ---- Miroir des mouvements d'Éclats confirmés ----

  function mouvements() { return etat.mouvements; }

  function mouvementPour(seanceId) {
    return etat.mouvements.find((m) => m.seanceId === seanceId) || null;
  }

  function enregistrerMouvement(mouvement) {
    const complet = {
      id: mouvement.id || identifiant(),
      date: mouvement.date || new Date().toISOString(),
      ...mouvement,
    };
    transformer((e) => (e.mouvements.some((m) => m.seanceId === complet.seanceId)
      ? e
      : { ...e, mouvements: [...e.mouvements, complet] }));
    return complet;
  }

  // ---- Export / import ----

  function exporter() {
    return {
      application: 'sport',
      version: VERSION_ETAT,
      exporteLe: new Date().toISOString(),
      etat,
    };
  }

  function importer(paquet) {
    const donnees = paquet?.etat ? paquet.etat : paquet;
    if (!donnees || !Array.isArray(donnees.sessions)) {
      throw new Error('Sauvegarde illisible : aucune session trouvée.');
    }
    transformer(() => migrer(donnees));
    return etat;
  }

  function reinitialiser() { transformer(() => etatInitial()); }

  return {
    instantane,
    abonner,
    transformer,
    sessions,
    session,
    enregistrerSession,
    supprimerSession,
    reordonnerSessions,
    etiquettes,
    remplacerEtiquettes,
    seanceEnCours,
    definirSeanceEnCours,
    archiverSeance,
    historique,
    seance,
    remplacerSeanceArchivee,
    supprimerSeance,
    reglages,
    majReglages,
    mouvements,
    mouvementPour,
    enregistrerMouvement,
    exporter,
    importer,
    reinitialiser,
  };
}

/** Complète une sauvegarde ancienne ou partielle sans jamais perdre de données. */
export function migrer(donnees) {
  const base = etatInitial();
  const liste = (v, defaut = []) => (Array.isArray(v) ? v : defaut);

  // v1 → v2 : le barème global par exercice devient un forfait porté par chaque
  // session. On convertit à volume constant plutôt que d'imposer le défaut, pour
  // qu'une session de 25 exercices ne se retrouve pas payée comme une de 14.
  const ancien = donnees.reglages?.bareme;
  const recompenseDefaut = normaliserRecompense(
    donnees.reglages?.recompenseDefaut || base.reglages.recompenseDefaut,
  );
  const forfaitRepris = (session) => (ancien?.eclatsParExercice > 0
    ? { forfait: ancien.eclatsParExercice * (session.exercices?.length || 0), paliers: recompenseDefaut.paliers }
    : recompenseDefaut);

  const { bareme, ...reglagesRepris } = donnees.reglages || {};

  return {
    ...base,
    ...donnees,
    version: VERSION_ETAT,
    sessions: liste(donnees.sessions).map((s) => normaliserSession(
      s, identifiant, s.recompense ? s.recompense : forfaitRepris(s),
    )),
    etiquettes: liste(donnees.etiquettes).length ? donnees.etiquettes : base.etiquettes,
    historique: liste(donnees.historique),
    mouvements: liste(donnees.mouvements),
    seanceEnCours: donnees.seanceEnCours || null,
    reglages: {
      ...base.reglages,
      ...reglagesRepris,
      recompenseDefaut,
    },
  };
}

/** Reconnaît un UUID canonique — le registre commun n'accepte que cette forme. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Identifiant de séance, de session et d'exercice.
 *
 * TOUJOURS un UUID, jamais une chaîne maison : l'identifiant de séance part au
 * registre commun dans `p_reference_id`, qui est typé `uuid` côté serveur.
 *
 * `crypto.randomUUID` n'existe que dans un contexte sécurisé — absent, donc, dès
 * qu'on ouvre l'application en `http://` sur le réseau local, ce qui est
 * précisément le cas quand on la teste depuis un téléphone. On retombe alors sur
 * `getRandomValues`, puis en dernier recours sur `Math.random`, mais la FORME
 * reste un UUID v4 dans les trois cas.
 */
export function identifiant() {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();

  const octets = new Uint8Array(16);
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(octets);
  else for (let i = 0; i < 16; i += 1) octets[i] = Math.floor(Math.random() * 256);

  octets[6] = (octets[6] & 0x0f) | 0x40; // version 4
  octets[8] = (octets[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = [...octets].map((o) => o.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
