// Historique des séances courues : la liste, et la collecte des Éclats.
//
// Les analyses vivent dans l'onglet Statistiques ; ici, on retrouve une séance
// précise et on encaisse ce qu'elle a rapporté.

import { annoncer, bouton, confirmer, div, el, formaterDate, span, titre } from '../dom.js';
import { ecartAffiche, vide } from '../composants.js';
import { formaterDuree } from '../../domaine/duree.js';
import { STATUT, ecartFinal, ecoule, nombrePasses, nombreValides } from '../../domaine/seance.js';
import { calculerRecompense } from '../../domaine/recompense.js';
import { resume } from '../../domaine/stats.js';

export function pageHistorique({ store, router, finances }) {
  const racine = div('page page-historique');

  function peindre() {
    const historique = store.historique();
    const secours = store.reglages().recompenseDefaut;
    const chiffres = resume(historique, secours);

    racine.replaceChildren(
      div('page-entete', [
        div('page-titre', [
          span('page-surtitre', `${chiffres.seances} terminées · ${chiffres.abandons} arrêtées`),
          titre(1, 'Historique'),
        ]),
        historique.length
          ? bouton('Statistiques', () => router.aller('#/statistiques'), {
            class: 'bouton bouton-discret',
          })
          : null,
      ]),

      chiffres.eclatsACollecter > 0
        ? div('bandeau bandeau-eclats', [
          div('bandeau-corps', [
            span('bandeau-titre', 'Éclats en attente'),
            span('bandeau-texte', 'sur les séances ci-dessous'),
          ]),
          span('bandeau-montant', `${chiffres.eclatsACollecter} ✦`),
        ])
        : null,

      historique.length
        ? div('liste-seances', historique.map((s) => carteSeance(s, secours)))
        : vide('Aucune séance courue pour l’instant.'),
    );
  }

  async function collecter(seance, boutonCollecte) {
    boutonCollecte.disabled = true;
    try {
      const { calcul } = await finances.collecter(seance.id);
      annoncer(`${calcul.total} ✦ ajoutés à votre solde.`, 'succes');
      peindre();
    } catch (erreur) {
      annoncer(erreur.message, 'erreur');
      boutonCollecte.disabled = false;
    }
  }

  async function supprimer(seance) {
    const collectee = seance.recompense?.collectee;
    const message = collectee
      ? `Supprimer « ${seance.nom} » de l’historique ? Les ${seance.recompense.total} ✦ déjà `
        + 'collectés restent acquis : le registre commun ne se réécrit pas.'
      : `Supprimer « ${seance.nom} » de l’historique ?`;
    if (!await confirmer(message)) return;
    store.supprimerSeance(seance.id);
    peindre();
  }

  function carteSeance(seance, secours) {
    const terminee = seance.statut === STATUT.TERMINEE;
    const calcul = calculerRecompense(seance, secours);
    const collectable = terminee && !seance.recompense?.collectee && calcul.total > 0;
    const boutonCollecte = collectable
      ? bouton(`Collecter ${calcul.total} ✦`, () => collecter(seance, boutonCollecte), {
        class: 'bouton bouton-primaire',
      })
      : null;

    return div(`carte-seance ${terminee ? '' : 'carte-seance-abandon'}`.trim(), [
      el('button', {
        class: 'carte-seance-corps',
        type: 'button',
        sur: { click: () => router.aller(`#/bilan/${seance.id}`) },
      }, [
        div('carte-seance-entete', [
          span('carte-seance-nom', seance.nom),
          span('carte-seance-date', formaterDate(seance.fin)),
        ]),
        div('carte-seance-details', [
          span('', `${nombreValides(seance)}/${seance.exercices.length} validés`),
          nombrePasses(seance) ? span('', `${nombrePasses(seance)} passés`) : null,
          span('', formaterDuree(ecoule(seance, seance.fin))),
          terminee ? ecartAffiche(ecartFinal(seance)) : span('etiquette-passe', 'arrêtée'),
          seance.recompense?.collectee
            ? span('carte-seance-eclats', `${seance.recompense.total} ✦`) : null,
        ]),
      ]),
      div('carte-seance-actions', [
        boutonCollecte,
        bouton('✕', () => supprimer(seance), {
          class: 'bouton-icone bouton-icone-danger', title: 'Supprimer',
        }),
      ]),
    ]);
  }

  peindre();
  return racine;
}
