// Statistiques d'entraînement, calculées à la demande depuis l'historique.
//
// Rien n'est stocké : aucun compteur ne peut donc diverger des séances qui
// l'ont produit. Ce sont des mesures brutes — pas de score composite de forme,
// de discipline ou de performance.
//
// Quatre familles : régularité, progression, contenu (exercices et muscles),
// rythme et Éclats.

import { STATUT, ecartFinal, nombrePasses, nombreValides, ecoule } from './seance.js';
import { repartitionMuscles } from './session.js';
import { RECOMPENSE_DEFAUT, calculerRecompense } from './recompense.js';

const JOUR = 86_400_000;

export function seancesTerminees(historique) {
  return historique.filter((s) => s.statut === STATUT.TERMINEE);
}

/** Ordre chronologique croissant : toutes les séries temporelles en dépendent. */
export function chronologique(historique) {
  return [...seancesTerminees(historique)].sort((a, b) => (a.fin || 0) - (b.fin || 0));
}

export function jourLocal(horodatage) {
  const d = new Date(horodatage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function minuit(horodatage) {
  const d = new Date(horodatage);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ---- Vue d'ensemble ----

export function resume(historique, recompenseDefaut = RECOMPENSE_DEFAUT) {
  const terminees = seancesTerminees(historique);
  const abandonnees = historique.filter((s) => s.statut === STATUT.ABANDONNEE);
  const tempsTotal = terminees.reduce((t, s) => t + ecoule(s, s.fin), 0);
  const ecarts = terminees.map((s) => ecartFinal(s));

  return {
    seances: terminees.length,
    abandons: abandonnees.length,
    tauxAchevement: historique.length
      ? terminees.length / historique.length : 0,
    exercicesValides: terminees.reduce((t, s) => t + nombreValides(s), 0),
    exercicesPasses: terminees.reduce((t, s) => t + nombrePasses(s), 0),
    tempsTotal,
    tempsMoyen: terminees.length ? Math.round(tempsTotal / terminees.length) : 0,
    ecartMoyen: ecarts.length
      ? Math.round(ecarts.reduce((t, e) => t + e, 0) / ecarts.length) : 0,
    meilleureAvance: ecarts.length ? Math.min(...ecarts) : 0,
    pireRetard: ecarts.length ? Math.max(...ecarts) : 0,
    seancesEnAvance: ecarts.filter((e) => e < 0).length,
    // Le montant collecté est celui réellement versé, figé dans la séance. Le
    // reste à collecter se recalcule : il n'est promis nulle part.
    eclatsCollectes: historique.reduce(
      (t, s) => t + (s.recompense?.collectee ? s.recompense.total : 0), 0,
    ),
    eclatsACollecter: terminees.reduce(
      (t, s) => t + (s.recompense?.collectee ? 0 : calculerRecompense(s, recompenseDefaut).total),
      0,
    ),
  };
}

// ---- Régularité ----

export function joursActifs(historique) {
  return new Set(seancesTerminees(historique).map((s) => jourLocal(s.fin)));
}

/**
 * Série de jours consécutifs avec au moins une séance. Aujourd'hui sans séance
 * ne casse pas la série en cours : la journée n'est pas finie.
 */
export function series(historique, maintenant = Date.now()) {
  const jours = [...new Set(seancesTerminees(historique).map((s) => minuit(s.fin)))]
    .sort((a, b) => a - b);
  if (!jours.length) return { enCours: 0, record: 0, dernier: null, joursDepuis: null };

  let record = 1;
  let courante = 1;
  for (let i = 1; i < jours.length; i += 1) {
    courante = jours[i] - jours[i - 1] === JOUR ? courante + 1 : 1;
    record = Math.max(record, courante);
  }

  const aujourdHui = minuit(maintenant);
  const dernier = jours[jours.length - 1];
  const ecartJours = Math.round((aujourdHui - dernier) / JOUR);

  return {
    enCours: ecartJours <= 1 ? courante : 0,
    record,
    dernier,
    joursDepuis: ecartJours,
  };
}

/** Grille type calendrier : un jour par case, sur `semaines` semaines. */
export function calendrier(historique, { maintenant = Date.now(), semaines = 26 } = {}) {
  const parJour = new Map();
  for (const seance of seancesTerminees(historique)) {
    const cle = jourLocal(seance.fin);
    const courant = parJour.get(cle) || { seances: 0, temps: 0 };
    courant.seances += 1;
    courant.temps += ecoule(seance, seance.fin);
    parJour.set(cle, courant);
  }

  // La grille va du lundi le plus ancien au dimanche de la semaine en cours :
  // chaque colonne est alors une semaine pleine, et les jours à venir restent
  // visibles — c'est ce qui reste à faire cette semaine.
  const aujourdHui = minuit(maintenant);
  const jourSemaine = (new Date(aujourdHui).getDay() + 6) % 7;
  const debut = aujourdHui - (jourSemaine + (semaines - 1) * 7) * JOUR;
  const fin = aujourdHui + (6 - jourSemaine) * JOUR;

  const cases = [];
  for (let t = debut; t <= fin; t += JOUR) {
    const cle = jourLocal(t);
    const donnees = parJour.get(cle);
    cases.push({
      date: t,
      cle,
      seances: donnees?.seances || 0,
      temps: donnees?.temps || 0,
      futur: t > aujourdHui,
    });
  }
  return cases;
}

/** Agrégat par semaine ISO-ish (lundi → dimanche), du plus ancien au plus récent. */
export function parSemaine(historique, nombre = 12) {
  const cumul = new Map();
  for (const seance of seancesTerminees(historique)) {
    const d = new Date(seance.fin);
    const decalage = (d.getDay() + 6) % 7;
    const lundi = minuit(seance.fin - decalage * JOUR);
    const courant = cumul.get(lundi) || { debut: lundi, seances: 0, temps: 0, eclats: 0 };
    courant.seances += 1;
    courant.temps += ecoule(seance, seance.fin);
    courant.eclats += seance.recompense?.collectee ? seance.recompense.total : 0;
    cumul.set(lundi, courant);
  }

  const semaines = [...cumul.values()].sort((a, b) => a.debut - b.debut);
  return semaines.slice(-nombre);
}

export function parMois(historique) {
  const cumul = new Map();
  for (const seance of seancesTerminees(historique)) {
    const d = new Date(seance.fin);
    const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const courant = cumul.get(cle) || { cle, seances: 0, temps: 0, eclats: 0 };
    courant.seances += 1;
    courant.temps += ecoule(seance, seance.fin);
    courant.eclats += seance.recompense?.collectee ? seance.recompense.total : 0;
    cumul.set(cle, courant);
  }
  return [...cumul.values()].sort((a, b) => a.cle.localeCompare(b.cle));
}

/** Répartition par jour de la semaine, lundi en tête. */
export function parJourSemaine(historique) {
  const noms = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const compte = noms.map((nom) => ({ nom, seances: 0, temps: 0 }));
  for (const seance of seancesTerminees(historique)) {
    const index = (new Date(seance.fin).getDay() + 6) % 7;
    compte[index].seances += 1;
    compte[index].temps += ecoule(seance, seance.fin);
  }
  return compte;
}

/** Répartition par tranche horaire de DÉBUT de séance. */
export function parHeure(historique) {
  const tranches = [
    { nom: 'Nuit', min: 0, max: 6 },
    { nom: 'Matin', min: 6, max: 12 },
    { nom: 'Midi', min: 12, max: 14 },
    { nom: 'Après-midi', min: 14, max: 18 },
    { nom: 'Soir', min: 18, max: 24 },
  ].map((t) => ({ ...t, seances: 0 }));

  for (const seance of seancesTerminees(historique)) {
    const heure = new Date(seance.debut).getHours();
    const tranche = tranches.find((t) => heure >= t.min && heure < t.max);
    if (tranche) tranche.seances += 1;
  }
  return tranches;
}

// ---- Progression ----

/** Une entrée par séance terminée : matière première des courbes. */
export function serieTemporelle(historique) {
  return chronologique(historique).map((seance) => ({
    id: seance.id,
    date: seance.fin,
    nom: seance.nom,
    temps: ecoule(seance, seance.fin),
    ecart: ecartFinal(seance),
    valides: nombreValides(seance),
    passes: nombrePasses(seance),
    exercices: seance.exercices.length,
    eclats: seance.recompense?.collectee ? seance.recompense.total : 0,
  }));
}

/**
 * Tendance : moyenne de la fenêtre récente contre la précédente. On compare
 * deux moyennes plutôt que deux séances, une seule séance ratée ne devant pas
 * inverser une tendance.
 */
export function tendance(historique, fenetre = 5) {
  const points = serieTemporelle(historique);
  if (points.length < 2) return null;

  const taille = Math.min(fenetre, Math.floor(points.length / 2));
  if (taille < 1) return null;

  const recents = points.slice(-taille);
  const avant = points.slice(-2 * taille, -taille);
  if (!avant.length) return null;

  const moyenne = (liste, cle) => liste.reduce((t, p) => t + p[cle], 0) / liste.length;

  return {
    fenetre: taille,
    ecartRecent: Math.round(moyenne(recents, 'ecart')),
    ecartAvant: Math.round(moyenne(avant, 'ecart')),
    deltaEcart: Math.round(moyenne(recents, 'ecart') - moyenne(avant, 'ecart')),
    tempsRecent: Math.round(moyenne(recents, 'temps')),
    tempsAvant: Math.round(moyenne(avant, 'temps')),
  };
}

export function records(historique) {
  const points = serieTemporelle(historique);
  if (!points.length) return null;

  const parCle = (cle, comparateur) => points.reduce(
    (meilleur, p) => (comparateur(p[cle], meilleur[cle]) ? p : meilleur), points[0],
  );

  return {
    plusGrandeAvance: parCle('ecart', (a, b) => a < b),
    plusLongue: parCle('temps', (a, b) => a > b),
    plusCourte: parCle('temps', (a, b) => a < b),
    plusDExercices: parCle('valides', (a, b) => a > b),
  };
}

/** Moyenne glissante de l'écart, pour lisser la courbe. */
export function moyenneGlissante(points, cle, fenetre = 3) {
  return points.map((point, i) => {
    const tranche = points.slice(Math.max(0, i - fenetre + 1), i + 1);
    return {
      ...point,
      valeur: tranche.reduce((t, p) => t + p[cle], 0) / tranche.length,
    };
  });
}

// ---- Sessions, exercices, muscles ----

export function parSession(historique) {
  const cumul = new Map();
  for (const seance of seancesTerminees(historique)) {
    const cle = seance.sessionId || seance.nom;
    const courant = cumul.get(cle) || {
      cle, nom: seance.nom, seances: 0, temps: 0, ecart: 0, eclats: 0, derniere: 0,
    };
    courant.seances += 1;
    courant.temps += ecoule(seance, seance.fin);
    courant.ecart += ecartFinal(seance);
    courant.eclats += seance.recompense?.collectee ? seance.recompense.total : 0;
    courant.derniere = Math.max(courant.derniere, seance.fin || 0);
    cumul.set(cle, courant);
  }
  return [...cumul.values()]
    .map((c) => ({ ...c, ecartMoyen: Math.round(c.ecart / c.seances), tempsMoyen: Math.round(c.temps / c.seances) }))
    .sort((a, b) => b.seances - a.seances);
}

/** Toutes les exécutions d'exercices, à plat : base des stats par exercice. */
export function executions(historique) {
  const lignes = [];
  for (const seance of seancesTerminees(historique)) {
    let precedent = 0;
    for (const etape of seance.etapes) {
      const exercice = seance.exercices[etape.index];
      const duree = etape.a - precedent;
      precedent = etape.a;
      if (!exercice) continue;
      lignes.push({
        nom: exercice.nom,
        statut: etape.statut,
        duree,
        alloue: exercice.dureeSecondes * 1000,
        ecart: duree - exercice.dureeSecondes * 1000,
        date: seance.fin,
        seance: seance.nom,
        position: etape.index,
        muscles: exercice.musclesPrincipaux || [],
        musclesSecondaires: exercice.musclesSecondaires || [],
      });
    }
  }
  return lignes;
}

export function parExercice(historique) {
  const cumul = new Map();
  for (const ligne of executions(historique)) {
    const courant = cumul.get(ligne.nom) || {
      nom: ligne.nom, fois: 0, valides: 0, passes: 0, temps: 0,
      depassements: 0, muscles: ligne.muscles, derniere: 0,
    };
    courant.fois += 1;
    if (ligne.statut === 'valide') {
      courant.valides += 1;
      courant.temps += ligne.duree;
      if (ligne.ecart > 0) courant.depassements += 1;
    } else {
      courant.passes += 1;
    }
    courant.derniere = Math.max(courant.derniere, ligne.date || 0);
    cumul.set(ligne.nom, courant);
  }

  return [...cumul.values()]
    .map((e) => ({
      ...e,
      tempsMoyen: e.valides ? Math.round(e.temps / e.valides) : 0,
      tauxPasse: e.fois ? e.passes / e.fois : 0,
      tauxDepassement: e.valides ? e.depassements / e.valides : 0,
    }))
    .sort((a, b) => b.fois - a.fois);
}

/** Les exercices qu'on évite : fort taux de passage, sur un minimum de passages. */
export function exercicesEvites(historique, minimum = 2) {
  return parExercice(historique)
    .filter((e) => e.passes > 0 && e.fois >= minimum)
    .sort((a, b) => b.tauxPasse - a.tauxPasse || b.passes - a.passes);
}

/** Les exercices qui débordent le plus souvent de leur temps alloué. */
export function exercicesDebordants(historique, minimum = 2) {
  return parExercice(historique)
    .filter((e) => e.valides >= minimum && e.depassements > 0)
    .sort((a, b) => b.tauxDepassement - a.tauxDepassement);
}

export function musclesTravailles(historique) {
  const cumul = new Map();
  for (const seance of seancesTerminees(historique)) {
    const faits = seance.etapes
      .filter((e) => e.statut === 'valide')
      .map((e) => seance.exercices[e.index])
      .filter(Boolean);
    for (const { id, valeur } of repartitionMuscles(faits)) {
      cumul.set(id, (cumul.get(id) || 0) + valeur);
    }
  }
  return [...cumul.entries()]
    .map(([id, valeur]) => ({ id, valeur }))
    .sort((a, b) => b.valeur - a.valeur);
}

/**
 * Équilibre musculaire : la part de chaque muscle, et l'écart au partage égal.
 * On ne juge pas — on montre ce qui est sur-travaillé et ce qui est délaissé.
 */
export function equilibreMuscles(historique, etiquettes = []) {
  const travailles = musclesTravailles(historique);
  const total = travailles.reduce((t, m) => t + m.valeur, 0);
  const connus = etiquettes.map((e) => e.id);
  const vus = new Set(travailles.map((m) => m.id));

  const lignes = travailles.map((m) => ({
    ...m,
    part: total ? m.valeur / total : 0,
  }));

  // Une étiquette existante jamais travaillée est une information, pas un vide.
  for (const id of connus) {
    if (!vus.has(id)) lignes.push({ id, valeur: 0, part: 0 });
  }

  return { total, lignes: lignes.sort((a, b) => b.valeur - a.valeur) };
}

/** Progression d'un mouvement : son temps à chaque passage validé. */
export function historiqueExercice(historique, nomExercice) {
  return executions(historique)
    .filter((l) => l.nom === nomExercice && l.statut === 'valide')
    .map((l) => ({ date: l.date, duree: l.duree, seance: l.seance, ecart: l.ecart }))
    .sort((a, b) => a.date - b.date);
}

// ---- Rythme ----

/**
 * Où le temps se perd dans une séance : écart moyen par position, regroupé en
 * cinq tranches. Le début, le milieu et la fin d'une séance ne se ressemblent
 * pas — c'est là qu'on voit qu'on part trop vite ou qu'on s'écroule.
 */
export function rythmeInterne(historique, tranches = 5) {
  const seaux = Array.from({ length: tranches }, (_, i) => ({
    tranche: i, ecart: 0, compte: 0,
  }));

  for (const seance of seancesTerminees(historique)) {
    const total = seance.exercices.length;
    if (!total) continue;
    let precedent = 0;
    for (const etape of seance.etapes) {
      const exercice = seance.exercices[etape.index];
      const duree = etape.a - precedent;
      precedent = etape.a;
      if (!exercice || etape.statut !== 'valide') continue;
      const index = Math.min(tranches - 1, Math.floor((etape.index / total) * tranches));
      seaux[index].ecart += duree - exercice.dureeSecondes * 1000;
      seaux[index].compte += 1;
    }
  }

  return seaux.map((s, i) => ({
    tranche: i,
    libelle: `${Math.round((i / tranches) * 100)}–${Math.round(((i + 1) / tranches) * 100)} %`,
    ecartMoyen: s.compte ? Math.round(s.ecart / s.compte) : 0,
    compte: s.compte,
  }));
}

// ---- Éclats ----

export function eclatsParSession(historique) {
  return parSession(historique)
    .filter((s) => s.eclats > 0)
    .sort((a, b) => b.eclats - a.eclats);
}

export function eclatsParMois(historique) {
  return parMois(historique).filter((m) => m.eclats > 0);
}

/** Tout ce qui a été gagné, gagné puis collecté, ou laissé en attente. */
export function bilanEclats(historique, recompenseDefaut = RECOMPENSE_DEFAUT) {
  const terminees = seancesTerminees(historique);
  let forfaits = 0;
  let bonus = 0;
  let paliersAtteints = 0;

  for (const seance of terminees) {
    const calcul = seance.recompense?.collectee
      ? seance.recompense
      : calculerRecompense(seance, recompenseDefaut);
    forfaits += calcul.forfait || 0;
    bonus += calcul.bonus || 0;
    if (calcul.bonus > 0) paliersAtteints += 1;
  }

  return {
    forfaits,
    bonus,
    total: forfaits + bonus,
    paliersAtteints,
    tauxPalier: terminees.length ? paliersAtteints / terminees.length : 0,
    parSeance: terminees.length ? Math.round((forfaits + bonus) / terminees.length) : 0,
  };
}
