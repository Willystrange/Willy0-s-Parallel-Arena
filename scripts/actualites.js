window.App = window.App || {};

// --- Navigation et démarrage de la partie ---
App.startGameIfStarted = () => {
  const userData = getUserData();
  if (userData.partie_commencee) loadPage('combat');
  else if (userData.partie_commencee_weekend) loadPage('combat-weekend');
};
App.startGameIfStarted();

// Constantes globales pour les sujets
App.subjectDefinitions = {
  TE: "Test",
  SO: "Correction",
  PR: "Problème",
  BO: "Bogue",
  AN: "Annonce",
  NM: "Nouvelle Màj",
  NS: "Nouvelle Saison",
  ER: "Erreur",
  EV: "Événement"
};

App.subjectColors = {
  TE: "#FFD700",
  SO: "#32CD32",
  PR: "#FF6347",
  BO: "#FF4500",
  AN: "#1E90FF",
  NM: "#8A2BE2",
  NS: "#FF1493",
  ER: "#DC143C",
  EV: "#FF8C00",
};

/************ Gestion des actualités ************/
// Crée un élément d’actualité
App.createNewsItem = function ({id, title, content, date, time}) {
  const newsItem = document.createElement("div");
  newsItem.className = "news-item";
  newsItem.style.position = "relative";

  const subjectKey = id.substring(2, 4);
  const subject = App.subjectDefinitions[subjectKey] || "Inconnu";
  const subjectColor = App.subjectColors[subjectKey] || "#000";

  const subjectBox = document.createElement("div");
  subjectBox.textContent = subject;
  subjectBox.style.position = "absolute";
  subjectBox.style.top = "5px";
  subjectBox.style.right = "5px";
  subjectBox.style.padding = "5px 10px";
  subjectBox.style.backgroundColor = subjectColor;
  subjectBox.style.color = "#fff";
  subjectBox.style.borderRadius = "5px";
  subjectBox.style.fontSize = "0.8em";
  subjectBox.style.fontWeight = "bold";

  const titleElement = document.createElement("div");
  titleElement.className = "news-title";
  titleElement.textContent = title;

  const dateElement = document.createElement("div");
  dateElement.textContent = `Publié le ${date} à ${time}`;
  dateElement.style.fontSize = "0.9em";
  dateElement.style.color = "#666";

  const contentElement = document.createElement("div");
  contentElement.textContent = content;

  newsItem.appendChild(subjectBox);
  newsItem.appendChild(titleElement);
  newsItem.appendChild(dateElement);
  newsItem.appendChild(contentElement);

  return newsItem;
};

// Récupère et affiche les actualités récentes
App.fetchNews = async function () {
  try {
    const response = await fetch('/api/news');
    const newsData = await response.json();
    const newsContainer = document.getElementById("news");
    newsContainer.innerHTML = "";

    if (!newsData || Object.keys(newsData).length === 0) {
        newsContainer.innerHTML = "<p>Aucune actualité pour le moment.</p>";
        return;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);

    const newsArray = Object.entries(newsData).map(([id, details]) => ({
      id,
      ...details,
    }));

    // Trier par date décroissante
    newsArray.sort((a, b) => {
      const toDate = x =>
        new Date(x.date.split("/").reverse().join("-") + "T" + x.time);
      return toDate(b) - toDate(a);
    });

    // Afficher la semaine écoulée
    newsArray.forEach(news => {
      const dt = new Date(news.date.split("/").reverse().join("-") + "T" + news.time);
      if (dt > oneWeekAgo && dt <= now) {
        newsContainer.appendChild(App.createNewsItem(news));
      }
    });

    // Bouton pour afficher les anciennes infos
    const seeOldNewsButton = document.createElement("button");
    seeOldNewsButton.textContent = "Voir les anciennes infos";
    seeOldNewsButton.classList.add("news-toggle-btn");
    seeOldNewsButton.addEventListener("click", () =>
      App.displayOldNews(newsArray, oneWeekAgo, seeOldNewsButton)
    );
    newsContainer.appendChild(seeOldNewsButton);
  } catch (e) {
      console.error("Erreur chargement news:", e);
  }
};

// Affiche les actualités plus anciennes que la semaine écoulée
App.displayOldNews = function (newsArray, cutoffDate, seeOldNewsButton) {
  const newsContainer = document.getElementById("news");
  newsContainer.innerHTML = "";

  const oldNews = newsArray.filter(({date, time}) => {
    const dt = new Date(date.split("/").reverse().join("-") + "T" + time);
    return dt <= cutoffDate;
  });

  oldNews.forEach(news =>
    newsContainer.appendChild(App.createNewsItem(news))
  );

  const returnToCurrentNewsButton = document.createElement("button");
  returnToCurrentNewsButton.textContent = "Retour aux infos actuelles";
  returnToCurrentNewsButton.classList.add("news-toggle-btn");
  returnToCurrentNewsButton.addEventListener("click", () => {
    App.fetchNews();
    returnToCurrentNewsButton.style.display = "none";
    seeOldNewsButton.style.display = "inline-block";
  });

  newsContainer.appendChild(returnToCurrentNewsButton);
  seeOldNewsButton.style.display = "none";
};

// Démarrage de la récupération des actualités
App.fetchNews();
