// Réglages : durées, barème, étiquettes, registre commun, données.

import { annoncer, bouton, confirmer, div, el, entree, span, titre } from '../dom.js';
import {
  analyserDuree, bornerDuree, formaterDuree, formaterSaisieDuree,
} from '../../domaine/duree.js';
import {
  ajouterEtiquette, nomDejaPris, retirerEtiquette, usages,
} from '../../domaine/etiquettes.js';

export function pageReglages({ store, registre, finances }) {
  const racine = div('page page-reglages');

  function peindre() {
    const reglages = store.reglages();

    racine.replaceChildren(
      titre(1, 'Réglages'),
      blocTemps(reglages),
      blocBaremeDefaut(reglages),
      blocEtiquettes(),
      blocConfort(reglages),
      blocRegistre(),
      blocDonnees(),
    );
  }

  // ---- Temps ----

  function blocTemps(reglages) {
    const champ = entree({
      value: formaterSaisieDuree(reglages.dureeExerciceDefaut),
      sur: {
        change: (e) => {
          const secondes = analyserDuree(e.target.value);
          if (secondes == null) {
            annoncer('Durée incomprise. Essayez « 3:00 », « 3min » ou « 180 ».', 'erreur');
            e.target.value = formaterSaisieDuree(store.reglages().dureeExerciceDefaut);
            return;
          }
          const borne = bornerDuree(secondes);
          store.majReglages({ dureeExerciceDefaut: borne });
          e.target.value = formaterSaisieDuree(borne);
          annoncer(`Durée par défaut : ${formaterDuree(borne * 1000)}.`, 'succes');
          peindre();
        },
      },
    });

    return el('section', { class: 'bloc' }, [
      titre(2, 'Temps'),
      div('champ', [
        el('label', { texte: 'Durée par défaut d’un exercice' }),
        champ,
        el('p', {
          class: 'aide',
          texte: 'Ce temps inclut le repos : il n’a rien à voir avec le nombre de '
            + 'répétitions. Un exercice peut fixer sa propre durée dans l’éditeur ; '
            + 'ce réglage sert à tous ceux qui n’en fixent pas.',
        }),
      ]),
    ]);
  }

  // ---- Barème par défaut ----

  /**
   * Ce barème ne récompense rien : il ne fait que PRÉREMPLIR une session
   * nouvellement créée. Le barème qui compte est celui de chaque session, réglé
   * dans son éditeur — c'est là qu'on décide qu'une séance dure vaut plus.
   */
  function blocBaremeDefaut(reglages) {
    const recompense = reglages.recompenseDefaut;
    const zone = div('paliers', []);

    function maj(champs) {
      store.majReglages({ recompenseDefaut: { ...recompense, ...champs } });
      peindre();
    }

    const champNombre = (valeur, surChangement) => el('input', {
      type: 'number', class: 'entree entree-nombre', value: String(valeur), min: 0, step: 1,
      sur: { change: (e) => surChangement(e.target.value) },
    });

    zone.replaceChildren(...recompense.paliers.map((palier, i) => div('palier-rangee', [
      champNombre(palier.minutes, (v) => {
        const suivants = [...recompense.paliers];
        suivants[i] = { ...palier, minutes: v };
        maj({ paliers: suivants });
      }),
      span('palier-separateur', 'min d’avance →'),
      champNombre(palier.eclats, (v) => {
        const suivants = [...recompense.paliers];
        suivants[i] = { ...palier, eclats: v };
        maj({ paliers: suivants });
      }),
      bouton('✕', () => maj({ paliers: recompense.paliers.filter((_, j) => j !== i) }), {
        class: 'bouton-icone bouton-icone-danger', title: 'Retirer',
      }),
    ])));

    return el('section', { class: 'bloc' }, [
      titre(2, 'Éclats par défaut'),
      el('p', {
        class: 'bloc-sous-titre',
        texte: 'Ces valeurs ne servent qu’à préremplir une nouvelle session. '
          + 'Ce que rapporte chaque session se règle dans son éditeur.',
      }),
      div('champ', [
        el('label', { texte: 'Forfait par défaut' }),
        champNombre(recompense.forfait, (v) => maj({ forfait: v })),
      ]),
      div('champ', [
        el('label', { texte: 'Paliers d’avance par défaut' }),
        zone,
        bouton('+ Ajouter un palier', () => {
          const dernier = recompense.paliers[recompense.paliers.length - 1];
          maj({
            paliers: [...recompense.paliers, {
              minutes: (dernier?.minutes || 0) + 5,
              eclats: (dernier?.eclats || 0) + 8,
            }],
          });
        }, { class: 'bouton bouton-discret' }),
      ]),
      el('p', {
        class: 'aide aide-exemple',
        texte: 'Le forfait est versé au prorata des exercices validés. Le palier '
          + 'atteint le plus haut s’applique seul, et un exercice passé annule tout '
          + 'bonus. Le retard, lui, ne retire jamais rien.',
      }),
    ]);
  }

  // ---- Étiquettes ----

  function blocEtiquettes() {
    const etiquettes = store.etiquettes();
    const sessions = store.sessions();

    async function renommer(etiquette) {
      const nom = window.prompt('Nouveau nom de l’étiquette ?', etiquette.nom);
      if (!nom || nom.trim() === etiquette.nom) return;
      if (nomDejaPris(etiquettes, nom, etiquette.id)) {
        annoncer(`L’étiquette « ${nom.trim()} » existe déjà.`, 'erreur');
        return;
      }
      store.remplacerEtiquettes(etiquettes.map(
        (e) => (e.id === etiquette.id ? { ...e, nom: nom.trim() } : e),
      ));
      peindre();
    }

    async function supprimer(etiquette) {
      const compte = usages(sessions, etiquette.id);
      const message = compte
        ? `« ${etiquette.nom} » est utilisée par ${compte} exercice(s). `
          + 'La supprimer la retirera de tous.'
        : `Supprimer l’étiquette « ${etiquette.nom} » ?`;
      if (!await confirmer(message)) return;

      const sessionsNettoyees = retirerEtiquette(sessions, etiquette.id);
      store.remplacerEtiquettes(
        etiquettes.filter((e) => e.id !== etiquette.id),
        sessionsNettoyees,
      );
      peindre();
    }

    function creer() {
      const nom = window.prompt('Nom de la nouvelle étiquette musculaire ?');
      if (!nom) return;
      try {
        store.remplacerEtiquettes(ajouterEtiquette(etiquettes, nom));
        peindre();
      } catch (erreur) {
        annoncer(erreur.message, 'erreur');
      }
    }

    return el('section', { class: 'bloc' }, [
      div('bloc-entete', [
        titre(2, 'Étiquettes musculaires'),
        bouton('+ Nouvelle', creer, { class: 'bouton bouton-discret' }),
      ]),
      div('liste-etiquettes', etiquettes.map((etiquette) => {
        const puce = span('pastille pastille-principal', etiquette.nom);
        puce.style.setProperty('--teinte', etiquette.couleur);
        return div('rang-etiquette', [
          puce,
          span('rang-etiquette-usages', `${usages(sessions, etiquette.id)} exercice(s)`),
          bouton('Renommer', () => renommer(etiquette), { class: 'bouton bouton-discret' }),
          bouton('✕', () => supprimer(etiquette), {
            class: 'bouton-icone bouton-icone-danger', title: 'Supprimer',
          }),
        ]);
      })),
    ]);
  }

  // ---- Confort ----

  function blocConfort(reglages) {
    const bascule = (cle, libelle, aide) => div('champ champ-bascule', [
      el('label', {}, [
        el('input', {
          type: 'checkbox',
          checked: !!reglages[cle],
          sur: { change: (e) => { store.majReglages({ [cle]: e.target.checked }); peindre(); } },
        }),
        span('', libelle),
      ]),
      aide ? el('p', { class: 'aide', texte: aide }) : null,
    ]);

    return el('section', { class: 'bloc' }, [
      titre(2, 'Confort'),
      div('champ', [
        el('label', { texte: 'Thème' }),
        el('select', {
          class: 'entree',
          sur: {
            change: (e) => {
              store.majReglages({ theme: e.target.value });
              appliquerTheme(e.target.value);
            },
          },
        }, [
          el('option', { value: 'sombre', texte: 'Sombre', selected: reglages.theme === 'sombre' }),
          el('option', { value: 'clair', texte: 'Clair', selected: reglages.theme === 'clair' }),
          el('option', { value: 'auto', texte: 'Selon le système', selected: reglages.theme === 'auto' }),
        ]),
      ]),
      bascule('garderEcranAllume', 'Garder l’écran allumé pendant une séance',
        'Sans cela, le téléphone s’éteint au milieu d’une planche.'),
      bascule('signalFinExercice', 'Signal sonore à la fin du temps alloué'),
      bascule('confirmerSuppression', 'Demander confirmation avant une suppression'),
    ]);
  }

  // ---- Registre commun ----

  function blocRegistre() {
    const zone = div('registre-etat', []);

    async function peindreEtat() {
      if (!registre.estConnecte()) {
        const email = entree({ type: 'email', placeholder: 'Adresse électronique' });
        const motDePasse = entree({ type: 'password', placeholder: 'Mot de passe' });
        const valider = bouton('Se connecter', async () => {
          valider.disabled = true;
          try {
            await registre.connexion(email.value.trim(), motDePasse.value);
            annoncer('Connecté au registre commun.', 'succes');
            peindreEtat();
          } catch (erreur) {
            annoncer(erreur.message, 'erreur');
            valider.disabled = false;
          }
        }, { class: 'bouton bouton-primaire' });

        zone.replaceChildren(
          el('p', {
            class: 'aide',
            texte: 'Le solde d’Éclats est commun à toutes les applications. '
              + 'Une seule connexion suffit pour toutes.',
          }),
          div('formulaire-connexion', [email, motDePasse, valider]),
        );
        return;
      }

      const solde = await finances.soldeDisponible().catch(() => null);
      zone.replaceChildren(
        div('registre-connecte', [
          span('', registre.utilisateur()?.email || 'Connecté'),
          span('solde', solde == null ? '—' : `${solde} ✦`),
        ]),
        bouton('Se déconnecter', () => {
          registre.deconnexion();
          peindreEtat();
        }, { class: 'bouton bouton-discret' }),
      );
    }

    peindreEtat();
    return el('section', { class: 'bloc' }, [titre(2, 'Registre commun'), zone]);
  }

  // ---- Données ----

  function blocDonnees() {
    function exporter() {
      const paquet = JSON.stringify(store.exporter(), null, 2);
      const lien = el('a', {
        href: URL.createObjectURL(new Blob([paquet], { type: 'application/json' })),
        download: `sport-${new Date().toISOString().slice(0, 10)}.json`,
      });
      lien.click();
      URL.revokeObjectURL(lien.href);
      annoncer('Sauvegarde téléchargée.', 'succes');
    }

    const fichier = el('input', {
      type: 'file',
      accept: 'application/json',
      class: 'invisible',
      sur: {
        change: async (e) => {
          const [choisi] = e.target.files;
          if (!choisi) return;
          try {
            store.importer(JSON.parse(await choisi.text()));
            annoncer('Sauvegarde importée.', 'succes');
            peindre();
          } catch (erreur) {
            annoncer(`Import refusé : ${erreur.message}`, 'erreur');
          }
          e.target.value = '';
        },
      },
    });

    async function reinitialiser() {
      const message = 'Tout effacer et revenir aux quatre séances d’origine ? '
        + 'Sessions, historique et réglages seront perdus. Les Éclats déjà collectés '
        + 'restent dans le registre commun.';
      if (!await confirmer(message, { valider: 'Tout effacer' })) return;
      store.reinitialiser();
      annoncer('Application réinitialisée.', 'succes');
      peindre();
    }

    return el('section', { class: 'bloc' }, [
      titre(2, 'Données'),
      el('p', {
        class: 'aide',
        texte: 'Tout est stocké dans ce navigateur. Exportez régulièrement : '
          + 'vider les données du site effacerait vos séances.',
      }),
      div('bloc-actions', [
        bouton('Exporter', exporter, { class: 'bouton' }),
        bouton('Importer', () => fichier.click(), { class: 'bouton' }),
        fichier,
        bouton('Réinitialiser', reinitialiser, { class: 'bouton bouton-danger' }),
      ]),
    ]);
  }

  peindre();
  return racine;
}

export function appliquerTheme(theme) {
  const sombre = theme === 'sombre'
    || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = sombre ? 'sombre' : 'clair';
}
