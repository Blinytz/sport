// Moteur de séance : le cœur de l'application.
//
// Une séance est une suite d'ÉTAPES horodatées, jamais un compteur qu'on
// décrémente. Tout l'affichage — temps écoulé, compte à rebours, avance ou
// retard — est RECALCULÉ à partir de `debut`, des étapes et de l'heure
// courante. Conséquence : mettre le téléphone en veille, changer d'onglet ou
// recharger la page ne fait pas dériver le chronomètre d'une seconde.
//
// La séance emporte une COPIE des exercices au démarrage. Modifier la session
// pendant qu'on la court ne change donc rien à la séance en cours, et
// l'historique reste lisible même si la session est supprimée plus tard.

import { dureeExercice } from './session.js';
import { DUREE_EXERCICE_DEFAUT } from './duree.js';

export const STATUT = {
  EN_COURS: 'en-cours',
  TERMINEE: 'terminee',
  ABANDONNEE: 'abandonnee',
};

export const ETAPE = { VALIDE: 'valide', PASSE: 'passe' };

export function demarrerSeance(session, {
  maintenant,
  dureeDefaut = DUREE_EXERCICE_DEFAUT,
  identifiant,
}) {
  if (!session?.exercices?.length) {
    throw new Error('Une séance sans exercice ne peut pas être lancée.');
  }
  return {
    id: identifiant(),
    sessionId: session.id,
    nom: session.nom,
    // Durées résolues ici : une modification ultérieure du réglage global ne
    // doit pas réécrire le temps théorique d'une séance déjà courue.
    exercices: session.exercices.map((e) => ({
      ...e,
      dureeSecondes: dureeExercice(e, dureeDefaut),
    })),
    // Barème figé de la même façon : relever le forfait d'une session ne doit
    // pas revaloriser après coup une séance déjà courue, ni celle en cours.
    bareme: session.recompense ? JSON.parse(JSON.stringify(session.recompense)) : null,
    debut: maintenant,
    etapes: [],
    pauseDepuis: null,
    pauseCumulee: 0,
    fin: null,
    statut: STATUT.EN_COURS,
    recompense: null,
  };
}

/** Temps réellement écoulé, pauses déduites. Figé dès que la séance est close. */
export function ecoule(seance, maintenant) {
  const reference = seance.fin ?? maintenant;
  const enPause = seance.pauseDepuis != null && seance.fin == null;
  const pauseCourante = enPause ? Math.max(0, reference - seance.pauseDepuis) : 0;
  return Math.max(0, reference - seance.debut - seance.pauseCumulee - pauseCourante);
}

/**
 * Temps théorique CRÉDITÉ par les `nombre` premières étapes.
 *
 * Un exercice passé ne crédite rien. Sans cette règle, sauter un exercice de
 * trois minutes en cinq secondes offrirait presque trois minutes d'avance : on
 * gagnerait du temps, et donc des Éclats, en travaillant moins.
 */
export function theoriqueCumule(seance, nombre) {
  return seance.etapes
    .slice(0, Math.max(0, nombre))
    .filter((etape) => etape.statut === ETAPE.VALIDE)
    .reduce((total, etape) => total + (seance.exercices[etape.index]?.dureeSecondes || 0), 0) * 1000;
}

/**
 * Temps théorique de la séance entière, amputé des exercices déjà passés.
 *
 * C'est la contrepartie de la règle ci-dessus : passer un exercice raccourcit
 * la séance prévue au lieu de laisser un crédit de temps à récupérer.
 */
export function theoriqueProjete(seance) {
  const passes = new Set(
    seance.etapes.filter((e) => e.statut === ETAPE.PASSE).map((e) => e.index),
  );
  return seance.exercices
    .reduce((total, exercice, i) => total + (passes.has(i) ? 0 : exercice.dureeSecondes), 0) * 1000;
}

export function indexCourant(seance) {
  return Math.min(seance.etapes.length, seance.exercices.length - 1);
}

/** Temps écoulé au moment où l'exercice courant a commencé. */
export function debutExerciceCourant(seance) {
  const derniere = seance.etapes[seance.etapes.length - 1];
  return derniere ? derniere.a : 0;
}

/**
 * L'écart affiché : temps réel écoulé moins temps théorique des exercices
 * déjà passés. Négatif = avance, positif = retard.
 *
 * Il est FIGÉ entre deux validations, volontairement. Le faire courir en
 * continu le ferait glisser vers le rouge pendant chaque exercice, y compris
 * quand tout va bien — le compte à rebours de l'exercice suffit à dire où l'on
 * en est dans l'instant.
 */
export function ecart(seance) {
  const faites = seance.etapes.length;
  if (!faites) return 0;
  return seance.etapes[faites - 1].a - theoriqueCumule(seance, faites);
}

