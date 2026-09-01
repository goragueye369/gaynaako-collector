# 📘 API GAYNAAKO - DOCUMENTATION COMPLÈTE

**Version**: 2.0  
**Base URL**: `http://localhost:3001/api`  
**Format**: JSON  
**Dernière mise à jour**: 2026-09-01

---

## 📋 TABLE DES MATIÈRES

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Endpoints](#endpoints)
   - [Opportunités](#opportunités)
   - [Recherche](#recherche)
   - [NLP & Embeddings](#nlp--embeddings)
   - [Statistiques](#statistiques)
   - [Référentiels](#référentiels)
4. [Modèles de données](#modèles-de-données)
5. [Codes d'erreur](#codes-derreur)
6. [Exemples d'utilisation](#exemples-dutilisation)

---

## 🎯 INTRODUCTION

Cette API expose les données d'opportunités collectées et enrichies automatiquement depuis Gaynaako.sn.

### Fonctionnalités principales
- ✅ Récupération des opportunités avec filtres avancés
- ✅ Recherche textuelle et sémantique
- ✅ Analyse NLP (montants, deadlines, organisations, contacts)
- ✅ Recommandations basées sur les embeddings IA
- ✅ Statistiques et analytics
- ✅ Pagination et tri

### Stack technique
- **Backend**: Node.js + Express
- **Base de données**: MySQL
- **NLP**: Python + spaCy + Transformers
- **Embeddings**: sentence-transformers (modèle multilingue)

---

## 🔐 AUTHENTIFICATION

**Pour l'instant**: Pas d'authentification requise (API publique)

**À implémenter** (recommandé pour production):
```javascript
Headers: {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
```

---

## 📡 ENDPOINTS

### OPPORTUNITÉS

#### 1. Liste des opportunités

```http
GET /api/opportunities
```

Récupère la liste des opportunités avec filtres et pagination.

**Paramètres query** :

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `limit` | integer | 50 | Nombre de résultats par page (max 100) |
| `offset` | integer | 0 | Décalage pour la pagination |
| `sector` | string | - | Filtrer par secteur |
| `country` | string | - | Filtrer par pays |
| `min_quality` | integer | - | Score qualité minimum (0-100) |
| `target_audience` | string | - | Public cible (Développeurs, Designers, etc.) |
| `urgency` | string | - | Niveau d'urgence (Urgent, Normal, Flexible) |

**Exemple de requête** :
```bash
GET /api/opportunities?sector=Technologie&min_quality=60&limit=10
```

**Réponse** :
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "title": "Développeur Full Stack recherché",
      "description": "Mission de 6 mois pour...",
      "url": "https://gaynaako.sn/opportunites/42",
      "sectors": "Technologie, IT",
      "country": "Sénégal",
      "date_published": "2026-08-25",
      "target_audience": "Développeurs",
      "experience_required": "Intermédiaire",
      "budget_range": "Moyen",
      "urgency": "Normal",
      "complexity_level": "Modéré",
      "suggested_profiles": "expert_tech,fullstack_dev",
      "quality_score": 75,
      "nlp_amounts": ["2000€", "3000€"],
      "nlp_deadlines": ["15 décembre 2026"],
      "nlp_organizations": ["Sonatel"],
      "nlp_emails": null,
      "nlp_phones": null,
      "nlp_keywords": ["Full Stack", "React", "Node.js"],
      "nlp_quality_score": 6,
      "nlp_processed_at": "2026-09-01 13:10:45",
      "collected_at": "2026-08-31 15:51:48"
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

#### 2. Détails d'une opportunité

```http
GET /api/opportunities/:id
```

Récupère les détails complets d'une opportunité.

**Paramètres** :
- `id` (integer, required) : ID de l'opportunité

**Exemple** :
```bash
GET /api/opportunities/42
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "id": 42,
    "title": "Développeur Full Stack recherché",
    // ... tous les champs de l'opportunité
  }
}
```

---

#### 3. Opportunités similaires

```http
GET /api/opportunities/:id/similar
```

Trouve les opportunités les plus similaires (utilise les embeddings IA).

**Paramètres** :
- `id` (integer, required) : ID de l'opportunité de référence
- `limit` (integer, optional) : Nombre de résultats (défaut: 5)

**Exemple** :
```bash
GET /api/opportunities/42/similar?limit=3
```

**Réponse** :
```json
{
  "success": true,
  "data": [
    {
      "id": 55,
      "title": "Mission Python full-time",
      "description": "Développement backend...",
      "sectors": "IT",
      "country": "Sénégal",
      "quality_score": 72,
      "url": "https://gaynaako.sn/opportunites/55",
      "similarity": 0.92
    },
    {
      "id": 17,
      "title": "Expert Django REST Framework",
      "similarity": 0.85
    }
  ]
}
```

**Note** : Le score `similarity` va de 0 (différent) à 1 (identique).

---

#### 4. Opportunités par profil

```http
GET /api/opportunities/profile/:profiles
```

Récupère les opportunités suggérées pour un ou plusieurs profils.

**Paramètres** :
- `profiles` (string, required) : Profils séparés par des virgules
- `limit` (integer, optional) : Nombre de résultats (défaut: 20)

**Profils disponibles** :
- `expert_tech`
- `fullstack_dev`
- `frontend_dev`
- `backend_dev`
- `data_scientist`
- `designer_ux_ui`
- `consultant_digital`
- `expert_marketing`
- `expert_finance`

**Exemple** :
```bash
GET /api/opportunities/profile/expert_tech,fullstack_dev?limit=10
```

**Réponse** :
```json
{
  "success": true,
  "data": [
    // ... opportunités correspondantes
  ],
  "count": 10
}
```

---

### RECHERCHE

#### 5. Recherche textuelle

```http
GET /api/search
```

Recherche par mots-clés dans les titres, descriptions et secteurs.

**Paramètres** :
- `q` (string, required) : Texte à rechercher
- `limit` (integer, optional) : Nombre de résultats (défaut: 20)

**Exemple** :
```bash
GET /api/search?q=python django&limit=5
```

**Réponse** :
```json
{
  "success": true,
  "data": [
    // ... opportunités correspondantes
  ],
  "count": 5,
  "query": "python django"
}
```

---

### NLP & EMBEDDINGS

#### 6. Données NLP d'une opportunité

```http
GET /api/opportunities/:id/nlp
```

Récupère les informations extraites par analyse NLP (Intelligence Artificielle).

**Paramètres** :
- `id` (integer, required) : ID de l'opportunité

**Exemple** :
```bash
GET /api/opportunities/42/nlp
```

**Réponse** :
```json
{
  "success": true,
  "has_nlp": true,
  "data": {
    "id": 42,
    "title": "Développeur Full Stack recherché",
    "nlp_amounts": ["2000€", "3000€/mois"],
    "nlp_deadlines": ["15 décembre 2026"],
    "nlp_organizations": ["Sonatel", "Orange"],
    "nlp_emails": ["recrutement@entreprise.sn"],
    "nlp_phones": ["+221 77 123 45 67"],
    "nlp_keywords": ["Full Stack", "React", "Node.js", "6 mois"],
    "nlp_quality_score": 8,
    "nlp_processed_at": "2026-09-01 13:10:45"
  }
}
```

**Champs NLP** :
- `nlp_amounts` : Montants/budgets détectés
- `nlp_deadlines` : Dates limites de candidature
- `nlp_organizations` : Entreprises/institutions mentionnées
- `nlp_emails` : Adresses email de contact
- `nlp_phones` : Numéros de téléphone
- `nlp_keywords` : Mots-clés extraits
- `nlp_quality_score` : Score qualité NLP (0-10)

**Note** : Si `has_nlp = false`, l'opportunité n'a pas été traitée par NLP (quality_score trop faible).

---

### STATISTIQUES

#### 7. Statistiques globales

```http
GET /api/statistics
```

Récupère les statistiques et KPIs du système.

**Exemple** :
```bash
GET /api/statistics
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "global": {
      "total_opportunities": 57,
      "with_nlp_analysis": 44,
      "avg_quality_score": 60.7,
      "avg_nlp_score": 2.1,
      "total_countries": 3,
      "high_quality_count": 12,
      "with_budget": 2,
      "with_deadline": 1,
      "with_organization": 13,
      "with_email": 0
    },
    "by_audience": [
      { "target_audience": "Développeurs", "count": 25 },
      { "target_audience": "Designers", "count": 8 },
      { "target_audience": "Consultants", "count": 12 }
    ],
    "by_urgency": [
      { "urgency": "Normal", "count": 35 },
      { "urgency": "Urgent", "count": 10 },
      { "urgency": "Flexible", "count": 12 }
    ],
    "by_experience": [
      { "experience_required": "Intermédiaire", "count": 30 },
      { "experience_required": "Senior", "count": 15 },
      { "experience_required": "Junior", "count": 12 }
    ],
    "by_budget": [
      { "budget_range": "Moyen", "count": 25 },
      { "budget_range": "Petit budget", "count": 20 },
      { "budget_range": "Élevé", "count": 12 }
    ]
  }
}
```

---

### RÉFÉRENTIELS

#### 8. Liste des secteurs

```http
GET /api/sectors
```

Récupère la liste des secteurs d'activité disponibles.

**Réponse** :
```json
{
  "success": true,
  "data": [
    { "name": "Technologie" },
    { "name": "Agriculture" },
    { "name": "Finance" },
    { "name": "Santé" }
  ],
  "count": 4
}
```

---

#### 9. Liste des pays

```http
GET /api/countries
```

Récupère la liste des pays avec le nombre d'opportunités.

**Réponse** :
```json
{
  "success": true,
  "data": [
    { "name": "Sénégal", "count": 45 },
    { "name": "Côte d'Ivoire", "count": 8 },
    { "name": "International", "count": 4 }
  ],
  "count": 3
}
```

---

#### 10. Santé de l'API

```http
GET /api/health
```

Vérifie que l'API et la base de données sont opérationnelles.

**Réponse** :
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-09-01T13:45:30.123Z"
}
```

---

## 📊 MODÈLES DE DONNÉES

### Opportunité (opportunities_processed)

```typescript
interface Opportunity {
  // Identifiant
  id: number;
  
  // Données de base
  title: string;
  description: string;
  url: string;
  sectors: string;              // CSV: "IT, Technologie"
  country: string;
  date_published: string;       // ISO date
  
  // Métadonnées (générées par IA)
  target_audience: string;      // "Développeurs", "Designers", etc.
  experience_required: string;  // "Junior", "Intermédiaire", "Senior"
  budget_range: string;         // "Petit budget", "Moyen", "Élevé"
  urgency: string;              // "Urgent", "Normal", "Flexible"
  complexity_level: string;     // "Simple", "Modéré", "Complexe"
  suggested_profiles: string;   // CSV: "expert_tech,fullstack_dev"
  quality_score: number;        // 0-100
  
  // Colonnes NLP (extraites par IA)
  nlp_amounts: string[] | null;        // ["2000€", "3000€"]
  nlp_deadlines: string[] | null;      // ["15 décembre 2026"]
  nlp_organizations: string[] | null;  // ["Sonatel", "Orange"]
  nlp_emails: string[] | null;         // ["contact@example.com"]
  nlp_phones: string[] | null;         // ["+221 77 123 45 67"]
  nlp_keywords: string[] | null;       // ["Python", "Django"]
  nlp_quality_score: number | null;    // 0-10
  nlp_processed_at: string | null;     // ISO datetime
  
  // Dates
  collected_at: string;         // ISO datetime
  updated_at: string;           // ISO datetime
}
```

### Embedding

```typescript
interface Embedding {
  opportunity_id: number;
  embedding: number[];          // Vecteur de 384 dimensions
  embedding_dim: number;        // 384
  model_name: string;           // "paraphrase-multilingual-MiniLM-L12-v2"
  created_at: string;           // ISO datetime
}
```

---

## ⚠️ CODES D'ERREUR

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 400 | Bad Request | Paramètres invalides |
| 404 | Not Found | Ressource non trouvée |
| 500 | Internal Server Error | Erreur serveur |

**Format des erreurs** :
```json
{
  "success": false,
  "error": "Message d'erreur détaillé"
}
```

---

## 💡 EXEMPLES D'UTILISATION

### JavaScript (fetch)

```javascript
// Récupérer les 10 dernières opportunités
fetch('http://localhost:3001/api/opportunities?limit=10')
  .then(res => res.json())
  .then(data => {
    console.log(`Total: ${data.pagination.total}`);
    data.data.forEach(opp => {
      console.log(`- ${opp.title} (${opp.country})`);
    });
  });

// Recherche
fetch('http://localhost:3001/api/search?q=python')
  .then(res => res.json())
  .then(data => {
    console.log(`${data.count} résultats trouvés`);
  });

// Opportunités similaires
fetch('http://localhost:3001/api/opportunities/42/similar?limit=5')
  .then(res => res.json())
  .then(data => {
    data.data.forEach(opp => {
      console.log(`${opp.title} - Similarité: ${(opp.similarity * 100).toFixed(1)}%`);
    });
  });
```

### Python (requests)

```python
import requests

# Récupérer les opportunités
response = requests.get('http://localhost:3001/api/opportunities', params={
    'min_quality': 60,
    'limit': 10
})
data = response.json()
print(f"Total: {data['pagination']['total']}")

# Statistiques
stats = requests.get('http://localhost:3001/api/statistics').json()
print(f"Opportunités avec NLP: {stats['data']['global']['with_nlp_analysis']}")

# Données NLP
nlp = requests.get('http://localhost:3001/api/opportunities/42/nlp').json()
if nlp['has_nlp']:
    print(f"Budgets détectés: {nlp['data']['nlp_amounts']}")
```

### cURL

```bash
# Liste des opportunités
curl "http://localhost:3001/api/opportunities?limit=5"

# Recherche
curl "http://localhost:3001/api/search?q=agriculture"

# Statistiques
curl "http://localhost:3001/api/statistics"

# Santé
curl "http://localhost:3001/api/health"
```

---

## 🚀 DÉMARRAGE DE L'API

```bash
# Installation des dépendances
npm install

# Démarrer l'API
npm start
# ou
node api-server.js

# Avec PM2 (recommandé)
pm2 start api-server.js --name gaynaako-api
pm2 save
```

**L'API sera accessible sur** : `http://localhost:3001`

---

## 📝 NOTES POUR LES DÉVELOPPEURS

### Gestion des NULL en NLP

Les colonnes NLP peuvent être `NULL` si :
- L'opportunité a un `quality_score ≤ 50` (pas assez de données)
- Le NLP n'a trouvé aucune information à extraire

**Toujours gérer les NULL** :
```javascript
const budget = opportunity.nlp_amounts || ["Non spécifié"];
const hasNLP = opportunity.nlp_processed_at !== null;
```

### Pagination

Pour paginer correctement :
```javascript
const page = 2;
const limit = 10;
const offset = (page - 1) * limit;

fetch(`/api/opportunities?limit=${limit}&offset=${offset}`)
```

### Similarité avec embeddings

Le score de similarité cosinus va de 0 à 1 :
- **> 0.8** : Très similaire
- **0.5 - 0.8** : Similaire
- **< 0.5** : Peu similaire

---

## 📧 SUPPORT

Pour toute question sur l'API, contactez l'équipe Data Science.

**Dernière mise à jour** : 2026-09-01
