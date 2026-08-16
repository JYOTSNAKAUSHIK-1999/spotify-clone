# Soundify — Spotify Clone 🎵

A Spotify-inspired music discovery and playlist web application built with **HTML, CSS and JavaScript**. It is designed for a B.Tech minor project and uses the **Spotify Tracks Dataset by Maharshi Pandya** as its track metadata source.

## Features

- Spotify-inspired responsive UI
- Search by track, artist, album or genre
- Genre filtering
- Popularity and audio-feature sorting
- Track detail modal
- Like/favourite songs using browser localStorage
- Library and Liked Songs views
- Audio player controls
- Shuffle and repeat
- Content-based recommendations using:
  - danceability
  - energy
  - valence
  - acousticness
  - instrumentalness
  - speechiness
- Local CSV upload
- GitHub Pages compatible

## Dataset

Kaggle:
https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset/code

Download the dataset and place its CSV file at:

```text
data/spotify_tracks.csv
```

The application expects the standard Kaggle columns including:

`track_id, artists, album_name, track_name, popularity, duration_ms, explicit, danceability, energy, key, loudness, mode, speechiness, acousticness, instrumentalness, liveness, valence, tempo, time_signature, track_genre`

A small demo dataset is included in the starter project so the UI works immediately. Replace `data/spotify_tracks.csv` with the downloaded Kaggle CSV to use the full dataset.

## Audio files

The Kaggle dataset is metadata/audio-feature data; it does not provide permission to redistribute Spotify recordings. The player therefore looks for audio files locally using:

```text
audio/<track_id>.mp3
```

Only add audio files that you own or are licensed to use. If no audio file exists, the metadata, search, library and recommendation features still work.

## Run locally

Because browsers restrict `fetch()` from `file://`, run a local web server.

### VS Code

Install the Live Server extension and open `index.html` with Live Server.

### Python

```bash
python -m http.server 8000
```

Then open:

http://localhost:8000

## Deploy to GitHub Pages

1. Create a public GitHub repository named `spotify-clone`.
2. Upload the project files.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select `main` and `/root`.
6. Save.
7. GitHub will provide your live URL.

## Project modules for your minor-project presentation

1. User Interface / Frontend
2. Dataset Integration
3. Search & Filtering
4. Music Player
5. User Library / Favorites
6. Content-Based Recommendation
7. GitHub Pages Deployment

## Important

This is a **Spotify-inspired clone for educational use**, not an official Spotify product. Do not use Spotify trademarks, private APIs, or copyrighted recordings without the required permissions.
