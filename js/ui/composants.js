// Fragments d'interface partagés entre les écrans.

import { div, el, span } from './dom.js';
import { couleurEtiquette, nomEtiquette } from '../domaine/etiquettes.js';
import { formaterDuree, formaterEcart, sensEcart } from '../domaine/duree.js';
import { dureeExercice, dureeTheorique, repartitionMuscles } from '../domaine/session.js';

/** Pastille de muscle. Le rôle secondaire est marqué par un contour, pas un aplat. */
export function pastille(etiquettes, id, role = 'principal') {
  const couleur = couleurEtiquette(etiquettes, id);
  const noeud = span(`pastille pastille-${role}`, nomEtiquette(etiquettes, id));
  noeud.style.setProperty('--teinte', couleur);
  return noeud;
}

export function pastilles(etiquettes, exercice) {
  const liste = [
    ...(exercice.musclesPrincipaux || []).map((id) => pastille(etiquettes, id, 'principal')),
    ...(exercice.musclesSecondaires || []).map((id) => pastille(etiquettes, id, 'secondaire')),
  ];
  return liste.length ? div('pastilles', liste) : null;
}

/**
 * L'écart, avec son signe et sa couleur. C'est l'information la plus lue de
 * l'application : elle a droit à son propre composant pour rester identique
 * partout où elle apparaît.
 */
export function ecartAffiche(millisecondes, { taille = 'normal' } = {}) {
  const sens = sensEcart(millisecondes);
  const noeud = span(`ecart ecart-${sens} ecart-${taille}`, formaterEcart(millisecondes));
  noeud.title = sens === 'avance' ? 'Avance sur le temps théorique'
    : sens === 'retard' ? 'Retard sur le temps théorique' : 'Pile sur le temps théorique';
  return noeud;
}

/** Résumé d'une session : nombre d'exercices, durée théorique, muscles dominants. */
export function resumeSession(session, etiquettes, dureeDefaut) {
  const total = dureeTheorique(session.exercices, dureeDefaut);
  const dominants = repartitionMuscles(session.exercices).slice(0, 4);
  return div('session-resume', [
    span('session-compte', `${session.exercices.length} exercice${session.exercices.length > 1 ? 's' : ''}`),
    span('session-duree', formaterDuree(total)),
    dominants.length
      ? div('pastilles pastilles-compactes', dominants.map((m) => pastille(etiquettes, m.id)))
      : null,
  ]);
}

/** Couleur du muscle le plus sollicité — sert de liseré d'identification. */
export function teinteDominante(session, etiquettes) {
  const [premier] = repartitionMuscles(session.exercices);
  return premier ? couleurEtiquette(etiquettes, premier.id) : null;
}

/** Ligne d'exercice, réutilisée par la liste de séance et par l'éditeur. */
export function ligneExercice(exercice, etiquettes, {
  numero, dureeDefaut, statut = null, actif = false, actions = null, surClic = null,
} = {}) {
  const classes = ['ligne-exercice'];
  if (actif) classes.push('ligne-actif');
  if (statut) classes.push(`ligne-${statut}`);

  const ligne = el(surClic ? 'button' : 'div', {
    class: classes.join(' '),
    type: surClic ? 'button' : undefined,
    sur: surClic ? { click: surClic } : undefined,
  }, [
    span('ligne-numero', String(numero)),
    div('ligne-corps', [
      div('ligne-titre', [
        span('ligne-nom', exercice.nom || 'Exercice sans nom'),
        exercice.repetitions ? span('ligne-reps', exercice.repetitions) : null,
      ]),
      pastilles(etiquettes, exercice),
      exercice.notes ? el('p', { class: 'ligne-notes', texte: exercice.notes }) : null,
    ]),
    span('ligne-duree', formaterDuree(dureeExercice(exercice, dureeDefaut) * 1000)),
    actions ? div('ligne-actions', actions) : null,
  ]);
  return ligne;
}

export function vide(message, action) {
  return div('vide', [el('p', { texte: message }), action]);
}

/** Barre de progression 0→1, sans texte : elle accompagne un chiffre, elle ne le remplace pas. */
export function jauge(valeur, classe = '') {
  const barre = div(`jauge ${classe}`.trim(), [div('jauge-remplissage')]);
  barre.firstChild.style.width = `${Math.round(Math.min(1, Math.max(0, valeur)) * 100)}%`;
  return barre;
}
