# 📝 Changelog - Gaynaako Collector

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

---

## [2.0.0] - 2026-09-03

### ✨ Ajouté
- **Système de Matching IA** complet avec BGE-M3 (1024D)
- **API REST** complète pour intégration backend (port 3001)
- **Documentation d'intégration** (`INTEGRATION.md`)
- **Template de configuration** (`.env.example`)
- **Pipeline automatisé** avec scheduler PM2
- Support de **2 bases de données** : `gaynaako_opportunities` + `gaynaako_profils`
- **Recommandations sémantiques** (70% IA + 30% règles métier)
- **Interface Web de test** du matching (port 3000)

### 🔧 Modifié
- **README.md** : Ajout du contexte module backend + architecture complète
- **requirements.txt** : Fusion avec requirements-python.txt (un seul fichier)
- **.gitignore** : Ajout protection .env, logs, cache, etc.
- Organisation : `analyse_collecte.ipynb` déplacé dans `/data`

### 🗑️ Supprimé
- **requirements-python.txt** : Fusionné dans requirements.txt

### 📚 Documentation
- Guide d'intégration backend complet
- Documentation API enrichie
- Guide de configuration (.env.example)
- CHANGELOG pour suivi des versions

---

## [1.0.0] - 2026-08-31

### ✨ Version Initiale
- Collecte automatique depuis 10+ sources web
- Nettoyage et normalisation des données
- Enrichissement NLP (montants, dates, organisations, emails)
- Génération embeddings (384D avec MiniLM)
- Import automatique en MySQL
- Notebook Jupyter d'analyse

---

## Format

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

**Types de changements** :
- `Ajouté` : Nouvelles fonctionnalités
- `Modifié` : Changements dans des fonctionnalités existantes
- `Déprécié` : Fonctionnalités qui seront retirées
- `Supprimé` : Fonctionnalités retirées
- `Corrigé` : Corrections de bugs
- `Sécurité` : Corrections de vulnérabilités
