   // --- Configuration API ---
const API_CONFIG = {
  TOKEN: '545767e77c606f52e9dd5542df4d34c4d8b2d22ed2d199074d9156d410115458',
  BASE_URL: 'https://api.meteo-concept.com/api'
};

// --- 1. Initialisation DOM et événements ---
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("searchBtn").addEventListener("click", handleSearch);
  document.getElementById("addToComparison").addEventListener("click", addToComparison);
  document.getElementById("clearComparison").addEventListener("click", clearComparison);
  document.getElementById("daysRange").addEventListener("input", updateDaysDisplay);
});

function updateDaysDisplay(e) {
  const value = e.target.value;
  document.getElementById("daysDisplay").textContent = `${value} jour${value > 1 ? 's' : ''}`;
}

// --- 2. API Fetching ---
async function fetchCityData(city) {
  const res = await fetch(`${API_CONFIG.BASE_URL}/location/cities?token=${API_CONFIG.TOKEN}&search=${city}`);
  if (!res.ok) throw new Error("Ville non trouvée");
  const data = await res.json();
  return data.cities[0];
}

async function fetchForecast(cityCode, days) {
  const res = await fetch(`${API_CONFIG.BASE_URL}/forecast/daily?token=${API_CONFIG.TOKEN}&insee=${cityCode}&days=${days}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des prévisions");
  const data = await res.json();
  return data.forecast;
}

// --- 3. Gestion des événements ---
async function handleSearch() {
  const city = document.getElementById("cityInput").value.trim();
  const days = parseInt(document.getElementById("daysRange").value);
  const options = getCheckedOptions();
  if (!city) return showMessage("Veuillez saisir une ville", "error");

  showMessage("Chargement des données...", "loading");
  try {
    const cityData = await fetchCityData(city);
    const forecast = await fetchForecast(cityData.insee, days);
    appState.currentCityData = { cityData, forecast };
    renderForecast(cityData, forecast, options);
    showMessage("Prévisions chargées !", "success");
  } catch (err) {
    showMessage(err.message, "error");
  }
}

function getCheckedOptions() {
  return Array.from(document.querySelectorAll(".checkbox-grid input:checked"))
    .map(el => el.value);
}

function showMessage(text, type) {
  const area = document.getElementById("messageArea");
  area.innerHTML = `<div class="message ${type}">${text}</div>`;
}

function renderForecast(cityData, forecast, options) {
  const container = document.getElementById("weatherResults");
  container.innerHTML = "";

  const card = createElement("div", { className: "weather-card" }, [
    createElement("div", { className: "city-header" }, [
      createElement("h4", { className: "city-name", innerText: cityData.name })
    ]),
    createElement("div", { className: "forecast-grid" }, forecast.map(day => {
      return createElement("div", { className: "forecast-day" }, [
        createElement("div", { className: "day-header" }, [
          createElement("div", { className: "day-date", innerText: day.datetime }),
          createElement("div", { className: "weather-icon", innerText: getWeatherSymbol(day.weather) })
        ]),
        createElement("div", { className: "weather-info" }, [
          createInfoItem("Temp. max", `${day.tmax} °C`),
          createInfoItem("Temp. min", `${day.tmin} °C`),
          options.includes("rr1") && createInfoItem("Pluie", `${day.rr1} mm`),
          options.includes("wind10m") && createInfoItem("Vent moyen", `${day.wind10m} km/h`),
          options.includes("dirwind10m") && createInfoItem("Direction vent", `${day.dirwind10m}°`),
          options.includes("latitude") && createInfoItem("Latitude", cityData.latitude),
          options.includes("longitude") && createInfoItem("Longitude", cityData.longitude)
        ].filter(Boolean))
      ]);
    }))
  ]);
  container.appendChild(card);
}

function createInfoItem(label, value) {
  return createElement("div", { className: "info-item" }, [
    createElement("div", { className: "info-label", innerText: label }),
    createElement("div", { className: "info-value", innerText: value })
  ]);
}

function getWeatherSymbol(code) {
  const icons = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 4: "🌧️", 5: "⛈️", 6: "❄️" };
  return icons[code] || "❓";
}

// --- 4. Comparaison ---
function addToComparison() {
  const data = appState.currentCityData;
  if (!data || appState.comparisonCities.length >= 4) return;
  appState.comparisonCities.push(data);
  updateComparison();
}

function clearComparison() {
  appState.comparisonCities = [];
  updateComparison();
}

function updateComparison() {
  const container = document.getElementById("weatherResults");
  container.innerHTML = "";
  document.getElementById("comparisonCount").textContent = `${appState.comparisonCities.length} ville(s) comparée(s)`;
  appState.comparisonCities.forEach(({ cityData, forecast }) => {
    const options = getCheckedOptions();
    const card = renderComparisonCard(cityData, forecast, options);
    container.appendChild(card);
  });
}

function renderComparisonCard(cityData, forecast, options) {
  const card = createElement("div", { className: "weather-card comparison-card" }, [
    createElement("div", { className: "city-header" }, [
      createElement("h4", { className: "city-name", innerText: cityData.name })
    ]),
    createElement("div", { className: "forecast-grid" }, forecast.map(day => {
      return createElement("div", { className: "forecast-day" }, [
        createElement("div", { className: "day-header" }, [
          createElement("div", { className: "day-date", innerText: day.datetime }),
          createElement("div", { className: "weather-icon", innerText: getWeatherSymbol(day.weather) })
        ]),
        createElement("div", { className: "weather-info" }, [
          createInfoItem("Temp. max", `${day.tmax} °C`),
          createInfoItem("Temp. min", `${day.tmin} °C`),
          options.includes("rr1") && createInfoItem("Pluie", `${day.rr1} mm`),
          options.includes("wind10m") && createInfoItem("Vent moyen", `${day.wind10m} km/h`),
          options.includes("dirwind10m") && createInfoItem("Direction vent", `${day.dirwind10m}°`),
          options.includes("latitude") && createInfoItem("Latitude", cityData.latitude),
          options.includes("longitude") && createInfoItem("Longitude", cityData.longitude)
        ].filter(Boolean))
      ]);
    }))
  ]);
  return card;
}

// --- 5. Thème ---
function initTheme() {
  document.documentElement.setAttribute("data-theme", appState.theme);
  document.getElementById("themeIcon").textContent = appState.theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  appState.theme = appState.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", appState.theme);
  initTheme();
}

// --- Utilitaire DOM ---
function createElement(tag, attributes = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') el.className = value;
    else if (key === 'innerText') el.innerText = value;
    else if (key === 'innerHTML') el.innerHTML = value;
    else el.setAttribute(key, value);
  }
  (children || []).forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

// --- État de l'application ---
const appState = {
  currentCityData: null,
  comparisonCities: [],
  isLoading: false,
  theme: localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
};
