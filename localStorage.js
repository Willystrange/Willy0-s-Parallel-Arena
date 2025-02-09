// Définir la version du jeu
const game_version = '2.5';

// Fonction pour obtenir les données utilisateur de localStorage
function getUserData() {
  const userData = JSON.parse(localStorage.getItem('userData'));
  return userData || {}; // Retourne un objet vide si les données ne sont pas définies
}

// Fonction pour sauvegarder les données utilisateur dans localStorage
function saveUserData(userData) {
  localStorage.setItem('userData', JSON.stringify(userData));
}

// Fonction pour vérifier et mettre à jour les semaines
function checkAndUpdateWeeks(userData) {
  const currentDate = new Date();
  const startThursday = new Date('2024-08-01T09:00:00'); // Premier jeudi 1er août 2024 à 9h

  if (currentDate >= startThursday) {
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksElapsed = Math.floor((currentDate - startThursday) / msInWeek);

    for (let i = 1; i <= weeksElapsed + 1; i++) {
      if (!userData[`semaine${i}`]) {
        userData[`semaine${i}`] = true;
      }
      saveUserData(userData);
    }
  }



  

  // Fonction pour ajuster aléatoirement les personnages

  // Vérifie si les données utilisateur existent, sinon initialise avec les valeurs par défaut
  if (!localStorage.getItem('userData')) {
    localStorage.setItem('userData', JSON.stringify({
      pass_XP: 0,
      pass_level: 0,
      nbr_perso: 2,
      victoires: 0,
      defaites: 0,
      manches_max: 0,
      XP_jour: 0,
      gagnant: '',
      fin_manche: 0,
      fin_xp: 0,
      fin_argent: 0,
      fin_trophees: 0,
      trophees: 0,
      tropheesMax: 0,
      argent: 0,
      VICTOIRE: false,
      version: '2.5',
      recompense: 0,
      perso_recompense: 0,
      xp_du_jour: 0,
      Willy: 1,
      Willy_XP: 0,
      Willy_Level: 1,
      Willy_boost: 0,
      Cocobi: 1,
      Cocobi_XP: 0,
      Cocobi_Level: 1,
      Cocobi_boost: 0,
      Oiseau: 0,
      Oiseau_XP: 0,
      Oiseau_Level: 1,
      Oiseau_boost: 0,
      Grours: 0,
      Grours_XP: 0,
      Grours_Level: 1,
      Grours_boost: 0,
      Baleine: 0,
      Baleine_XP: 0,
      Baleine_Level: 1,
      Baleine_boost: 0,
      Doudou: 0,
      Doudou_XP: 0,
      Doudou_Level: 1,
      Doudou_boost: 0,
      Coeur: 0,
      Coeur_XP: 0,
      Coeur_Level: 1,
      Coeur_boost: 0,
      Diva: 0,
      Diva_XP: 0,
      Diva_Level: 1,
      Diva_boost: 0,
      Poulpy: 0,
      Poulpy_XP: 0,
      Poulpy_Level: 1,
      Poulpy_boost: 0,
      Colorina: 0,
      Colorina_XP: 0,
      Colorina_Level: 1,
      Colorina_boost: 0,
      Rosalie: 0,
      Rosalie_XP: 0,
      Rosalie_Level: 1,
      Rosalie_boost: 0,
      Sboonie: 0,
      Sboonie_XP: 0,
      Sboonie_Level: 1,
      Sboonie_boost: 0,
      Inconnu: 0,
      Inconnu_XP: 0,
      Inconnu_Level: 1,
      Inconnu_boost: 0,
      Double_XP: 5,
      Double_XP_acheté: 0,
      Potion_de_Santé_acheté: 0,
      Amulette_de_Régénération_acheté: 0,
      epee_tranchante_acheté: 0,
      elixir_puissance_acheté: 0,
      armure_fer_acheté: 0,
      bouclier_solide_acheté: 0,
      Cape_acheté: 0,
      crystal_acheté: 0,
      lastDoubleXPCheck: 0,
      lastFraudeReset: 0,
      boutique_recompense: false,

      semaine1: false,


      semaine2: false,


      semaine3: false,


      semaine4: false,



      semaine5: false,

      semaine6: false,

      crystaux_parrallels: 0,

      quetes_jour: false,

      quete1_type: "",
      quete1_text: "",
      quete1_total: "",
      quete1_current: "",
      quete1_character: "",

      quete2_type: "",
      quete2_text: "",
      quete2_total: "",
      quete2_current: "",
      quete2_character: "",

      quete3_type: "",
      quete3_text: "",
      quete3_total: "",
      quete3_current: "",
      quete3_character: "",

      partie_commencee: false,

      parties_test: 0,
      parties_weekend_test: 0,
    }));
  }
}
