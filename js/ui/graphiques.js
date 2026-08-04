// Graphiques en SVG, écrits à la main.
//
// Aucune bibliothèque : l'application doit fonctionner hors ligne, sans CDN, et
// une dépendance de 200 ko pour six courbes serait hors de proportion.
//
// Toutes les fonctions renvoient un SVG autonome, mis à l'échelle par son
// `viewBox` : il s'adapte à la largeur du téléphone sans recalcul au
// redimensionnement.

const SVG = 'http://www.w3.org/2000/svg';

function svg(balise, attributs = {}, enfants = []) {
  const noeud = document.createElementNS(SVG, balise);
  for (const [cle, valeur] of Object.entries(attributs)) {
    if (valeur == null || valeur === false) continue;
    noeud.setAttribute(cle, String(valeur));
  }
  for (const enfant of [].concat(enfants)) if (enfant) noeud.append(enfant);
  return noeud;
}

function cadre(largeur, hauteur, classe = '') {
  return svg('svg', {
    viewBox: `0 0 ${largeur} ${hauteur}`,
    class: `graphique ${classe}`.trim(),
    preserveAspectRatio: 'none',
    role: 'img',
  });
}

/**
 * Anneau de progression de l'exercice en cours. Le compte à rebours vit au
 * centre : l'anneau donne la proportion d'un coup d'œil, le chiffre donne la
 * seconde exacte.
 */
export function anneau({ progression = 0, depasse = false, taille = 240 } = {}) {
  const rayon = 100;
  const centre = 120;
  const perimetre = 2 * Math.PI * rayon;
  const part = Math.min(1, Math.max(0, progression));

  const racine = svg('svg', {
    viewBox: '0 0 240 240',
    class: `anneau ${depasse ? 'anneau-depasse' : ''}`.trim(),
    width: taille,
    height: taille,
    'aria-hidden': 'true',
  });

  const commun = {
    cx: centre, cy: centre, r: rayon, fill: 'none', 'stroke-width': 12, 'stroke-linecap': 'round',
  };
  const trace = svg('circle', {
    ...commun,
    class: 'anneau-trace',
    'stroke-dasharray': perimetre,
    'stroke-dashoffset': perimetre * (1 - part),
    transform: `rotate(-90 ${centre} ${centre})`,
  });

  racine.append(svg('circle', { ...commun, class: 'anneau-fond' }), trace);
  racine.majProgression = (valeur, estDepasse) => {
    trace.setAttribute('stroke-dashoffset', perimetre * (1 - Math.min(1, Math.max(0, valeur))));
    racine.classList.toggle('anneau-depasse', !!estDepasse);
  };
  return racine;
}

/** Courbe lissée avec aire sous la ligne. `points` : [{x, y}] déjà ordonnés. */
export function courbe(valeurs, {
  hauteur = 120, largeur = 320, classe = '', zero = false, libelle = '',
} = {}) {
  const racine = cadre(largeur, hauteur, `courbe ${classe}`.trim());
  if (valeurs.length < 2) {
    racine.append(svg('text', {
      x: largeur / 2, y: hauteur / 2, class: 'graphique-vide', 'text-anchor': 'middle',
    }, [document.createTextNode('Pas encore assez de séances')]));
    return racine;
  }

  const min = Math.min(...valeurs, zero ? 0 : Infinity);
  const max = Math.max(...valeurs, zero ? 0 : -Infinity);
  const amplitude = max - min || 1;
  const marge = 8;
  const utile = hauteur - marge * 2;

  const x = (i) => (i / (valeurs.length - 1)) * largeur;
  const y = (v) => marge + utile - ((v - min) / amplitude) * utile;

  const chemin = valeurs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const aire = `${chemin} L${largeur},${hauteur} L0,${hauteur} Z`;

  // La ligne du zéro n'a de sens que sur un axe signé (les écarts).
  if (zero && min < 0 && max > 0) {
    racine.append(svg('line', {
      x1: 0, x2: largeur, y1: y(0), y2: y(0), class: 'graphique-zero',
    }));
  }

  racine.append(
    svg('path', { d: aire, class: 'courbe-aire' }),
    svg('path', { d: chemin, class: 'courbe-ligne', fill: 'none' }),
    svg('circle', { cx: x(valeurs.length - 1), cy: y(valeurs[valeurs.length - 1]), r: 4, class: 'courbe-point' }),
  );
  if (libelle) racine.append(svg('title', {}, [document.createTextNode(libelle)]));
  return racine;
}

/** Histogramme vertical. `barres` : [{valeur, libelle, titre}]. */
export function histogramme(barres, { hauteur = 120, classe = '', signe = false } = {}) {
  const largeur = Math.max(barres.length * 24, 120);
  const racine = cadre(largeur, hauteur, `histogramme ${classe}`.trim());
  if (!barres.length) return racine;

  const valeurs = barres.map((b) => b.valeur);
  const max = Math.max(...valeurs, 0);
  const min = signe ? Math.min(...valeurs, 0) : 0;
  const amplitude = (max - min) || 1;
  const pas = largeur / barres.length;
  const epaisseur = Math.max(4, pas * 0.62);
  const base = hauteur - ((0 - min) / amplitude) * hauteur;

  barres.forEach((barre, i) => {
    const h = (Math.abs(barre.valeur) / amplitude) * hauteur;
    const y = barre.valeur >= 0 ? base - h : base;
    const rect = svg('rect', {
      x: i * pas + (pas - epaisseur) / 2,
      y: Math.max(0, y),
      width: epaisseur,
      height: Math.max(1, h),
      rx: Math.min(3, epaisseur / 2),
      class: `barre ${barre.valeur < 0 ? 'barre-negative' : 'barre-positive'}`,
    });
    if (barre.titre) rect.append(svg('title', {}, [document.createTextNode(barre.titre)]));
    racine.append(rect);
  });

  if (signe) {
    racine.append(svg('line', { x1: 0, x2: largeur, y1: base, y2: base, class: 'graphique-zero' }));
  }
  return racine;
}

