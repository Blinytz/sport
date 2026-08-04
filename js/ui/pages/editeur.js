// Éditeur d'une session.
//
// L'enregistrement est immédiat : chaque frappe part dans le store. Il n'y a
// donc pas de bouton « Enregistrer », et rien à perdre en fermant l'onglet.
//
// Seules les modifications STRUCTURELLES (ajout, suppression, déplacement)
// redessinent la liste. Redessiner à chaque frappe ferait perdre le curseur au
// milieu d'un mot.

import { annoncer, bouton, confirmer, div, el, entree, span, titre } from '../dom.js';
import { pastilles, vide } from '../composants.js';
import {
  analyserDuree, bornerDuree, formaterDuree, formaterSaisieDuree,
} from '../../domaine/duree.js';
import { deplacer, dureeExercice, exerciceVide, repartitionMuscles } from '../../domaine/session.js';
import { ajouterEtiquette, basculer } from '../../domaine/etiquettes.js';
import { PALIERS_MAX, normaliserRecompense } from '../../domaine/recompense.js';
import { identifiant } from '../../store.js';

export function pageEditeur({ store, router }, { id }) {
  let session = store.session(id);
  if (!session) {
    router.aller('#/sessions');
    return null;
  }

  const racine = div('page page-editeur');
  let ouvert = null; // identifiant de l'exercice déplié

  function enregistrer(maj) {
    session = store.enregistrerSession(maj);
    return session;
  }

  /**
   * Relit un exercice dans le store. Les gestionnaires d'événements capturent
   * l'exercice tel qu'il était à l'ouverture du formulaire ; tout ce qui doit
   * refléter l'état courant passe par ici.
   */
  function frais(exerciceId) {
    return store.session(session.id)?.exercices.find((e) => e.id === exerciceId) || null;
  }

  function majExercice(exerciceId, champs) {
    enregistrer({
      ...session,
      exercices: session.exercices.map((e) => (e.id === exerciceId ? { ...e, ...champs } : e)),
    });
  }

  function ajouterExercice() {
    const nouveau = { ...exerciceVide(), id: identifiant() };
    enregistrer({ ...session, exercices: [...session.exercices, nouveau] });
    ouvert = nouveau.id;
    peindre();
    racine.querySelector(`[data-exercice="${nouveau.id}"] input`)?.focus();
  }

  function dupliquerExercice(index) {
    // Le classeur répète beaucoup les mêmes mouvements : dupliquer est le geste
    // le plus fréquent de l'éditeur.
    const copie = { ...session.exercices[index], id: identifiant() };
    const exercices = [...session.exercices];
    exercices.splice(index + 1, 0, copie);
    enregistrer({ ...session, exercices });
    peindre();
  }

  async function supprimerExercice(exercice) {
    if (store.reglages().confirmerSuppression
      && !await confirmer(`Supprimer « ${exercice.nom || 'cet exercice'} » ?`)) return;
    enregistrer({ ...session, exercices: session.exercices.filter((e) => e.id !== exercice.id) });
    peindre();
  }

  function deplacerExercice(index, decalage) {
    enregistrer({ ...session, exercices: deplacer(session.exercices, index, decalage) });
    peindre();
  }

  // ---- Formulaire d'un exercice ----

  function formulaire(exercice) {
    const etiquettes = store.etiquettes();
    const dureeDefaut = store.reglages().dureeExerciceDefaut;

    const champDuree = entree({
      value: exercice.dureeSecondes == null ? '' : formaterSaisieDuree(exercice.dureeSecondes),
      placeholder: `${formaterSaisieDuree(dureeDefaut)} (défaut)`,
      inputmode: 'text',
      sur: {
        change: (e) => {
          const texte = e.target.value.trim();
          if (!texte) {
            majExercice(exercice.id, { dureeSecondes: null });
            e.target.value = '';
            rafraichirLigne(exercice.id);
            return;
          }
          const secondes = analyserDuree(texte);
          if (secondes == null) {
            annoncer('Durée incomprise. Essayez « 3:00 », « 3min » ou « 45 ».', 'erreur');
            // On relit la durée ENREGISTRÉE, pas celle capturée à l'ouverture du
            // formulaire : sinon un refus effacerait à l'écran une durée qui,
            // elle, est toujours là.
            const enregistree = frais(exercice.id)?.dureeSecondes;
            e.target.value = enregistree == null ? '' : formaterSaisieDuree(enregistree);
            return;
          }
          const borne = bornerDuree(secondes);
          majExercice(exercice.id, { dureeSecondes: borne });
          e.target.value = formaterSaisieDuree(borne);
          rafraichirLigne(exercice.id);
        },
      },
    });

    const zoneEtiquettes = div('zone-etiquettes', []);

    function peindreEtiquettes() {
      const courant = frais(exercice.id);
      const liste = store.etiquettes();
      const groupe = (role, libelle) => div('groupe-etiquettes', [
        span('groupe-libelle', libelle),
        div('choix-etiquettes', liste.map((etiquette) => {
          const actives = role === 'principal'
            ? courant.musclesPrincipaux : courant.musclesSecondaires;
          const choisi = actives.includes(etiquette.id);
          const puce = el('button', {
            type: 'button',
            class: `pastille pastille-${role} ${choisi ? 'pastille-choisie' : 'pastille-eteinte'}`,
            texte: etiquette.nom,
            sur: {
              click: () => {
                const apres = basculer(frais(exercice.id), etiquette.id, role);
                majExercice(exercice.id, {
                  musclesPrincipaux: apres.musclesPrincipaux,
                  musclesSecondaires: apres.musclesSecondaires,
                });
                peindreEtiquettes();
                rafraichirLigne(exercice.id);
              },
            },
          });
          puce.style.setProperty('--teinte', etiquette.couleur);
          return puce;
        })),
      ]);

      zoneEtiquettes.replaceChildren(
        groupe('principal', 'Muscles principaux'),
        groupe('secondaire', 'Muscles secondaires'),
        bouton('+ Nouvelle étiquette', creerEtiquette, { class: 'bouton bouton-discret' }),
      );
    }

    function creerEtiquette() {
      const nom = window.prompt('Nom de la nouvelle étiquette musculaire ?');
      if (!nom) return;
      try {
        store.remplacerEtiquettes(ajouterEtiquette(store.etiquettes(), nom));
        peindreEtiquettes();
      } catch (erreur) {
        annoncer(erreur.message, 'erreur');
      }
    }

    peindreEtiquettes();

    return div('exercice-formulaire', [
      div('formulaire-grille', [
        libelle('Exercice', entree({
          value: exercice.nom,
          placeholder: 'Pompes',
          sur: {
            input: (e) => {
              majExercice(exercice.id, { nom: e.target.value });
              rafraichirLigne(exercice.id);
            },
          },
        })),
        libelle('Répétitions', entree({
          value: exercice.repetitions,
          placeholder: '30, 2min, 5x2, (40+40)x2…',
          sur: {
            input: (e) => {
              majExercice(exercice.id, { repetitions: e.target.value });
              rafraichirLigne(exercice.id);
            },
          },
        }), 'Texte libre : compte, durée, séries, ce que vous voulez.'),
        libelle('Temps alloué', champDuree,
          'Repos compris. Indépendant des répétitions. Vide = durée par défaut des réglages.'),
      ]),
      zoneEtiquettes,
      libelle('Notes', el('textarea', {
        class: 'entree entree-zone',
        rows: 2,
        value: exercice.notes,
        placeholder: 'Consigne d’exécution, charge, rappel de posture…',
        sur: { input: (e) => majExercice(exercice.id, { notes: e.target.value }) },
      })),
    ]);
  }

  /** Met à jour l'aperçu replié d'une ligne sans redessiner toute la liste. */
  function rafraichirLigne(exerciceId) {
    const exercice = frais(exerciceId);
    const cadre = racine.querySelector(`[data-exercice="${exerciceId}"] .exercice-apercu`);
    if (!exercice || !cadre) return;
    cadre.replaceChildren(...apercu(exercice).childNodes);
    majEnTete();
  }

  function apercu(exercice) {
    const dureeDefaut = store.reglages().dureeExerciceDefaut;
    return div('exercice-apercu', [
      div('ligne-titre', [
        span('ligne-nom', exercice.nom || 'Exercice sans nom'),
        exercice.repetitions ? span('ligne-reps', exercice.repetitions) : null,
      ]),
      pastilles(store.etiquettes(), exercice),
      span(`ligne-duree ${exercice.dureeSecondes == null ? 'ligne-duree-defaut' : ''}`,
        formaterDuree(dureeExercice(exercice, dureeDefaut) * 1000)),
    ]);
  }

  // ---- Barème d'Éclats de la session ----

  /**
   * Le forfait et les paliers sont propres à la session : c'est ici qu'on
   * décide qu'une séance dure vaut plus qu'une séance simplement longue. Une
   * séance déjà courue garde le barème figé à son lancement.
   */
  function blocBareme() {
    const zone = div('paliers', []);
    const apercu = div('apercu-gain', []);

    function recompense() {
      return normaliserRecompense(store.session(session.id)?.recompense);
    }

    function majBareme(champs) {
      enregistrer({ ...store.session(session.id), recompense: { ...recompense(), ...champs } });
      peindreApercu();
    }

    function peindreApercu() {
      const { forfait, paliers } = recompense();
      const meilleur = paliers.length ? paliers[paliers.length - 1] : null;
      apercu.replaceChildren(
        span('apercu-gain-montant', `${forfait + (meilleur?.eclats || 0)} ✦`),
        span('apercu-gain-detail', meilleur
          ? `au maximum : ${forfait} ✦ de forfait + ${meilleur.eclats} ✦ au palier ${meilleur.minutes} min`
          : `${forfait} ✦ — aucun palier d’avance défini`),
      );
    }

    function peindrePaliers() {
      const { paliers } = recompense();
      const champNombre = (valeur, surChangement) => el('input', {
        type: 'number', class: 'entree entree-nombre', value: String(valeur), min: 0, step: 1,
        sur: { change: (e) => surChangement(e.target.value) },
      });

      zone.replaceChildren(
        ...paliers.map((palier, i) => div('palier-rangee', [
          champNombre(palier.minutes, (v) => {
            const suivants = [...paliers];
            suivants[i] = { ...palier, minutes: v };
            majBareme({ paliers: suivants });
            peindrePaliers();
          }),
          span('palier-separateur', 'min d’avance →'),
          champNombre(palier.eclats, (v) => {
            const suivants = [...paliers];
            suivants[i] = { ...palier, eclats: v };
            majBareme({ paliers: suivants });
          }),
          bouton('✕', () => {
            majBareme({ paliers: paliers.filter((_, j) => j !== i) });
            peindrePaliers();
          }, { class: 'bouton-icone bouton-icone-danger', title: 'Retirer ce palier' }),
        ])),
        paliers.length < PALIERS_MAX
          ? bouton('+ Ajouter un palier', () => {
            const dernier = paliers[paliers.length - 1];
            majBareme({
              paliers: [...paliers, {
                minutes: (dernier?.minutes || 0) + 5,
                eclats: (dernier?.eclats || 0) + 8,
              }],
            });
            peindrePaliers();
          }, { class: 'bouton bouton-discret' })
          : el('p', { class: 'aide', texte: `Maximum ${PALIERS_MAX} paliers.` }),
      );
      peindreApercu();
    }

    peindrePaliers();

    return el('section', { class: 'bloc bloc-bareme' }, [
      titre(2, 'Éclats de cette session'),
      div('champ', [
        el('label', { texte: 'Forfait de la séance terminée' }),
        el('input', {
          type: 'number',
          class: 'entree entree-nombre',
          value: String(recompense().forfait),
          min: 0,
          step: 1,
          sur: { change: (e) => majBareme({ forfait: e.target.value }) },
        }),
        el('p', {
          class: 'aide',
          texte: 'Versé au prorata des exercices validés : une séance entièrement '
            + 'validée touche le forfait complet, une séance à moitié faite la moitié.',
        }),
      ]),
      div('champ', [
        el('label', { texte: 'Paliers d’avance' }),
        zone,
        el('p', {
          class: 'aide',
          texte: 'Le palier atteint le plus haut s’applique, et lui seul — ils ne '
            + 's’additionnent pas. Un seul exercice passé annule tout bonus, sans '
            + 'quoi sauter des exercices fabriquerait de l’avance payée.',
        }),
      ]),
      apercu,
    ]);
  }

  // ---- Rendu ----

  const resumeEnTete = div('editeur-resume', []);

  function majEnTete() {
    const courante = store.session(session.id);
    if (!courante) return;
    const dureeDefaut = store.reglages().dureeExerciceDefaut;
    const total = courante.exercices
      .reduce((t, e) => t + dureeExercice(e, dureeDefaut), 0) * 1000;
    const dominants = repartitionMuscles(courante.exercices).slice(0, 5);

    resumeEnTete.replaceChildren(
      span('', `${courante.exercices.length} exercice${courante.exercices.length > 1 ? 's' : ''}`),
      span('', `${formaterDuree(total)} de temps théorique`),
      ...(dominants.length ? [pastilles(store.etiquettes(), {
        musclesPrincipaux: dominants.map((m) => m.id),
        musclesSecondaires: [],
      })] : []),
    );
  }

  function peindre() {
    const courante = store.session(session.id);
    if (!courante) { router.aller('#/sessions'); return; }
    session = courante;

    racine.replaceChildren(
      div('page-entete', [
        bouton('← Sessions', () => router.aller('#/sessions'), {
          class: 'bouton bouton-discret',
        }),
        bouton('Lancer', () => router.aller(`#/lancer/${session.id}`), {
          class: 'bouton bouton-primaire',
          disabled: session.exercices.length === 0,
        }),
      ]),

      el('input', {
        class: 'entree entree-titre',
        value: session.nom,
        placeholder: 'Nom de la session',
        sur: { input: (e) => enregistrer({ ...session, nom: e.target.value }) },
      }),
      el('input', {
        class: 'entree entree-description',
        value: session.description || '',
        placeholder: 'Description (facultative)',
        sur: { input: (e) => enregistrer({ ...session, description: e.target.value }) },
      }),
      resumeEnTete,

      session.exercices.length
        ? el('ol', { class: 'editeur-liste' }, session.exercices.map((exercice, i) => {
          const deplie = ouvert === exercice.id;
          return el('li', {
            class: `editeur-exercice ${deplie ? 'deplie' : ''}`,
            donnees: { exercice: exercice.id },
          }, [
            div('exercice-entete', [
              span('ligne-numero', String(i + 1)),
              el('button', {
                class: 'exercice-bascule',
                type: 'button',
                'aria-expanded': deplie ? 'true' : 'false',
                sur: {
                  click: () => { ouvert = deplie ? null : exercice.id; peindre(); },
                },
              }, [apercu(exercice)]),
              div('exercice-actions', [
                bouton('↑', () => deplacerExercice(i, -1), {
                  class: 'bouton-icone', title: 'Monter', disabled: i === 0,
                }),
                bouton('↓', () => deplacerExercice(i, 1), {
                  class: 'bouton-icone',
                  title: 'Descendre',
                  disabled: i === session.exercices.length - 1,
                }),
                bouton('⧉', () => dupliquerExercice(i), {
                  class: 'bouton-icone', title: 'Dupliquer',
                }),
                bouton('✕', () => supprimerExercice(exercice), {
                  class: 'bouton-icone bouton-icone-danger', title: 'Supprimer',
                }),
              ]),
            ]),
            deplie ? formulaire(exercice) : null,
          ]);
        }))
        : vide('Aucun exercice dans cette session.'),

      bouton('+ Ajouter un exercice', ajouterExercice, { class: 'bouton bouton-primaire large' }),
      blocBareme(),
    );

    majEnTete();
  }

  peindre();
  return racine;
}

function libelle(texte, entreeNoeud, aide) {
  return div('champ', [
    el('label', { texte }),
    entreeNoeud,
    aide ? el('p', { class: 'aide', texte: aide }) : null,
  ]);
}
