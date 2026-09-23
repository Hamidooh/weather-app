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
    const APP_INSTALLED_KEY = "hamo-weather-app-installed";
    let deferredInstallPrompt = null;
    let installPromptInProgress = false;

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

    function isRunningStandalone() {
      return window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
    }

    function hasBeenInstalled() {
      if (isRunningStandalone()) return true;
      try {
        return localStorage.getItem(APP_INSTALLED_KEY) === "true";
      } catch (error) {
        return false;
      }
    }

    function rememberInstallation() {
      try {
        localStorage.setItem(APP_INSTALLED_KEY, "true");
      } catch (error) {
        // Storage can be unavailable in restricted browser contexts.
      }
    }

    function hideInstallButton() {
      $("installButton").hidden = true;
      $("installButton").disabled = false;
    }

    function showInstallGuidance() {
      $("message").textContent = "Use your browser menu and choose Install app or Add to Home screen.";
      $("message").className = "message";
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      if (hasBeenInstalled()) {
        deferredInstallPrompt = null;
        hideInstallButton();
        return;
      }
      deferredInstallPrompt = event;
      if (!hasBeenInstalled()) {
        $("installButton").hidden = false;
      }
    });

    $("installButton").addEventListener("click", async () => {
      if (installPromptInProgress) return;
      if (!deferredInstallPrompt) {
        showInstallGuidance();
        return;
      }

      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      installPromptInProgress = true;
      $("installButton").disabled = true;

      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === "accepted") {
          rememberInstallation();
        } else if (choice?.outcome === "dismissed") {
          $("message").textContent = "Installation was cancelled. You can try again from the browser menu.";
          $("message").className = "message";
        }
      } catch (error) {
        showInstallGuidance();
      } finally {
        installPromptInProgress = false;
        hideInstallButton();
      }
    });

    window.addEventListener("appinstalled", () => {
      rememberInstallation();
      deferredInstallPrompt = null;
      installPromptInProgress = false;
      hideInstallButton();
    });

    if (hasBeenInstalled()) {
      hideInstallButton();
    }

    if ("serviceWorker" in navigator) {
      const registerServiceWorker = () => {
        navigator.serviceWorker.register("./service-worker.js").catch((error) => {
          console.warn("Offline app support could not be enabled.", error);
        });
      };
      if (document.readyState === "loading") {
        window.addEventListener("load", registerServiceWorker, { once: true });
      } else {
        registerServiceWorker();
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

    function chooseBestAddress(results, query) {
      const requested = normalizeLocationText(query);
      const queryWords = requested.split(" ").filter((word) => word.length > 2);
      return results
        .map((place, index) => {
          const address = place.address || {};
          const searchable = normalizeLocationText([
            place.display_name,
            place.name,
            address.amenity,
            address.building,
            address.road,
            address.neighbourhood,
            address.suburb,
            address.town,
            address.city,
            address.county
          ].filter(Boolean).join(" "));
          const exact = normalizeLocationText(place.display_name) === requested;
          const matchedWords = queryWords.filter((word) => searchable.includes(word)).length;
          return { place, index, score: (exact ? 1000 : 0) + matchedWords * 20 };
        })
        .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.place;
    }

    function formatAddressPlace(place) {
      const address = place.address || {};
      return [
        place.name || address.neighbourhood || address.suburb || address.town || address.city,
        address.suburb || address.town || address.city,
        address.country
      ].filter((value, index, values) => value && values.indexOf(value) === index).join(", ");
    }

    async function findLocation(query) {
      const addressResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&q=${encodeURIComponent(query)}`
      );
      if (addressResponse.ok) {
        const addresses = await addressResponse.json();
        if (addresses.length) {
          const place = chooseBestAddress(addresses, query);
          return {
            latitude: Number(place.lat),
            longitude: Number(place.lon),
            name: place.name || query,
            country: place.address?.country || "",
            label: formatAddressPlace(place) || place.display_name
          };
        }
      }

      const openMeteoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
      );
      if (!openMeteoResponse.ok) throw new Error("Location search failed");
      const openMeteo = await openMeteoResponse.json();
      if (!openMeteo.results?.length) throw new Error("Location not found");
      const place = chooseBestPlace(openMeteo.results, query);
      return {
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        country: place.country,
        label: formatPlaceName(place)
      };
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
        const place = await findLocation(city);
        const loaded = await loadForecast(
          place.latitude,
          place.longitude,
          place.name,
          place.country
        );
        if (loaded) {
          $("locationText").textContent = place.label;
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
