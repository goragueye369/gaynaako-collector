# 📋 Format des Données d'Opportunités - Gaynaako

**Date**: 8 septembre 2026  
**Version**: 1.0  
**Base de données**: `gaynaako_opportunities`  
**Table principale**: `opportunities_processed`

---

## 🗄️ Structure de la Table `opportunities_processed`

### Schéma SQL

```sql
CREATE TABLE `opportunities_processed` (
  `id` VARCHAR(255) PRIMARY KEY,
  `title` TEXT NOT NULL,
  `description` LONGTEXT,
  `url` TEXT,
  `source_name` VARCHAR(255),
  `source_type` VARCHAR(100),
  `country` VARCHAR(255),
  `sectors` TEXT,
  `quality_score` INT,
  `target_audience` VARCHAR(100),
  `urgency` VARCHAR(50),
  `experience_required` VARCHAR(100),
  `budget_range` VARCHAR(100),
  `suggested_profiles` TEXT,
  `date_original` TEXT,
  `date_normalized` DATE,
  `has_date` ENUM('oui', 'non'),
  `collected_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Colonnes NLP enrichies
  `nlp_amounts` JSON,
  `nlp_deadlines` JSON,
  `nlp_organizations` JSON,
  `nlp_emails` JSON,
  `nlp_phones` JSON,
  `nlp_keywords` JSON,
  `nlp_quality_score` INT,
  `nlp_processed_at` TIMESTAMP
);
```

---

## 📊 Format JSON Complet d'une Opportunité

### Exemple Réel

```json
{
  "id": "01898e2c2502",
  "title": "Fourniture de la matière d'œuvre périssable pour certains établissements bénéficiaires de la Fenêtre 1 du MCDC du PADESCE en trois (03) Lots",
  "description": "Le Ministère de l'Education Nationale lance un appel d'offres pour la fourniture de matière d'œuvre périssable...",
  "url": "https://example.com/opportunite",
  "source_name": "Marchés Publics Sénégal",
  "source_type": "appel_offres",
  "country": "Sénégal",
  "sectors": "technologie,agriculture,éducation",
  "quality_score": 85,
  "target_audience": "PME",
  "urgency": "haute",
  "experience_required": "5+ ans",
  "budget_range": "10M-50M FCFA",
  "suggested_profiles": "expert_tech,consultant_digital",
  "date_original": "31 décembre 2026",
  "date_normalized": "2026-12-31",
  "has_date": "oui",
  "collected_at": "2026-09-08T10:30:00Z",
  
  "nlp_amounts": [
    {"value": 10000000, "currency": "FCFA", "context": "budget estimé"},
    {"value": 50000000, "currency": "FCFA", "context": "plafond"}
  ],
  "nlp_deadlines": [
    {"date": "2026-12-31", "type": "soumission", "text": "31 décembre 2026"}
  ],
  "nlp_organizations": ["PADESCE", "Ministère de l'Education"],
  "nlp_emails": ["contact@education.sn"],
  "nlp_phones": ["+221 33 123 45 67"],
  "nlp_keywords": ["fourniture", "éducation", "appel d'offres"],
  "nlp_quality_score": 90,
  "nlp_processed_at": "2026-09-08T11:00:00Z"
}
```

---

## 📝 Description des Champs

### Champs Obligatoires

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| **id** | `VARCHAR(255)` | Identifiant unique de l'opportunité | `"01898e2c2502"` |
| **title** | `TEXT` | Titre de l'opportunité | `"Appel d'offres infrastructure IT"` |

### Champs Principaux

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| **description** | `LONGTEXT` | ✅ | Description complète (peut contenir du HTML) |
| **url** | `TEXT` | ✅ | Lien vers l'opportunité originale |
| **source_name** | `VARCHAR(255)` | ✅ | Nom de la source (ex: "BAD", "PNUD") |
| **source_type** | `VARCHAR(100)` | ✅ | Type: `appel_offres`, `financement`, `emploi`, `consultation` |
| **country** | `VARCHAR(255)` | ✅ | Pays cible (ex: "Sénégal", "International") |
| **sectors** | `TEXT` | ✅ | Secteurs séparés par virgule |
| **quality_score** | `INT` | ✅ | Score de qualité 0-100 |
| **collected_at** | `TIMESTAMP` | ❌ | Date de collecte (auto-générée) |

### Champs Enrichis

| Champ | Type | Description | Valeurs Possibles |
|-------|------|-------------|-------------------|
| **target_audience** | `VARCHAR(100)` | Public cible | `"ENTREPRENEUR"`, `"PME"`, `"ONG"`, `"CONSULTANT"`, `"TOUS"` |
| **urgency** | `VARCHAR(50)` | Niveau d'urgence | `"haute"`, `"moyenne"`, `"basse"`, `"continue"` |
| **experience_required** | `VARCHAR(100)` | Expérience requise | `"junior"`, `"5+ ans"`, `"10+ ans"`, `"senior"` |
| **budget_range** | `VARCHAR(100)` | Fourchette budgétaire | `"0-5M FCFA"`, `"10M-50M FCFA"`, `"50M+ FCFA"` |
| **suggested_profiles** | `TEXT` | Profils suggérés (virgule) | `"expert_tech,consultant_digital"` |

### Champs Date

| Champ | Type | Description | Format |
|-------|------|-------------|--------|
| **date_original** | `TEXT` | Date brute extraite | `"31 décembre 2026"` |
| **date_normalized** | `DATE` | Date normalisée | `"2026-12-31"` |
| **has_date** | `ENUM` | Présence de date | `"oui"` ou `"non"` |

### Champs NLP (JSON)

| Champ | Type | Description | Format JSON |
|-------|------|-------------|-------------|
| **nlp_amounts** | `JSON` | Montants extraits | `[{"value": 10000000, "currency": "FCFA", "context": "budget"}]` |
| **nlp_deadlines** | `JSON` | Dates limites extraites | `[{"date": "2026-12-31", "type": "soumission"}]` |
| **nlp_organizations** | `JSON` | Organisations mentionnées | `["PADESCE", "BAD"]` |
| **nlp_emails** | `JSON` | Emails extraits | `["contact@example.sn"]` |
| **nlp_phones** | `JSON` | Téléphones extraits | `["+221 33 123 45 67"]` |
| **nlp_keywords** | `JSON` | Mots-clés extraits | `["fourniture", "infrastructure"]` |
| **nlp_quality_score** | `INT` | Score qualité NLP 0-100 | `90` |
| **nlp_processed_at** | `TIMESTAMP` | Date traitement NLP | `"2026-09-08T11:00:00Z"` |

---

## 🔄 Format des Secteurs (sectors)

**Format**: Liste séparée par virgules (`,`)

**Secteurs Standards**:
```
technologie
agriculture
santé
éducation
infrastructure
énergie
eau
environnement
finance
commerce
industrie
tourisme
gouvernance
transport
```

**Exemple**:
```json
"sectors": "technologie,infrastructure,éducation"
```

---

## 🎯 Format des Profils Suggérés (suggested_profiles)

**Format**: Liste séparée par virgules (`,`)

**Profils Standards**:
```
expert_tech
consultant_digital
entrepreneur_agri
pme_construction
ong_sante
expert_finance
consultant_rh
developpeur_logiciel
chef_projet
expert_environnement
```

**Exemple**:
```json
"suggested_profiles": "expert_tech,developpeur_logiciel,chef_projet"
```

---

## 📥 Format d'Import/Export

### Format CSV

```csv
id,title,description,url,source_name,country,sectors,quality_score,target_audience,urgency,date_normalized
01898e2c2502,"Appel d'offres","Description...","https://...","Marchés Publics","Sénégal","technologie,infrastructure",85,"PME","haute","2026-12-31"
```

### Format JSON (API)

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "01898e2c2502",
      "title": "Appel d'offres infrastructure IT",
      "description": "Description complète...",
      "url": "https://example.com",
      "source_name": "Marchés Publics Sénégal",
      "source_type": "appel_offres",
      "country": "Sénégal",
      "sectors": "technologie,infrastructure",
      "quality_score": 85,
      "target_audience": "PME",
      "urgency": "haute",
      "experience_required": "5+ ans",
      "budget_range": "10M-50M FCFA",
      "date_normalized": "2026-12-31",
      "has_date": "oui",
      "nlp_amounts": [{"value": 10000000, "currency": "FCFA"}],
      "nlp_deadlines": [{"date": "2026-12-31", "type": "soumission"}]
    }
  ]
}
```

