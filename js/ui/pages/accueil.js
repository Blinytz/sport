// Accueil : choisir une séance et la lancer. Rien d'autre au premier plan.

import { bouton, div, el, span, titre } from '../dom.js';
import { ecartAffiche, resumeSession, teinteDominante, vide } from '../composants.js';
import { formaterDuree } from '../../domaine/duree.js';
import { demarrerSeance, vueSeance } from '../../domaine/seance.js';
import { series } from '../../domaine/stats.js';
import { identifiant } from '../../store.js';

export function pageAccueil({ store, router, finances }) {
  const sessions = store.sessions();
  const etiquettes = store.etiquettes();
  const reglages = store.reglages();
  const enCours = store.seanceEnCours();
  const serie = series(store.historique());

  function lancer(session) {
    store.definirSeanceEnCours(demarrerSeance(session, {
      maintenant: Date.now(),
      dureeDefaut: reglages.dureeExerciceDefaut,
      identifiant,
    }));
    router.aller('#/seance');
  }

  const aCollecter = finances.eclatsACollecter();

  return div('page page-accueil', [
    div('accueil-entete', [
      div('page-titre', [
        span('page-surtitre', salutation()),
        titre(1, 'Séances'),
      ]),
      serie.enCours > 1
        ? div('jeton-serie', [span('', '🔥'), span('', `${serie.enCours} jours`)])
        : null,
    ]),

    enCours ? repriseSeance(enCours, router) : null,

    aCollecter > 0
      ? el('button', {
        class: 'bandeau bandeau-eclats',
        type: 'button',
        sur: { click: () => router.aller('#/historique') },
      }, [
        div('bandeau-corps', [
          span('bandeau-titre', 'Éclats en attente'),
          span('bandeau-texte', 'à collecter dans l’historique'),
        ]),
        span('bandeau-montant', `${aCollecter} ✦`),
      ])
      : null,

    sessions.length
      ? div('grille-sessions', sessions.map((session) => carteSession(
        session, etiquettes, reglages, () => lancer(session), router,
      )))
      : vide(
        'Aucune séance. Créez-en une pour commencer.',
        bouton('Créer une séance', () => router.aller('#/sessions'), {
          class: 'bouton bouton-primaire',
        }),
      ),
  ]);
}

function salutation() {
  const heure = new Date().getHours();
  if (heure < 6) return 'Cette nuit';
  if (heure < 12) return 'Ce matin';
  if (heure < 18) return 'Cet après-midi';
  return 'Ce soir';
}

function carteSession(session, etiquettes, reglages, surLancement, router) {
  const sansExercice = session.exercices.length === 0;
  const carte = div('carte-session', [
    el('button', {
      class: 'carte-session-corps',
      type: 'button',
      disabled: sansExercice,
      sur: { click: surLancement },
    }, [
      div('carte-session-haut', [
        titre(2, session.nom, 'carte-session-nom'),
        session.recompense?.forfait
          ? span('carte-session-gain', `${session.recompense.forfait} ✦`) : null,
      ]),
      session.description
        ? el('p', { class: 'carte-session-description', texte: session.description }) : null,
      resumeSession(session, etiquettes, reglages.dureeExerciceDefaut),
      span('carte-session-lancer', sansExercice ? 'Aucun exercice' : 'Lancer'),
    ]),
    bouton('Modifier', () => router.aller(`#/session/${session.id}`), {
      class: 'bouton bouton-discret carte-session-modifier',
    }),
  ]);

  const teinte = teinteDominante(session, etiquettes);
  if (teinte) carte.style.setProperty('--teinte', teinte);
  return carte;
}

/**
 * Une séance interrompue par un rechargement ou une fermeture d'onglet reste
 * reprenable : le chronomètre a continué de tourner, elle affiche donc son
 * état réel et non celui d'il y a une heure.
 */
function repriseSeance(seance, router) {
  const vue = vueSeance(seance, Date.now());
  return div('bandeau bandeau-reprise', [
    div('bandeau-corps', [
      span('bandeau-titre', `En cours : ${seance.nom}`),
      div('bandeau-details', [
        span('', `Exercice ${vue.numero}/${vue.total}`),
        span('', formaterDuree(vue.ecoule)),
        ecartAffiche(vue.ecart),
      ]),
    ]),
    bouton('Reprendre', () => router.aller('#/seance'), { class: 'bouton bouton-primaire' }),
  ]);
}
