# 🧠 Guide NLP + Embeddings

## Vue d'ensemble

Système complet d'analyse NLP et génération d'embeddings pour les opportunités.

---

## 📦 Installation

### **1. Installer Python (si pas déjà fait)**

```bash
# Vérifier l'installation
python --version
# ou
python3 --version
```

### **2. Installer les dépendances Python**

```bash
pip install -r requirements.txt
```

**Dépendances installées :**
- `sentence-transformers` : Génération d'embeddings
- `mysql-connector-python` : Connexion MySQL
- `torch` : Backend pour transformers
- `transformers` : Modèles NLP
- `numpy`, `pandas` : Manipulation de données

**Taille téléchargement :** ~2GB (modèles + dépendances)  
**Durée installation :** 5-10 minutes

---

## 🚀 Utilisation

### **Étape 1 : Créer les Tables MySQL**

Les tables seront créées automatiquement au premier lancement, mais vous pouvez aussi :

```bash
python nlp-processor.py
```

Cela crée :
- `opportunity_nlp` : Stocke les extractions NLP
- `opportunity_embeddings` : Stocke les vecteurs sémantiques

### **Étape 2 : Lancer le Traitement NLP**

```bash
python nlp-processor.py
```

**Ce qui est extrait :**
- 💰 Montants (en FCFA, USD, EUR)
- 📅 Dates limites
- 📧 Emails
- 📞 Numéros de téléphone
- 🏢 Organisations
- 🔑 Mots-clés importants

**Durée :** ~30 secondes pour 100 opportunités

###**Étape 3 : Générer les Embeddings**

```bash
python embedding-generator.py
```

**Ce qui est fait :**
- Génération de vecteurs 384D pour chaque opportunité
- Modèle multilingue (FR/EN/etc.)
- Sauvegarde dans MySQL

**Durée :** ~2-3 minutes pour 100 opportunités (première fois : +5 min pour télécharger le modèle)

### **Étape 4 : Tester la Similarité**

```bash
python embedding-generator.py --test-similarity
```

Affiche les 5 opportunités les plus similaires à la première.

---

## 📊 Résultats

### **Table `opportunity_nlp`**

| Colonne | Type | Description |
|---------|------|-------------|
| `opportunity_id` | VARCHAR(12) | ID de l'opportunité |
| `amount` | BIGINT | Montant extrait (en unité de base) |
| `currency` | VARCHAR(10) | Devise (FCFA, USD, EUR) |
| `deadline` | DATE | Date limite extraite |
| `emails` | TEXT | Emails extraits (séparés par virgule) |
| `phones` | TEXT | Téléphones extraits |
| `organizations` | TEXT | Organisations mentionnées |
| `keywords` | TEXT | Mots-clés extraits |
| `processed_at` | TIMESTAMP | Date du traitement |

**Exemple :**
```sql
SELECT 
    op.title,
    nlp.amount,
    nlp.currency,
    nlp.deadline,
    nlp.organizations
FROM opportunities_processed op
JOIN opportunity_nlp nlp ON op.id = nlp.opportunity_id
WHERE nlp.amount > 10000000;
```

### **Table `opportunity_embeddings`**

| Colonne | Type | Description |
|---------|------|-------------|
| `opportunity_id` | VARCHAR(12) | ID de l'opportunité |
| `embedding` | JSON | Vecteur 384D (liste de nombres) |
| `embedding_dim` | INT | Dimension (384) |
| `model_name` | VARCHAR(255) | Nom du modèle |
| `created_at` | TIMESTAMP | Date de création |

---

## 🔍 Nouveaux Endpoints API

### **1. GET /api/opportunities/:id/similar**

Trouve les opportunités similaires

**Exemple :**
```bash
curl http://localhost:3001/api/opportunities/abc123/similar?limit=5
```

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": "def456",
      "title": "Projet similaire...",
      "similarity": 0.85,
      "quality_score": 75
    }
  ]
}
```

### **2. GET /api/opportunities/nlp/:id**

Informations NLP extraites

**Exemple :**
```bash
curl http://localhost:3001/api/opportunities/abc123/nlp
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "opportunity_id": "abc123",
    "amount": 50000000,
    "currency": "FCFA",
    "deadline": "2026-09-15",
    "emails": "contact@example.com",
    "organizations": "Banque Mondiale, PNUD",
    "keywords": "agriculture,financement,pme"
  }
}
```

---

## ⚙️ Automatisation

### **Intégrer au Pipeline Automatique**

Pour que NLP + Embeddings soient générés automatiquement après chaque collecte :

**Option 1 : Ajouter au scheduler Node.js**

Éditer `auto-collect.js` et ajouter après l'import MySQL :

```javascript
// ÉTAPE 6: NLP Processing
console.log('🧠 ÉTAPE 6/7 : Analyse NLP...\n');
execSync('python nlp-processor.py', { stdio: 'inherit' });

// ÉTAPE 7: Embedding Generation
console.log('🧬 ÉTAPE 7/7 : Génération embeddings...\n');
execSync('python embedding-generator.py', { stdio: 'inherit' });
```

**Option 2 : Créer un script shell**

```bash
#!/bin/bash
# run-nlp-pipeline.sh

