// Contenu d'amorçage : les quatre séances transcrites depuis le classeur
// « Sessions Sport ». Ces données ne sont posées qu'au tout premier lancement,
// puis appartiennent à l'utilisateur — l'application ne les réécrit jamais.
//
// Les répétitions restent du TEXTE LIBRE : le classeur mélange des comptes
// (« 30 »), des durées (« 2min »), des séries (« 5x2 ») et des combinés
// (« (40+40)x2 ») qu'aucun format structuré ne capturerait sans perte.
//
// `dureeSecondes: null` signifie « durée par défaut des réglages » : le temps
// alloué à un exercice inclut le repos, il est donc indépendant des répétitions.

export const ETIQUETTES_INITIALES = [
  {
    "id": "pectoraux",
    "nom": "Pectoraux"
  },
  {
    "id": "triceps",
    "nom": "Triceps"
  },
  {
    "id": "epaules",
    "nom": "Épaules"
  },
  {
    "id": "jambes",
    "nom": "Jambes"
  },
  {
    "id": "abdos",
    "nom": "Abdos"
  },
  {
    "id": "dos",
    "nom": "Dos"
  },
  {
    "id": "biceps",
    "nom": "Biceps"
  }
];

export const SESSIONS_INITIALES = [
  {
    "nom": "Session Push",
    "exercices": [
      {
        "nom": "Pompes",
        "repetitions": "30",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "pectoraux"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Dips",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "pectoraux"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Handstand push-up",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "KB squats",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "jambes"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Planche",
        "repetitions": "2min",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Dips",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "pectoraux"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Handstand push-up",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Roulette",
        "repetitions": "30",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [
          "epaules"
        ],
        "notes": ""
      },
      {
        "nom": "Handstand push-up",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "KB squats",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "jambes"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes coudées",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "pectoraux"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Levés de jambes",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes Hindous",
        "repetitions": "10",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Levés de jambes",
        "repetitions": "5x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes en V",
        "repetitions": "25",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Levés de jambes",
        "repetitions": "5x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes en V",
        "repetitions": "25",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Planches latérales",
        "repetitions": "(40+40)x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB latéraux",
        "repetitions": "20x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB swing",
        "repetitions": "30",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "jambes"
        ],
        "notes": ""
      },
      {
        "nom": "KB halo",
        "repetitions": "10x2-10x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "abdos"
        ],
        "notes": ""
      }
    ]
  },
  {
    "nom": "Session Pull",
    "exercices": [
      {
        "nom": "Tractions supinations lentes",
        "repetitions": "5",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "biceps"
        ],
        "musclesSecondaires": [
          "dos"
        ],
        "notes": ""
      },
      {
        "nom": "Roulette",
        "repetitions": "30",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [
          "dos"
        ],
        "notes": ""
      },
      {
        "nom": "Traction pronation",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "biceps"
        ],
        "notes": ""
      },
      {
        "nom": "Deadlift",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "jambes"
        ],
        "notes": ""
      },
      {
        "nom": "Traction supination",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "biceps"
        ],
        "notes": ""
      },
      {
        "nom": "Deadlift",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "jambes"
        ],
        "notes": ""
      },
      {
        "nom": "Traction pronation",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "biceps"
        ],
        "musclesSecondaires": [
          "dos"
        ],
        "notes": ""
      },
      {
        "nom": "KB squats",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "jambes"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Traction supinations",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "biceps"
        ],
        "musclesSecondaires": [
          "dos"
        ],
        "notes": ""
      },
      {
        "nom": "KB squats",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "jambes"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Traction supinations",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "biceps"
        ],
        "musclesSecondaires": [
          "dos"
        ],
        "notes": ""
      },
      {
        "nom": "Planche",
        "repetitions": "2min",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB row penché alterné et posé",
        "repetitions": "15x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "biceps"
        ],
        "notes": ""
      },
      {
        "nom": "Levés de jambes",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB Barbichette",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "biceps"
        ],
        "notes": "KB tenue à deux mains, soulevée jusqu'au niveau du visage"
      },
      {
        "nom": "Levés de jambes latérales",
        "repetitions": "5x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB Barbichette",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "biceps"
        ],
        "notes": "KB tenue à deux mains, soulevée jusqu'au niveau du visage"
      },
      {
        "nom": "Levés de jambes latérales",
        "repetitions": "5x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB row penché",
        "repetitions": "15x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "biceps"
        ],
        "notes": "Tu te penches en avant à environ 45°, dos plat, une main en appui sur un genou ou une surface stable. Tu tires la KB depuis le sol jusqu'à la hanche en gardant le coude proche du corps. \nL'idée c'est de penser à \"amener le coude vers le plafond\" plutôt que \"lever la KB\". 20-24 kg pour toi."
      },
      {
        "nom": "Planches latérales",
        "repetitions": "(40+40)x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB latéraux",
        "repetitions": "20x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB swing",
        "repetitions": "15x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "jambes"
        ],
        "musclesSecondaires": [
          "dos"
        ],
        "notes": ""
      },
      {
        "nom": "KB halo",
        "repetitions": "10x2-10x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "abdos"
        ],
        "notes": ""
      }
    ]
  },
  {
    "nom": "Calisthénie",
    "exercices": [
      {
        "nom": "Handstand",
        "repetitions": "10s",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes avancées",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "pectoraux"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Deadlift",
        "repetitions": "10",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "jambes"
        ],
        "notes": ""
      },
      {
        "nom": "Handstand",
        "repetitions": "10s",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes avancées",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "pectoraux"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Deadlift",
        "repetitions": "10",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "jambes"
        ],
        "notes": ""
      },
      {
        "nom": "L-raise",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": "Assis jambes tendues, on lève les talons"
      },
      {
        "nom": "Knee to handstand pushup",
        "repetitions": "1x3",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": "On part à genoux, on se soulève pour passer en handstand et faire des pompes"
      },
      {
        "nom": "L-raise",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Knee to handstand pushup",
        "repetitions": "1x3",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "L-raise",
        "repetitions": "15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": "Assis jambes tendues, on lève les talons"
      },
      {
        "nom": "Knee to handstand pushup",
        "repetitions": "1x3",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Deadlift",
        "repetitions": "10",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [
          "jambes"
        ],
        "notes": ""
      },
      {
        "nom": "Planche à la barre",
        "repetitions": "10s",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Grenouille",
        "repetitions": "10s",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Curls",
        "repetitions": "15x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "biceps"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB squats",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "jambes"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Planche à la barre",
        "repetitions": "10s",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Grenouille",
        "repetitions": "10s",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Curls",
        "repetitions": "15x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "biceps"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "KB squats",
        "repetitions": "20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "jambes"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Planche à la barre",
        "repetitions": "10s",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Grenouille",
        "repetitions": "10s",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Curls",
        "repetitions": "15x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "biceps"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Montagne avant bras",
        "repetitions": "1",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "biceps"
        ],
        "musclesSecondaires": [],
        "notes": ""
      }
    ]
  },
  {
    "nom": "Session Alt",
    "exercices": [
      {
        "nom": "Pompes",
        "repetitions": "40",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "pectoraux"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Corps creux",
        "repetitions": "1min",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes diamand",
        "repetitions": "20-20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "triceps"
        ],
        "musclesSecondaires": [
          "pectoraux"
        ],
        "notes": ""
      },
      {
        "nom": "Superman",
        "repetitions": "1min",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "dos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes archer",
        "repetitions": "10x2-10x2",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "triceps"
        ],
        "musclesSecondaires": [
          "pectoraux"
        ],
        "notes": ""
      },
      {
        "nom": "Handstand push-up",
        "repetitions": "15-15-15",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Jambes papillon",
        "repetitions": "60",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes mains basses",
        "repetitions": "20-20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "triceps"
        ],
        "musclesSecondaires": [
          "dos"
        ],
        "notes": ""
      },
      {
        "nom": "Squats sautés",
        "repetitions": "30",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "jambes"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes Hindous",
        "repetitions": "12",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Squats bulgares",
        "repetitions": "20-20",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "biceps"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Pompes en V",
        "repetitions": "30",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "epaules"
        ],
        "musclesSecondaires": [
          "triceps"
        ],
        "notes": ""
      },
      {
        "nom": "Planche",
        "repetitions": "2min",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      },
      {
        "nom": "Planches latérales",
        "repetitions": "40+40",
        "dureeSecondes": null,
        "musclesPrincipaux": [
          "abdos"
        ],
        "musclesSecondaires": [],
        "notes": ""
      }
    ]
  }
];
