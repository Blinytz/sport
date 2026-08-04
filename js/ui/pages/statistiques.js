// Statistiques. Quatre onglets, parce qu'une page unique de trente mesures ne
// se lit pas sur un téléphone : régularité, progression, contenu, rythme et
// Éclats.
//
// Aucun score composite : chaque chiffre est une mesure brute, rattachable aux
// séances qui l'ont produite.

import { bouton, div, el, formaterDate, span, titre } from '../dom.js';
import { ecartAffiche, vide } from '../composants.js';
import {
  barres, calendrierActivite, courbe, couronne, etincelle, histogramme,
} from '../graphiques.js';
import { formaterDuree } from '../../domaine/duree.js';
import { couleurEtiquette, nomEtiquette } from '../../domaine/etiquettes.js';
import {
  bilanEclats, calendrier, eclatsParMois, equilibreMuscles, exercicesDebordants,
  exercicesEvites, moyenneGlissante, parExercice, parHeure, parJourSemaine,
  parMois, parSemaine, parSession, records, resume, rythmeInterne, series,
  serieTemporelle, tendance,
} from '../../domaine/stats.js';

const ONGLETS = [
  { id: 'regularite', libelle: 'Régularité' },
  { id: 'progression', libelle: 'Progression' },
  { id: 'contenu', libelle: 'Exercices' },
  { id: 'rythme', libelle: 'Rythme & Éclats' },
];

export function pageStatistiques({ store, router }, params = {}) {
  const racine = div('page page-stats');
  let onglet = ONGLETS.some((o) => o.id === params.onglet) ? params.onglet : 'regularite';

  function peindre() {
    const historique = store.historique();
    const etiquettes = store.etiquettes();
    const secours = store.reglages().recompenseDefaut;
    const chiffres = resume(historique, secours);

    if (!chiffres.seances) {
      racine.replaceChildren(
        titre(1, 'Statistiques'),
        vide(
          'Aucune séance terminée pour l’instant. Les statistiques apparaîtront dès la première.',
          bouton('Lancer une séance', () => router.aller('#/accueil'), {
            class: 'bouton bouton-primaire',
          }),
        ),
      );
      return;
    }

    racine.replaceChildren(
      titre(1, 'Statistiques'),
      enTete(chiffres, historique),
      div('stats-onglets', ONGLETS.map((o) => el('button', {
        type: 'button',
        class: `stats-onglet ${o.id === onglet ? 'actif' : ''}`.trim(),
        texte: o.libelle,
        sur: { click: () => { onglet = o.id; peindre(); racine.scrollIntoView({ block: 'start' }); } },
      }))),
      ...contenuOnglet(onglet, { historique, etiquettes, chiffres, secours }),
    );
  }

  peindre();
  return racine;
}

// ---- En-tête commun ----

function enTete(chiffres, historique) {
  const points = serieTemporelle(historique);
  return div('grille-mesures', [
    mesure('Séances', String(chiffres.seances), null,
      etincelle(points.map((p) => p.temps))),
    mesure('Temps total', formaterDuree(chiffres.tempsTotal)),
    mesure('Écart moyen', ecartAffiche(chiffres.ecartMoyen)),
    mesure('Éclats collectés', `${chiffres.eclatsCollectes} ✦`, 'mesure-or'),
  ]);
}

function contenuOnglet(onglet, contexte) {
  if (onglet === 'regularite') return ongletRegularite(contexte);
  if (onglet === 'progression') return ongletProgression(contexte);
  if (onglet === 'contenu') return ongletContenu(contexte);
  return ongletRythme(contexte);
}

// ---- Onglet 1 : régularité ----

