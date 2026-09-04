# 🤖 Gaynaako Collector - Module Backend IA

> **Module de collecte, enrichissement IA et recommandation d'opportunités**  
> Fait partie de l'écosystème Gaynaako

Système automatisé de collecte d'opportunités depuis 10+ sources web avec enrichissement par intelligence artificielle et recommandation sémantique.

## 🎯 Rôle de ce Module

Ce module backend autonome gère l'ensemble du pipeline de données pour Gaynaako :

1. 📥 **Collecte automatique** depuis 10+ sources web (Sénégal + International)
2. 🧹 **Nettoyage et normalisation** des données
3. 🧠 **Enrichissement IA** : NLP, extraction d'entités, génération d'embeddings
4. 🔍 **Matching sémantique** : Recommandation profils ↔ opportunités (BGE-M3)
5. 🎯 **Stratégie IA** : Priorisation, analyse des gaps, conseils personnalisés
6. 📡 **API REST** : Exposition des données pour le backend principal (port 3001)

## 🏗️ Intégration dans l'Écosystème Gaynaako

```
┌─────────────────────┐
│ Sources Web Publiques│
│ (Gaynaako, ADEPME,  │
│  Banque Mondiale...)│
└──────────┬──────────┘
           │ Scraping
           ↓
┌─────────────────────┐
│ gaynaako-collector  │  ← CE MODULE
│ - Collecte          │
│ - Enrichissement IA │
│ - Matching BGE-M3   │
│ - API REST (3001)   │
└──────────┬──────────┘
           │ API REST
           ↓
┌─────────────────────┐
│ Backend Principal   │
│ (NestJS/Laravel)    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ Frontend Gaynaako   │
│ (React/Next.js)     │
└─────────────────────┘
```

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

## 🚀 Installation & Démarrage

### Prérequis
- **Node.js** >= 16.x
- **Python** >= 3.8
- **MySQL** >= 8.0

### 1. Installation des dépendances

```bash
# Dépendances Node.js
npm install

# Dépendances Python (NLP, IA, Matching)
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copier le template de configuration
cp .env.example .env

# Éditer .env et ajuster les valeurs
# Notamment : mots de passe MySQL, ports, modèle IA
```

### 3. Initialiser les bases de données

```bash
# Base opportunités
mysql -u root -p < collector/schema-enriched.sql

# Base profils & recommandations
mysql -u root -p < matching/schema-matching.sql
```

### 4. Démarrer l'API REST

```bash
# Mode développement
npm start

# Avec PM2 (production)
pm2 start ecosystem.config.js
pm2 save

# API disponible sur http://localhost:3001
```

### 5. Tester le système

```bash
# Collecter les opportunités
node collector/auto-collect.js

# Lancer le matching IA
python matching/bge-matching-mysql.py

# Tester l'API
curl http://localhost:3001/api/opportunities?limit=5
```

---

## 📡 API REST - Endpoints pour Intégration Backend

Ce module expose une API REST complète consommable par le backend principal Gaynaako.

**Base URL** : `http://localhost:3001/api`

### Endpoints Principaux

| Endpoint | Méthode | Description | Usage Backend |
|----------|---------|-------------|---------------|
| `/health` | GET | Santé de l'API | Health check |
| `/opportunities` | GET | Liste opportunités | Listing, recherche |
| `/opportunities/:id` | GET | Détails opportunité | Page détail |
| `/opportunities/:id/similar` | GET | Opportunités similaires (IA) | Recommandations associées |
| `/opportunities/:id/nlp` | GET | Données NLP extraites | Affichage enrichi |
| `/recommendations/:userId` | GET | Top 5 recommandations IA | Dashboard utilisateur |
| `/search` | GET | Recherche textuelle | Moteur de recherche |
| `/statistics` | GET | Statistiques globales | Dashboard admin |

### Exemples d'utilisation

```javascript
// Depuis le backend principal (NestJS/Express)

// 1. Récupérer les recommandations pour un utilisateur
const recommendations = await axios.get(
  'http://localhost:3001/api/recommendations/usr-ent-001'
);

// 2. Rechercher des opportunités
const results = await axios.get(
  'http://localhost:3001/api/search?q=agriculture&limit=10'
);

// 3. Déclencher un matching à la demande
await axios.post('http://localhost:3001/api/matching/run', {
  userId: 'usr-pme-001'
});
```

