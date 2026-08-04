import test from 'node:test';
import assert from 'node:assert/strict';

import { abandonner, demarrerSeance, passer, valider } from '../js/domaine/seance.js';
import {
  bilanEclats, calendrier, equilibreMuscles, exercicesDebordants, exercicesEvites,
  historiqueExercice, jourLocal, moyenneGlissante, musclesTravailles, parExercice,
  parHeure, parJourSemaine, parSemaine, parSession, records, resume, rythmeInterne,
  series, tendance,
} from '../js/domaine/stats.js';

const T0 = 1_800_000_000_000;
let compteur = 0;
const identifiant = () => `id-${(compteur += 1)}`;

function courir({
  nom = 'Session Push', sessionId = 's1', debut = T0, durees = [180, 180],
  temps = [60_000, 120_000], sauts = [], muscles = [['pectoraux'], ['dos']],
  recompense = { forfait: 10, paliers: [] },
} = {}) {
  let seance = demarrerSeance({
    id: sessionId,
    nom,
    recompense,
    exercices: durees.map((d, i) => ({
      id: `ex-${i}`, nom: `Exercice ${i + 1}`, repetitions: '30', dureeSecondes: d,
      musclesPrincipaux: muscles[i] || [], musclesSecondaires: [], notes: '',
    })),
  }, { maintenant: debut, dureeDefaut: 180, identifiant });
  temps.forEach((t, i) => {
    seance = sauts.includes(i) ? passer(seance, debut + t) : valider(seance, debut + t);
  });
  return seance;
}

test('un historique vide ne divise par rien', () => {
  const chiffres = resume([]);
  assert.equal(chiffres.seances, 0);
  assert.equal(chiffres.tempsMoyen, 0);
  assert.equal(chiffres.ecartMoyen, 0);
  assert.equal(chiffres.meilleureAvance, 0);
});

test('le résumé ne compte que les séances menées au bout', () => {
  const abandon = abandonner(courir({ temps: [60_000] }), T0 + 90_000);
  const chiffres = resume([courir(), abandon]);

  assert.equal(chiffres.seances, 1);
  assert.equal(chiffres.abandons, 1);
  assert.equal(chiffres.exercicesValides, 2);
  assert.equal(chiffres.tempsTotal, 120_000);
});

test('les Éclats à collecter viennent du barème figé dans chaque séance', () => {
  const historique = [courir(), courir({ recompense: { forfait: 30, paliers: [] } })];
  assert.equal(resume(historique).eclatsACollecter, 40);
});

test('une séance sans barème retombe sur le secours fourni', () => {
  const seance = courir();
  delete seance.bareme;
  assert.equal(resume([seance], { forfait: 7, paliers: [] }).eclatsACollecter, 7);
});

test('une séance collectée sort du « à collecter » et entre dans le « collecté »', () => {
  const seance = courir();
  const collectee = { ...seance, recompense: { total: 5, collectee: true } };
  const chiffres = resume([collectee]);

  assert.equal(chiffres.eclatsCollectes, 5);
  assert.equal(chiffres.eclatsACollecter, 0);
});

test('l’écart moyen et la meilleure avance viennent des séances terminées', () => {
  const rapide = courir({ temps: [60_000, 120_000] });
  const lente = courir({ temps: [200_000, 400_000] });
  const chiffres = resume([rapide, lente]);

  assert.equal(chiffres.meilleureAvance, -240_000);
  assert.equal(chiffres.ecartMoyen, Math.round((-240_000 + 40_000) / 2));
});

test('parSession regroupe les répétitions d’une même session', () => {
  const lignes = parSession([
    courir({ sessionId: 's1', nom: 'Push' }),
    courir({ sessionId: 's1', nom: 'Push' }),
    courir({ sessionId: 's2', nom: 'Pull' }),
  ]);

  assert.equal(lignes.length, 2);
  assert.equal(lignes[0].nom, 'Push');
  assert.equal(lignes[0].seances, 2);
  assert.equal(lignes[0].ecartMoyen, -240_000);
});

test('les muscles travaillés ignorent les exercices passés', () => {
  const seance = courir({ sauts: [1], muscles: [['pectoraux'], ['dos']] });
  const travailles = musclesTravailles([seance]);

  assert.deepEqual(travailles, [{ id: 'pectoraux', valeur: 1 }]);
});