function ongletRegularite({ historique, chiffres }) {
  const serie = series(historique);
  const cases = calendrier(historique, { semaines: 26 });
  const semaines = parSemaine(historique, 12);
  const mois = parMois(historique);
  const jours = parJourSemaine(historique);

  return [
    div('grille-mesures', [
      mesure('Série en cours', serie.enCours ? `${serie.enCours} j` : 'aucune',
        serie.enCours ? 'mesure-accent' : null),
      mesure('Record de série', `${serie.record} j`),
      mesure('Dernière séance', serie.joursDepuis === 0 ? "Aujourd'hui"
        : serie.joursDepuis === 1 ? 'Hier' : `Il y a ${serie.joursDepuis} j`),
      mesure('Séances abandonnées', String(chiffres.abandons), null, null,
        chiffres.abandons ? `${Math.round((1 - chiffres.tauxAchevement) * 100)} % des lancements` : null),
    ]),

    bloc('Six derniers mois', [
      calendrierActivite(cases),
      div('legende-graphique', [
        span('', formaterDate(cases[0]?.date).split(',')[0] || ''),
        span('', `${cases.filter((c) => c.seances).length} jours actifs sur ${cases.length}`),
      ]),
    ], 'Une case par jour, d’autant plus vive que la séance a été longue.'),

    semaines.length > 1 ? bloc('Séances par semaine', [
      histogramme(semaines.map((s) => ({
        valeur: s.seances,
        titre: `Semaine du ${new Date(s.debut).toLocaleDateString('fr-FR')} : ${s.seances} séance(s)`,
      }))),
      div('legende-graphique', [
        span('', `Il y a ${semaines.length} semaines`),
        span('', 'Cette semaine'),
      ]),
    ]) : null,

    bloc('Jour de la semaine', [
      barres(jours.map((j) => ({
        libelle: j.nom,
        valeur: j.seances,
        texte: j.seances ? String(j.seances) : '0',
      }))),
    ], 'Les jours où vous vous entraînez réellement.'),

    mois.length > 1 ? bloc('Par mois', [
      tableau(
        ['Mois', 'Séances', 'Temps'],
        mois.slice().reverse().map((m) => [
          moisLisible(m.cle), String(m.seances), formaterDuree(m.temps),
        ]),
      ),
    ]) : null,
  ].filter(Boolean);
}

// ---- Onglet 2 : progression ----

function ongletProgression({ historique }) {
  const points = serieTemporelle(historique);
  const tend = tendance(historique);
  const rec = records(historique);
  const lisses = moyenneGlissante(points, 'ecart', 3);

  return [
    tend ? bloc('Tendance', [
      div('grille-mesures', [
        mesure('Écart, 5 dernières', ecartAffiche(tend.ecartRecent)),
        mesure('Écart, 5 précédentes', ecartAffiche(tend.ecartAvant)),
        mesure('Évolution', ecartAffiche(tend.deltaEcart), null, null,
          tend.deltaEcart < 0 ? 'Vous accélérez' : tend.deltaEcart > 0 ? 'Vous ralentissez' : 'Stable'),
      ]),
    ], 'Deux moyennes comparées plutôt que deux séances : une séance ratée ne doit pas inverser une tendance.') : null,

    bloc('Avance et retard, séance après séance', [
      courbe(points.map((p) => p.ecart), { zero: true, classe: 'courbe-avance' }),
      div('legende-graphique', [
        span('', `${points.length} séances`),
        span('', 'Sous la ligne = en avance'),
      ]),
    ]),

    points.length > 3 ? bloc('Écart lissé sur 3 séances', [
      courbe(lisses.map((p) => p.valeur), { zero: true }),
    ], 'La même courbe, débarrassée des à-coups.') : null,

    bloc('Durée des séances', [
      courbe(points.map((p) => p.temps)),
      div('legende-graphique', [
        span('', formaterDuree(Math.min(...points.map((p) => p.temps)))),
        span('', formaterDuree(Math.max(...points.map((p) => p.temps)))),
      ]),
    ]),

    rec ? bloc('Records', [
      div('', [
        record('🏃', 'Plus grande avance', ecartAffiche(rec.plusGrandeAvance.ecart),
          `${rec.plusGrandeAvance.nom} · ${formaterDate(rec.plusGrandeAvance.date)}`),
        record('⏱️', 'Séance la plus longue', formaterDuree(rec.plusLongue.temps),
          `${rec.plusLongue.nom} · ${formaterDate(rec.plusLongue.date)}`),
        record('⚡', 'Séance la plus courte', formaterDuree(rec.plusCourte.temps),
          `${rec.plusCourte.nom} · ${formaterDate(rec.plusCourte.date)}`),
        record('💪', 'Le plus d’exercices', `${rec.plusDExercices.valides} validés`,
          `${rec.plusDExercices.nom} · ${formaterDate(rec.plusDExercices.date)}`),
      ]),
    ]) : null,

    bloc('Par session', [
      tableau(
        ['Session', 'Fois', 'Temps moyen', 'Écart moyen'],
        parSession(historique).map((s) => [
          s.nom, String(s.seances), formaterDuree(s.tempsMoyen), ecartAffiche(s.ecartMoyen),
        ]),
      ),
    ]),
  ].filter(Boolean);
}

