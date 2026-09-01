# 📡 API Documentation - Gaynaako Opportunities

## Vue d'ensemble

API REST qui expose les opportunités enrichies avec métadonnées d'attribution pour le backend.

**Base URL:** `http://localhost:3001/api`

---

## 🚀 Démarrage

```bash
# Installer les dépendances
npm install

# Démarrer l'API
node api-server.js

# L'API sera disponible sur http://localhost:3001
```

---

## 📋 Endpoints

### 1. **GET /api/opportunities**
Liste toutes les opportunités avec filtres

**Query Parameters:**
- `sector` (string) - Filtrer par secteur
- `country` (string) - Filtrer par pays
- `source_type` (enum: 'national', 'international') - Type de source
- `min_quality` (int) - Score de qualité minimum (0-100)
- `target_audience` (string) - Public cible
- `urgency` (enum: 'Urgente', 'Haute', 'Normale', 'Flexible')
- `limit` (int, default: 50) - Nombre de résultats
- `offset` (int, default: 0) - Offset pour pagination

**Exemple:**
```bash
GET /api/opportunities?sector=technologie&min_quality=70&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4e5f6",
      "source_name": "Banque Mondiale",
      "source_type": "international",
      "title": "Projet d'électrification...",
      "description": "...",
      "url": "https://...",
      "date_normalized": "2026-09-15",
      "country": "Sénégal",
      "sectors": "technologie, energie",
      "quality_score": 85,
      "target_audience": "PME",
      "experience_required": "Confirmé",
      "budget_range": "Moyen (10-100M)",
      "urgency": "Haute",
      "complexity_level": 3,
      "suggested_profiles": "expert_tech, ingenieur_energie",
      "collected_at": "2026-08-31T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 57,
    "limit": 10,
    "offset": 0,
    "pages": 6
  }
}
```

---

### 2. **GET /api/opportunities/:id**
Détails d'une opportunité spécifique

**Exemple:**
```bash
GET /api/opportunities/a1b2c3d4e5f6
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4e5f6",
    "title": "...",
    ...
  }
}
```

---

### 3. **GET /api/opportunities/profile/:profiles**
Opportunités suggérées pour un ou plusieurs profils

**Parameters:**
- `profiles` (string) - Liste de profils séparés par virgule

**Query Parameters:**
- `limit` (int, default: 20)

**Exemple:**
```bash
GET /api/opportunities/profile/expert_tech,consultant_digital?limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 15
}
```

---

### 4. **GET /api/search**
Recherche textuelle fulltext

**Query Parameters:**
- `q` (string, required) - Termes de recherche
- `limit` (int, default: 20)

**Exemple:**
```bash
GET /api/search?q=agriculture+digital&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "...",
      "relevance": 2.5
    }
  ],
  "count": 5
}
```

---

### 5. **GET /api/statistics**
Statistiques globales

**Exemple:**
```bash
GET /api/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "global": {
      "total_opportunities": 57,
      "avg_quality_score": 61.1,
      "total_countries": 4,
      "total_sources": 8,
      "high_quality_count": 18
    },
    "by_sector": [
      { "sector": "technologie", "count": 28 },
      { "sector": "eau", "count": 6 }
    ],
    "by_country": [
      { "country": "Afrique", "count": 21 },
      { "country": "Sénégal", "count": 20 }
    ],
    "by_audience": [
      { "target_audience": "Tout public", "count": 45 },
      { "target_audience": "PME", "count": 8 }
    ],
    "by_urgency": [
      { "urgency": "Urgente", "count": 0 },
      { "urgency": "Haute", "count": 1 },
      { "urgency": "Normale", "count": 56 }
    ]
  }
}
```

---

### 6. **GET /api/sectors**
Liste des secteurs disponibles

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "agriculture",
      "description": "Agriculture, élevage, pêche",
      "keywords": "agriculture,agri,agricole,elevage,..."
    }
  ]
}
```

---

### 7. **GET /api/countries**
Liste des pays disponibles

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Sénégal",
      "code": "SEN",
      "region": "Afrique de l'Ouest",
      "keywords": "senegal,dakar,..."
    }
  ]
}
```

---

