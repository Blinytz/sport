// Célébration d'une collecte d'Éclats.
//
// C'est le seul moment où l'application s'autorise du spectacle : il récompense
// un travail réellement fait. Le geste se déroule en trois temps.
//
//   1. ÉCLOSION   — une onde part de la carte, les éclats s'en extraient.
//   2. VOL        — ils montent, puis plongent en arc vers le solde de
//                   l'en-tête. Chacun met un temps légèrement différent.
//   3. ABSORPTION — chaque éclat qui touche le solde le fait tressaillir et
//                   incrémente le compteur. Le total ne monte donc pas d'un
//                   bloc : il se remplit éclat par éclat.
//
// Rien ici ne décide de quoi que ce soit. L'écriture au registre a déjà eu
// lieu ; ce module ne fait que la rendre sensible. Le montant final vient
// toujours du serveur, jamais d'une addition locale.

const FORMES = ['✦', '✧', '◆', '❖', '✦', '★'];
const OR = ['#ffc043', '#ffd77a', '#ff9f1c', '#ffe9b0', '#f5a518'];
const CONFETTIS = ['#5b8cff', '#22d47b', '#a976ff', '#ff6b9d'];

const VOLANTS = 14;
const ECLATS_CONFETTIS = 10;
const VOL = 1150;
const ECART_DEPART = 45;

const sobre = () => typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

const hasard = (min, max) => min + Math.random() * (max - min);

function centre(element) {
  const r = element.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}

/** Amortissement cubique : rapide au départ, posé à l'arrivée. */
const adoucir = (x) => 1 - (1 - x) ** 3;

/**
 * Fait monter le solde de `depart` à `arrivee`. Renvoie une promesse tenue à
 * la fin, pour que l'appelant puisse enchaîner sans deviner la durée.
 */
export function compter(noeud, depart, arrivee, { duree = 700, suffixe = ' ✦' } = {}) {
  if (!noeud) return Promise.resolve();
  if (sobre() || depart === arrivee) {
    noeud.textContent = `${Math.round(arrivee)}${suffixe}`;
    return Promise.resolve();
  }
  return new Promise((fini) => {
    const debut = performance.now();
    let termine = false;

    const clore = () => {
      if (termine) return;
      termine = true;
      noeud.textContent = `${Math.round(arrivee)}${suffixe}`;
      fini();
    };

    // `requestAnimationFrame` est suspendu quand l'onglet passe en arrière-plan.
    // Sans ce filet, quitter l'application pendant la collecte laisserait le
    // compteur figé sur une valeur intermédiaire, donc fausse.
    const filet = setTimeout(clore, duree + 400);

    const tic = (t) => {
      if (termine) return;
      const x = Math.min(1, (t - debut) / duree);
      noeud.textContent = `${Math.round(depart + (arrivee - depart) * adoucir(x))}${suffixe}`;
      if (x < 1) requestAnimationFrame(tic);
      else { clearTimeout(filet); clore(); }
    };
    requestAnimationFrame(tic);
  });
}

/** Onde de choc dorée : la carte relâche ce qu'elle retenait. */
export function onde(carte) {
  if (!carte || sobre()) return;
  carte.classList.remove('eclat-joue');
  // Forcer un reflow, sinon rejouer l'animation sur la même carte ne prend pas.
  void carte.offsetWidth;
  carte.classList.add('eclat-joue');
  setTimeout(() => carte.classList.remove('eclat-joue'), 900);
}

function creerEclat(depart, taille, couleur, forme) {
  const p = document.createElement('span');
  p.className = 'eclat-vol';
  p.textContent = forme;
  p.style.color = couleur;
  p.style.fontSize = `${taille}rem`;
  p.style.left = `${depart.x}px`;
  p.style.top = `${depart.y}px`;
  document.body.append(p);
  return p;
}

/**
 * Un éclat qui monte puis plonge vers le solde. L'arc passe par un sommet
 * au-dessus de la trajectoire directe : une ligne droite ferait projectile,
 * la courbe fait « envol ».
 */
