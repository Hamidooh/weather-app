# Skyline Weather

A dependency-free weather app using the Open-Meteo API.

## Project structure

- `index.html` - page structure and app entry point
- `css/styles.css` - responsive styling and light/dark theme
- `js/app.js` - city search, API requests, rendering, and fallback data

## Run locally

Double-click `Open Weather App.bat` to launch the app in your default browser. You can also open `index.html` directly. An internet connection enables live forecasts; if the API is unavailable, the app displays the built-in Tokyo fallback.

## Publish with GitHub Pages

This project includes `.github/workflows/deploy-pages.yml`. Put the folder in a GitHub repository with a `main` branch and push it. The workflow deploys the repository root automatically; after the first successful run, the Pages URL is shown under the workflow's deployment environment.
