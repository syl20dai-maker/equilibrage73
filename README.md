# Équilibrage 73 — Web App installable (PWA)

Cette version fonctionne dans Safari/Chrome et peut être ajoutée à l’écran d’accueil d’un iPhone.

## Fonctionnalités

- choix du type d'angle :
  - **Angle du balourd** : correction calculée automatiquement à +180°
  - **Angle à compenser (endroit exact)** : l'angle saisi est utilisé directement, sans +180°

- 73 positions
- P1 = 0°
- masse disponible : 1,2 g uniquement
- intervalles interdits : 72-73, 73-1, 1-2
- tolérance : 0,10 g
- recherche du nombre minimum de masses
- meilleur résiduel pour ce nombre de masses
- dessin circulaire
- fonctionnement hors ligne après la première ouverture
- aucun serveur nécessaire pour le calcul

## Mise en ligne

Une PWA doit être servie en HTTPS pour que l’installation et le mode hors ligne fonctionnent correctement.

Solutions simples :
- GitHub Pages
- Netlify
- Cloudflare Pages
- Vercel

Déposez simplement tous les fichiers de ce dossier à la racine du site.

## Installation sur iPhone

1. Ouvrir l’adresse HTTPS de l’application dans Safari.
2. Toucher le bouton Partager.
3. Choisir « Sur l’écran d’accueil ».
4. Valider.

L’application apparaîtra ensuite comme une app normale et s’ouvrira en plein écran.

## Test local

Les Service Workers ne fonctionnent pas avec un simple double-clic sur `index.html`.
Lancez un petit serveur local :

```bash
python3 -m http.server 8000
```

Puis ouvrez `http://localhost:8000`.

## Fichiers

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
- `icons/`

- Les masses à placer sont affichées en **ordre croissant de position**.