### 8. **GET /api/health**
Vérifier la santé de l'API

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-08-31T12:00:00.000Z"
}
```

---

## 📊 Métadonnées d'Attribution

Chaque opportunité contient des métadonnées pour faciliter l'attribution automatique :

### **target_audience**
Public cible de l'opportunité
- `Tout public`
- `PME`
- `Startup`
- `Grande entreprise`
- `ONG/Association`
- `Public`

### **experience_required**
Niveau d'expérience requis
- `Expert`
- `Confirmé`
- `Intermédiaire`

### **budget_range**
Fourchette budgétaire estimée
- `Petit (<10M)`
- `Moyen (10-100M)`
- `Grand (>100M)`
- `Grand (>1 Mrd)`
- `Non spécifié`

### **urgency**
Urgence basée sur la date limite
- `Urgente` (< 7 jours)
- `Haute` (7-30 jours)
- `Normale` (30-60 jours)
- `Flexible` (> 60 jours)
- `Expirée` (date dépassée)

### **complexity_level**
Niveau de complexité (1-5)
- 1: Très simple
- 2: Simple
- 3: Moyen
- 4: Complexe
- 5: Très complexe

### **suggested_profiles**
Liste de profils suggérés (séparés par virgule)

Exemples:
- `expert_tech, consultant_digital, developpeur`
- `expert_agriculture, consultant_agro`
- `ingenieur_energie, expert_renewable`

---

## 🔍 Profils Disponibles

### Par Secteur

**Agriculture:**
- `expert_agriculture`
- `consultant_agro`
- `ingenieur_agronome`

**Santé:**
- `expert_sante`
- `consultant_medical`
- `gestionnaire_sante`

**Éducation:**
- `expert_education`
- `consultant_formation`
- `pedagogie`

**Infrastructure:**
- `ingenieur_civil`
- `architecte`
- `expert_infrastructure`

**Énergie:**
- `ingenieur_energie`
- `expert_renewable`
- `consultant_energie`

**Eau:**
- `ingenieur_hydraulique`
- `expert_eau`
- `environnement`

**Technologie:**
- `expert_tech`
- `consultant_digital`
- `developpeur`
- `it_manager`

**Finance:**
- `expert_finance`
- `consultant_finance`
- `comptable`
- `auditeur`

**Environnement:**
- `expert_environnement`
- `consultant_climat`
- `eco_conseiller`

**Gouvernance:**
- `expert_gouvernance`
- `consultant_public`
- `administrateur`

**Commerce:**
- `expert_commerce`
- `consultant_export`
- `business_dev`

**Industrie:**
- `ingenieur_industriel`
- `expert_production`
- `qualite`

**Tourisme:**
- `expert_tourisme`
- `consultant_hotellerie`
- `culture`

### Profils Génériques

- `expert_afrique_ouest` (pour pays africains)
- `consultant_pme` (pour PME)
- `accompagnement_startup` (pour startups)

---

## 🛠️ Configuration

### Variables d'environnement

```bash
# Port du serveur
PORT=3001

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=gaynaako_opportunities
```

---

## 🔐 Sécurité

**Pour la production:**

1. Ajouter une authentification (JWT)
2. Limiter le taux de requêtes (rate limiting)
3. Valider tous les inputs
4. Utiliser HTTPS
5. Ajouter un système de logs

---

## 📝 Exemples d'Intégration Backend

### Express.js / Node.js

```javascript
const axios = require('axios');

// Récupérer des opportunités pour un profil
async function getOpportunitiesForProfile(profile) {
  const response = await axios.get(
    `http://localhost:3001/api/opportunities/profile/${profile}`
  );
  return response.data.data;
}

// Recherche
async function searchOpportunities(query) {
  const response = await axios.get(
    `http://localhost:3001/api/search?q=${query}`
  );
  return response.data.data;
}
```

### Python / Flask

```python
import requests

def get_opportunities_for_profile(profile):
    response = requests.get(
        f'http://localhost:3001/api/opportunities/profile/{profile}'
    )
    return response.json()['data']

def search_opportunities(query):
    response = requests.get(
        f'http://localhost:3001/api/search',
        params={'q': query}
    )
    return response.json()['data']
```

### PHP / Laravel

```php
use Illuminate\Support\Facades\Http;

function getOpportunitiesForProfile($profile) {
    $response = Http::get(
        "http://localhost:3001/api/opportunities/profile/{$profile}"
    );
    return $response->json()['data'];
}
```

---

## 🧪 Tests

```bash
# Santé de l'API
curl http://localhost:3001/api/health

# Liste des opportunités
curl http://localhost:3001/api/opportunities?limit=5

# Recherche
curl "http://localhost:3001/api/search?q=technologie"

# Statistiques
curl http://localhost:3001/api/statistics
```

---

## ✅ Checklist d'Intégration

- [ ] API démarrée et accessible
- [ ] Base de données enrichie créée (`schema-enriched.sql`)
- [ ] Données importées dans `opportunities_processed`
- [ ] Tests des endpoints réussis
- [ ] Configuration backend avec URL de l'API
- [ ] Mapping des profils défini
- [ ] Système d'attribution automatique développé (côté backend)

---

**Version:** 1.0  
**Date:** 31 août 2026  
**Contact:** Équipe Gaynaako Collector
