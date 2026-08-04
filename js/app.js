// Assemblage de Sport.
//
// Une seule instance de store, de registre et de couche financière, injectées
// dans chaque page. Aucun état global ailleurs.

import { createStore, identifiant } from './store.js';
import { createRegistre } from './eclats-registre.js';
import { createFinancesSport } from './eclats-sport.js';
import { createRouter } from './router.js';
import { annoncer } from './ui/dom.js';
import { demarrerSeance } from './domaine/seance.js';
import { pageAccueil } from './ui/pages/accueil.js';
import { pageSeance } from './ui/pages/seance.js';
import { pageSessions } from './ui/pages/sessions.js';
import { pageEditeur } from './ui/pages/editeur.js';
import { pageBilan } from './ui/pages/bilan.js';
import { pageHistorique } from './ui/pages/historique.js';
import { pageStatistiques } from './ui/pages/statistiques.js';
import { pageReglages, appliquerTheme } from './ui/pages/reglages.js';
import { ICONES } from './ui/icones.js';
import { createSolde } from './ui/solde.js';

const store = createStore();
const registre = createRegistre();
const finances = createFinancesSport({ store, registre });

/**
 * Verrou de veille : un compte à rebours de trois minutes est inutile si
 * l'écran s'éteint au bout de trente secondes. L'API n'existe pas partout,
 * l'absence est donc silencieuse.
 */
const veille = (() => {
  let verrou = null;
  return {
    async demander() {
      if (!store.reglages().garderEcranAllume || !navigator.wakeLock) return;
      try { verrou = await navigator.wakeLock.request('screen'); } catch { verrou = null; }
    },
    relacher() {
      verrou?.release?.().catch(() => {});
      verrou = null;
    },
  };
})();

const conteneur = document.getElementById('vue');
const router = createRouter({ conteneur, surChangement: majNavigation });
const solde = createSolde({ registre, finances, router });
const contexte = {
  store, registre, finances, router, veille, solde, majPastilles,
};

router.ajouter('/accueil', () => pageAccueil(contexte));
router.ajouter('/seance', () => pageSeance(contexte));
router.ajouter('/sessions', () => pageSessions(contexte));
router.ajouter('/session/:id', (p) => pageEditeur(contexte, p));
router.ajouter('/bilan/:id', (p) => pageBilan(contexte, p));
router.ajouter('/historique', () => pageHistorique(contexte));
router.ajouter('/statistiques', (p) => pageStatistiques(contexte, p));
router.ajouter('/reglages', () => pageReglages(contexte));

// Lancer depuis l'éditeur : la route ne rend rien, elle démarre et redirige.
router.ajouter('/lancer/:id', ({ id }) => {
  const session = store.session(id);
  if (!session?.exercices.length) {
    annoncer('Cette session n’a aucun exercice.', 'erreur');
    router.aller('#/sessions');
    return null;
  }
  if (store.seanceEnCours()) {
    annoncer('Une séance est déjà en cours : terminez-la ou arrêtez-la d’abord.', 'erreur');
    router.aller('#/seance');
    return null;
  }
  store.definirSeanceEnCours(demarrerSeance(session, {
    maintenant: Date.now(),
    dureeDefaut: store.reglages().dureeExerciceDefaut,
    identifiant,
  }));
  router.aller('#/seance');
  return null;
});

const ONGLETS = [
  { hash: '#/accueil', libelle: 'Séances', icone: 'seances', motifs: ['/accueil'] },
  { hash: '#/sessions', libelle: 'Éditer', icone: 'editer', motifs: ['/sessions', '/session/:id'] },
  { hash: '#/statistiques', libelle: 'Stats', icone: 'stats', motifs: ['/statistiques'] },
  { hash: '#/historique', libelle: 'Historique', icone: 'historique', motifs: ['/historique', '/bilan/:id'] },
  { hash: '#/reglages', libelle: 'Réglages', icone: 'reglages', motifs: ['/reglages'] },
];

function majNavigation(motif) {
  const barre = document.getElementById('navigation');
  // La séance occupe tout l'écran : la barre disparaîtrait sous le pouce, et
  // le solde n'a rien à faire au milieu d'un compte à rebours.
  const pendantSeance = motif === '/seance';
  barre.hidden = pendantSeance;
  document.getElementById('entete').hidden = pendantSeance;
  document.body.classList.toggle('sans-entete', pendantSeance);
  for (const lien of barre.querySelectorAll('a')) {
    const onglet = ONGLETS.find((o) => o.hash === lien.getAttribute('href'));
    lien.classList.toggle('actif', onglet.motifs.includes(motif));
  }
  majPastilles();
}

/**
 * Pastille des Éclats en attente sur l'onglet Historique. Elle disparaît dès
 * que tout est ramassé : c'est le seul rappel que l'application se permet, et
 * il doit s'éteindre de lui-même.
 */
function majPastilles() {
  const lien = document.querySelector('#navigation a[href="#/historique"]');
  if (!lien) return;

  const enAttente = finances.eclatsACollecter();
  const existante = lien.querySelector('.pastille-onglet');

  if (!enAttente) {
    existante?.remove();
    lien.removeAttribute('aria-label');
    return;
  }

  const texte = enAttente > 999 ? '999+' : String(enAttente);
  if (existante) {
    existante.textContent = texte;
  } else {
    const pastille = document.createElement('span');
    pastille.className = 'pastille-onglet';
    pastille.textContent = texte;
    lien.append(pastille);
  }
  lien.setAttribute('aria-label', `Historique, ${enAttente} Éclats à collecter`);
}

function construireNavigation() {
  const barre = document.getElementById('navigation');
  barre.replaceChildren(...ONGLETS.map((onglet) => {
    const lien = document.createElement('a');
    lien.href = onglet.hash;
    lien.append(ICONES[onglet.icone](), document.createTextNode(onglet.libelle));
    return lien;
  }));
}

appliquerTheme(store.reglages().theme);
construireNavigation();
router.demarrer();
solde.rafraichir();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* hors ligne, sans conséquence */ });
  });
}
