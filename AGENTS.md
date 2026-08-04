# Consignes de travail : Sport

À lire avant toute modification. Ces règles viennent du classeur d'origine
(`Sessions Sport.xlsx`) et des décisions prises avec le propriétaire.

## Ce qui ne se négocie pas

1. **Les répétitions sont du texte libre.** Le classeur mélange des comptes
   (« 30 »), des durées (« 2min »), des séries (« 5x2 ») et des combinés
   (« (40+40)x2 »). Aucun format structuré ne les capturerait sans perte.
2. **Le temps alloué à un exercice est indépendant des répétitions.** Il inclut
   le repos. Une planche de 2 minutes peut occuper un créneau de 3 minutes.
3. **Le chronomètre se recalcule, il ne se décrémente pas.** Tout dérive de
   `debut`, des étapes horodatées et de l'heure courante. C'est ce qui permet à
   une veille d'écran ou à un rechargement de ne rien fausser.
4. **L'écart est figé entre deux validations.** Le faire courir en continu le
   ferait glisser vers le rouge pendant chaque exercice, même quand tout va
   bien. Le compte à rebours suffit à dire où l'on en est dans l'instant.
5. **Une séance emporte une copie de ses exercices.** Modifier une session ne
   réécrit jamais une séance déjà courue, et supprimer une session ne casse pas
   l'historique.
6. **Les étiquettes musculaires sont ouvertes** : autant de principaux et de
   secondaires que voulu, création libre. Un muscle ne peut pas être des deux
   côtés du même exercice.
7. **Le barème d'Éclats appartient à la session, pas aux réglages.** Un forfait
   pour la séance terminée, des paliers d'avance. Les réglages ne font que
   préremplir une session nouvellement créée.
8. **Une séance fige le barème de sa session à son lancement.** Relever un
   forfait ne revalorise jamais une séance déjà courue.
9. **Le palier atteint le plus haut s'applique, et lui seul.** Les paliers ne
   s'additionnent pas.
10. **Un exercice passé ne crédite aucun temps théorique**, et il est retiré du
    temps prévu de la séance. C'est la règle la plus facile à casser par
    inadvertance : compter son temps alloué transformerait chaque saut en
    avance offerte, donc en Éclats volés. Le prix d'un saut, ce sont les
    secondes réellement dépensées à le faire.
11. **Bâcler ne doit pas rapporter plus que faire.** Deux garde-fous en plus du
    précédent : le forfait est versé au prorata des exercices validés, et un
    seul exercice passé annule tout bonus. Le retard, lui, ne retire jamais
    rien.
12. **Une récompense se collecte.** Aucun crédit automatique dans le solde.
13. **Les mouvements d'Éclats sont idempotents** : clé stable par séance, écrite
    au registre avant l'état local.
14. **Aucun score composite** dans les statistiques. Des mesures brutes,
    rattachables aux séances qui les ont produites.
15. **Aucun tiret typographique visible.** Les signes « — », « – » et « − » sont
    proscrits de l'interface et des textes. Remplacer selon le contexte :
    valeur manquante par « ? » ou un mot, séparateur par « · », « : » ou une
    virgule, intervalle par un trait d'union simple. C'est pour cela que l'écart
    s'affiche `-6:32` et non `−6:32`. Les commentaires de code, invisibles,
    restent libres ; un test garde la règle.

## Architecture

- `js/domaine/` ne touche **jamais** au DOM et ne connaît ni `window` ni
  `localStorage`. C'est ce qui rend les règles testables.
- `seance.js` est un moteur **pur** : `vueSeance(seance, maintenant)` recalcule
  tout l'affichage. Aucun compteur n'est stocké.
- `store.js` est l'unique point d'écriture des données locales.
- `eclats-sport.js` est le seul endroit qui écrit dans le registre. Ordre
  imposé : registre d'abord, état local ensuite.
- `eclats-registre.js` n'expose **pas** `eclats_spend` : Sport ne dépense pas,
  et ce qu'on ne sait pas appeler ne s'appelle pas par accident.
- `domaine/stats.js` ne calcule rien qui soit stocké : aucun compteur ne peut
  diverger des séances qui l'ont produit.
- `ui/graphiques.js` écrit du SVG à la main. Pas de bibliothèque de graphiques :
  l'application doit tourner hors ligne, sans CDN.

## Habitudes

- Français partout : noms de fonctions, variables, commentaires, interface.
- Un commentaire explique **pourquoi**, pas quoi.
- Toute correction reproductible ajoute ou met à jour un test.
- Terminer par `node --test` : la suite doit rester entièrement verte.
- Vérifier dans un navigateur avant de publier : les tests ne voient pas la
  mise en page, et l'écran de séance se juge à bout de bras.

## Publication

Dépôt public `Blinytz/sport`, GitHub Pages depuis `main`. Un push sur `main`
publie. Ne jamais pousser un travail non vérifié.

Le service worker sert la page et les modules **réseau d'abord** : sans cela,
une publication resterait invisible derrière un cache périmé. Incrémenter
`CACHE` dans `sw.js` à chaque changement de la liste des fichiers.
