# 📄 Module 3 : Candidature Préremplie

**Version**: 1.0  
**Date**: 8 septembre 2026  
**Statut**: ✅ Opérationnel

---

## 🎯 Objectif

Système de candidature intelligente qui :
- ✅ **Prérempli automatiquement** les formulaires avec les données du profil
- ✅ **Identifie précisément** les informations manquantes
- ✅ **N'invente JAMAIS** de données
- ✅ **Enregistre les nouvelles informations** dans le profil
- ✅ **Génère des lettres de motivation** adaptées par IA

---

## 📁 Structure des Fichiers

```
candidature/
├── README.md                      # Ce fichier
├── candidature-engine.js          # Moteur métier principal
├── candidature-routes.js          # Routes Express API
├── schema-candidature-db.sql      # Schéma de la table candidatures
├── test-candidature.js            # Tests automatisés
├── GUIDE_UTILISATION.md           # Guide utilisateur
└── EXEMPLES.md                    # Exemples d'utilisation API
```

---

## 🔧 Installation

### 1. Base de données

```bash
# Créer la table candidatures
mysql -u root -p gaynaako_profils < candidature/schema-candidature-db.sql
```

### 2. Dépendances

Les dépendances sont déjà installées dans le projet parent :
- `express` - Serveur HTTP
- `mysql2` - Connexion MySQL
- `groq-sdk` - Génération de lettres IA
- `uuid` - Génération d'IDs uniques

---

## 🚀 Utilisation

### Dans le serveur API

```javascript
// Dans api-server.js ou server-ui.js
const candidatureRoutes = require('./candidature/candidature-routes');
app.use('/api/candidature', candidatureRoutes);
```

### Endpoints disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/candidature/prepare/:userId/:oppId` | GET | Prépare la candidature |
| `/api/candidature/complete` | POST | Enregistre les champs manquants |
| `/api/candidature/letter` | POST | Génère la lettre de motivation |
| `/api/candidature/list/:userId` | GET | Liste les candidatures |
| `/api/candidature/submit` | POST | Soumet une candidature |

---

## 📊 Workflow Complet

### 1. Préparation du dossier

```http
GET /api/candidature/prepare/usr-ent-001/01898e2c2502
```

**Réponse** :
```json
{
  "success": true,
  "user": { "id": "usr-ent-001", "nom": "Fatou Sow" },
  "opportunity": { "id": "01898e2c2502", "title": "..." },
  "champs_pre_remplis": {
    "nom_complet": { "label": "Nom complet", "value": "Fatou Sow" },
    "email": { "label": "Email", "value": "fatou.sow@..." }
  },
  "champs_manquants": [
    { "key": "telephone", "label": "Téléphone", "description": "..." }
  ],
  "score_completude": 87,
  "statut": "BROUILLON"
}
```

### 2. Compléter les informations manquantes

```http
POST /api/candidature/complete
Content-Type: application/json

{
  "userId": "usr-ent-001",
  "oppId": "01898e2c2502",
  "fields": {
    "telephone": "+221 77 123 45 67"
  }
}
```

### 3. Générer la lettre de motivation

```http
POST /api/candidature/letter
Content-Type: application/json

{
  "userId": "usr-ent-001",
  "oppId": "01898e2c2502"
}
```

### 4. Soumettre la candidature

```http
POST /api/candidature/submit
Content-Type: application/json

{
  "userId": "usr-ent-001",
  "oppId": "01898e2c2502"
}
```

---

## 🧪 Tests

### Exécuter les tests

```bash
node candidature/test-candidature.js
```

### Tests couverts

- ✅ Chargement du profil utilisateur
- ✅ Chargement de l'opportunité
- ✅ Analyse sans hallucination
- ✅ Identification des champs manquants
- ✅ Calcul du score de complétude
- ✅ Enregistrement dans la base
- ✅ Mise à jour du profil
- ✅ Génération de lettre IA

---

## 📋 Règles Métier

### Principe de Non-Hallucination

```
❌ Le système N'INVENTE JAMAIS de données
✅ Identification précise des informations manquantes
✅ Demande explicite à l'utilisateur
✅ Enregistrement permanent dans le profil
✅ Génération IA basée sur faits réels uniquement
```

### Champs Obligatoires par Rôle

#### ENTREPRENEUR
- Nom complet
- Email
- Téléphone
- Pays de résidence
- Domaine d'expertise
- Formation principale
- Années d'expérience
- CV/Références

#### PME
- Nom entreprise
- Email de contact
- Téléphone
- Pays d'implantation
- Secteurs d'activité

#### ONG
- Nom organisation
- Email officiel
- Téléphone
- Pays d'intervention
- Mission
- Domaines d'intervention

---

## 🗄️ Base de Données

### Table `candidatures`

```sql
CREATE TABLE candidatures (
  id VARCHAR(255) PRIMARY KEY,
  utilisateur_id VARCHAR(255) NOT NULL,
  opportunite_id VARCHAR(255) NOT NULL,
  statut ENUM('BROUILLON', 'COMPLETE', 'SOUMISE'),
  score_completude INT DEFAULT 0,
  champs_pre_remplis JSON,
  champs_manquants JSON,
  lettre_motivation LONGTEXT,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_mise_a_jour TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔍 Exemples Complets

Voir `EXEMPLES.md` pour des exemples détaillés d'utilisation.

---

## 🐛 Dépannage

### Erreur : "Opportunité introuvable"
- Vérifier que l'ID de l'opportunité existe dans `gaynaako_opportunities.opportunities_processed`

### Erreur : "GROQ_API_KEY non configurée"
- Ajouter `GROQ_API_KEY=...` dans le fichier `.env`
- Obtenir une clé gratuite sur https://console.groq.com

### Erreur : "Table candidatures doesn't exist"
- Exécuter le script `schema-candidature-db.sql`

---

## 📞 Support

Pour toute question sur le module candidature, contacter l'équipe technique Gaynaako.

---

**Dernière mise à jour** : 8 septembre 2026
