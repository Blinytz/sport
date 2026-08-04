// Couche métier entre les séances et le registre commun.
//
// Une seule opération financière : COLLECTER le versement d'une séance
// terminée. Ordre imposé — le registre d'abord, l'état local ensuite. Le
// registre est idempotent (clé stable par séance), donc une coupure réseau ou
// un double clic rejoue la même écriture sans produire un second mouvement ;
// il suffit de relancer pour que l'état local rattrape le registre.
//
// Rien n'est jamais crédité automatiquement : le gain reste « à collecter »
// tant que l'utilisateur ne l'a pas demandé, comme dans Missions et Rédac.

import { STATUT } from './domaine/seance.js';
import { calculerRecompense, cleIdempotence } from './domaine/recompense.js';
import { UUID } from './store.js';

export class ErreurEclats extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ErreurEclats';
    this.code = code;
  }
}

export function createFinancesSport({ store, registre, maintenant = () => Date.now() }) {
  async function collecter(seanceId) {
    const seance = store.seance(seanceId);
    if (!seance) throw new ErreurEclats('Séance introuvable.', 'introuvable');
    if (seance.statut !== STATUT.TERMINEE) {
      throw new ErreurEclats(
        'Seule une séance menée jusqu’au bout donne des Éclats.', 'non_terminee',
      );
    }
    if (seance.recompense?.collectee) {
      throw new ErreurEclats('Cette récompense a déjà été collectée.', 'deja_collectee');
    }

    // Le calcul est refait ici, à partir du barème FIGÉ dans la séance : le
    // montant affiché à l'écran n'est jamais ce qui part au registre.
    const calcul = calculerRecompense(seance, store.reglages().recompenseDefaut);
    if (calcul.total <= 0) {
      throw new ErreurEclats('Cette séance ne rapporte aucun Éclat.', 'montant_nul');
    }
    if (!registre.estConnecte()) {
      throw new ErreurEclats(
        'Connectez-vous au registre commun pour récupérer vos Éclats.', 'hors_ligne',
      );
    }

    const cle = cleIdempotence(seanceId);
    let mouvementId = store.mouvementPour(seanceId)?.mouvementId || null;

    if (!store.mouvementPour(seanceId)) {
      // `p_reference_id` est typé `uuid` côté registre. Une séance enregistrée
      // avant que les identifiants ne soient garantis UUID ferait échouer la
      // conversion : dans ce cas on l'envoie en metadata, comme le prévoit le
      // contrat, plutôt que de perdre la récompense.
      const referenceUuid = UUID.test(seanceId) ? seanceId : null;

      const reponse = await registre.recompenser({
        montant: calcul.total,
        reason: `Séance « ${seance.nom} » : ${calcul.valides} exercices`,
        referenceType: 'seance_sport',
        referenceId: referenceUuid,
        idempotencyKey: cle,
        metadata: {
          seance: seanceId,
          session: seance.sessionId,
          forfait: calcul.forfait,
          bonus: calcul.bonus,
          palier: calcul.palier?.minutes ?? null,
          avanceMs: calcul.avance,
        },
      });
      mouvementId = reponse?.movement_id || null;
      store.enregistrerMouvement({
        seanceId,
        montant: calcul.total,
        mouvementId,
        soldeApres: reponse?.balance_after ?? null,
        date: new Date(maintenant()).toISOString(),
      });
    }

    const collectee = {
      ...seance,
      recompense: {
        ...calcul,
        collectee: true,
        mouvementId,
        dateCollecte: new Date(maintenant()).toISOString(),
      },
    };
    store.remplacerSeanceArchivee(collectee);
    return { seance: collectee, calcul };
  }

  /** Solde commun, ou null si l'application n'est pas connectée. */
  async function soldeDisponible() {
    if (!registre.estConnecte()) return null;
    return registre.solde();
  }

  /** Éclats gagnés mais pas encore collectés — ils ne comptent pas dans le solde. */
  function eclatsACollecter() {
    const secours = store.reglages().recompenseDefaut;
    return store.historique()
      .filter((s) => s.statut === STATUT.TERMINEE && !s.recompense?.collectee)
      .reduce((total, s) => total + calculerRecompense(s, secours).total, 0);
  }

  return { collecter, soldeDisponible, eclatsACollecter };
}
