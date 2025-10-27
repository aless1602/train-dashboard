# Dashboard

Cette mini app développée en React, TypeScript et TailwindCSS a pour but principal d'afficher en temps réel les informations sur les lignes de trains liées à la gare de Nivelles, tout 
en rendant possible l'extension à d'autres tâches.  
L’application affiche en temps réel les informations ferroviaires liées à la gare de Nivelles en utilisant l’API publique [iRail](https://api.irail.be).

---
### Fonctionnalités principales

- Affichage des prochains trains à destination ou en provenance de Bruxelles et Charleroi sur les deux prochaines heures.  
- Calcul du retard moyen sur l’heure à venir.  
- Estimation du taux d’annulation des trains sur les trois dernières heures.  
- Affichage de l’heure actuelle synchronisée.  
- Interface extensible : d’autres cartes (pull requests, tickets, builds, monitoring, etc.) peuvent être ajoutées.  
- Glisser-déposer des cartes entre colonnes avec sauvegarde automatique dans le navigateur.

---


## Prérequis

### Option 1 — Exécution via Docker (recommandée)
Aucun environnement Node requis.  
Il suffit d’avoir Docker installé sur votre machine :

```bash
docker --version
```

### Option 2 — Exécution locale
Si vous préférez lancer le projet sans conteneur, il faut :
- **Node.js 22+** (de préférence via `nvm`)
- **npm** ou **pnpm**

---

## Lancement avec Docker

Depuis la racine du projet :

```bash
docker build -t train-dashboard .
docker run -d -p 8080:80 --name train-dashboard train-dashboard
```

Le dashboard est alors accessible à l’adresse :

--> [http://localhost:8080](http://localhost:8080)

Pour un déploiement persistant (redémarrage automatique après reboot) :

```bash
docker run -d --restart always -p 8080:80 --name train-dashboard train-dashboard
```

### Arrêter ou supprimer le conteneur
```bash
docker stop train-dashboard
docker rm train-dashboard
```

---

## Lancement en mode développement (local)

1. **Installer Node via nvm :**
   ```bash
   nvm install 22
   nvm use 22
   ```

2. **Installer les dépendances :**
   ```bash
   npm ci
   ```

3. **Démarrer le serveur de développement :**
   ```bash
   npm run dev
   ```

4. Ouvrir le navigateur sur :
   ```
   http://localhost:5173
   ```

---

## Structure du projet

```
train-dashboard/
│
├── src/
│   ├── components/     # Composants UI réutilisables (Switch, Card, TrainList, etc.)
│   ├── hooks/          # Hooks personnalisés (useKpis, etc.)
│   ├── lib/            # Fonctions utilitaires et accès API iRail
│   ├── sections/       # Groupes logiques de cartes (tâches, KPI, etc.)
│   ├── App.tsx         # Composant principal (layout, drag & drop)
│   └── main.tsx        # Point d’entrée React
│
├── public/             # Fichiers statiques
├── Dockerfile          # Configuration Docker multi-étapes
├── vite.config.ts      # Configuration du bundler Vite
├── tailwind.config.js  # Configuration TailwindCSS
└── README.md           # Ce fichier
```

---
