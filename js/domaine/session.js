// Modèle d'une session d'entraînement et de ses exercices.
//
// Une SESSION est un modèle réutilisable (« Session Push »). La lancer produit
// une SÉANCE, qui est l'exécution chronométrée d'un jour donné (voir seance.js).
// Modifier une session ne touche donc jamais à une séance déjà courue : la
// séance emporte sa propre copie des exercices.

import { DUREE_EXERCICE_DEFAUT, bornerDuree } from './duree.js';
import { RECOMPENSE_DEFAUT, normaliserRecompense } from './recompense.js';

export function exerciceVide() {
  return {
    nom: '',
    repetitions: '',
    dureeSecondes: null,
    musclesPrincipaux: [],
    musclesSecondaires: [],
    notes: '',
  };
}

/** Complète un exercice partiel sans jamais perdre un champ inconnu. */
export function normaliserExercice(brut, identifiant) {
  const base = exerciceVide();
  const listeIds = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x) : []);
  return {
    ...base,
    ...brut,
    id: brut?.id || identifiant(),
    nom: String(brut?.nom ?? '').trim(),
    repetitions: String(brut?.repetitions ?? '').trim(),
    dureeSecondes: brut?.dureeSecondes == null ? null : bornerDuree(brut.dureeSecondes),
    musclesPrincipaux: listeIds(brut?.musclesPrincipaux),
    musclesSecondaires: listeIds(brut?.musclesSecondaires),
    notes: String(brut?.notes ?? ''),
  };
}

export function normaliserSession(brut, identifiant, recompenseDefaut = RECOMPENSE_DEFAUT) {
  // Une session neuve n'a pas encore d'exercices : c'est légitime. En revanche,
  // un champ `exercices` présent mais qui n'est pas une liste signale une
  // sauvegarde abîmée. On refuse plutôt que de renvoyer une session vide, ce
  // qui effacerait le travail de l'utilisateur sans un mot.
  const exercices = brut?.exercices;
  if (exercices != null && !Array.isArray(exercices)) {
    throw new Error(`Exercices illisibles pour la session « ${brut?.nom ?? '?'} ».`);
  }

  return {
    ...brut,
    id: brut?.id || identifiant(),
    nom: String(brut?.nom ?? '').trim() || 'Session sans nom',
    description: String(brut?.description ?? ''),
    // Chaque session porte son propre barème d'Éclats. Les réglages ne servent
    // qu'à préremplir celles qui n'en ont pas encore.
    recompense: normaliserRecompense(brut?.recompense || recompenseDefaut),
    exercices: (exercices || []).map((e) => normaliserExercice(e, identifiant)),
  };
}

/** Durée effective d'un exercice : la sienne, sinon celle des réglages. */
export function dureeExercice(exercice, dureeDefaut = DUREE_EXERCICE_DEFAUT) {
  return exercice?.dureeSecondes == null ? dureeDefaut : exercice.dureeSecondes;
}

/** Temps théorique total d'une session, en millisecondes. */
export function dureeTheorique(exercices, dureeDefaut = DUREE_EXERCICE_DEFAUT) {
  return exercices.reduce((total, e) => total + dureeExercice(e, dureeDefaut), 0) * 1000;
}

/** Déplace un exercice d'un cran ; renvoie la liste inchangée si c'est un bord. */
export function deplacer(exercices, index, decalage) {
  const cible = index + decalage;
  if (index < 0 || index >= exercices.length || cible < 0 || cible >= exercices.length) {
    return exercices;
  }
  const copie = [...exercices];
  [copie[index], copie[cible]] = [copie[cible], copie[index]];
  return copie;
}

/**
 * Muscles couverts par une session, du plus au moins sollicité. Un muscle
 * secondaire compte pour moitié : il est travaillé, mais ce n'est pas la cible.
 */
export function repartitionMuscles(exercices) {
  const poids = new Map();
  const ajouter = (id, valeur) => poids.set(id, (poids.get(id) || 0) + valeur);
  for (const e of exercices) {
    for (const id of e.musclesPrincipaux || []) ajouter(id, 1);
    for (const id of e.musclesSecondaires || []) ajouter(id, 0.5);
  }
  return [...poids.entries()]
    .map(([id, valeur]) => ({ id, valeur }))
    .sort((a, b) => b.valeur - a.valeur || a.id.localeCompare(b.id));
}

/** Copie profonde destinée à un dupliqué : aucun identifiant n'est partagé. */
export function dupliquerSession(session, identifiant, nom) {
  return {
    ...session,
    id: identifiant(),
    nom: nom || `${session.nom} (copie)`,
    exercices: session.exercices.map((e) => ({ ...e, id: identifiant() })),
  };
}
