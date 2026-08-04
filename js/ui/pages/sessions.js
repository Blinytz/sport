// Liste des sessions : créer, dupliquer, réordonner, supprimer.

import { bouton, confirmer, div, el, titre } from '../dom.js';
import { resumeSession, vide } from '../composants.js';
import { deplacer, dupliquerSession } from '../../domaine/session.js';
import { identifiant } from '../../store.js';

export function pageSessions({ store, router }) {
  const racine = div('page page-sessions');

  function peindre() {
    const sessions = store.sessions();
    const etiquettes = store.etiquettes();
    const dureeDefaut = store.reglages().dureeExerciceDefaut;

    racine.replaceChildren(
      div('page-entete', [
        titre(1, 'Sessions'),
        bouton('Nouvelle session', creer, { class: 'bouton bouton-primaire' }),
      ]),

      sessions.length
        ? div('liste-sessions', sessions.map((session, i) => div('rang-session', [
          el('button', {
            class: 'rang-session-corps',
            type: 'button',
            sur: { click: () => router.aller(`#/session/${session.id}`) },
          }, [
            titre(2, session.nom, 'rang-session-nom'),
            resumeSession(session, etiquettes, dureeDefaut),
          ]),
          div('rang-session-actions', [
            bouton('↑', () => reordonner(i, -1), {
              class: 'bouton-icone', title: 'Monter', disabled: i === 0,
            }),
            bouton('↓', () => reordonner(i, 1), {
              class: 'bouton-icone', title: 'Descendre', disabled: i === sessions.length - 1,
            }),
            bouton('⧉', () => dupliquer(session), {
              class: 'bouton-icone', title: 'Dupliquer',
            }),
            bouton('✕', () => supprimer(session), {
              class: 'bouton-icone bouton-icone-danger', title: 'Supprimer',
            }),
          ]),
        ])))
        : vide('Aucune session.', bouton('Nouvelle session', creer, {
          class: 'bouton bouton-primaire',
        })),
    );
  }

  function creer() {
    const session = store.enregistrerSession({ nom: 'Nouvelle session', exercices: [] });
    router.aller(`#/session/${session.id}`);
  }

  function dupliquer(session) {
    store.enregistrerSession(dupliquerSession(session, identifiant));
    peindre();
  }

  function reordonner(index, decalage) {
    const ids = deplacer(store.sessions().map((s) => s.id), index, decalage);
    store.reordonnerSessions(ids);
    peindre();
  }

  async function supprimer(session) {
    if (store.reglages().confirmerSuppression) {
      const message = `Supprimer « ${session.nom} » et ses ${session.exercices.length} `
        + 'exercices ? Les séances déjà courues resteront dans l’historique.';
      if (!await confirmer(message)) return;
    }
    store.supprimerSession(session.id);
    peindre();
  }

  peindre();
  return racine;
}
