# 📦 LIVRABLES POUR LE BACKEND - GAYNAAKO API

**Date** : 2026-09-01  
**Version** : 1.0 (MVP)  
**Contact Data/IA** : [Votre email]

---

## ✅ **CE QUI EST PRÊT ET LIVRABLE**

### **1. API REST Opérationnelle**

**URL** : `http://localhost:3001`  
**Status** : ✅ En ligne et testée  
**Documentation** : Voir `API_DOCUMENTATION.md`

#### **Endpoints disponibles** :

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/health` | GET | Vérifier l'état de l'API |
| `/api/opportunities` | GET | Liste des opportunités avec filtres |
| `/api/opportunities/:id` | GET | Détails d'une opportunité |
| `/api/opportunities/:id/similar` | GET | Opportunités similaires (embeddings) |
| `/api/opportunities/:id/nlp` | GET | Données NLP extraites |
| `/api/opportunities/profile/:profiles` | GET | Opportunités par profils |
| `/api/search` | GET | Recherche textuelle |
| `/api/statistics` | GET | Statistiques globales |
| `/api/sectors` | GET | Liste des secteurs |
| `/api/countries` | GET | Liste des pays |

---

### **2. Base de Données MySQL**

**Nom** : `gaynaako_opportunities`  
**Credentials** :
```
Host: localhost
Port: 3306
User: gaynaako_api
Password: apipassword123
Database: gaynaako_opportunities
```

#### **Tables** :

**Table 1 : `opportunities_processed`** (57 opportunités)
- Données de base : title, description, url, sectors, country, date_published
- Métadonnées IA : target_audience, experience_required, budget_range, urgency, complexity_level, suggested_profiles, quality_score
- Colonnes NLP : nlp_amounts, nlp_deadlines, nlp_organizations, nlp_emails, nlp_phones, nlp_keywords, nlp_quality_score, nlp_processed_at
- Dates : collected_at, updated_at

**Table 2 : `opportunity_embeddings`** (44 embeddings)
- opportunity_id, embedding (vecteur 384 dimensions), embedding_dim, model_name, created_at

**Schéma complet** : Voir `schema-enriched.sql`

---

### **3. Pipeline de Collecte Automatique**

**Status** : ✅ Opérationnel avec PM2  
**Fréquence** : Tous les jours à 13h05 (configurable)  
**Processus** :
1. Scraping Gaynaako.sn
2. Nettoyage des données
3. Enrichissement métadonnées IA
4. Import MySQL
5. Analyse NLP (montants, deadlines, organisations, emails)
6. Génération embeddings (recherche sémantique)

**Gestion PM2** :
```bash
pm2 list                    # Voir l'état
pm2 logs                    # Voir les logs
pm2 restart gaynaako-api    # Redémarrer l'API
pm2 stop all                # Arrêter tout
```

---

### **4. Données Enrichies Disponibles**

#### **Métadonnées générées par IA** :
- `target_audience` : Développeurs, Designers, Consultants, etc.
- `experience_required` : Junior, Intermédiaire, Senior
- `budget_range` : Petit budget, Moyen, Élevé
- `urgency` : Urgent, Normal, Flexible
- `complexity_level` : Simple, Modéré, Complexe
- `suggested_profiles` : expert_tech, fullstack_dev, data_scientist, etc.
- `quality_score` : 0-100 (complétude des données)

#### **Données NLP extraites** :
- `nlp_amounts` : Budgets/montants détectés (JSON)
- `nlp_deadlines` : Dates limites (JSON)
- `nlp_organizations` : Entreprises mentionnées (JSON)
- `nlp_emails` : Emails de contact (JSON)
- `nlp_phones` : Téléphones (JSON)
- `nlp_keywords` : Mots-clés extraits (JSON)
- `nlp_quality_score` : 0-10 (qualité extractions)

#### **Embeddings pour recherche sémantique** :
- Vecteurs de 384 dimensions
- Modèle : paraphrase-multilingual-MiniLM-L12-v2
- Usage : similarité cosinus, recommandations, recherche intelligente

---

## ⏳ **CE QUI EST EN COURS DE DÉVELOPPEMENT**

### **Modules IA restants** (livrables prochains) :

| Module | Status | Livraison estimée |
|--------|--------|-------------------|
| **Moteur de Recommandation** | 🔄 En cours | J+3 |
| **Score d'Éligibilité** | 🔄 En cours | J+3 |
| **Résumé Automatique** | ⏸️ Planifié | J+5 |
| **Chatbot IA** | ⏸️ Planifié | J+7 |

Ces modules seront livrés sous forme de :
- Scripts Python autonomes
- Nouveaux endpoints API REST
- Documentation complète

---

## 🚀 **COMMENT UTILISER L'API**

### **Exemple 1 : Récupérer les 10 dernières opportunités**
```bash
GET http://localhost:3001/api/opportunities?limit=10&offset=0
```

### **Exemple 2 : Filtrer par secteur et pays**
```bash
GET http://localhost:3001/api/opportunities?sector=Technologie&country=Sénégal&min_quality=60
```

### **Exemple 3 : Rechercher par mots-clés**
```bash
GET http://localhost:3001/api/search?q=python django&limit=5
```

### **Exemple 4 : Opportunités similaires (IA)**
```bash
GET http://localhost:3001/api/opportunities/42/similar?limit=5
```

### **Exemple 5 : Données NLP d'une opportunité**
```bash
GET http://localhost:3001/api/opportunities/42/nlp
```

### **Exemple 6 : Statistiques globales**
```bash
GET http://localhost:3001/api/statistics
```

**Documentation complète** : Voir `API_DOCUMENTATION.md` pour tous les endpoints avec exemples détaillés.

---

## 📊 **STATISTIQUES ACTUELLES**

- **Total opportunités** : 57
- **Opportunités avec NLP** : 44 (77%)
- **Opportunités avec embeddings** : 44 (77%)
- **Score qualité moyen** : 60.7/100
- **Score NLP moyen** : 2.1/10
- **Sources** : Gaynaako.sn (extensible)
- **Mise à jour** : Automatique quotidienne

---

## 🔧 **CONFIGURATION POUR INTÉGRATION**

### **Variables d'environnement recommandées** :

```env
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=gaynaako_api
DB_PASSWORD=apipassword123
DB_NAME=gaynaako_opportunities