---

## 🔗 Endpoints API Disponibles

### 1. Liste des opportunités
```http
GET /api/opportunities?limit=50&offset=0
```

**Filtres disponibles**:
- `sector`: Filtrer par secteur (ex: `?sector=technologie`)
- `country`: Filtrer par pays (ex: `?country=Sénégal`)
- `source_type`: Type de source (ex: `?source_type=appel_offres`)
- `min_quality`: Score minimum (ex: `?min_quality=70`)
- `target_audience`: Public cible (ex: `?target_audience=PME`)
- `urgency`: Niveau d'urgence (ex: `?urgency=haute`)

**Exemple**:
```http
GET /api/opportunities?sector=technologie&country=Sénégal&min_quality=70&limit=10
```

### 2. Détails d'une opportunité
```http
GET /api/opportunities/:id
```

**Réponse**:
```json
{
  "success": true,
  "data": {
    "id": "01898e2c2502",
    "title": "...",
    "description": "...",
    ...
  }
}
```

### 3. Recherche textuelle
```http
GET /api/search?q=infrastructure
```

### 4. Opportunités similaires
```http
GET /api/opportunities/:id/similar?limit=5
```

### 5. Données NLP
```http
GET /api/opportunities/:id/nlp
```

---

## 📊 Statistiques des Données

