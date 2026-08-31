# 🤖 Collecteur d'Opportunités Gaynaako

Système de collecte automatique d'opportunités depuis 10 sources web (Sénégal + International).

## 📊 Résultats Actuels

**110 opportunités collectées** depuis 10 sources :

| Source | Opportunités | Type |
|--------|--------------|------|
| ADEPME | 42 | Sénégal 🇸🇳 |
| Banque Mondiale | 20 | International 🌍 |
| BAD | 20 | International 🌍 |
| PNUD Sénégal | 9 | International 🌍 |
| DER Sénégal | 6 | Sénégal 🇸🇳 |
| ARCOP (ex-ARMP) | 4 | Sénégal 🇸🇳 |
| USAID | 2 | International 🌍 |
| Union Européenne | 1 | International 🌍 |
| GIZ Sénégal | 1 | International 🌍 |

**Sources fonctionnelles** : 9/10 (90%)

---

## 🚀 Installation

### Prérequis
- **Node.js** >= 16.x
- **Python** >= 3.8 (pour l'analyse)

### Installation des dépendances Node.js

```bash
cd collector
npm install
```

### Installation des dépendances Python (pour le notebook)

```bash
pip install pandas matplotlib seaborn plotly jupyter
```

---

## 📥 Collecte des Données

### Collecter toutes les sources

```bash
npm run collect
```

Cela va :
- Scraper les 10 sources web
- Sauvegarder dans `data/raw/opportunities_TIMESTAMP.csv`
- Afficher les statistiques en temps réel

### Tester une source spécifique

```bash
node test-source.js "ADEPME"
node test-source.js "Banque Mondiale"
node test-source.js "DER"
```

Cela va :
- Télécharger le HTML de la source
- Tester le scraping
- Sauvegarder le HTML pour inspection (`debug_*.html`)
- Afficher les résultats

---

## 📊 Analyse et Visualisation

### Lancer le notebook Jupyter

```bash
jupyter notebook analyse_collecte.ipynb
```

Le notebook permet de :
- ✅ Visualiser les statistiques de collecte
- ✅ Analyser la qualité des données
- ✅ Créer des graphiques interactifs
- ✅ Nettoyer les données (supprimer doublons, test, etc.)
- ✅ Sauvegarder les données nettoyées pour PostgreSQL

---

## 📁 Structure des Fichiers

```
collector/
├── scraper.js              # Script principal de collecte
├── test-source.js          # Script de test par source
├── analyse_collecte.ipynb  # Notebook Jupyter d'analyse
├── package.json            # Dépendances Node.js
├── requirements.txt        # Dépendances Python
├── data/
│   ├── raw/               # Données brutes collectées (CSV)
│   └── cleaned/           # Données nettoyées (générées par le notebook)
└── debug_*.html           # HTML téléchargé pour debug
```

---

## 🛠️ Technologies Utilisées

### Collecte (Node.js)
- **axios** : Requêtes HTTP
- **cheerio** : Parsing HTML (scraping simple)
- **puppeteer** : Navigateur headless (sites dynamiques avec JavaScript)

### Analyse (Python)
- **pandas** : Manipulation de données
- **matplotlib** : Graphiques statiques
- **seaborn** : Graphiques statistiques
- **plotly** : Graphiques interactifs

---

## 🔧 Configuration des Sources

Les sources sont configurées dans `scraper.js` :

```javascript
const SOURCES = [
  {
    name: 'Nom de la source',
    url: 'https://example.com',
    type: 'html',  // ou 'api' ou 'puppeteer'
    selectors: {
      container: '.item, article',
      title: 'h2, .title',
      description: 'p, .description',
      link: 'a',
      date: '.date'
    }
  }
];
```

### Types de sources

- **`api`** : API REST JSON
- **`html`** : Scraping HTML simple (sites statiques)
- **`puppeteer`** : Sites dynamiques avec JavaScript (protection anti-bot)

---

## 🐛 Débogage

### Une source retourne 0 résultats ?

1. **Tester la source individuellement** :
   ```bash
   node test-source.js "Nom de la source"
   ```

2. **Ouvrir le HTML téléchargé** dans un navigateur :
   ```
   debug_Nom_de_la_source.html
   ```

3. **Inspecter les éléments** pour trouver les bons sélecteurs CSS

4. **Mettre à jour les sélecteurs** dans `scraper.js`

### Erreur "Header overflow" ?

Utiliser `type: 'puppeteer'` au lieu de `type: 'html'`

### Erreur 403 (Forbidden) ?

Utiliser `type: 'puppeteer'` pour contourner la protection anti-bot

---

## 🎯 Prochaines Étapes

- [ ] Créer le script de nettoyage automatique
- [ ] Configurer PostgreSQL et créer le schéma
- [ ] Créer le script d'import vers PostgreSQL
- [ ] Automatiser la collecte (cron job / GitHub Actions)

---

## 📝 Notes

- La collecte prend **~2-3 minutes** (pauses entre sources pour éviter le blocage)
- Les données sont sauvegardées avec timestamp pour historique
- Puppeteer télécharge automatiquement Chromium (~300MB) au premier lancement
