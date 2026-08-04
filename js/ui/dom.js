// Fabrique d'éléments. Aucun `innerHTML` avec du contenu utilisateur : un nom
// d'exercice contenant « < » doit s'afficher, pas s'exécuter.

export function el(balise, options = {}, enfants = []) {
  const noeud = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(options)) {
    if (valeur == null || valeur === false) continue;
    if (cle === 'class') noeud.className = valeur;
    else if (cle === 'texte') noeud.textContent = valeur;
    else if (cle === 'html') noeud.innerHTML = valeur;
    else if (cle === 'sur') for (const [ev, f] of Object.entries(valeur)) noeud.addEventListener(ev, f);
    else if (cle === 'donnees') for (const [d, v] of Object.entries(valeur)) noeud.dataset[d] = v;
    else if (cle in noeud && cle !== 'list') noeud[cle] = valeur;
    else noeud.setAttribute(cle, valeur === true ? '' : valeur);
  }
  ajouter(noeud, enfants);
  return noeud;
}

export function ajouter(parent, enfants) {
  for (const enfant of [].concat(enfants)) {
    if (enfant == null || enfant === false) continue;
    parent.append(typeof enfant === 'string' || typeof enfant === 'number'
      ? document.createTextNode(String(enfant)) : enfant);
  }
  return parent;
}

export const div = (classe, enfants) => el('div', { class: classe }, enfants);
export const span = (classe, texte) => el('span', { class: classe, texte });
export const titre = (niveau, texte, classe) => el(`h${niveau}`, { texte, class: classe });

export function bouton(texte, action, options = {}) {
  return el('button', {
    type: 'button', class: options.class || 'bouton', texte, sur: { click: action }, ...options,
  });
}

export function champ(etiquette, entree, aide) {
  return div('champ', [
    el('label', { texte: etiquette, for: entree.id || undefined }),
    entree,
    aide ? el('p', { class: 'aide', texte: aide }) : null,
  ]);
}

export function entree(options = {}) {
  return el('input', { type: 'text', class: 'entree', ...options });
}

export function section(titreTexte, enfants, actions) {
  return el('section', { class: 'bloc' }, [
    titreTexte
      ? div('bloc-entete', [titre(2, titreTexte), actions ? div('bloc-actions', actions) : null])
      : null,
    ...[].concat(enfants),
  ]);
}

/** Bandeau de message, remplacé à chaque appel plutôt qu'empilé. */
export function annoncer(message, genre = 'info') {
  const zone = document.getElementById('annonces');
  if (!zone) return;
  zone.replaceChildren(el('p', { class: `annonce annonce-${genre}`, texte: message }));
  zone.scrollIntoView({ block: 'nearest' });
  clearTimeout(annoncer._t);
  annoncer._t = setTimeout(() => zone.replaceChildren(), 6000);
}

/**
 * Confirmation modale. `confirm()` natif est bloqué dans certaines PWA
 * installées : on ne peut pas s'y fier pour une suppression.
 */
export function confirmer(message, { valider = 'Supprimer', danger = true } = {}) {
  return new Promise((resoudre) => {
    const fermer = (reponse) => { fond.remove(); resoudre(reponse); };
    const boite = div('modale', [
      el('p', { class: 'modale-message', texte: message }),
      div('modale-actions', [
        bouton('Annuler', () => fermer(false), { class: 'bouton bouton-discret' }),
        bouton(valider, () => fermer(true), {
          class: danger ? 'bouton bouton-danger' : 'bouton bouton-primaire',
        }),
      ]),
    ]);
    const fond = div('modale-fond', [boite]);
    fond.addEventListener('click', (e) => { if (e.target === fond) fermer(false); });
    document.addEventListener('keydown', function echap(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', echap); fermer(false); }
    });
    document.body.append(fond);
    boite.querySelector('button:last-child')?.focus();
  });
}

export function formaterDate(iso) {
  if (!iso) return '';
  const d = typeof iso === 'number' ? new Date(iso) : new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
