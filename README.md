# Hamo Weather

A dependency-free weather app using the Open-Meteo API.

## Project structure

- `index.html` - page structure and app entry point
- `css/styles.css` - responsive styling and light/dark theme
- `js/app.js` - city search, API requests, rendering, and fallback data
- `manifest.webmanifest` - install metadata for supported browsers
- `service-worker.js` - offline app-shell cache
- `icons/` - local Hamo Weather app icons

## Run locally

Double-click `Open Weather App.bat` to launch the app in your default browser. You can also open `index.html` directly. An internet connection enables live forecasts; if the API is unavailable, the app displays the built-in Tokyo fallback.

The app remembers the last successfully searched location when the same browser tab is refreshed or resumed. Search accepts cities, towns, suburbs, estates, landmarks, and addresses. It checks OpenStreetMap address-level geocoding first to resolve smaller locations to precise coordinates, then falls back to Open-Meteo city geocoding. A newly opened tab requests the user's location for a local forecast; if location permission is denied or unavailable, it starts in Tokyo.

The data-source attribution is kept in a compact disclosure at the bottom of the app. OpenStreetMap attribution should not be removed when using its geocoding data.

## Install as an app

Open the live site at https://hamidooh.github.io/weather-app/ in a supported browser. On desktop, use the install icon in the address bar or the app's **Install app** button when it appears. On Android, open the browser menu and choose **Install app** or **Add to Home screen**. On iPhone/iPad, open the site in Safari, tap **Share**, then choose **Add to Home Screen**.

The app shell can open offline after it has been visited, but live weather and location searches require an internet connection.

## Publish with GitHub Pages

This project includes `.github/workflows/deploy-pages.yml`. Put the folder in a GitHub repository with a `main` branch and push it. The workflow deploys the repository root automatically; after the first successful run, the Pages URL is shown under the workflow's deployment environment.
