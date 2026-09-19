    const fallback = {
      name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503,
      current: { temperature_2m: 23, apparent_temperature: 24, relative_humidity_2m: 62, wind_speed_10m: 11, weather_code: 2 },
      daily: {
        time: [0, 1, 2, 3, 4],
        weather_code: [2, 1, 3, 61, 2],
        temperature_2m_max: [26, 27, 24, 22, 25],
        temperature_2m_min: [19, 20, 18, 17, 19]
      }
    };

    const codeInfo = {
      0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
      45: ["Foggy", "🌫️"], 48: ["Rime fog", "🌫️"], 51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"],
      55: ["Heavy drizzle", "🌧️"], 61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
      71: ["Light snow", "🌨️"], 73: ["Snow", "❄️"], 75: ["Heavy snow", "❄️"], 80: ["Rain showers", "🌦️"],
      81: ["Rain showers", "🌧️"], 82: ["Heavy showers", "⛈️"], 95: ["Thunderstorm", "⛈️"], 96: ["Hail storm", "⛈️"], 99: ["Hail storm", "⛈️"]
    };
    const $ = (id) => document.getElementById(id);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const formatDay = (value, index) => index === 0 ? "Today" : dayNames[new Date(value).getDay()];
    const RECENT_CITY_KEY = "hamo-weather-recent-city";
    const RECENT_LOCATION_KEY = "hamo-weather-recent-location";

    function getRecentCity() {
      try {
        return sessionStorage.getItem(RECENT_CITY_KEY);
      } catch (error) {
        return null;
      }
    }

    function saveRecentCity(city) {
      try {
        sessionStorage.setItem(RECENT_CITY_KEY, city);
        sessionStorage.removeItem(RECENT_LOCATION_KEY);
      } catch (error) {
        // Storage can be unavailable in restricted browser contexts.
      }
    }

    function getRecentLocation() {
      try {
        const saved = sessionStorage.getItem(RECENT_LOCATION_KEY);
        return saved ? JSON.parse(saved) : null;
      } catch (error) {
        return null;
      }
    }

    function saveRecentLocation(latitude, longitude) {
      try {
        sessionStorage.setItem(RECENT_LOCATION_KEY, JSON.stringify({ latitude, longitude }));
      } catch (error) {
        // Storage can be unavailable in restricted browser contexts.
      }
    }

    function normalizeLocationText(value) {
      return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function chooseBestPlace(results, query) {
      const requested = normalizeLocationText(query);
      return results
        .map((place, index) => {
          const names = [
            place.name,
            place.admin1,
            place.admin2,
            place.admin3,
            place.admin4
          ].filter(Boolean).map(normalizeLocationText);
          let score = 0;

          if (names.includes(requested)) score += 100;
          if (names.some((name) => name.startsWith(requested))) score += 35;
          if (names.some((name) => name.includes(requested))) score += 20;
          if (place.feature_code?.startsWith("PPL")) score += 10;

          return { place, score, index };
        })
        .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.place;
    }

    function formatPlaceName(place) {
      return [
        place.name,
        place.admin1 && place.admin1 !== place.name ? place.admin1 : "",
        place.country
      ].filter(Boolean).join(", ");
    }

    function render(data, isFallback = false) {
      const current = data.current, info = codeInfo[current.weather_code] || ["Variable conditions", "🌤️"];
      $("locationText").textContent = data.locationLabel || `${data.name}, ${data.country || ""}`.replace(/, $/, "");
      $("temperature").innerHTML = `${Math.round(current.temperature_2m)}<sup>°C</sup>`;
      $("condition").textContent = info[0];
      $("weatherIcon").textContent = info[1];
      $("feelsLike").textContent = `${Math.round(current.apparent_temperature)}°`;
      $("humidity").textContent = `${current.relative_humidity_2m}%`;
      $("wind").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
      $("dateText").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(new Date());
      $("updated").textContent = isFallback ? "Offline sample" : "Updated just now";
      $("statusText").textContent = isFallback ? "Offline sample" : "Live forecast";
      $("statusDot").classList.toggle("offline", isFallback);
      $("forecast").innerHTML = data.daily.time.slice(0, 5).map((date, i) => {
        const dayInfo = codeInfo[data.daily.weather_code[i]] || ["Variable", "🌤️"];
        return `<article class="day"><div class="day-name">${formatDay(date, i)}</div><div class="day-icon" aria-hidden="true">${dayInfo[1]}</div><div class="day-temp">${Math.round(data.daily.temperature_2m_max[i])}°<span class="day-low">${Math.round(data.daily.temperature_2m_min[i])}°</span></div></article>`;
      }).join("");
    }

    async function loadForecast(latitude, longitude, name, country = "") {
      $("message").textContent = "";
      $("message").className = "message";
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Forecast failed");
        const forecast = await response.json();
        render({ ...forecast, name, country });
        return true;
      } catch (error) {
        render(fallback, true);
        $("message").textContent = "Couldn’t reach the weather service, so a sample forecast is shown.";
        $("message").className = "message error";
        return false;
      }
    }

    async function loadWeather(city) {
      try {
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`);
        if (!geoResponse.ok) throw new Error("Geocoding failed");
        const geo = await geoResponse.json();
        if (!geo.results?.length) throw new Error("City not found");
        const place = chooseBestPlace(geo.results, city);
        const loaded = await loadForecast(
          place.latitude,
          place.longitude,
          place.name,
          place.country
        );
        if (loaded) {
          $("locationText").textContent = formatPlaceName(place);
        }
        if (loaded) saveRecentCity(city);
      } catch (error) {
        render(fallback, true);
        $("message").textContent = city.toLowerCase() === "tokyo" ? "Live data is unavailable, showing the Tokyo sample." : "Couldn’t find that city, so the previous location was kept.";
        $("message").className = "message error";
      }
    }

    function loadCurrentLocation() {
      if (!navigator.geolocation) {
        loadWeather("Tokyo");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          saveRecentLocation(coords.latitude, coords.longitude);
          const loaded = await loadForecast(coords.latitude, coords.longitude, "Your location");
          if (!loaded) loadWeather("Tokyo");
        },
        () => loadWeather("Tokyo"),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    }

    $("searchForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const city = $("cityInput").value.trim();
      if (city) loadWeather(city);
    });
    render(fallback);
    const initialCity = getRecentCity();
    if (initialCity) {
      loadWeather(initialCity);
    } else {
      const recentLocation = getRecentLocation();
      if (recentLocation) {
        loadForecast(recentLocation.latitude, recentLocation.longitude, "Your location");
      } else {
        loadCurrentLocation();
      }
    }
