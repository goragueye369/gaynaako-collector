# 🎯 Guide Stratégie Gaynaako

> **Module d'aide à la décision stratégique pour les candidatures**

---

## 📋 Table des matières

1. [Présentation](#présentation)
2. [Fonctionnalités](#fonctionnalités)
3. [Architecture](#architecture)
4. [Utilisation](#utilisation)
5. [Format de sortie](#format-de-sortie)
6. [Exemples](#exemples)

---

## 🎯 Présentation

Le **Module 2 : Stratégie** aide l'utilisateur à définir une stratégie de recherche et de candidature. L'IA détermine :

- **Quelles opportunités privilégier** (priorisation intelligente)
- **Quelles sont les plus adaptées au profil** (match compétences)
- **Quelles candidatures faire en priorité** (ordre stratégique)
- **Quelles compétences améliorer** (analyse des gaps)

L'objectif est d'aider l'utilisateur à mieux orienter ses efforts et augmenter ses chances de succès.

---

## ⚡ Fonctionnalités

### 1. Priorisation Intelligente

Chaque opportunité reçoit un score global basé sur 3 critères pondérés :

```
Score Global = (Match Profil × 50%) + (Urgence × 25%) + (Attractivité × 25%)
```

**Match Profil (50%)** : Compatibilité entre profil et opportunité (secteurs, compétences, etc.)

**Urgence (25%)** : Proximité de la deadline
- ≤ 7 jours : 100/100
- ≤ 30 jours : 75/100
- ≤ 90 jours : 50/100
- > 90 jours : 25/100

**Attractivité (25%)** : Attractivité de l'opportunité
- Budget élevé : +30 points
- Qualité élevée : +25 points
- Urgence "Normal" : +20 points
- Budget "Moyen" : +15 points

### 2. Analyse des Gaps de Compétences

Le module identifie les compétences manquantes par rapport aux opportunités disponibles :

```
Profil : "Python, Django, SQL"
Opportunités requièrent : "Python, Django, Docker, Kubernetes"

Résultat : Docker et Kubernetes manquants
Recommandation : Ajouter Docker à vos compétences pour accéder à 23% d'opportunités supplémentaires
```

### 3. Conseils d'Optimisation

Le module génère automatiquement des conseils personnalisés :

```
💡 CONSEILS D'OPTIMISATION :

🎯 Urgence
   3 opportunités ont une deadline proche (≤30 jours). Priorisez-les !
   Action : Postuler rapidement

💰 Budget
   1 opportunités ont un budget élevé (>50M FCFA)
   Action : Cibler ces opportunités

🎯 Match
   5 opportunités correspondent très bien à votre profil
   Action : Focus sur ces candidatures

🔄 Diversification
   Les recommandations sont concentrées sur peu de secteurs. Élargissez votre recherche.
   Action : Explorer d'autres secteurs
```

---

## 🏗️ Architecture

### Fichier principal
```
strategy-advisor.py
```

### Fonctions clés

| Fonction | Description |
|----------|-------------|
| `load_user_profile()` | Charge le profil utilisateur complet |
| `load_opportunities()` | Charge toutes les opportunités valides |
| `calculate_match_score()` | Calcule le score de match profil ↔ opportunité |
| `calculate_urgency_score()` | Calcule le score d'urgence (deadline) |
| `calculate_attractiveness_score()` | Calcule le score d'attractivité |
| `analyze_skill_gaps()` | Analyse les gaps de compétences |
| `prioritize_opportunities()` | Priorise les opportunités pour un profil |
| `generate_strategy_report()` | Génère le rapport stratégique complet |

### Base de données

**gaynaako_profils** :
- `utilisateurs` (ID, email, role)
- `entrepreneur_profiles` (domaine_expertise, objectifs)
- `pme_profiles` (nom_entreprise)
- `ong_profiles` (nom_organisation, mission)

**gaynaako_opportunities** :
- `opportunities_processed` (title, description, sectors, quality_score, etc.)

---

## 🚀 Utilisation

### Commande de base

```bash
# Pour un utilisateur spécifique
python strategy-advisor.py usr-ent-001

# Pour tous les utilisateurs
python strategy-advisor.py
```

### Exemple de sortie

```
======================================================================
🎯 GAYNAAKO — CONSEILLER STRATÉGIQUE DE CANDIDATURE
======================================================================

📦 Chargement des opportunités...
   95 opportunités valides chargées

👤 1 profil(s) à analyser

======================================================================
👤 Fatou Sow (fatou.sow@gaynaako.sn)
   Secteurs : technologie
   Compétences : machine learning, deep learning, data science, python...
======================================================================

📊 RAPPORT STRATÉGIQUE
----------------------------------------------------------------------

📈 Résumé :
   - 95 opportunités analysées
   - Match moyen : 65%
   - Gaps de compétences : 0

🏆 TOP 5 RECOMMANDATIONS (stratégiques) :

   1. [39%] SAVE THE DATE : La Guinée sollicite l'expertise du Sénégal
      - Match profil : 68%
      - Urgence : 0/100
      - Attractivité : 21/100

   2. [39%] PNUD Sénégal | Rapport Annuel 2025
      - Match profil : 68%
      - Urgence : 0/100
      - Attractivité : 21/100

   ...

💡 CONSEILS D'OPTIMISATION :
   🎯 💰 Budget: 1 opportunités ont un budget élevé (>50M FCFA)
      Action : Cibler ces opportunités
```

---

## 📊 Format de sortie

Le module génère une sortie textuelle formatée avec :

### 1. Résumé
```
📈 Résumé :
   - [X] opportunités analysées
   - Match moyen : [XX]%
   - Gaps de compétences : [X]
```

### 2. Top 5 Recommandations
```
🏆 TOP 5 RECOMMANDATIONS (stratégiques) :

   1. [XX%] TITRE DE L'OPPORTUNITÉ
      - Match profil : XX%
      - Urgence : XX/100
      - Attractivité : XX/100
      - Deadline : YYYY-MM-DD (si disponible)
      - Budget : XXX,XXX,XXX FCFA (si disponible)
```

### 3. Gaps de Compétences
```
📚 AMÉLIORATIONS RECOMMANDÉES :
   - DOCKER: Requis par X opportunités
   - KUBERNETES: Requis par X opportunités
```

### 4. Conseils d'Optimisation
```
💡 CONSEILS D'OPTIMISATION :
   🎯 [TITRE]
   [DESCRIPTION]
   Action : [ACTION RECOMMANDÉE]
```

---

## 📖 Exemples

### Exemple 1 : Entrepreneur Data Scientist

**Profil** :
```
Nom : Fatou Sow
Email : fatou.sow@gaynaako.sn
Secteur : technologie
Compétences : data science, machine learning, python, deep learning
Objectifs : Développer et déployer des solutions d'IA
```

**Résultat** :
- Match moyen : 65%
- Top 5 opportunités : Toutes liées à l'IA/Data Science
- Conseil : Focus sur les opportunités avec budget élevé (>50M FCFA)

### Exemple 2 : PME BTP

**Profil** :
```
Nom : BTP Sahel Construction
Secteurs : agriculture, infrastructure
```

**Résultat** :
- Match moyen : 61%
- Top 5 opportunités : Projets d'infrastructure et agriculture
- Conseil : Prioriser les projets avec deadline proche

### Exemple 3 : ONG Santé

**Profil** :
```
Nom : Action Santé Sahel
Domaines : santé, eau
Mission : Améliorer l'accès aux soins de santé communautaire
```

**Résultat** :
- Match moyen : 61%
- Top 5 opportunités : Projets de santé publique
- Conseil : Les opportunités sont bien alignées avec la mission

---

## 🔧 Configuration avancée

### Modifier les poids

Éditer `strategy-advisor.py` :

```python
# Score global pondéré
# Modifier les coefficients ici
global_score = (
    match_score * 0.50 +        # Match profil (50%)
    urgency_score * 0.25 +      # Urgence (25%)
    attractiveness_score * 0.25 # Attractivité (25%)
)
```

### Modifier le seuil de priorisation

```python
# Top 5 recommandations
prioritized[:5]

# Pour changer le nombre
prioritized[:10]  # Top 10
prioritized[:3]   # Top 3
```

---

## 📊 Performance

- **Temps de calcul** : ~2-5 secondes pour 100 opportunités
- **Mémoire** : ~50 MB
- **CPU** : Faible (algorithmes simples)

---

## 🎯 Roadmap

- [ ] Intégration dans l'API REST (POST /api/strategy/:userId)
- [ ] Interface Web pour visualiser les stratégies
- [ ] Export PDF des rapports stratégiques
- [ ] Historique des stratégies générées
- [ ] Feedback loop (correction des recommandations)
- [ ] Fine-tuning des weights selon données réelles

---

## 📞 Support

Pour toute question sur le module stratégie :
- 📧 Email : equipe-data@gaynaako.sn
- 📚 Documentation : Voir `API_DOCUMENTATION.md`
- 🐛 Signaler un bug : Créer une issue dans le repo

---

**Dernière mise à jour** : Septembre 2026  
**Version** : 2.0  
**Auteur** : Équipe Data/IA Gaynaako