### Requête de statistiques
```http
GET /api/statistics
```

**Réponse**:
```json
{
  "success": true,
  "data": {
    "global": {
      "total_opportunities": 207,
      "with_nlp_analysis": 180,
      "avg_quality_score": 75.3,
      "total_countries": 15,
      "high_quality_count": 120
    },
    "by_audience": [
      {"target_audience": "PME", "count": 85},
      {"target_audience": "ENTREPRENEUR", "count": 62}
    ],
    "by_urgency": [
      {"urgency": "haute", "count": 45},
      {"urgency": "moyenne", "count": 120}
    ]
  }
}
```

---

## 🔍 Validation des Données

### Règles de Validation

**ID**:
- ✅ Unique
- ✅ Non vide
- ✅ Longueur max: 255 caractères

**Title**:
- ✅ Non vide
- ✅ Longueur min: 10 caractères
- ✅ Longueur max: 500 caractères

**Quality Score**:
- ✅ Entre 0 et 100
- ✅ Type: Integer

**Date Normalized**:
- ✅ Format: `YYYY-MM-DD`
- ✅ Date valide
- ✅ Peut être NULL

**Sectors**:
- ✅ Liste séparée par virgules
- ✅ Pas d'espaces avant/après
- ✅ Secteurs en minuscules

**NLP JSON**:
- ✅ JSON valide
- ✅ Peut être NULL
- ✅ Structure respectée

---

## 💾 Exemple d'Insertion

### SQL
```sql
INSERT INTO opportunities_processed (
  id, title, description, url, source_name, country, 
  sectors, quality_score, target_audience, urgency,
  date_normalized, has_date
) VALUES (
  '01898e2c2502',
  'Appel d''offres infrastructure IT',
  'Description complète de l''opportunité...',
  'https://example.com/opportunite',
  'Marchés Publics Sénégal',
  'Sénégal',
  'technologie,infrastructure',
  85,
  'PME',
  'haute',
  '2026-12-31',
  'oui'
);
```

### Node.js
```javascript
const mysql = require('mysql2/promise');

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gaynaako_opportunities'
});

await conn.query(`
  INSERT INTO opportunities_processed 
  (id, title, country, sectors, quality_score, target_audience)
  VALUES (?, ?, ?, ?, ?, ?)
`, [
  '01898e2c2502',
  'Appel d\'offres infrastructure IT',
  'Sénégal',
  'technologie,infrastructure',
  85,
  'PME'
]);
```

### Python
```python
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='',
    database='gaynaako_opportunities'
)

cursor = conn.cursor()
cursor.execute("""
    INSERT INTO opportunities_processed 
    (id, title, country, sectors, quality_score, target_audience)
    VALUES (%s, %s, %s, %s, %s, %s)
""", (
    '01898e2c2502',
    'Appel d\'offres infrastructure IT',
    'Sénégal',
    'technologie,infrastructure',
    85,
    'PME'
))

conn.commit()
```

---

## 📌 Notes Importantes pour le Backend

### 1. **Encodage**
- ✅ Utiliser UTF-8 pour tous les champs texte
- ✅ Supporter les caractères spéciaux français (é, è, à, ô, etc.)

### 2. **Performance**
- ✅ Indexer les champs: `id`, `country`, `sectors`, `quality_score`, `date_normalized`
- ✅ Utiliser FULLTEXT index sur `title` et `description` pour la recherche

### 3. **Sécurité**
- ✅ Échapper les entrées utilisateur
- ✅ Utiliser des requêtes préparées (prepared statements)
- ✅ Valider les données avant insertion

### 4. **Pagination**
- ✅ Limite par défaut: 50 résultats
- ✅ Maximum: 100 résultats par requête
- ✅ Utiliser `LIMIT` et `OFFSET`

### 5. **Dates**
- ✅ Stocker en UTC
- ✅ Convertir pour l'affichage
- ✅ Format ISO 8601 pour les APIs

---

## 🔗 Ressources

- **Base de données**: `gaynaako_opportunities`
- **Table**: `opportunities_processed`
- **API Server**: Port 3001 (`http://localhost:3001`)
- **Documentation API**: `/api` (racine)
- **Health Check**: `/api/health`

---

## 📞 Contact

Pour toute question sur le format des données, contacter l'équipe technique Gaynaako.

**Date de dernière mise à jour**: 8 septembre 2026
