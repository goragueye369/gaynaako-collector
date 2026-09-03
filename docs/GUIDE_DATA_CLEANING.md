# 🧹 Guide du Data Cleaning & Processing

## Vue d'ensemble

Ce système de nettoyage et de traitement des données transforme les opportunités brutes collectées en un dataset de qualité prêt pour l'analyse et l'IA.

---

## 📋 Processus Complet

### Étape 1: Collecte (scraper.js)
- Récupération depuis 10 sources web
- Sauvegarde en format brut (CSV)

### Étape 2: Nettoyage Basique (auto-collect.js)
- Suppression des données de test
- Dédoublonnage initial
- Filtrage des titres trop courts

### Étape 3: Processing Avancé (data-cleaner.js) ✨
- **Nettoyage des descriptions**
- **Normalisation des dates**
- **Extraction des pays**
- **Détection des secteurs**
- **Gestion des données manquantes**
- **Calcul du score de qualité**

### Étape 4: Import Enrichi (import-processed-to-mysql.js)
- Insertion dans la table `opportunities_processed`
- Gestion des doublons automatique

---

## 🔧 Fonctionnalités de Nettoyage

### 1️⃣ Nettoyage des Descriptions

**Problèmes résolus:**
- ✅ Encodage UTF-8 mal interprété (`Ã©` → `é`)
- ✅ Entités HTML (`&nbsp;`, `&amp;`)
- ✅ Balises HTML et shortcodes
- ✅ Espaces multiples et sauts de ligne
- ✅ Caractères spéciaux mal encodés

**Exemple:**
```
Avant: "CrÃ©Ã©e par dÃ©cret nÂ° 2017-2123&nbsp;[rev_slider]..."
Après: "Créée par décret n° 2017-2123..."
```

### 2️⃣ Normalisation des Dates

**Formats supportés:**
- `9 juin 2026` → `2026-06-09`
- `Juin 9, 2026` → `2026-06-09`
- `31/08/2026` → `2026-08-31`
- `2026-08-31T10:00:00Z` → `2026-08-31`

**Résultat:** Format ISO standard `YYYY-MM-DD`

### 3️⃣ Normalisation des Pays

**Détection automatique** basée sur:
- Mots-clés dans le titre/description
- Nom de la source

**Pays reconnus:**
- 🇸🇳 Sénégal
- 🇨🇮 Côte d'Ivoire
- 🇲🇱 Mali
- 🇧🇫 Burkina Faso
- 🇳🇪 Niger
- 🇬🇳 Guinée
- 🇧🇯 Bénin
- 🇹🇬 Togo
- 🇬🇭 Ghana
- 🌍 Afrique (continental)
- 🌐 International

### 4️⃣ Détection des Secteurs

**13 secteurs d'activité:**
1. Agriculture
2. Santé
3. Éducation
4. Infrastructure
5. Énergie
6. Eau
7. Technologie
8. Finance
9. Environnement
10. Gouvernance
11. Commerce
12. Industrie
13. Tourisme

**Détection multi-secteurs:**
Une opportunité peut appartenir à plusieurs secteurs.

**Exemple:**
```
Titre: "Projet d'électrification solaire des écoles rurales"
Secteurs détectés: énergie, éducation, infrastructure
```

### 5️⃣ Gestion des Données Manquantes

**Stratégies:**
- **Description manquante:** Indicateur `has_description = non`
- **Date manquante:** Indicateur `has_date = non`
- **Secteur non détecté:** `non classifié`
- **Pays non détecté:** `International` (par défaut)

### 6️⃣ Score de Qualité (0-100)

**Calcul du score:**
- **Titre** (0-30 points)
  - 30 pts: 20-200 caractères
  - 20 pts: 10-20 caractères
  - 10 pts: < 10 caractères

- **Description** (0-30 points)
  - 30 pts: ≥ 100 caractères
  - 20 pts: 50-100 caractères
  - 10 pts: < 50 caractères

- **Date normalisée** (0-15 points)
  - 15 pts: Date valide et normalisée

- **Secteur** (0-10 points)
  - 10 pts: Au moins 1 secteur détecté

- **Pays** (0-10 points)
  - 10 pts: Pays spécifique détecté

- **URL valide** (0-5 points)
  - 5 pts: URL commence par `http`

**Catégories:**
- 🌟 **Haute qualité:** Score > 70
- ⭐ **Moyenne qualité:** Score 50-70
- ⚠️ **Basse qualité:** Score < 50

---

## 🗄️ Schéma de Données Standardisé

### Table: `opportunities_processed`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(12) | Identifiant unique (hash MD5) |
| `source_name` | VARCHAR(255) | Nom de la source |
| `source_type` | ENUM | 'national' ou 'international' |
| `title` | VARCHAR(300) | Titre nettoyé |
| `description` | TEXT | Description nettoyée |
| `url` | TEXT | URL de l'opportunité |
| `date_original` | VARCHAR(255) | Date au format original |
| `date_normalized` | DATE | Date normalisée (YYYY-MM-DD) |
| `country` | VARCHAR(100) | Pays détecté |
| `sectors` | TEXT | Liste des secteurs (séparés par virgule) |
| `has_description` | ENUM | 'oui' ou 'non' |
| `has_date` | ENUM | 'oui' ou 'non' |
| `quality_score` | INT | Score de qualité (0-100) |
| `collected_at` | TIMESTAMP | Date de collecte |

### Index et Recherche

**Index standards:**
- Par source, pays, date, score de qualité

**Index FULLTEXT:**
- Recherche dans titre
- Recherche dans description
- Recherche dans secteurs
- Recherche globale (titre + description + secteurs)