**Documentation complète** : Voir `docs/API_DOCUMENTATION.md`

---

## 📥 Collecte des Opportunités

### Collecte manuelle

```bash
# Collecter toutes les sources
node collector/auto-collect.js

# Tester une source spécifique
node collector/scraper.js
```

### Collecte automatisée (Scheduler PM2)

```bash
# Le scheduler collecte automatiquement tous les jours à 13h05
pm2 start ecosystem.config.js
pm2 logs gaynaako-scheduler

# Modifier l'heure dans .env :
# SCHEDULER_CRON=5 13 * * *
```

---

## 🧠 Matching & Recommandation IA

### Matching sémantique (BGE-M3)

```bash
# Calculer les recommandations pour tous les profils
python matching/bge-matching-mysql.py

# Pour un profil spécifique
python matching/bge-matching-mysql.py usr-ent-001
```

**Résultat** : Top 5 opportunités enregistrées dans `gaynaako_profils.recommandations`

### Algorithme

- **Modèle IA** : BAAI/bge-m3 (1024 dimensions)
- **Approche hybride** : 70% IA sémantique + 30% règles métier
- **Seuil minimal** : 55% de compatibilité
- **Explications** : Génération automatique des raisons du match

**Documentation complète** : Voir `docs/RECAP_MATCHING.md`

---

## 📊 Analyse et Visualisation

### Notebook Jupyter

```bash
# Lancer Jupyter
jupyter notebook data/analyse_collecte.ipynb
```

Le notebook permet de :
- ✅ Visualiser les statistiques de collecte
- ✅ Analyser la qualité des données
- ✅ Créer des graphiques interactifs
- ✅ Explorer les données NLP extraites

---

## 📁 Structure du Projet

```
gaynaako-collector/
│
├── collector/                     # 📥 Collecte & Enrichissement
│   ├── scraper.js                # Scraping des sources web
│   ├── data-cleaner.js           # Nettoyage des données
│   ├── nlp-processor.py          # Analyse NLP (montants, dates, etc.)
│   ├── embedding-generator.py    # Génération embeddings (384D)
│   ├── import-processed-to-mysql.js # Import en base
│   ├── auto-collect.js           # Pipeline automatisé
│   └── schema-enriched.sql       # Schéma DB opportunités
│
├── matching/                      # 🧠 IA & Recommandation
│   ├── bge-matching-mysql.py     # Matching sémantique (BGE-M3)
│   ├── matching-mysql.js         # Matching algorithmique
│   ├── matching-backend-engine.js # Moteur de règles
│   ├── schema-matching.sql       # Schéma DB recommandations
│   ├── setup-profiles-db.js      # Setup DB profils
│   ├── server-ui.js              # Interface Web test
│   └── public/                   # Assets UI
│
├── docs/                          # 📚 Documentation
│   ├── API_DOCUMENTATION.md      # Doc API complète
│   ├── RECAP_MATCHING.md         # Doc Matching IA
│   ├── GUIDE_NLP_EMBEDDINGS.md   # Guide NLP
│   └── [autres guides...]
│
├── data/                          # 💾 Données
│   ├── raw/                      # Données brutes collectées
│   ├── cleaned/                  # Données nettoyées
│   ├── processed/                # Données enrichies
│   ├── benchmark_profiles.json   # Profils de test
│   └── analyse_collecte.ipynb    # Notebook Jupyter
│
├── logs/                          # 📝 Logs PM2
│
├── api-server.js                  # 📡 API REST principale
├── scheduler.js                   # ⏰ Scheduler PM2
├── pipeline-complet.js            # 🔄 Pipeline automatisé
│
├── .env.example                   # 🔐 Template configuration
├── README.md                      # 📖 Ce fichier
├── package.json                   # 📦 Dépendances Node.js
├── requirements.txt               # 🐍 Dépendances Python
└── ecosystem.config.js            # ⚙️ Configuration PM2
```

