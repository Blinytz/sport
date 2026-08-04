// Routage par ancre.
//
// Une route est déclarée par un motif (« #/session/:id ») ; le routeur en
// extrait les paramètres et appelle la vue correspondante. Chaque vue peut
// renvoyer une fonction de nettoyage — indispensable ici, où l'écran de séance
// entretient un chronomètre qu'il faut arrêter en partant.

export function createRouter({ conteneur, surChangement, defaut = '#/accueil' }) {
  const routes = [];
  let nettoyer = null;

  function ajouter(motif, vue) {
    routes.push({ motif, parties: motif.split('/').filter(Boolean), vue });
  }

  function analyser(hash) {
    const chemin = (hash || defaut).replace(/^#/, '');
    const [avant, requete] = chemin.split('?');
    const parties = avant.split('/').filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(requete || ''));

    for (const route of routes) {
      if (route.parties.length !== parties.length) continue;
      const extrait = {};
      let correspond = true;
      for (let i = 0; i < route.parties.length; i += 1) {
        const attendu = route.parties[i];
        if (attendu.startsWith(':')) extrait[attendu.slice(1)] = decodeURIComponent(parties[i]);
        else if (attendu !== parties[i]) { correspond = false; break; }
      }
      if (correspond) return { route, params: { ...extrait, ...params } };
    }
    return null;
  }

  async function rendre() {
    const cible = analyser(window.location.hash) || analyser(defaut);
    if (!cible) return;

    if (nettoyer) { nettoyer(); nettoyer = null; }
    const resultat = await cible.route.vue(cible.params);
    const vue = Array.isArray(resultat) ? resultat[0] : resultat;
    if (Array.isArray(resultat)) nettoyer = resultat[1];

    if (vue) {
      conteneur.replaceChildren(vue);
      conteneur.scrollTop = 0;
    }
    if (surChangement) surChangement(cible.route.motif, cible.params);
  }

  function demarrer() {
    window.addEventListener('hashchange', rendre);
    rendre();
  }

  function aller(hash) {
    if (window.location.hash === hash) rendre();
    else window.location.hash = hash;
  }

  return { ajouter, demarrer, aller, rendre };
}
