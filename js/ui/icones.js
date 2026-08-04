// Icônes de la barre de navigation, tracées en SVG.
//
// Des traits, pas des emoji : ils héritent de `currentColor`, restent nets à
// toutes les densités d'écran, et n'imposent pas le style d'un système.

const SVG = 'http://www.w3.org/2000/svg';

function trace(chemins) {
  const noeud = document.createElementNS(SVG, 'svg');
  noeud.setAttribute('viewBox', '0 0 24 24');
  noeud.setAttribute('fill', 'none');
  noeud.setAttribute('stroke', 'currentColor');
  noeud.setAttribute('stroke-linecap', 'round');
  noeud.setAttribute('stroke-linejoin', 'round');
  noeud.setAttribute('aria-hidden', 'true');
  for (const d of chemins) {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', d);
    noeud.append(p);
  }
  return noeud;
}

export const ICONES = {
  // Chronomètre : l'objet central de l'application.
  seances: () => trace(['M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M12 9v4l2.5 2', 'M9.5 2.5h5']),
  // Liste avec un crayon.
  editer: () => trace(['M4 6h9', 'M4 12h7', 'M4 18h5', 'M15.5 17.5 20 13l2 2-4.5 4.5H15.5v-2Z']),
  // Colonnes montantes.
  stats: () => trace(['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2']),
  // Flèche circulaire vers le passé.
  historique: () => trace(['M3 12a9 9 0 1 0 3-6.7', 'M3 4v4h4', 'M12 8v4.5l3 1.8']),
  // Roue crantée simplifiée.
  reglages: () => trace([
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3H9.8l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.7h4.4l.4-2.7c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
  ]),
};