// ---- Onglet 3 : exercices et muscles ----

function ongletContenu({ historique, etiquettes }) {
  const exercices = parExercice(historique);
  const equilibre = equilibreMuscles(historique, etiquettes);
  const evites = exercicesEvites(historique);
  const debordants = exercicesDebordants(historique);
  const negliges = equilibre.lignes.filter((l) => l.valeur === 0);

  const parts = equilibre.lignes.filter((l) => l.valeur > 0).map((l) => ({
    valeur: l.valeur,
    teinte: couleurEtiquette(etiquettes, l.id),
    libelle: nomEtiquette(etiquettes, l.id),
    part: l.part,
  }));

  return [
    bloc('Équilibre musculaire', [
      div('couronne-cadre', [
        couronne(parts),
        div('couronne-legende', parts.map((p) => div('couronne-item', [
          (() => {
            const puce = div('couronne-puce');
            puce.style.background = p.teinte;
            return puce;
          })(),
          span('', p.libelle),
          span('couronne-part', `${Math.round(p.part * 100)} %`),
        ]))),
      ]),
      negliges.length
        ? el('p', {
          class: 'aide',
          texte: `Jamais travaillé : ${negliges.map((n) => nomEtiquette(etiquettes, n.id)).join(', ')}.`,
        })
        : null,
    ], 'Un muscle secondaire compte pour moitié : il est travaillé, mais ce n’est pas la cible.'),

    bloc('Exercices les plus faits', [
      barres(exercices.slice(0, 12).map((e) => ({
        libelle: e.nom,
        valeur: e.fois,
        texte: `${e.fois}×`,
        teinte: e.muscles.length ? couleurEtiquette(etiquettes, e.muscles[0]) : null,
      }))),
    ]),

    bloc('Temps moyen par exercice', [
      tableau(
        ['Exercice', 'Fois', 'Moyenne', 'Dépassé'],
        exercices.slice(0, 20).map((e) => [
          e.nom,
          String(e.valides),
          formaterDuree(e.tempsMoyen),
          e.valides ? `${Math.round(e.tauxDepassement * 100)} %` : '?',
        ]),
      ),
    ], 'Le temps réellement passé, repos compris.'),

    evites.length ? bloc('Exercices les plus évités', [
      barres(evites.slice(0, 8).map((e) => ({
        libelle: e.nom,
        valeur: e.tauxPasse,
        texte: `${e.passes}/${e.fois}`,
      }))),
    ], 'Passés plutôt que validés. À vous de voir si c’est le mouvement ou sa place dans la séance.') : null,

    debordants.length ? bloc('Exercices qui débordent', [
      barres(debordants.slice(0, 8).map((e) => ({
        libelle: e.nom,
        valeur: e.tauxDepassement,
        texte: `${Math.round(e.tauxDepassement * 100)} %`,
      }))),
    ], 'Ceux qui dépassent le plus souvent leur temps alloué : leur créneau est peut-être trop court.') : null,
  ].filter(Boolean);
}

// ---- Onglet 4 : rythme et Éclats ----

