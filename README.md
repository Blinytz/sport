# Sport

Séances de sport chronométrées. On choisit une séance, on la lance, et chaque
exercice reçoit son compte à rebours. À chaque validation, l'application dit si
l'on est en avance ou en retard sur le temps théorique.

Application web installable (PWA), 100 % locale, connectée au registre commun
des Éclats de l'écosystème.

## Ce qu'elle fait

**Lancer une séance.** L'écran affiche l'exercice en cours et ses répétitions,
son numéro (`4/21`), le compte à rebours de l'exercice, le temps écoulé, le
temps théorique restant, et la liste complète des exercices : celui du moment
surligné et centré automatiquement.

**Dire où l'on en est.** L'écart est le temps réellement écoulé moins la somme
des temps théoriques des exercices déjà passés : `-6:32` en vert si l'on est en
avance, `+4:21` en rouge si l'on est en retard. Il se met à jour à chaque
validation.

**Valider, passer, mettre en pause, revenir.** Le compte à rebours continue en
négatif au lieu de s'arrêter : dépasser n'interrompt rien.

**Éditer les séances.** Créer, dupliquer, réordonner. Chaque exercice a un nom,
des répétitions en texte libre, un temps alloué, des étiquettes musculaires et
des notes. L'enregistrement est immédiat.

**Gagner des Éclats.** Chaque session décide de ce qu'elle rapporte. Le gain se
collecte explicitement ; rien n'entre dans le solde tout seul.

**Voir sa progression.** Un onglet Statistiques en quatre volets : régularité
(calendrier, séries, jours et semaines), progression (courbes d'écart et de
durée, tendance, records), exercices (équilibre musculaire, temps moyen par
mouvement, exercices évités ou qui débordent), rythme et Éclats (où le temps se
perd dans une séance, moment de la journée, forfaits contre bonus).

## Ce que rapporte une session

Deux réglages, dans l'éditeur de chaque session.

Le **forfait** est ce que vaut la séance menée au bout. Un seul nombre, qui
permet de payer une séance dure plus qu'une séance simplement longue. Il est
versé **au prorata des exercices validés** : une séance entièrement validée
touche le forfait complet, une séance à moitié faite la moitié.

Les **paliers** sont des seuils d'avance sur le temps théorique, par exemple
2 min → 5 ✦, 5 min → 12 ✦, 10 min → 25 ✦. Le palier atteint le plus haut
s'applique, **et lui seul** : ils ne s'additionnent pas.

**Passer un exercice ne fait gagner aucun temps.** Un exercice sauté ne crédite
pas son temps théorique, et la séance prévue raccourcit d'autant. Sauter une
planche de 3 minutes en 5 secondes coûte donc 5 secondes de retard, au lieu de
rapporter presque 3 minutes d'avance. Par sécurité, un seul exercice passé
**annule aussi tout bonus**.

Le retard, lui, ne retire jamais rien.

Une séance **fige le barème de sa session à son lancement** : relever un forfait
ne revalorise pas après coup une séance déjà courue.

## Le temps alloué n'est pas les répétitions

Ce sont deux notions distinctes, et c'est volontaire.

Les **répétitions** décrivent le mouvement : `30`, `2min`, `5x2`,
`(40+40)x2`, `10x2-10x2`. Du texte libre, tel qu'il était dans le classeur
d'origine, aucun format structuré ne le capturerait sans perte.

Le **temps alloué** est le créneau que l'exercice occupe dans la séance, repos
compris. Trois minutes par défaut, réglable globalement et surchargeable
exercice par exercice. Une planche de 2 minutes peut très bien vivre dans un
créneau de 3 minutes.

## Contenu d'amorçage

Au premier lancement, l'application pose les quatre séances du classeur
`Sessions Sport.xlsx` : Session Push (21 exercices), Session Pull (23),
Calisthénie (25) et Session Alt (14), ainsi que sept étiquettes musculaires.
Ces données vous appartiennent ensuite : l'application ne les réécrit jamais.

## Données

Tout est stocké dans le navigateur (`localStorage`, clé `sport_etat_v1`).
Export et import JSON complets dans les réglages. Vider les données du site
effacerait les séances : exportez régulièrement.

Seuls les mouvements d'Éclats vivent côté serveur. Ce que l'application en
garde localement est un miroir confirmé, pour ne jamais recompter un gain.

## Développement

```bash
python -m http.server 4323
```

```bash
node --test
```

Les règles de travail sont dans [AGENTS.md](AGENTS.md).
