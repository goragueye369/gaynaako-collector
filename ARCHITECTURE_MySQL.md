# 🗄️ Architecture MySQL - Gaynaako Collector

## 📐 Structure Finale : 1 SEULE TABLE

```
Base de données : gaynaako_opportunities
│
└── Table : opportunities_processed
    ├── Données de base (titre, description, pays, secteur)
    └── Colonnes NLP (JSON) : montants, deadlines, organisations, etc.
```

---

## 🏗️ Schéma de la Table `opportunities_processed`

### **Colonnes de Base** (Enrichissement)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(12) | Identifiant unique (ex: opp_abc123) |
| `source_name` | VARCHAR(255) | Nom de la source (ex: DER Sénégal) |
| `source_type` | ENUM | 'national' ou 'international' |
| `title` | VARCHAR(300) | Titre de l'opportunité |
| `description` | TEXT | Description complète |
| `url` | TEXT | URL source |
| `date_original` | VARCHAR(255) | Date au format original |
| `date_normalized` | DATE | Date normalisée (YYYY-MM-DD) |
| `country` | VARCHAR(100) | Pays (ex: Sénégal) |
| `sectors` | TEXT | Secteurs (ex: "agriculture, technologie") |
| `has_description` | ENUM | 'oui' ou 'non' |
| `has_date` | ENUM | 'oui' ou 'non' |
| `quality_score` | INT | Score de qualité (0-100) |
| `collected_at` | TIMESTAMP | Date de collecte |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de dernière mise à jour |

### **Colonnes NLP** (Analyse IA) 🤖

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `nlp_amounts` | JSON | Montants extraits | `[{"amount":50,"currency":"USD","unit":"millions"}]` |
| `nlp_deadlines` | JSON | Dates limites | `["2024-12-31", "2025-01-15"]` |
| `nlp_organizations` | JSON | Organisations | `["Banque Mondiale", "USAID"]` |
| `nlp_emails` | JSON | Emails de contact | `["contact@example.com"]` |
| `nlp_phones` | JSON | Téléphones | `["+221 77 123 45 67"]` |
| `nlp_keywords` | JSON | Mots-clés métiers | `["financement", "technologie"]` |
| `nlp_quality_score` | INT | Score NLP (0-10) | `8` |
| `nlp_processed_at` | TIMESTAMP | Date traitement NLP | `2024-08-31 10:00:00` |

---

## 🔄 Flux de Données

```
1. Collecte (scraper.js)
   └─> data/raw/*.csv

2. Nettoyage (data-cleaner.js)
   └─> data/cleaned/*.csv

3. Enrichissement (data-cleaner.js)
   └─> data/processed/*.csv

4. Import MySQL (import-processed-to-mysql.js)
   └─> MySQL : opportunities_processed (colonnes de base remplies)

5. Analyse NLP (nlp-processor.py)
   └─> MySQL : opportunities_processed (colonnes NLP mises à jour)

6. Embeddings (embedding-generator.py)
   └─> data/embeddings/*.json (fichiers JSON séparés)
```

---

## 📊 Exemples de Requêtes SQL

### **1. Opportunités avec montants > 10M USD**
```sql
SELECT 
    id, title, country,
    JSON_EXTRACT(nlp_amounts, '$[0].amount') as amount,
    JSON_EXTRACT(nlp_amounts, '$[0].currency') as currency
FROM opportunities_processed
WHERE JSON_EXTRACT(nlp_amounts, '$[0].amount') > 10
  AND JSON_EXTRACT(nlp_amounts, '$[0].currency') = '"USD"';
```

### **2. Opportunités avec deadline proche**
```sql
SELECT 
    id, title, country,
    JSON_EXTRACT(nlp_deadlines, '$[0]') as deadline
FROM opportunities_processed
WHERE JSON_CONTAINS(nlp_deadlines, '"2024-12-31"');
```

### **3. Opportunités par organisation**
```sql
SELECT 
    id, title, country,
    nlp_organizations
FROM opportunities_processed
WHERE JSON_SEARCH(nlp_organizations, 'one', 'Banque Mondiale') IS NOT NULL;
```

### **4. Opportunités haute qualité avec NLP**
```sql
SELECT 
    id, title, country, quality_score, nlp_quality_score,
    nlp_amounts, nlp_organizations
FROM opportunities_processed
WHERE quality_score > 70
  AND nlp_quality_score > 7
ORDER BY quality_score DESC, nlp_quality_score DESC;
```

### **5. Statistiques globales**
```sql
SELECT 
    COUNT(*) as total,
    COUNT(nlp_processed_at) as with_nlp,
    AVG(quality_score) as avg_quality,
    AVG(nlp_quality_score) as avg_nlp,
    COUNT(DISTINCT country) as total_countries
FROM opportunities_processed;
```

---

## 🚀 Installation et Utilisation

### **1. Installer MySQL**
```bash
# Windows (avec XAMPP) :
# - Télécharger XAMPP : https://www.apachefriends.org/
# - Installer et démarrer MySQL depuis XAMPP Control Panel

# Ou MySQL standalone :
# - Télécharger MySQL : https://dev.mysql.com/downloads/mysql/
# - Installer avec mot de passe root
```

### **2. Créer la base de données**
```bash
mysql -u root -p < schema-enriched.sql
```

### **3. Importer les données**
```bash
node import-processed-to-mysql.js
```

### **4. Lancer l'analyse NLP**
```bash
python nlp-processor.py
```

### **5. Vérifier les données**
```bash
mysql -u root -p
```
```sql
USE gaynaako_opportunities;

-- Voir toutes les opportunités avec NLP
SELECT id, title, nlp_quality_score, nlp_processed_at
FROM opportunities_processed
WHERE nlp_processed_at IS NOT NULL;

-- Statistiques
SELECT * FROM v_dashboard;
```

---

## 🎯 Avantages de cette Architecture

### ✅ **1 Table avec JSON**
- ✅ Simple à maintenir
- ✅ Pas de JOIN nécessaire
- ✅ Toutes les données au même endroit
- ✅ Colonnes JSON flexibles (ajout facile de nouvelles infos)
- ✅ Requêtes SQL puissantes avec `JSON_EXTRACT` et `JSON_SEARCH`

### ✅ **vs 2 Tables Séparées**
- ❌ Besoin de JOIN à chaque requête
- ❌ Plus complexe à maintenir
- ❌ Données éparpillées

---

## 📚 Documentation Complémentaire

- **`schema-enriched.sql`** → Schéma MySQL complet
- **`import-processed-to-mysql.js`** → Script d'import
- **`nlp-processor.py`** → Script d'analyse NLP
- **`GUIDE_NLP_EMBEDDINGS.md`** → Guide détaillé NLP/IA

---

## 🔧 Configuration MySQL

### **Fichier `.env` (optionnel)**
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=gaynaako_opportunities
```

### **Dans les scripts**
- `import-processed-to-mysql.js` → Lit depuis `.env` ou valeurs par défaut
- `nlp-processor.py` → Config en dur (ligne 16-22)

---

## 🎉 Résultat Final

**Une base de données MySQL complète avec :**
- ✅ Opportunités collectées et nettoyées
- ✅ Données enrichies (pays, secteurs, scores)
- ✅ Analyse NLP (montants, deadlines, organisations)
- ✅ Prêt pour le backend
- ✅ Requêtes SQL puissantes

**Prochaine étape : Embeddings pour la recherche sémantique !** 🚀
