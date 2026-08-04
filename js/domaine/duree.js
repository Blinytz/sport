// Durées et formats d'affichage.
//
// Tout le domaine compte en MILLISECONDES ; seules les durées configurées par
// l'utilisateur (durée d'un exercice) sont exprimées en secondes entières, car
// c'est ce qu'il saisit. Aucun arrondi caché entre les deux.

export const MINUTE = 60;
export const DUREE_EXERCICE_DEFAUT = 180;
export const DUREE_MINIMALE = 5;
export const DUREE_MAXIMALE = 90 * MINUTE;

/** `754s` → `12:34`. Au-delà de l'heure, `1:02:03`. */
export function formaterDuree(millisecondes) {
  const total = Math.floor(Math.abs(millisecondes) / 1000);
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secondes = total % 60;
  const deux = (n) => String(n).padStart(2, '0');
  return heures > 0
    ? `${heures}:${deux(minutes)}:${deux(secondes)}`
    : `${minutes}:${deux(secondes)}`;
}

/**
 * Écart signé, tel qu'il s'affiche à l'écran : `-6:32` d'avance, `+4:21` de
 * retard. Le signe est porté par le texte parce que la couleur seule ne suffit
 * pas à distinguer les deux.
 *
 * Trait d'union simple, jamais le signe moins typographique : les tirets longs
 * sont proscrits de tout ce qui s'affiche.
 */
export function formaterEcart(millisecondes) {
  const signe = millisecondes < 0 ? '-' : '+';
  return `${signe}${formaterDuree(millisecondes)}`;
}

/** `avance`, `retard` ou `pile` — c'est ce qui décide de la couleur. */
export function sensEcart(millisecondes, toleranceMs = 1000) {
  if (Math.abs(millisecondes) < toleranceMs) return 'pile';
  return millisecondes < 0 ? 'avance' : 'retard';
}

/** `3:00` ou `180` ou `2min 30` → 180. `null` si rien d'exploitable. */
export function analyserDuree(saisie) {
  const texte = String(saisie ?? '').trim().toLowerCase();
  if (!texte) return null;

  const horloge = texte.match(/^(\d+)\s*:\s*([0-5]?\d)$/);
  if (horloge) return Number(horloge[1]) * 60 + Number(horloge[2]);

  const lettres = texte.match(/^(?:(\d+)\s*(?:min|m)\s*)?(?:(\d+)\s*s?)?$/);
  if (lettres && (lettres[1] || lettres[2])) {
    const minutes = Number(lettres[1] || 0);
    // « 3min » sans reste : le second groupe est vide, pas nul.
    const secondes = Number(lettres[2] || 0);
    if (!lettres[1]) return secondes;
    return minutes * 60 + secondes;
  }

  return null;
}

/** Une durée saisie n'entre jamais dans les données sans être bornée. */
export function bornerDuree(secondes, defaut = DUREE_EXERCICE_DEFAUT) {
  // `null` veut dire « rien de saisi », pas « zéro seconde » : sans ce test,
  // `Number(null)` vaudrait 0 et écraserait la valeur par défaut.
  if (secondes == null || secondes === '') return defaut;
  const valeur = Number(secondes);
  if (!Number.isFinite(valeur)) return defaut;
  return Math.min(DUREE_MAXIMALE, Math.max(DUREE_MINIMALE, Math.round(valeur)));
}

/** `180` → `3:00`, pour préremplir un champ de saisie. */
export function formaterSaisieDuree(secondes) {
  const total = Math.max(0, Math.round(Number(secondes) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
