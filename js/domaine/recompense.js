// Ce qu'une séance rapporte. Réglé SESSION PAR SESSION.
//
// Deux termes seulement, tous deux saisis dans l'éditeur de session :
//
//   FORFAIT — ce que vaut la séance menée au bout. Un seul nombre, qui permet
//   de payer une séance dure plus qu'une séance simplement longue.
//
//   PALIERS — des seuils d'avance sur le temps théorique. Le palier atteint le
//   plus haut s'applique, et lui seul : les paliers ne s'additionnent pas.
//
// Deux garde-fous, pour la même raison — bâcler ne doit jamais rapporter plus
// que faire :
//
//   1. Le forfait est versé AU PRORATA des exercices validés. Sauter la moitié
//      d'une séance ne paie pas une séance entière.
//   2. Un seul exercice passé annule tout le bonus. Sauter raccourcit le temps
//      réel, donc fabrique de l'avance : cette avance-là ne se paie pas.
//
// Aucun malus : le retard ne retire rien. On ne perd pas d'Éclats à s'être
// entraîné lentement.

import { STATUT, ecartFinal, nombrePasses, nombreValides } from './seance.js';

export const PALIERS_DEFAUT = [
  { minutes: 2, eclats: 5 },
  { minutes: 5, eclats: 12 },
  { minutes: 10, eclats: 25 },
];

export const RECOMPENSE_DEFAUT = {
  forfait: 40,
  paliers: PALIERS_DEFAUT,
};

export const FORFAIT_MAX = 100_000;
export const PALIERS_MAX = 8;

function entier(valeur, defaut, max) {
  const n = Math.round(Number(valeur));
  if (!Number.isFinite(n) || n < 0) return defaut;
  return Math.min(max, n);
}

/**
 * Range les paliers par avance croissante et écarte les doublons de seuil.
 * Deux paliers au même seuil rendraient le calcul dépendant de l'ordre de
 * saisie, ce qui serait invisible à l'écran et impossible à déboguer.
 */
export function normaliserPaliers(bruts) {
  if (!Array.isArray(bruts)) return PALIERS_DEFAUT.map((p) => ({ ...p }));
  const parSeuil = new Map();
  for (const brut of bruts) {
    const minutes = entier(brut?.minutes, null, 600);
    const eclats = entier(brut?.eclats, null, FORFAIT_MAX);
    if (minutes == null || eclats == null || minutes <= 0) continue;
    parSeuil.set(minutes, { minutes, eclats });
  }
  return [...parSeuil.values()]
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, PALIERS_MAX);
}

export function normaliserRecompense(brut) {
  return {
    forfait: entier(brut?.forfait, RECOMPENSE_DEFAUT.forfait, FORFAIT_MAX),
    paliers: normaliserPaliers(brut?.paliers),
  };
}

/** Le palier atteint, ou `null`. Le plus haut gagne ; ils ne se cumulent pas. */
export function palierAtteint(paliers, avanceMs) {
  let meilleur = null;
  for (const palier of paliers) {
    if (avanceMs >= palier.minutes * 60_000) meilleur = palier;
  }
  return meilleur;
}

/** Le prochain palier à décrocher, pour l'afficher pendant la séance. */
export function palierSuivant(paliers, avanceMs) {
  return paliers.find((p) => avanceMs < p.minutes * 60_000) || null;
}

/**
 * Récompense d'une séance. Fonction pure : elle ne lit que la séance close et
 * son barème, ce qui permet d'afficher le détail du calcul à l'utilisateur.
 *
 * Le barème est celui FIGÉ dans la séance à son lancement. Modifier une session
 * ne réévalue donc jamais une séance déjà courue.
 */
export function calculerRecompense(seance, secours = RECOMPENSE_DEFAUT) {
  const bareme = normaliserRecompense(seance?.bareme || secours);
  const vide = {
    forfait: 0, bonus: 0, total: 0, avance: 0, valides: 0, passes: 0,
    total_exercices: seance?.exercices?.length || 0, palier: null, bareme,
  };

  if (seance.statut !== STATUT.TERMINEE) {
    return { ...vide, motif: 'seance_non_terminee' };
  }

  const total = seance.exercices.length;
  const valides = nombreValides(seance);
  const passes = nombrePasses(seance);
  const avance = Math.max(0, -ecartFinal(seance));

  // Prorata : une séance intégralement validée touche le forfait entier.
  const forfait = total > 0
    ? Math.floor((bareme.forfait * valides) / total)
    : 0;

  const palier = passes > 0 ? null : palierAtteint(bareme.paliers, avance);
  const bonus = palier ? palier.eclats : 0;

  return {
    forfait,
    bonus,
    total: forfait + bonus,
    avance,
    valides,
    passes,
    total_exercices: total,
    palier,
    prochainPalier: palierSuivant(bareme.paliers, avance),
    bareme,
    motif: passes > 0 ? 'bonus_annule_exercice_passe' : null,
  };
}

/**
 * Clé d'idempotence du versement. Stable et unique par séance : deux clics, une
 * coupure réseau ou un rechargement rejouent la même écriture au lieu d'en
 * créer une seconde.
 */
export function cleIdempotence(seanceId) {
  return `sport:seance:${seanceId}:versement`;
}

/** Une récompense est collectable une fois, et seulement si elle vaut quelque chose. */
export function collectable(seance) {
  if (seance.statut !== STATUT.TERMINEE) return false;
  if (seance.recompense?.collectee) return false;
  return calculerRecompense(seance).total > 0;
}

/** Résumé du calcul, ligne à ligne, affiché sous le bouton de collecte. */
export function detailRecompense(calcul) {
  const lignes = [];

  if (calcul.valides === calcul.total_exercices) {
    lignes.push(`Séance complète : ${calcul.forfait} ✦`);
  } else {
    lignes.push(
      `${calcul.valides}/${calcul.total_exercices} exercices validés : `
      + `${calcul.forfait} ✦ sur ${calcul.bareme.forfait} ✦`,
    );
  }

  if (calcul.passes > 0) {
    lignes.push(`${calcul.passes} exercice${calcul.passes > 1 ? 's' : ''} passé${calcul.passes > 1 ? 's' : ''} : bonus annulé`);
  } else if (calcul.palier) {
    lignes.push(`Palier ${calcul.palier.minutes} min d'avance : +${calcul.palier.eclats} ✦`);
  } else if (calcul.prochainPalier) {
    lignes.push(
      `Aucun palier atteint (le premier est à ${calcul.prochainPalier.minutes} min d'avance)`,
    );
  } else {
    lignes.push('Aucun palier d’avance défini pour cette session');
  }

  return lignes;
}