---

## 🛠️ Technologies Utilisées

### Backend & API
- **Node.js** + **Express** : API REST
- **MySQL** : Bases de données (opportunités + profils)
- **PM2** : Orchestration et monitoring

### Intelligence Artificielle
- **Python** : Traitement des données
- **BAAI/bge-m3** : Embeddings sémantiques (1024D)
- **sentence-transformers** : Framework NLP
- **Transformers (HuggingFace)** : Modèles pré-entraînés

### Collecte & Scraping
- **axios** : Requêtes HTTP
- **cheerio** : Parsing HTML (sites statiques)
- **puppeteer** : Navigation headless (sites dynamiques)

### Analyse & Visualisation
- **pandas** : Manipulation de données
- **matplotlib**, **seaborn**, **plotly** : Graphiques
- **Jupyter** : Notebooks interactifs

---

## 🔧 Configuration & Personnalisation

### Modifier le modèle d'embeddings

```bash
# Dans .env
EMBEDDING_MODEL=BAAI/bge-m3  # Recommandé (1024D, meilleur)
# ou
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2  # Léger (384D)
```

### Ajuster les paramètres de matching

```bash
# Dans .env
MIN_MATCH_SCORE=0.55        # Seuil minimal (0.0 à 1.0)
MAX_RECOMMENDATIONS=5        # Nombre de recommandations
```

### Changer l'heure de collecte automatique

```bash
# Dans .env (format cron)
SCHEDULER_CRON=5 13 * * *    # Tous les jours à 13h05
# Exemples :
# 0 6 * * *   → 6h00 tous les jours
# 0 */6 * * * → Toutes les 6 heures
```

---

## 🐛 Dépannage

### L'API ne démarre pas

```bash
# Vérifier MySQL
mysql -u root -p -e "SHOW DATABASES;"

# Vérifier les ports
netstat -ano | findstr :3001

# Vérifier les logs
pm2 logs gaynaako-api
```

### Erreur Python "Module not found"

```bash
# Réinstaller les dépendances
pip install -r requirements.txt --upgrade
```

### Matching IA lent

```bash
# Utiliser le modèle léger
# Dans .env :
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

### Aucune recommandation générée

```bash
# Vérifier les profils en base
mysql -u root -p gaynaako_profils -e "SELECT COUNT(*) FROM utilisateurs;"

# Vérifier les opportunités
mysql -u root -p gaynaako_opportunities -e "SELECT COUNT(*) FROM opportunities_processed;"

# Réduire le seuil
# Dans .env : MIN_MATCH_SCORE=0.40
```

---

## 📚 Documentation Complète

- **API REST** : `docs/API_DOCUMENTATION.md`
- **Matching IA** : `docs/RECAP_MATCHING.md`
- **NLP & Embeddings** : `docs/GUIDE_NLP_EMBEDDINGS.md`
- **Installation MySQL** : `docs/GUIDE_MYSQL.md`
- **PM2 & Scheduler** : `docs/GUIDE_PM2.md`

---

## 🎯 Roadmap & Améliorations Futures

- [ ] **Module Stratégie** : Priorisation intelligente + analyse gaps compétences
- [ ] **Candidature préremplie** : Génération automatique avec LLM (GPT-4/Mistral)
- [ ] **Équilibrage inter-profils** : Diversification des recommandations
- [ ] **Système d'abonnement** : Freemium avec quotas (5/20/50 recommandations/jour)
- [ ] **Fine-tuning BGE-M3** : Sur données réelles Gaynaako
- [ ] **Webhooks** : Notifications en temps réel vers le backend principal
- [ ] **Tests automatisés** : Unit tests + Integration tests
- [ ] **Monitoring avancé** : Grafana + Prometheus

---

## � Contribution

Ce module fait partie du projet Gaynaako - Sonatel.

**Équipe Data/IA** : Collecte, NLP, Matching  
**Équipe Backend** : Intégration API, gestion utilisateurs  
**Équipe Frontend** : Interface utilisateur

---

## 📄 License

Propriétaire - Sonatel / Gaynaako © 2026