**Exemples de recherches:**
```sql
-- Recherche textuelle
SELECT * FROM opportunities_processed 
WHERE MATCH(title, description) AGAINST('éducation numérique');

-- Opportunités haute qualité au Sénégal
SELECT * FROM opportunities_processed 
WHERE country = 'Sénégal' AND quality_score > 70;

-- Opportunités du secteur technologie
SELECT * FROM opportunities_processed 
WHERE FIND_IN_SET('technologie', sectors) > 0;
```

---

## 🚀 Utilisation

### Nettoyage Manuel

```bash
# Nettoyer le dernier fichier collecté
node data-cleaner.js

# Le résultat est sauvegardé dans:
# data/processed/opportunities_processed_TIMESTAMP.csv
```

### Processus Automatisé Complet

```bash
# Collecte + Nettoyage + Processing + Import MySQL
node auto-collect.js
```

**Ce qui est fait automatiquement:**
1. ✅ Collecte depuis 10 sources
2. ✅ Nettoyage basique
3. ✅ Processing avancé
4. ✅ Import dans MySQL (table normale)
5. ⚠️ Import enrichi vers `opportunities_processed` (à faire manuellement pour l'instant)

### Import du Dataset Enrichi

```bash
# Créer le schéma enrichi
mysql -u root -p < schema-enriched.sql

# Importer les données processées
node import-processed-to-mysql.js
```

---

## 📊 Statistiques Actuelles

**Dernière exécution (31/08/2026):**
- ✅ 57 opportunités traitées
- 🧹 0 doublons supprimés
- 🌍 4 pays détectés (Afrique, Sénégal, International, Niger)
- 🏭 10 secteurs différents
- ⭐ Score moyen: 61.1/100
- 📝 93% avec description
- 📅 1.8% avec date normalisée

**Répartition par secteur:**
1. Technologie: 28
2. Non classifié: 19
3. Eau: 6
4. Gouvernance: 6
5. Commerce: 4
6. Agriculture: 4

---

## 🎯 Dataset Prêt pour l'IA

### Cas d'usage Machine Learning

**1. Classification automatique**
```python
# Prédire le secteur d'une nouvelle opportunité
features = ['title', 'description', 'source_name', 'country']
target = 'sectors'
```

**2. Détection de doublons**
```python
# Similarité entre opportunités
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
```

**3. Recommandation**
```python
# Recommander des opportunités similaires
# Basé sur secteurs, pays, description
```

**4. Extraction d'informations**
```python
# NER pour extraire:
# - Montants
# - Dates limites
# - Entités (organisations)
```

### Formats d'export

Le dataset peut être exporté en:
- ✅ **CSV** (déjà fait)
- 📄 **JSON** (à faire)
- 🐍 **Pandas DataFrame** (direct depuis MySQL)
- 🔢 **Excel** (à faire)

---

## ⚙️ Configuration

### Ajouter un Secteur

Éditer `data-cleaner.js` :

```javascript
const SECTEURS = {
  // ...
  'mon_secteur': ['keyword1', 'keyword2', 'keyword3']
};
```

### Ajouter un Pays

Éditer `data-cleaner.js` :

```javascript
const PAYS = {
  // ...
  'Mon Pays': ['keyword1', 'ville1', 'ville2']
};
```

### Ajuster le Score de Qualité

Modifier la fonction `calculateQualityScore()` dans `data-cleaner.js`.

---

## 🔄 Prochaines Améliorations

### À Court Terme
- [ ] Détection automatique des dates limites
- [ ] Extraction des montants (budgets)
- [ ] Détection de la langue (FR/EN)
- [ ] Normalisation des types d'opportunités (appel d'offres, subvention, etc.)

### À Moyen Terme
- [ ] API REST pour accéder aux données
- [ ] Interface web pour visualiser les statistiques
- [ ] Système de notification (nouvelles opportunités)
- [ ] Export automatique vers différents formats

### À Long Terme
- [ ] Modèle ML pour classification automatique
- [ ] Détection des opportunités pertinentes par profil
- [ ] Analyse de sentiment
- [ ] Prédiction des opportunités futures

---

## 📚 Ressources

**Scripts:**
- `data-cleaner.js` : Nettoyage et processing
- `schema-enriched.sql` : Schéma MySQL enrichi
- `import-processed-to-mysql.js` : Import des données enrichies

**Documentation:**
- `README.md` : Guide général
- `GUIDE_MYSQL.md` : Configuration MySQL
- Ce fichier : Guide du Data Cleaning

---

## 🆘 Dépannage

### Problème: Caractères mal encodés

**Solution:** Le script corrige automatiquement les erreurs d'encodage UTF-8 courantes.

### Problème: Dates non détectées

**Solution:** Ajouter le format de date dans la fonction `normalizeDate()`.

### Problème: Secteur non détecté

**Solution:** Ajouter des mots-clés dans le dictionnaire `SECTEURS`.

### Problème: Score de qualité trop bas

**Vérifier:**
- Longueur du titre et de la description
- Présence d'une date
- Détection du pays
- Détection du secteur

---

## ✅ Checklist de Validation

Avant de considérer le dataset comme prêt pour l'IA:

- [x] ✅ Encodage UTF-8 correct
- [x] ✅ Doublons supprimés
- [x] ✅ Dates normalisées (format ISO)
- [x] ✅ Pays extraits et normalisés
- [x] ✅ Secteurs détectés
- [x] ✅ Score de qualité calculé
- [x] ✅ Schéma MySQL standardisé
- [x] ✅ Index de recherche créés
- [ ] ⏳ Validation manuelle d'un échantillon
- [ ] ⏳ Export en format JSON
- [ ] ⏳ Documentation des colonnes

---

**Date de création:** 31 août 2026  
**Version:** 1.0  
**Auteur:** Système Gaynaako Collector