echo "🧠 Lancement du pipeline NLP + Embeddings"

python nlp-processor.py
if [ $? -ne 0 ]; then
    echo "❌ Erreur NLP"
    exit 1
fi

python embedding-generator.py
if [ $? -ne 0 ]; then
    echo "❌ Erreur Embeddings"
    exit 1
fi

echo "✅ Pipeline NLP terminé"
```

Puis ajouter à PM2 ou cron.

---

## 📈 Cas d'Usage

### **1. Recherche par Montant**

```sql
SELECT op.title, nlp.amount, nlp.currency
FROM opportunities_processed op
JOIN opportunity_nlp nlp ON op.id = nlp.opportunity_id
WHERE nlp.amount BETWEEN 10000000 AND 100000000
  AND nlp.currency = 'FCFA'
ORDER BY nlp.amount DESC;
```

### **2. Opportunités avec Deadline Proche**

```sql
SELECT op.title, nlp.deadline
FROM opportunities_processed op
JOIN opportunity_nlp nlp ON op.id = nlp.opportunity_id
WHERE nlp.deadline BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY nlp.deadline ASC;
```

### **3. Recherche par Organisation**

```sql
SELECT op.title, nlp.organizations
FROM opportunities_processed op
JOIN opportunity_nlp nlp ON op.id = nlp.opportunity_id
WHERE nlp.organizations LIKE '%Banque Mondiale%';
```

### **4. Trouver Opportunités Similaires (Python)**

```python
from embedding_generator import find_similar_opportunities

# Trouver les 10 opportunités les plus similaires
find_similar_opportunities('abc123', limit=10)
```

---

## 🎯 Performances

### **NLP Processing**
- **Vitesse :** ~200 opportunités/seconde
- **Mémoire :** ~200 MB
- **CPU :** Faible

### **Embedding Generation**
- **Vitesse :** ~30-50 opportunités/seconde
- **Mémoire :** ~2 GB
- **CPU/GPU :** Élevé (plus rapide avec GPU)

### **Recherche de Similarité**
- **Vitesse :** ~0.5 secondes pour 100 opportunités
- **Mémoire :** ~500 MB
- **CPU :** Moyen

---

## 🔧 Configuration

### **Changer le Modèle d'Embedding**

Éditer `embedding-generator.py` :

```python
# Modèles disponibles :
# - paraphrase-multilingual-MiniLM-L12-v2 (384D, rapide)
# - paraphrase-multilingual-mpnet-base-v2 (768D, précis)
# - sentence-transformers/all-MiniLM-L6-v2 (384D, EN seulement)

generator = EmbeddingGenerator('paraphrase-multilingual-mpnet-base-v2')
```

### **Ajuster le Mot de Passe MySQL**

Éditer les scripts Python :

```python
DB_CONFIG = {
    'password': 'VOTRE_MOT_DE_PASSE'
}
```

---

## ✅ Validation

### **Tester l'Extraction NLP**

```bash
python nlp-processor.py
```

**Vérifier dans MySQL :**
```sql
SELECT COUNT(*) FROM opportunity_nlp;
SELECT * FROM opportunity_nlp LIMIT 5;
```

### **Tester les Embeddings**

```bash
python embedding-generator.py --test-similarity
```

**Vérifier dans MySQL :**
```sql
SELECT COUNT(*) FROM opportunity_embeddings;
SELECT opportunity_id, embedding_dim FROM opportunity_embeddings LIMIT 5;
```

### **Tester l'API**

```bash
# Restart API
pm2 restart gaynaako-api

# Tester similarité
curl http://localhost:3001/api/opportunities/FIRST_ID/similar

# Tester NLP
curl http://localhost:3001/api/opportunities/FIRST_ID/nlp
```

---

## 🆘 Dépannage

### **Erreur: Module not found**

```bash
pip install --upgrade -r requirements.txt
```

### **Erreur: MySQL connection refused**

Vérifier que MySQL est démarré et le mot de passe est correct.

### **Erreur: CUDA not available (GPU)**

Normal si pas de GPU. Le modèle utilisera le CPU (plus lent mais fonctionne).

### **Erreur: Out of memory**

Réduire le batch size ou utiliser un modèle plus petit.

---

## 📊 Statistiques Attendues

Pour 100 opportunités :

| Métrique | Valeur | Pourcentage |
|----------|--------|-------------|
| Montants extraits | ~15-20 | 15-20% |
| Dates limites | ~2-5 | 2-5% |
| Emails | ~10-15 | 10-15% |
| Organisations | ~60-80 | 60-80% |
| Mots-clés | 100 | 100% |
| Embeddings | 100 | 100% |

**Note :** Les taux d'extraction dépendent de la qualité et du contenu des données sources.

---

## 🎉 Résultat Final

Après exécution complète, vous aurez :

✅ **Extraction NLP** : Montants, dates, contacts, organisations  
✅ **Embeddings 384D** : Vecteurs sémantiques pour chaque opportunité  
✅ **Recherche par similarité** : API endpoint `/similar`  
✅ **Base de données enrichie** : 2 nouvelles tables  
✅ **Prêt pour ML** : Features pour modèles avancés  

**Le système est maintenant INTELLIGENT ! 🧠**