test('historiqueExercice suit un mouvement dans le temps', () => {
  const points = historiqueExercice([
    courir({ debut: T0, temps: [60_000, 120_000] }),
    courir({ debut: T0 + 86_400_000, temps: [50_000, 100_000] }),
  ], 'Exercice 1');

  assert.equal(points.length, 2);
  assert.equal(points[0].duree, 60_000);
  assert.equal(points[1].duree, 50_000);
  assert.ok(points[0].date < points[1].date);
});

// ---- Régularité ----

const JOUR = 86_400_000;

test('la série compte les jours consécutifs, pas les séances', () => {
  const historique = [
    courir({ debut: T0, temps: [10_000, 20_000] }),
    courir({ debut: T0 + 3_600_000, temps: [10_000, 20_000] }),
    courir({ debut: T0 + JOUR, temps: [10_000, 20_000] }),
    courir({ debut: T0 + 2 * JOUR, temps: [10_000, 20_000] }),
  ];
  const serie = series(historique, T0 + 2 * JOUR);

  assert.equal(serie.enCours, 3, 'deux séances le même jour ne comptent qu’une fois');
  assert.equal(serie.record, 3);
  assert.equal(serie.joursDepuis, 0);
});

test('la journée en cours ne casse pas la série tant qu’elle n’est pas finie', () => {
  const historique = [courir({ debut: T0, temps: [10_000, 20_000] })];

  assert.equal(series(historique, T0).enCours, 1, 'séance faite aujourd’hui');
  assert.equal(series(historique, T0 + JOUR).enCours, 1, 'hier : la journée peut encore servir');
  assert.equal(series(historique, T0 + 2 * JOUR).enCours, 0, 'un jour sauté rompt la série');
});

test('le record de série survit à une interruption', () => {
  const jours = [0, 1, 2, 5, 6];
  const historique = jours.map((j) => courir({ debut: T0 + j * JOUR, temps: [10_000, 20_000] }));
  const serie = series(historique, T0 + 6 * JOUR);

  assert.equal(serie.record, 3);
  assert.equal(serie.enCours, 2);
});

test('le calendrier couvre des semaines pleines et marque les jours actifs', () => {
  const historique = [courir({ debut: T0, temps: [10_000, 20_000] })];
  const cases = calendrier(historique, { maintenant: T0, semaines: 4 });

  assert.equal(cases.length, 28, 'quatre semaines pleines');
  assert.equal(cases.length % 7, 0, 'chaque colonne est une semaine complète');
  assert.equal(cases.filter((c) => c.seances > 0).length, 1);
  assert.ok(cases.some((c) => c.cle === jourLocal(T0) && !c.futur));
  assert.ok(cases.every((c) => !c.futur || c.seances === 0), 'aucune séance dans le futur');
});

test('parSemaine et parJourSemaine rangent sans rien perdre', () => {
  const historique = [
    courir({ debut: T0, temps: [10_000, 20_000] }),
    courir({ debut: T0 + 7 * JOUR, temps: [10_000, 20_000] }),
  ];

  const semaines = parSemaine(historique);
  assert.equal(semaines.length, 2);
  assert.ok(semaines[0].debut < semaines[1].debut);

  const jours = parJourSemaine(historique);
  assert.equal(jours.length, 7);
  assert.equal(jours.reduce((t, j) => t + j.seances, 0), 2);
});

// ---- Progression ----

test('la tendance compare deux fenêtres, pas deux séances', () => {
  const lentes = [0, 1, 2, 3].map((i) => courir({ debut: T0 + i * JOUR, temps: [200_000, 400_000] }));
  const rapides = [4, 5, 6, 7].map((i) => courir({ debut: T0 + i * JOUR, temps: [60_000, 120_000] }));
  const tend = tendance([...lentes, ...rapides], 4);

  assert.equal(tend.fenetre, 4);
  assert.ok(tend.ecartRecent < tend.ecartAvant, 'les séances récentes sont plus rapides');
  assert.ok(tend.deltaEcart < 0);
});

test('la tendance se tait tant qu’il n’y a pas deux fenêtres', () => {
  assert.equal(tendance([]), null);
  assert.equal(tendance([courir()]), null);
});

test('les records pointent la bonne séance', () => {
  const rapide = courir({ nom: 'Éclair', temps: [30_000, 60_000] });
  const lente = courir({ nom: 'Longue', debut: T0 + JOUR, temps: [300_000, 600_000] });
  const rec = records([rapide, lente]);

  assert.equal(rec.plusGrandeAvance.nom, 'Éclair');
  assert.equal(rec.plusCourte.nom, 'Éclair');
  assert.equal(rec.plusLongue.nom, 'Longue');
});