# API
PORT=3001
NODE_ENV=development

# CORS (à ajuster selon votre frontend)
CORS_ORIGIN=http://localhost:3000
```

### **Dépendances Node.js** :
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "cors": "^2.8.5"
  }
}
```

---

## 📝 **NOTES IMPORTANTES**

### **Gestion des NULL** :
Les colonnes NLP peuvent être `NULL` si :
- L'opportunité a un `quality_score ≤ 50` (données insuffisantes)
- Le NLP n'a trouvé aucune information à extraire

**Toujours gérer les NULL dans votre code** :
```javascript
const budget = opportunity.nlp_amounts || "Non spécifié";
const hasNLP = opportunity.nlp_processed_at !== null;
```

### **Pagination** :
```javascript
const page = 2;
const limit = 10;
const offset = (page - 1) * limit;
```

### **Similarité avec embeddings** :
Le score de similarité va de 0 à 1 :
- **> 0.8** : Très similaire
- **0.5 - 0.8** : Similaire
- **< 0.5** : Peu similaire

---

## 📧 **SUPPORT & CONTACT**

Pour toute question sur l'API ou les données :
- **Email** : [Votre email]
- **Documentation** : Voir `API_DOCUMENTATION.md`
- **Schéma base** : Voir `schema-enriched.sql`
- **Code source** : `api-server.js`

---

## ✅ **CHECKLIST D'INTÉGRATION**

Avant d'intégrer l'API dans votre backend, vérifiez :

- [ ] MySQL accessible avec les credentials fournis
- [ ] API répond sur `http://localhost:3001/api/health`
- [ ] Endpoint `/api/opportunities` retourne des données
- [ ] Lecture de `API_DOCUMENTATION.md` complète
- [ ] Gestion des NULL implémentée
- [ ] Variables d'environnement configurées
- [ ] Tests de charge effectués (optionnel)

---

**L'API est prête pour l'intégration ! 🚀**

Les modules IA supplémentaires seront livrés progressivement selon le planning défini.
