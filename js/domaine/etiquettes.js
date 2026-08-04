// Étiquettes musculaires.
//
// Le classeur d'origine n'offrait qu'un muscle principal et un secondaire par
// exercice. Ici les deux listes sont ouvertes : autant d'étiquettes que
// nécessaire de chaque côté, et de nouvelles créables à la volée.
//
// Une étiquette n'est jamais supprimée en silence des exercices qui la
// portent : `retirerEtiquette` fait le ménage explicitement, pour qu'aucun
// exercice ne garde la référence d'une étiquette disparue.

import { ETIQUETTES_INITIALES } from './donnees-initiales.js';

/** Palette lisible en clair comme en sombre, assignée en boucle. */
export const COULEURS = [
  '#c0392b', '#2980b9', '#8e44ad', '#16a085',
  '#d35400', '#2c3e50', '#7f8c8d', '#b7950b',
];

export function identifiantEtiquette(nom, existants = []) {
  const base = String(nom || 'muscle')
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'muscle';
  if (!existants.includes(base)) return base;
  let n = 2;
  while (existants.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function etiquettesInitiales() {
  return ETIQUETTES_INITIALES.map((e, i) => ({
    ...e,
    couleur: COULEURS[i % COULEURS.length],
  }));
}

export function nomEtiquette(etiquettes, id) {
  return etiquettes.find((e) => e.id === id)?.nom || id;
}

export function couleurEtiquette(etiquettes, id) {
  return etiquettes.find((e) => e.id === id)?.couleur || COULEURS[0];
}

/** Deux étiquettes de même nom seraient indistinguables à l'écran. */
export function nomDejaPris(etiquettes, nom, sauf = null) {
  const cible = String(nom).trim().toLocaleLowerCase('fr');
  return etiquettes.some((e) => e.id !== sauf && e.nom.toLocaleLowerCase('fr') === cible);
}

export function ajouterEtiquette(etiquettes, nom) {
  const propre = String(nom || '').trim();
  if (!propre) throw new Error('Une étiquette a besoin d’un nom.');
  if (nomDejaPris(etiquettes, propre)) {
    throw new Error(`L’étiquette « ${propre} » existe déjà.`);
  }
  const id = identifiantEtiquette(propre, etiquettes.map((e) => e.id));
  return [...etiquettes, { id, nom: propre, couleur: COULEURS[etiquettes.length % COULEURS.length] }];
}

/** Combien d'exercices portent cette étiquette — affiché avant suppression. */
export function usages(sessions, id) {
  let total = 0;
  for (const session of sessions) {
    for (const exercice of session.exercices) {
      if (exercice.musclesPrincipaux.includes(id) || exercice.musclesSecondaires.includes(id)) {
        total += 1;
      }
    }
  }
  return total;
}

/** Retire une étiquette du catalogue ET de tous les exercices qui la portaient. */
export function retirerEtiquette(sessions, id) {
  const sansId = (liste) => liste.filter((x) => x !== id);
  return sessions.map((session) => ({
    ...session,
    exercices: session.exercices.map((e) => ({
      ...e,
      musclesPrincipaux: sansId(e.musclesPrincipaux),
      musclesSecondaires: sansId(e.musclesSecondaires),
    })),
  }));
}

/**
 * Un muscle ne peut pas être principal et secondaire sur le même exercice :
 * cocher d'un côté décoche automatiquement de l'autre.
 */
export function basculer(exercice, id, role) {
  const principal = role === 'principal';
  const source = principal ? exercice.musclesPrincipaux : exercice.musclesSecondaires;
  const autre = principal ? exercice.musclesSecondaires : exercice.musclesPrincipaux;
  const presente = source.includes(id);
  const nouvelleSource = presente ? source.filter((x) => x !== id) : [...source, id];
  const nouvelAutre = autre.filter((x) => x !== id);
  return {
    ...exercice,
    musclesPrincipaux: principal ? nouvelleSource : nouvelAutre,
    musclesSecondaires: principal ? nouvelAutre : nouvelleSource,
  };
}
