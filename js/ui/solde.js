// Solde d'Éclats affiché en permanence dans l'en-tête.
//
// Il vient TOUJOURS du registre, jamais d'un calcul local : un solde deviné
// donnerait l'illusion d'Éclats qui n'existent pas. Tant qu'on n'est pas
// connecté, l'en-tête invite à se connecter au lieu d'afficher un chiffre.
//
// C'est aussi la cible de l'animation de collecte : sans point d'arrivée
// visible, les particules n'auraient nulle part où converger.

import { compter } from './celebration.js';

export function createSolde({ registre, finances, router }) {
  const valeur = document.getElementById('solde-valeur');
  const jeton = document.getElementById('solde');
  let courant = null;

  jeton?.addEventListener('click', () => {
    router.aller(registre.estConnecte() ? '#/historique' : '#/reglages');
  });

  function afficher(texte, connecte) {
    if (!valeur) return;
    valeur.textContent = texte;
    jeton?.classList.toggle('solde-deconnecte', !connecte);
    jeton?.setAttribute(
      'title',
      connecte ? 'Solde commun d’Éclats' : 'Connectez-vous au registre commun',
    );
  }

  /** Relit le solde au serveur. Silencieux en cas d'échec réseau. */
  async function rafraichir() {
    if (!registre.estConnecte()) {
      courant = null;
      afficher('Connexion', false);
      return null;
    }
    try {
      const solde = await finances.soldeDisponible();
      courant = Number.isFinite(solde) ? solde : null;
      afficher(courant == null ? '?' : `${courant} ✦`, true);
      return courant;
    } catch {
      // Un solde périmé vaut mieux qu'un faux : on garde le dernier connu.
      afficher(courant == null ? '?' : `${courant} ✦`, true);
      return courant;
    }
  }

  function connu() { return courant; }

  /** Pose une valeur confirmée par le registre, sans animation. */
  function definir(solde) {
    if (!Number.isFinite(solde)) return;
    courant = solde;
    afficher(`${solde} ✦`, true);
  }

  /** Fait monter le compteur vers la valeur confirmée par le registre. */
  async function animerVers(solde) {
    if (!Number.isFinite(solde)) return;
    const depart = courant ?? solde;
    courant = solde;
    await compter(valeur, depart, solde);
  }

  return { rafraichir, connu, definir, animerVers, noeud: () => valeur };
}
