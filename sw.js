/* Service worker de Sport.
 *
 * Stratégie reprise de Missions : RÉSEAU D'ABORD pour la page et les modules
 * JavaScript, sinon une version périmée resterait figée dans le cache après
 * chaque publication. Le cache est un filet hors ligne — indispensable ici, une
 * séance se courant souvent sans réseau — jamais la source du code.
 *
 * Incrémenter `CACHE` à chaque changement de la liste des fichiers.
 */

const CACHE = 'sport-v7';

const FICHIERS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './icons/icone.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/eclats-registre.js',
  './js/eclats-sport.js',
  './js/domaine/donnees-initiales.js',
  './js/domaine/duree.js',
  './js/domaine/etiquettes.js',
  './js/domaine/recompense.js',
  './js/domaine/seance.js',
  './js/domaine/session.js',
  './js/domaine/stats.js',
  './js/ui/dom.js',
  './js/ui/composants.js',
  './js/ui/celebration.js',
  './js/ui/graphiques.js',
  './js/ui/icones.js',
  './js/ui/solde.js',
  './js/ui/pages/accueil.js',
  './js/ui/pages/seance.js',
  './js/ui/pages/sessions.js',
  './js/ui/pages/editeur.js',
  './js/ui/pages/bilan.js',
  './js/ui/pages/historique.js',
  './js/ui/pages/statistiques.js',
  './js/ui/pages/reglages.js',
];

self.addEventListener('install', (event) => {
  // On ne prend la main qu'une fois le nouveau cache constitué : sinon la
  // nouvelle version démarrerait avec un cache incomplet.
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(FICHIERS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(
        cles.filter((cle) => cle !== CACHE).map((cle) => caches.delete(cle)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Le registre d'Éclats ne doit JAMAIS être servi depuis un cache : un solde
  // périmé donnerait l'illusion d'Éclats qui n'existent pas.
  if (url.origin !== self.location.origin) return;

  const versLeReseau = event.request.mode === 'navigate'
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('.css');

  if (versLeReseau) {
    event.respondWith(
      fetch(event.request)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copie)).catch(() => {});
          return reponse;
        })
        .catch(() => caches.match(event.request)
          .then((c) => c || caches.match('./index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cache) => cache || fetch(event.request)),
  );
});
