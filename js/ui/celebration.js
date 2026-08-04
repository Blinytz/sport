// Célébration d'une collecte d'Éclats.
//
// Reprise du geste de Marchés : des particules jaillissent du bouton, la moitié
// converge vers le solde de l'en-tête, l'autre gicle en confettis, et le solde
// compte de l'ancien montant au nouveau. C'est le seul moment de l'application
// où l'on s'autorise du spectacle : il récompense un travail réellement fait.
//
// Rien ici ne décide de quoi que ce soit. L'écriture au registre a déjà eu
// lieu ; ce module ne fait que la rendre sensible.

const FORMES = ['✦', '◆', '●', '✧', '★'];
const COULEURS = ['#ffc043', '#5b8cff', '#22d47b', '#a976ff', '#ff8a3d'];
const NOMBRE = 16;
const DECALAGE = 26;
const VOL = 720;
const COMPTEUR = 700;

const sobre = () => typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Amortissement cubique : rapide au départ, posé à l'arrivée. */
function adoucir(x) {
  return 1 - (1 - x) ** 3;
}

/**
 * Fait monter le solde de `depart` à `arrivee`. Renvoie une promesse tenue à
 * la fin, pour que l'appelant puisse enchaîner sans deviner la durée.
 */
export function compter(noeud, depart, arrivee, { duree = COMPTEUR, suffixe = ' ✦' } = {}) {
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

/** Halo qui s'étend depuis la carte collectée. */
export function halo(carte) {
  if (!carte || sobre()) return;
  carte.classList.remove('eclat-joue');
  // Forcer un reflow, sinon rejouer l'animation sur la même carte ne prend pas.
  void carte.offsetWidth;
  carte.classList.add('eclat-joue');
  setTimeout(() => carte.classList.remove('eclat-joue'), 800);
}

/**
 * Pluie de particules entre le bouton et le solde. Ne renvoie rien : c'est un
 * effet, il ne doit bloquer aucune suite.
 */
export function particules(depuis, vers) {
  if (sobre() || !depuis) return;
  const source = depuis.getBoundingClientRect();
  const cible = vers?.getBoundingClientRect();

  for (let i = 0; i < NOMBRE; i += 1) {
    const p = document.createElement('span');
    p.className = 'particule';
    p.textContent = FORMES[i % FORMES.length];
    p.style.color = COULEURS[i % COULEURS.length];
    p.style.fontSize = `${0.7 + Math.random() * 0.8}rem`;

    const ecartX = (Math.random() - 0.5) * source.width;
    const departX = source.left + source.width / 2 + ecartX;
    const departY = source.top + source.height / 2;
    p.style.left = `${departX}px`;
    p.style.top = `${departY}px`;
    document.body.append(p);

    // Une moitié rejoint le solde, l'autre part en confettis : la première dit
    // où vont les Éclats, la seconde fête l'événement.
    const versLeSolde = cible && i % 2 === 0;
    const arriveeX = versLeSolde
      ? cible.left + cible.width / 2 - departX
      : (Math.random() - 0.5) * 240;
    const arriveeY = versLeSolde
      ? cible.top + cible.height / 2 - departY
      : 70 + Math.random() * 130;
    const echelle = versLeSolde ? 0.35 : 0.9;

    requestAnimationFrame(() => {
      setTimeout(() => {
        p.style.transform = `translate(${arriveeX}px, ${arriveeY}px) scale(${echelle}) rotate(${Math.random() * 540}deg)`;
        p.style.opacity = '0';
      }, i * DECALAGE);
    });
    setTimeout(() => p.remove(), VOL + i * DECALAGE + 200);
  }
}

/**
 * Le geste complet. `soldeAvant` et `soldeApres` viennent du registre, jamais
 * d'un calcul local : le compteur montre le solde réel, pas une estimation.
 */
export async function celebrerCollecte({
  depuis, carte, soldeAvant, soldeApres, montant,
}) {
  const valeur = document.getElementById('solde-valeur');
  halo(carte);
  particules(depuis, valeur);

  if (!valeur) return;
  valeur.classList.add('solde-flash');
  setTimeout(() => valeur.classList.remove('solde-flash'), 900);

  // Les particules mettent un moment à traverser : le compteur les attend,
  // sinon le solde aurait déjà changé quand elles arrivent.
  const depart = Number.isFinite(soldeAvant) ? soldeAvant : null;
  const arrivee = Number.isFinite(soldeApres)
    ? soldeApres
    : (depart != null ? depart + montant : null);
  if (arrivee == null) return;

  await new Promise((suite) => setTimeout(suite, sobre() ? 0 : 420));
  await compter(valeur, depart ?? arrivee, arrivee);
}
