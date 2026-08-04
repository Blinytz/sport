// Écran de séance : l'exercice en cours, l'anneau, la liste complète.
//
// Le rendu est séparé en deux vitesses. Le SQUELETTE (nom de l'exercice, liste,
// pastilles) n'est refait qu'au changement d'exercice ; les CHIFFRES sont mis à
// jour quatre fois par seconde en écrivant directement dans les nœuds déjà en
// place. Sans cette séparation, la liste se reconstruirait en permanence et
// annulerait le défilement à chaque tic.

import { annoncer, bouton, confirmer, div, el, span } from '../dom.js';
import { ligneExercice, pastilles } from '../composants.js';
import { anneau } from '../graphiques.js';
import { formaterDuree, formaterEcart, sensEcart } from '../../domaine/duree.js';
import {
  STATUT, abandonner, annulerDerniereEtape, basculerPause, passer, valider, vueSeance,
} from '../../domaine/seance.js';
import { normaliserRecompense, palierAtteint, palierSuivant } from '../../domaine/recompense.js';

const PERIODE_TIC = 250;

export function pageSeance({ store, router, veille }) {
  const seance = store.seanceEnCours();
  if (!seance) {
    router.aller('#/accueil');
    return null;
  }

  const etiquettes = store.etiquettes();
  const reglages = store.reglages();
  const bareme = normaliserRecompense(seance.bareme || reglages.recompenseDefaut);
  let courante = seance;
  let dernierIndex = -1;
  let signalEmis = false;

  // ---- Squelette ----

  const numero = span('seance-numero', '');
  const nomExercice = el('h1', { class: 'seance-exercice', texte: '' });
  const repetitions = span('seance-reps', '');
  const zonePastilles = div('seance-pastilles', []);
  const notes = el('p', { class: 'seance-notes', texte: '' });

  const couronne = anneau({ progression: 0 });
  const rebours = div('rebours', '');
  const reboursLibelle = span('rebours-libelle', 'restant');
  const chrono = div('seance-chrono', [couronne, div('chrono-centre', [rebours, reboursLibelle])]);

  const ecoule = span('mesure-valeur', '0:00');
  const zoneEcart = div('mesure-valeur', []);
  const restantTotal = span('mesure-valeur', '0:00');
  const zonePalier = div('palier-vise', []);

  const liste = el('ol', { class: 'seance-liste' });
  const zoneListe = div('seance-liste-cadre', [liste]);

  const boutonValider = bouton('Valider', () => agir(valider), { class: 'bouton bouton-valider' });
  const boutonPause = bouton('Pause', () => agir(basculerPause), { class: 'bouton bouton-discret' });
  const boutonPasser = bouton('Passer', () => agir(passer), { class: 'bouton bouton-discret' });
  const boutonRetour = bouton('Revenir', () => {
    if (!courante.etapes.length) return;
    enregistrer(annulerDerniereEtape(courante));
  }, { class: 'bouton bouton-discret' });

  const racine = div('page page-seance', [
    div('seance-entete', [
      bouton('✕', quitter, { class: 'bouton-icone', title: 'Quitter la séance' }),
      span('seance-titre', courante.nom),
      numero,
    ]),
    div('seance-scene', [
      div('seance-carte', [nomExercice, repetitions, zonePastilles, notes]),
      chrono,
      div('seance-mesures', [
        div('mesure', [span('mesure-etiquette', 'Écoulé'), ecoule]),
        div('mesure mesure-ecart', [span('mesure-etiquette', 'Avance / retard'), zoneEcart]),
        div('mesure', [span('mesure-etiquette', 'Reste prévu'), restantTotal]),
      ]),
      zonePalier,
    ]),
    zoneListe,
    div('seance-commandes', [
      div('commandes-secondaires', [boutonPause, boutonPasser, boutonRetour]),
      boutonValider,
    ]),
  ]);

  // ---- Actions ----

  function enregistrer(suivante) {
    courante = suivante;
    if (suivante.statut === STATUT.EN_COURS) {
      store.definirSeanceEnCours(suivante);
      peindre(true);
      return;
    }
    store.archiverSeance(suivante);
    veille?.relacher();
    router.aller(`#/bilan/${suivante.id}`);
  }

  function agir(transition) {
    try {
      enregistrer(transition(courante, Date.now()));
    } catch (erreur) {
      annoncer(erreur.message, 'erreur');
    }
  }

  async function quitter() {
    if (courante.statut !== STATUT.EN_COURS) { router.aller('#/accueil'); return; }
    const reponse = await confirmer(
      `Arrêter « ${courante.nom} » après ${courante.etapes.length} exercice(s) ? `
      + 'La séance rejoindra l’historique, sans Éclats.',
      { valider: 'Arrêter la séance' },
    );
    if (!reponse) return;
    store.archiverSeance(abandonner(courante, Date.now()));
    veille?.relacher();
    router.aller('#/accueil');
  }

  // ---- Peinture ----

  /** Reconstruit la liste : uniquement quand l'exercice courant change. */
  function peindreListe(vue) {
    liste.replaceChildren(...courante.exercices.map((exercice, i) => el('li', {}, [
      ligneExercice(exercice, etiquettes, {
        numero: i + 1,
        dureeDefaut: reglages.dureeExerciceDefaut,
        actif: i === vue.index && !vue.close,
        statut: vue.statutsEtapes[i],
      }),
    ])));

    // Centrer l'exercice courant : on doit voir ce qui vient, pas seulement
    // ce qu'on fait.
    liste.children[vue.index]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /**
   * Le palier visé. C'est le seul endroit où l'application dit quoi viser : ni
   * classement, ni objectif imposé, juste le prochain seuil d'Éclats et ce
   * qu'il reste à gagner pour l'atteindre.
   */
  function peindrePalier(vue) {
    if (!bareme.paliers.length) { zonePalier.hidden = true; return; }
    zonePalier.hidden = false;

    const avance = Math.max(0, -vue.ecart);
    const atteint = palierAtteint(bareme.paliers, avance);
    const suivant = palierSuivant(bareme.paliers, avance);
    zonePalier.classList.toggle('palier-vise-atteint', !!atteint);

    if (suivant) {
      const manque = suivant.minutes * 60_000 - avance;
      zonePalier.textContent = atteint
        ? `+${atteint.eclats} ✦ acquis · ${formaterDuree(manque)} d’avance de plus pour ${suivant.eclats} ✦`
        : `${formaterDuree(manque)} d’avance pour décrocher ${suivant.eclats} ✦`;
      return;
    }
    zonePalier.textContent = atteint
      ? `Palier maximal atteint : +${atteint.eclats} ✦`
      : 'Aucun palier en vue';
  }

  function peindre(forcerListe = false) {
    const vue = vueSeance(courante, Date.now());

    if (forcerListe || vue.index !== dernierIndex) {
      dernierIndex = vue.index;
      signalEmis = false;
      const exercice = vue.exercice || {};
      nomExercice.textContent = exercice.nom || 'Exercice';
      repetitions.textContent = exercice.repetitions || '';
      repetitions.hidden = !exercice.repetitions;
      notes.textContent = exercice.notes || '';
      notes.hidden = !exercice.notes;
      zonePastilles.replaceChildren(...(pastilles(etiquettes, exercice)?.children || []));
      peindreListe(vue);
      peindrePalier(vue);
    }

    numero.textContent = `${vue.numero}/${vue.total}`;
    ecoule.textContent = formaterDuree(vue.ecoule);
    restantTotal.textContent = formaterDuree(vue.restantTheorique);

    rebours.textContent = vue.depasse
      ? `+${formaterDuree(-vue.restant)}` : formaterDuree(vue.restant);
    rebours.classList.toggle('rebours-depasse', vue.depasse);
    reboursLibelle.textContent = vue.depasse ? 'au-delà du prévu' : 'restant';
    couronne.majProgression(vue.progression, vue.depasse);

    const sens = sensEcart(vue.ecart);
    zoneEcart.replaceChildren(el('span', {
      class: `ecart ecart-${sens}`, texte: formaterEcart(vue.ecart),
    }));

    racine.classList.toggle('en-pause', vue.enPause);
    boutonPause.textContent = vue.enPause ? 'Reprendre' : 'Pause';
    boutonRetour.disabled = courante.etapes.length === 0;

    if (vue.depasse && !signalEmis) {
      signalEmis = true;
      if (reglages.signalFinExercice) signaler();
    }
  }

  const minuterie = setInterval(peindre, PERIODE_TIC);
  peindre(true);
  veille?.demander();

  // Reprendre le focus après une mise en veille : l'affichage peut avoir
  // plusieurs minutes de retard, et l'horloge, elle, n'a pas attendu.
  const reveil = () => peindre();
  document.addEventListener('visibilitychange', reveil);

  const clavier = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); agir(valider); }
    else if (e.code === 'KeyP') agir(basculerPause);
  };
  document.addEventListener('keydown', clavier);

  return [racine, () => {
    clearInterval(minuterie);
    document.removeEventListener('visibilitychange', reveil);
    document.removeEventListener('keydown', clavier);
    veille?.relacher();
  }];
}

/** Bip de fin d'exercice, synthétisé : aucun fichier son à embarquer. */
function signaler() {
  try {
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (!Contexte) return;
    const ctx = new Contexte();
    const oscillateur = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillateur.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    oscillateur.connect(gain).connect(ctx.destination);
    oscillateur.start();
    oscillateur.stop(ctx.currentTime + 0.36);
    oscillateur.onended = () => ctx.close();
  } catch { /* le son est un confort, jamais une condition */ }
  if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
}