test('la moyenne glissante lisse sans décaler la série', () => {
  const points = [{ v: 0 }, { v: 3 }, { v: 6 }];
  const lisse = moyenneGlissante(points, 'v', 2);

  assert.equal(lisse.length, 3);
  assert.equal(lisse[0].valeur, 0);
  assert.equal(lisse[1].valeur, 1.5);
  assert.equal(lisse[2].valeur, 4.5);
});

// ---- Exercices et muscles ----

test('parExercice agrège les passages d’un même mouvement', () => {
  const historique = [
    courir({ temps: [60_000, 120_000] }),
    courir({ debut: T0 + JOUR, temps: [200_000, 260_000] }),
  ];
  const [premier] = parExercice(historique).filter((e) => e.nom === 'Exercice 1');

  assert.equal(premier.fois, 2);
  assert.equal(premier.valides, 2);
  assert.equal(premier.tempsMoyen, 130_000);
  assert.equal(premier.depassements, 1, 'seul le passage à 200 s dépasse les 3 min');
});

test('les exercices évités sont ceux qu’on passe le plus souvent', () => {
  const historique = [
    courir({ sauts: [1] }),
    courir({ debut: T0 + JOUR, sauts: [1] }),
  ];
  const evites = exercicesEvites(historique);

  assert.equal(evites[0].nom, 'Exercice 2');
  assert.equal(evites[0].passes, 2);
  assert.equal(evites[0].tauxPasse, 1);
});

test('les exercices débordants dépassent leur temps alloué', () => {
  const historique = [
    courir({ temps: [200_000, 260_000] }),
    courir({ debut: T0 + JOUR, temps: [200_000, 260_000] }),
  ];
  const debordants = exercicesDebordants(historique);

  assert.equal(debordants.length, 1);
  assert.equal(debordants[0].nom, 'Exercice 1');
});

test('l’équilibre musculaire signale les muscles jamais travaillés', () => {
  const historique = [courir({ muscles: [['pectoraux'], ['pectoraux']] })];
  const equilibre = equilibreMuscles(historique, [{ id: 'pectoraux' }, { id: 'jambes' }]);

  assert.equal(equilibre.total, 2);
  assert.equal(equilibre.lignes[0].id, 'pectoraux');
  assert.equal(equilibre.lignes[0].part, 1);
  assert.equal(equilibre.lignes.find((l) => l.id === 'jambes').valeur, 0);
});

// ---- Rythme et Éclats ----

test('le rythme interne découpe la séance en tranches', () => {
  // Premier exercice pile à l'heure, second très en retard.
  const historique = [courir({ durees: [180, 180], temps: [180_000, 600_000] })];
  const tranches = rythmeInterne(historique, 2);

  assert.equal(tranches.length, 2);
  assert.equal(tranches[0].ecartMoyen, 0);
  assert.equal(tranches[1].ecartMoyen, 240_000);
});

test('le bilan des Éclats sépare forfaits et bonus', () => {
  const historique = [
    courir({ recompense: { forfait: 40, paliers: [{ minutes: 2, eclats: 5 }] } }),
    courir({ debut: T0 + JOUR, temps: [200_000, 400_000], recompense: { forfait: 40, paliers: [{ minutes: 2, eclats: 5 }] } }),
  ];
  const bilan = bilanEclats(historique);

  assert.equal(bilan.forfaits, 80);
  assert.equal(bilan.bonus, 5, 'seule la séance en avance décroche un palier');
  assert.equal(bilan.paliersAtteints, 1);
  assert.equal(bilan.tauxPalier, 0.5);
  assert.equal(bilan.parSeance, 43);
});

test('parHeure classe les séances selon leur heure de début', () => {
  const matin = new Date(T0); matin.setHours(8, 0, 0, 0);
  const soir = new Date(T0); soir.setHours(20, 0, 0, 0);
  const tranches = parHeure([
    courir({ debut: matin.getTime() }),
    courir({ debut: soir.getTime() }),
  ]);

  assert.equal(tranches.find((t) => t.nom === 'Matin').seances, 1);
  assert.equal(tranches.find((t) => t.nom === 'Soir').seances, 1);
});
