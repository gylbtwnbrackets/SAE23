    const API_TOKEN = '545767e77c606f52e9dd5542df4d34c4d8b2d22ed2d199074d9156d410115458';
    const API_BASE_URL = 'https://api.meteo-concept.com/api';

    let currentCityData = null;
    let comparisonCities = [];

    document.addEventListener('DOMContentLoaded', () => {
      document.querySelector('.search-btn').addEventListener('click', searchWeather);
      document.getElementById('addToComparison').addEventListener('click', addToComparison);
      document.getElementById('clearComparison').addEventListener('click', clearComparison);
      document.getElementById('daysRange').addEventListener('input', updateDaysDisplay);
      updateDaysDisplay();
    });

    function updateDaysDisplay() {
      const val = document.getElementById('daysRange').value;
      document.getElementById('daysDisplay').textContent = `${val} DAY${val > 1 ? 'S' : ''}`;
    }

    function showMessage(msg, type = 'info') {
      const area = document.getElementById('messageArea');
      area.innerHTML = `<div class="message ${type}"><p>> ${msg}</p></div>`;
    }

    function clearMessage() {
      document.getElementById('messageArea').innerHTML = '';
    }

    async function searchWeather() {
      const cityInput = document.getElementById('cityInput');
      const cityName = cityInput.value.trim();
      if (!cityName) return showMessage('ERROR: NO CITY NAME PROVIDED', 'error');

      try {
        showMessage('EXECUTING WEATHER QUERY...', 'loading');

        // Recherche de la ville
        const cityRes = await fetch(`${API_BASE_URL}/location/cities?token=${API_TOKEN}&search=${encodeURIComponent(cityName)}`);
        const cityData = await cityRes.json();
        if (!cityData.cities || cityData.cities.length === 0) throw new Error("NO CITY DATA FOUND");

        const city = cityData.cities[0];
        currentCityData = city;

        const days = parseInt(document.getElementById('daysRange').value, 10);

        const weatherRes = await fetch(`${API_BASE_URL}/forecast/daily?token=${API_TOKEN}&insee=${city.insee}`);
        const weatherData = await weatherRes.json();
        const limitedForecast = weatherData.forecast.slice(0, days);

        clearMessage();
        displayWeather(city, limitedForecast);

      } catch (e) {
        showMessage(`ERROR: ${e.message.toUpperCase()}`, 'error');
      }
    }

    function getSelectedOptions() {
      const options = [
        { value: 'latitude', label: 'LAT' },
        { value: 'longitude', label: 'LON' },
        { value: 'rr1', label: 'RAIN' },
        { value: 'wind10m', label: 'WIND' },
        { value: 'dirwind10m', label: 'WIND_DIR' },
      ];

      return options.filter(opt => {
        const id = opt.value === 'rr1' ? 'rain' : opt.value === 'wind10m' ? 'wind' : opt.value === 'dirwind10m' ? 'windDirection' : opt.value;
        return document.getElementById(id).checked;
      });
    }

    function formatValue(value, type) {
      switch (type) {
        case 'latitude':
        case 'longitude': return `${parseFloat(value).toFixed(4)}°`;
        case 'rr1': return `${value}mm`;
        case 'wind10m': return `${value}km/h`;
        case 'dirwind10m': return `${value}°`;
        default: return value;
      }
    }

    function displayWeather(city, forecast, isComparison) {
      const container = document.getElementById('weatherResults');
      if (!isComparison) container.innerHTML = '';

      const card = document.createElement('div');
      card.className = `weather-card${isComparison ? ' comparison-card' : ''}`;
      const selectedOptions = getSelectedOptions();

      const daysHTML = forecast.map(day => {
        const date = new Date(day.datetime).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const extras = selectedOptions.map(opt => {
          const val = opt.value === 'latitude' ? city.lat
                    : opt.value === 'longitude' ? city.lon
                    : day[opt.value];

          return `
            <div class="info-item">
              <span class="info-label">${opt.label}:</span>
              <span class="info-value">${formatValue(val, opt.value)}</span>
            </div>
          `;
        }).join('');

        return `
          <div class="forecast-day">
            <div class="day-header">
              <div class="day-date">${date.toUpperCase()}</div>
              <img src="${getWeatherIcon(day.weather)}" alt="${getWeatherDescription(day.weather)}" class="weather-icon" />
            </div>
            <div class="weather-info">
              <div class="info-item">
                <span class="info-label">TEMP:</span>
                <span class="info-value">${day.tmin}°C / ${day.tmax}°C</span>
              </div>
              <div class="info-item">
                <span class="info-label">STATUS:</span>
                <span class="info-value">${getWeatherDescription(day.weather).toUpperCase()}</span>
              </div>
              ${extras}
            </div>
          </div>
        `;
      }).join('');

      card.innerHTML = `
        <div class="city-header">
          <h2 class="city-name">${city.name} (${city.cp})</h2>
        </div>
        <div class="forecast-grid">${daysHTML}</div>
      `;

      container.appendChild(card);
    }

    async function addToComparison() {
      if (!currentCityData) return showMessage('ERROR: NO CURRENT DATA TO ADD', 'error');
      if (comparisonCities.find(c => c.insee === currentCityData.insee)) return showMessage('ERROR: CITY ALREADY IN COMPARISON', 'error');
      if (comparisonCities.length >= 4) return showMessage('ERROR: MAXIMUM 4 CITIES ALLOWED', 'error');

      try {
        const days = document.getElementById('daysRange').value;
        const res = await fetch(`${API_BASE_URL}/forecast/daily?token=${API_TOKEN}&insee=${currentCityData.insee}&days=${days}`);
        const forecast = await res.json();

        comparisonCities.push({ city: currentCityData, forecast: forecast.forecast });
        displayWeather(currentCityData, forecast.forecast, true);
        updateComparisonCount();
        showMessage('CITY ADDED TO COMPARISON', 'success');
        setTimeout(clearMessage, 2000);
      } catch (e) {
        showMessage('ERROR: API CONNECTION FAILED', 'error');
      }
    }

    function clearComparison() {
      comparisonCities = [];
      document.querySelectorAll('.comparison-card').forEach(el => el.remove());
      updateComparisonCount();
      showMessage('COMPARISON DATA CLEARED', 'success');
      setTimeout(clearMessage, 2000);
    }

    function updateComparisonCount() {
      const count = comparisonCities.length;
      document.getElementById('comparisonCount').innerHTML = count
        ? `<div style="background: var(--lain-green); color: var(--lain-bg); padding: 8px 16px; margin-top: 1rem; text-transform: uppercase; letter-spacing: 1px;">${count} CITY${count > 1 ? 'S' : ''} IN COMPARISON</div>`
        : '';
    }

    function getWeatherIcon(weatherCode) {
      const iconMap = {
        0: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2600.png',
        1: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f324.png',
        2: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/26c5.png',
        3: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2601.png',
        4: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f327.png',
        5: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f329.png',
        6: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f328.png',
        7: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f32b.png',
        8: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f327.png'
      };
      return iconMap[weatherCode] || iconMap[0];
    }

    function getWeatherDescription(weatherCode) {
      const descriptions = {
        0: 'Dégagé',
        1: 'Légèrement Nuageux',
        2: 'Couvert',
        3: 'Nuageux',
        4: 'Heavy Clouds',
        5: 'Covered',
        6: 'Fog',
        7: 'Freezing Fog',
        8: 'Light Rain'
      };
      return descriptions[weatherCode] || 'Unknown';
    }