/** Barres horizontales avec libellé et valeur — pour les classements. */
export function barres(lignes, { max: maxImpose = null } = {}) {
  const max = maxImpose ?? Math.max(...lignes.map((l) => l.valeur), 1);
  const conteneur = document.createElement('div');
  conteneur.className = 'barres';

  for (const ligne of lignes) {
    const rangee = document.createElement('div');
    rangee.className = 'barre-rangee';

    const nom = document.createElement('span');
    nom.className = 'barre-nom';
    nom.textContent = ligne.libelle;

    const piste = document.createElement('div');
    piste.className = 'barre-piste';
    const remplissage = document.createElement('div');
    remplissage.className = 'barre-remplissage';
    remplissage.style.width = `${Math.round((ligne.valeur / max) * 100)}%`;
    if (ligne.teinte) remplissage.style.setProperty('--teinte', ligne.teinte);
    piste.append(remplissage);

    const valeur = document.createElement('span');
    valeur.className = 'barre-valeur';
    valeur.textContent = ligne.texte ?? String(ligne.valeur);

    rangee.append(nom, piste, valeur);
    conteneur.append(rangee);
  }
  return conteneur;
}

/**
 * Calendrier d'activité. Une colonne par semaine, une case par jour, teintée
 * selon le volume — la régularité se lit alors sans lire un seul chiffre.
 */
export function calendrierActivite(cases, { maxTemps = null } = {}) {
  const plafond = maxTemps ?? Math.max(...cases.map((c) => c.temps), 1);
  const semaines = Math.ceil(cases.length / 7);
  const cote = 12;
  const espace = 3;
  const largeur = semaines * (cote + espace);
  const hauteur = 7 * (cote + espace);

  const racine = svg('svg', {
    viewBox: `0 0 ${largeur} ${hauteur}`,
    class: 'graphique calendrier',
    role: 'img',
    'aria-label': 'Calendrier des séances',
  });

  cases.forEach((jour, i) => {
    const semaine = Math.floor(i / 7);
    const ligne = i % 7;
    const intensite = jour.seances ? Math.min(1, jour.temps / plafond) : 0;
    const rect = svg('rect', {
      x: semaine * (cote + espace),
      y: ligne * (cote + espace),
      width: cote,
      height: cote,
      rx: 3,
      class: `jour ${jour.seances ? 'jour-actif' : ''} ${jour.futur ? 'jour-futur' : ''}`.trim(),
      'fill-opacity': jour.seances ? 0.25 + intensite * 0.75 : 1,
    });
    const date = new Date(jour.date).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    rect.append(svg('title', {}, [document.createTextNode(
      jour.seances ? `${date} — ${jour.seances} séance(s)` : date,
    )]));
    racine.append(rect);
  });

  return racine;
}

/** Anneau de répartition (muscles, sessions). `parts` : [{valeur, teinte, libelle}]. */
export function couronne(parts, { taille = 160 } = {}) {
  const total = parts.reduce((t, p) => t + p.valeur, 0);
  const racine = svg('svg', {
    viewBox: '0 0 120 120', class: 'graphique couronne', width: taille, height: taille, role: 'img',
  });
  if (!total) return racine;

  const rayon = 48;
  const perimetre = 2 * Math.PI * rayon;
  let parcouru = 0;

  for (const part of parts) {
    if (part.valeur <= 0) continue;
    const longueur = (part.valeur / total) * perimetre;
    const arc = svg('circle', {
      cx: 60,
      cy: 60,
      r: rayon,
      fill: 'none',
      'stroke-width': 16,
      stroke: part.teinte,
      'stroke-dasharray': `${longueur} ${perimetre - longueur}`,
      'stroke-dashoffset': -parcouru,
      transform: 'rotate(-90 60 60)',
    });
    arc.append(svg('title', {}, [document.createTextNode(
      `${part.libelle} — ${Math.round((part.valeur / total) * 100)} %`,
    )]));
    racine.append(arc);
    parcouru += longueur;
  }
  return racine;
}

/** Ligne d'étincelle compacte, posée dans une tuile de mesure. */
export function etincelle(valeurs, { largeur = 90, hauteur = 26 } = {}) {
  if (valeurs.length < 2) return null;
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const amplitude = max - min || 1;
  const chemin = valeurs.map((v, i) => {
    const x = (i / (valeurs.length - 1)) * largeur;
    const y = hauteur - 2 - ((v - min) / amplitude) * (hauteur - 4);
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const racine = cadre(largeur, hauteur, 'etincelle');
  racine.append(svg('path', { d: chemin, fill: 'none', class: 'etincelle-ligne' }));
  return racine;
}