function ongletRythme({ historique, secours, chiffres }) {
  const rythme = rythmeInterne(historique);
  const heures = parHeure(historique).filter((h) => h.seances > 0);
  const eclats = bilanEclats(historique, secours);
  const mois = eclatsParMois(historique);
  const sessions = parSession(historique).filter((s) => s.eclats > 0);

  return [
    bloc('Où le temps se perd', [
      histogramme(rythme.map((r) => ({
        valeur: r.ecartMoyen,
        titre: `${r.libelle} de la séance : ${r.ecartMoyen > 0 ? 'retard' : 'avance'} moyen de ${formaterDuree(r.ecartMoyen)}`,
      })), { signe: true, classe: 'histogramme-ecart' }),
      div('legende-graphique', [span('', 'Début de séance'), span('', 'Fin de séance')]),
    ], 'Écart moyen par tranche de séance. Vers le haut, on traîne ; vers le bas, on avance.'),

    heures.length ? bloc('Moment de la journée', [
      barres(heures.map((h) => ({ libelle: h.nom, valeur: h.seances, texte: String(h.seances) }))),
    ]) : null,

    bloc('Éclats', [
      div('grille-mesures', [
        mesure('Total gagné', `${eclats.total} ✦`, 'mesure-or'),
        mesure('Dont forfaits', `${eclats.forfaits} ✦`),
        mesure('Dont bonus', `${eclats.bonus} ✦`),
        mesure('Par séance', `${eclats.parSeance} ✦`),
      ]),
      div('grille-mesures', [
        mesure('Paliers décrochés', `${eclats.paliersAtteints}/${chiffres.seances}`, null, null,
          `${Math.round(eclats.tauxPalier * 100)} % des séances`),
        mesure('Collectés', `${chiffres.eclatsCollectes} ✦`),
        mesure('En attente', `${chiffres.eclatsACollecter} ✦`,
          chiffres.eclatsACollecter ? 'mesure-or' : null),
      ]),
    ], 'Le total gagné compte aussi ce qui n’a pas encore été collecté.'),

    sessions.length ? bloc('Éclats par session', [
      barres(sessions.map((s) => ({ libelle: s.nom, valeur: s.eclats, texte: `${s.eclats} ✦` }))),
    ]) : null,

    mois.length > 1 ? bloc('Éclats par mois', [
      histogramme(mois.map((m) => ({ valeur: m.eclats, titre: `${moisLisible(m.cle)} : ${m.eclats} ✦` }))),
      div('legende-graphique', [
        span('', moisLisible(mois[0].cle)),
        span('', moisLisible(mois[mois.length - 1].cle)),
      ]),
    ]) : null,
  ].filter(Boolean);
}

// ---- Fragments ----

function bloc(titreTexte, enfants, aide) {
  return el('section', { class: 'bloc' }, [
    titre(2, titreTexte),
    aide ? el('p', { class: 'bloc-sous-titre', texte: aide }) : null,
    ...[].concat(enfants).filter(Boolean),
  ]);
}

function mesure(etiquette, valeur, classe, extra, note) {
  return div(`mesure ${classe || ''}`.trim(), [
    span('mesure-etiquette', etiquette),
    typeof valeur === 'string' ? span('mesure-valeur', valeur) : div('mesure-valeur', [valeur]),
    note ? span('mesure-note', note) : null,
    extra || null,
  ]);
}

function record(icone, titreTexte, valeur, contexte) {
  return div('record', [
    span('record-icone', icone),
    div('record-corps', [
      span('record-titre', titreTexte),
      typeof valeur === 'string' ? span('record-valeur', valeur) : div('record-valeur', [valeur]),
      span('record-contexte', contexte),
    ]),
  ]);
}

function tableau(entetes, lignes) {
  return div('tableau-defilant', [
    el('table', { class: 'tableau' }, [
      el('thead', {}, [el('tr', {}, entetes.map((t) => el('th', { texte: t })))]),
      el('tbody', {}, lignes.map((ligne) => el('tr', {}, ligne.map(
        (cellule) => (typeof cellule === 'string'
          ? el('td', { texte: cellule })
          : el('td', {}, [cellule])),
      )))),
    ]),
  ]);
}

function moisLisible(cle) {
  const [annee, mois] = cle.split('-');
  return new Date(Number(annee), Number(mois) - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
