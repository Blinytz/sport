// Bilan de fin de séance : ce qui s'est passé, puis la collecte des Éclats.
//
// La récompense n'est jamais créditée d'office. L'écran affiche le détail du
// calcul avant le bouton, pour qu'un montant ne tombe pas du ciel.

import { annoncer, bouton, div, el, formaterDate, span, titre } from '../dom.js';
import { ecartAffiche, pastilles } from '../composants.js';
import { formaterDuree } from '../../domaine/duree.js';
import { STATUT, detailEtapes, ecartFinal, ecoule, nombrePasses, nombreValides } from '../../domaine/seance.js';
import { calculerRecompense, detailRecompense } from '../../domaine/recompense.js';

export function pageBilan({ store, router, finances }, { id }) {
  const seance = store.seance(id);
  if (!seance) {
    router.aller('#/accueil');
    return null;
  }

  const etiquettes = store.etiquettes();
  const terminee = seance.statut === STATUT.TERMINEE;
  const temps = ecoule(seance, seance.fin);
  const calcul = calculerRecompense(seance, store.reglages().recompenseDefaut);
  const zoneEclats = div('bilan-eclats', []);

  async function collecter(boutonCollecte) {
    boutonCollecte.disabled = true;
    boutonCollecte.textContent = 'Collecte…';
    try {
      const { calcul: verse } = await finances.collecter(seance.id);
      annoncer(`${verse.total} ✦ ajoutés à votre solde.`, 'succes');
      peindreEclats();
    } catch (erreur) {
      annoncer(erreur.message, 'erreur');
      boutonCollecte.disabled = false;
      boutonCollecte.textContent = `Collecter ${calcul.total} ✦`;
    }
  }

  function peindreEclats() {
    const courante = store.seance(seance.id);
    if (!terminee) {
      zoneEclats.replaceChildren(el('p', {
        class: 'aide',
        texte: 'Séance arrêtée avant la fin : aucun Éclat. Le temps passé reste dans l’historique.',
      }));
      return;
    }
    if (courante.recompense?.collectee) {
      zoneEclats.replaceChildren(div('eclats-collectes', [
        span('eclats-montant', `${courante.recompense.total} ✦`),
        span('', `collectés le ${formaterDate(courante.recompense.dateCollecte)}`),
      ]));
      return;
    }

    const boutonCollecte = bouton(`Collecter ${calcul.total} ✦`, () => collecter(boutonCollecte), {
      class: 'bouton bouton-primaire bouton-collecte',
      disabled: calcul.total <= 0,
    });
    zoneEclats.replaceChildren(
      el('ul', { class: 'liste-detail' },
        detailRecompense(calcul).map((ligne) => el('li', { texte: ligne }))),
      boutonCollecte,
    );
  }

  peindreEclats();

  return div('page page-bilan', [
    div('bilan-entete', [
      span(`bilan-statut ${terminee ? '' : 'bilan-statut-abandon'}`.trim(),
        terminee ? '✓ Séance terminée' : 'Séance arrêtée'),
      titre(1, seance.nom),
      span('bilan-date', formaterDate(seance.fin)),
    ]),

    div('bilan-mesures', [
      mesure('Temps total', formaterDuree(temps)),
      mesure('Avance / retard', ecartAffiche(ecartFinal(seance), { taille: 'grand' })),
      mesure('Validés', `${nombreValides(seance)}/${seance.exercices.length}`),
      nombrePasses(seance) ? mesure('Passés', String(nombrePasses(seance))) : null,
    ]),

    el('section', { class: 'bloc' }, [titre(2, 'Éclats'), zoneEclats]),

    el('section', { class: 'bloc' }, [
      titre(2, 'Détail'),
      el('ol', { class: 'bilan-liste' }, detailEtapes(seance).map((etape) => el('li', {
        class: `bilan-etape bilan-${etape.statut}`,
      }, [
        span('ligne-numero', String(etape.index + 1)),
        div('ligne-corps', [
          div('ligne-titre', [
            span('ligne-nom', etape.exercice.nom),
            etape.exercice.repetitions ? span('ligne-reps', etape.exercice.repetitions) : null,
            etape.statut === 'passe' ? span('etiquette-passe', 'passé') : null,
          ]),
          pastilles(etiquettes, etape.exercice),
        ]),
        div('bilan-temps', [
          span('', formaterDuree(etape.duree)),
          ecartAffiche(etape.ecartExercice),
        ]),
      ]))),
    ]),

    div('bilan-actions', [
      bouton('Retour à l’accueil', () => router.aller('#/accueil'), {
        class: 'bouton bouton-primaire',
      }),
      bouton('Historique', () => router.aller('#/historique'), { class: 'bouton bouton-discret' }),
    ]),
  ]);
}

function mesure(etiquette, valeur) {
  return div('mesure', [
    span('mesure-etiquette', etiquette),
    typeof valeur === 'string' ? span('mesure-valeur', valeur) : div('mesure-valeur', [valeur]),
  ]);
}