/** Écart mesuré au moment exact où la séance s'est close. */
export function ecartFinal(seance, maintenant = seance.fin) {
  if (seance.statut === STATUT.TERMINEE) {
    return ecoule(seance, maintenant) - theoriqueCumule(seance, seance.etapes.length);
  }
  return ecart(seance);
}

/**
 * Vue complète destinée à l'affichage. Une seule fonction, appelée à chaque
 * tic : l'interface n'a aucune arithmétique de temps à refaire de son côté.
 */
export function vueSeance(seance, maintenant) {
  const total = seance.exercices.length;
  const faites = seance.etapes.length;
  const close = seance.statut !== STATUT.EN_COURS;
  const index = indexCourant(seance);
  const temps = ecoule(seance, maintenant);
  const debutExercice = debutExerciceCourant(seance);
  const exercice = seance.exercices[index] || null;
  const dureeMs = exercice ? exercice.dureeSecondes * 1000 : 0;
  const surExercice = close ? 0 : Math.max(0, temps - debutExercice);

  return {
    close,
    statut: seance.statut,
    exercice,
    index,
    numero: Math.min(faites + 1, total),
    total,
    faites,
    enPause: seance.pauseDepuis != null && !close,
    ecoule: temps,
    surExercice,
    restant: dureeMs - surExercice,
    depasse: !close && surExercice > dureeMs,
    progression: dureeMs > 0 ? Math.min(1, surExercice / dureeMs) : 0,
    ecart: close ? ecartFinal(seance, maintenant) : ecart(seance),
    theoriqueTotal: theoriqueProjete(seance),
    restantTheorique: Math.max(0, theoriqueProjete(seance) - temps),
    statutsEtapes: seance.exercices.map((_, i) => seance.etapes[i]?.statut || null),
  };
}

// ---- Transitions ----

function exigerEnCours(seance) {
  if (seance.statut !== STATUT.EN_COURS) {
    throw new Error('Cette séance est terminée.');
  }
}

/** Reprendre est implicite : valider en pause relance le chronomètre d'abord. */
function reprise(seance, maintenant) {
  if (seance.pauseDepuis == null) return seance;
  return {
    ...seance,
    pauseCumulee: seance.pauseCumulee + Math.max(0, maintenant - seance.pauseDepuis),
    pauseDepuis: null,
  };
}

function avancer(seance, maintenant, statut) {
  exigerEnCours(seance);
  const repris = reprise(seance, maintenant);
  const index = indexCourant(repris);
  const etapes = [...repris.etapes, {
    index,
    statut,
    a: ecoule(repris, maintenant),
    horodatage: maintenant,
  }];
  const fini = etapes.length >= repris.exercices.length;
  return {
    ...repris,
    etapes,
    statut: fini ? STATUT.TERMINEE : STATUT.EN_COURS,
    fin: fini ? maintenant : null,
  };
}

export function valider(seance, maintenant) {
  return avancer(seance, maintenant, ETAPE.VALIDE);
}

export function passer(seance, maintenant) {
  return avancer(seance, maintenant, ETAPE.PASSE);
}

export function basculerPause(seance, maintenant) {
  exigerEnCours(seance);
  if (seance.pauseDepuis != null) return reprise(seance, maintenant);
  return { ...seance, pauseDepuis: maintenant };
}

/**
 * Retour en arrière sur la dernière étape — le clic de trop est fréquent quand
 * on est essoufflé. L'horodatage réel n'est pas réécrit : le temps passé reste
 * compté, seule la validation est annulée.
 */
export function annulerDerniereEtape(seance) {
  if (!seance.etapes.length) return seance;
  return {
    ...seance,
    etapes: seance.etapes.slice(0, -1),
    statut: STATUT.EN_COURS,
    fin: null,
  };
}

/** Arrêt avant la fin : la séance rejoint l'historique, sans récompense. */
export function abandonner(seance, maintenant) {
  exigerEnCours(seance);
  const repris = reprise(seance, maintenant);
  return { ...repris, statut: STATUT.ABANDONNEE, fin: maintenant };
}

// ---- Lecture de l'historique ----

export function nombreValides(seance) {
  return seance.etapes.filter((e) => e.statut === ETAPE.VALIDE).length;
}

export function nombrePasses(seance) {
  return seance.etapes.filter((e) => e.statut === ETAPE.PASSE).length;
}

/** Détail par exercice, pour le bilan de fin de séance. */
export function detailEtapes(seance) {
  let precedent = 0;
  return seance.etapes.map((etape) => {
    const exercice = seance.exercices[etape.index];
    const duree = etape.a - precedent;
    precedent = etape.a;
    // Un exercice passé ne crédite aucun temps : les secondes réellement
    // dépensées à le sauter comptent donc entièrement comme du retard.
    const credite = etape.statut === ETAPE.VALIDE ? exercice.dureeSecondes * 1000 : 0;
    return {
      ...etape,
      exercice,
      duree,
      credite,
      ecartExercice: duree - credite,
    };
  });
}