function envoler(p, dx, dy, delai, duree) {
  const sommetX = dx * hasard(0.25, 0.55) + hasard(-70, 70);
  const sommetY = dy * 0.35 - hasard(90, 190);

  return p.animate([
    { transform: 'translate(-50%, -50%) scale(.2) rotate(0deg)', opacity: 0, offset: 0 },
    {
      transform: `translate(calc(-50% + ${hasard(-30, 30)}px), calc(-50% - ${hasard(20, 60)}px)) scale(${hasard(1.15, 1.6)}) rotate(${hasard(40, 140)}deg)`,
      opacity: 1,
      offset: 0.2,
    },
    {
      transform: `translate(calc(-50% + ${sommetX}px), calc(-50% + ${sommetY}px)) scale(1) rotate(${hasard(160, 260)}deg)`,
      opacity: 1,
      offset: 0.6,
    },
    {
      transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.22) rotate(${hasard(400, 520)}deg)`,
      opacity: 0,
      offset: 1,
    },
  ], {
    duration: duree,
    delay: delai,
    easing: 'cubic-bezier(.34, .04, .28, 1)',
    fill: 'forwards',
  });
}

/** Un éclat qui ne rejoint pas le solde : il retombe, pour la fête. */
function disperser(p, delai) {
  return p.animate([
    { transform: 'translate(-50%, -50%) scale(.3) rotate(0deg)', opacity: 0, offset: 0 },
    {
      transform: `translate(calc(-50% + ${hasard(-60, 60)}px), calc(-50% - ${hasard(60, 130)}px)) scale(${hasard(1, 1.4)}) rotate(${hasard(60, 180)}deg)`,
      opacity: 1,
      offset: 0.3,
    },
    {
      transform: `translate(calc(-50% + ${hasard(-190, 190)}px), calc(-50% + ${hasard(140, 300)}px)) scale(.5) rotate(${hasard(400, 700)}deg)`,
      opacity: 0,
      offset: 1,
    },
  ], {
    duration: VOL + hasard(0, 250),
    delay: delai,
    easing: 'cubic-bezier(.25, .5, .4, 1)',
    fill: 'forwards',
  });
}

/** Tressaillement du solde à chaque éclat absorbé. */
function absorber(jeton) {
  if (!jeton) return;
  jeton.classList.remove('solde-absorbe');
  void jeton.offsetWidth;
  jeton.classList.add('solde-absorbe');
  setTimeout(() => jeton.classList.remove('solde-absorbe'), 260);
}

/**
 * Le geste complet. `soldeAvant` et `soldeApres` viennent du registre : le
 * compteur affiche le solde réel, pas une estimation.
 */
export async function celebrerCollecte({
  depuis, carte, soldeAvant, soldeApres, montant,
}) {
  const valeur = document.getElementById('solde-valeur');
  const jeton = document.getElementById('solde');

  const depart = Number.isFinite(soldeAvant) ? soldeAvant : null;
  const arrivee = Number.isFinite(soldeApres)
    ? soldeApres
    : (depart != null ? depart + montant : null);

  onde(carte);

  if (sobre() || !depuis || !valeur) {
    if (arrivee != null) valeur && (valeur.textContent = `${Math.round(arrivee)} ✦`);
    return;
  }

  const source = centre(depuis);
  const cible = centre(valeur);
  const dx = cible.x - source.x;
  const dy = cible.y - source.y;

  jeton?.classList.add('solde-attire');

  // Les éclats qui rejoignent le solde portent chacun une part du montant :
  // le compteur se remplit à mesure qu'ils arrivent, au lieu de sauter.
  let absorbes = 0;
  const parEclat = depart != null && arrivee != null ? (arrivee - depart) / VOLANTS : 0;
  const promesses = [];

  for (let i = 0; i < VOLANTS; i += 1) {
    const p = creerEclat(
      { x: source.x + hasard(-source.rect.width / 3, source.rect.width / 3), y: source.y },
      hasard(0.85, 1.6),
      OR[i % OR.length],
      FORMES[i % FORMES.length],
    );
    const anim = envoler(p, dx, dy, i * ECART_DEPART, VOL + hasard(-120, 160));
    promesses.push(new Promise((fini) => {
      anim.onfinish = () => {
        p.remove();
        absorbes += 1;
        absorber(jeton);
        if (depart != null) {
          const valeurCourante = absorbes === VOLANTS
            ? arrivee : Math.round(depart + parEclat * absorbes);
          valeur.textContent = `${Math.round(valeurCourante)} ✦`;
        }
        fini();
      };
      anim.oncancel = () => { p.remove(); fini(); };
    }));
  }

  for (let i = 0; i < ECLATS_CONFETTIS; i += 1) {
    const p = creerEclat(
      { x: source.x + hasard(-source.rect.width / 2, source.rect.width / 2), y: source.y },
      hasard(0.6, 1.1),
      CONFETTIS[i % CONFETTIS.length],
      FORMES[(i + 2) % FORMES.length],
    );
    const anim = disperser(p, i * 30);
    anim.onfinish = () => p.remove();
    anim.oncancel = () => p.remove();
  }

  // Filet : si les animations sont suspendues (application en arrière-plan),
  // le solde doit tout de même finir juste.
  const filet = setTimeout(() => {
    if (arrivee != null) valeur.textContent = `${Math.round(arrivee)} ✦`;
  }, VOL + VOLANTS * ECART_DEPART + 600);

  await Promise.all(promesses);
  clearTimeout(filet);
  if (arrivee != null) valeur.textContent = `${Math.round(arrivee)} ✦`;
  jeton?.classList.remove('solde-attire');
}
