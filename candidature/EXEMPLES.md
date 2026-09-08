# 📚 Exemples d'Utilisation - Module Candidature

---

## 🎯 Scénario 1 : Candidature Complète (Score 100%)

### Contexte
Un entrepreneur avec un profil complet souhaite candidater à une opportunité.

### Étape 1 : Préparer le dossier

**Requête**:
```http
GET /api/candidature/prepare/usr-ent-001/01898e2c2502
```

**Réponse**:
```json
{
  "success": true,
  "user": {
    "id": "usr-ent-001",
    "email": "fatou.sow@gaynaako.sn",
    "nom": "Fatou Sow",
    "role": "ENTREPRENEUR"
  },
  "opportunity": {
    "id": "01898e2c2502",
    "title": "Fourniture de matière d'œuvre périssable...",
    "source": "Marchés Publics Sénégal",
    "country": "Sénégal",
    "sectors": "agriculture,éducation"
  },
  "champs_pre_remplis": {
    "nom_complet": {
      "label": "Nom complet",
      "value": "Fatou Sow",
      "source": "profile"
    },
    "email": {
      "label": "Adresse email",
      "value": "fatou.sow@gaynaako.sn",
      "source": "user"
    },
    "telephone": {
      "label": "Numéro de téléphone",
      "value": "+221 77 123 45 67",
      "source": "user"
    },
    "pays": {
      "label": "Pays de résidence",
      "value": "Sénégal",
      "source": "profile"
    },
    "domaine_expertise": {
      "label": "Domaine d'expertise",
      "value": "Intelligence Artificielle, Machine Learning...",
      "source": "profile"
    },
    "formation_principale": {
      "label": "Formation / Diplôme principal",
      "value": "Master 2 en Intelligence Artificielle",
      "source": "profile"
    },
    "annees_experience": {
      "label": "Expérience professionnelle (années)",
      "value": "5",
      "source": "profile"
    },
    "cv_url": {
      "label": "CV / Références",
      "value": "https://storage.gaynaako.sn/cv/fatou_sow.pdf",
      "source": "profile"
    }
  },
  "champs_manquants": [],
  "total_requis": 8,
  "nb_remplis": 8,
  "nb_manquants": 0,
  "score_completude": 100,
  "statut": "COMPLETE",
  "ready_to_submit": true
}
```

### Étape 2 : Générer la lettre de motivation

**Requête**:
```http
POST /api/candidature/letter
Content-Type: application/json

{
  "userId": "usr-ent-001",
  "oppId": "01898e2c2502"
}
```

**Réponse**:
```json
{
  "success": true,
  "opportunite_id": "01898e2c2502",
  "utilisateur_id": "usr-ent-001",
  "lettre_motivation": "Dakar, le 8 septembre 2026\n\nFatou Sow\nExperte en Intelligence Artificielle\nfatou.sow@gaynaako.sn\n+221 77 123 45 67\nDakar, Sénégal\n\nÀ l'attention de\nMarchés Publics Sénégal\n\nObjet : Candidature pour la fourniture de matière d'œuvre périssable...\n\nMadame, Monsieur,\n\nTitulaire d'un Master 2 en Intelligence Artificielle et forte de 5 années d'expérience dans le domaine du Machine Learning et du Deep Learning, je me permets de soumettre ma candidature pour le projet susmentionné.\n\nMon expertise en Intelligence Artificielle, combinée à ma maîtrise de Python et du NLP, me permet d'apporter une approche innovante et orientée données à votre projet. Au cours de mes 5 années d'expérience, j'ai développé des solutions d'IA prédictive pour diverses entreprises et institutions en Afrique de l'Ouest.\n\nMa formation académique solide, couplée à mon expérience pratique, me permet de comprendre les enjeux techniques et opérationnels de votre appel d'offres. Je suis convaincue que mon profil correspond parfaitement aux exigences de ce projet.\n\nMon CV, disponible à l'adresse https://storage.gaynaako.sn/cv/fatou_sow.pdf, détaille l'ensemble de mes réalisations et compétences.\n\nJe reste à votre entière disposition pour tout complément d'information et pour un entretien à votre convenance.\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\nFatou Sow",
  "message": "Lettre de motivation générée avec succès"
}
```

### Étape 3 : Soumettre la candidature

**Requête**:
```http
POST /api/candidature/submit
Content-Type: application/json

{
  "userId": "usr-ent-001",
  "oppId": "01898e2c2502"
}
```

**Réponse**:
```json
{
  "success": true,
  "candidature_id": "cand_usr-ent-001_01898e2c2502",
  "statut": "SOUMISE",
  "date_soumission": "2026-09-08T12:30:00Z",
  "message": "Candidature soumise avec succès"
}
```

---

## ⚠️ Scénario 2 : Candidature Incomplète (Score 62%)

### Contexte
Une PME avec des informations manquantes dans son profil.

### Étape 1 : Préparer le dossier

**Requête**:
```http
GET /api/candidature/prepare/usr-pme-001/02bec1d2f672
```

**Réponse**:
```json
{
  "success": true,
  "user": {
    "id": "usr-pme-001",
    "email": "contact@techsolutions.sn",
    "nom": "Tech Solutions Sénégal",
    "role": "PME"
  },
  "opportunity": {
    "id": "02bec1d2f672",
    "title": "Consultation pour étude de faisabilité...",
    "source": "BAD",
    "country": "International"
  },
  "champs_pre_remplis": {
    "nom_entreprise": {
      "label": "Nom de l'entreprise",
      "value": "Tech Solutions Sénégal",
      "source": "profile"
    },
    "email": {
      "label": "Email de contact",
      "value": "contact@techsolutions.sn",
      "source": "user"
    },
    "pays": {
      "label": "Pays d'implantation",
      "value": "Sénégal",
      "source": "profile"
    },
    "secteurs": {
      "label": "Secteurs d'activité",
      "value": "technologie, services numériques",
      "source": "profile"
    }
  },
  "champs_manquants": [
    {
      "key": "telephone",
      "label": "Numéro de téléphone",
      "source": "user",
      "description": "Veuillez renseigner votre numéro de téléphone"
    }
  ],
  "total_requis": 5,
  "nb_remplis": 4,
  "nb_manquants": 1,
  "score_completude": 80,
  "statut": "BROUILLON",
  "ready_to_submit": false
}
```

### Étape 2 : Compléter les informations manquantes

**Requête**:
```http
POST /api/candidature/complete
Content-Type: application/json

{
  "userId": "usr-pme-001",
  "oppId": "02bec1d2f672",
  "fields": {
    "telephone": "+221 33 825 50 50"
  }
}
```

**Réponse**:
```json
{
  "success": true,
  "profile_updated": {
    "telephone": "+221 33 825 50 50"
  },
  "candidature": {
    "success": true,
    "candidature_id": "cand_usr-pme-001_02bec1d2f672",
    "score_completude": 100,
    "statut": "COMPLETE",
    "ready_to_submit": true,
    "champs_manquants": []
  },
  "message": "Informations enregistrées avec succès dans votre profil et votre dossier."
}
```

### Étape 3 : Vérifier la mise à jour

**Requête**:
```http
GET /api/candidature/prepare/usr-pme-001/02bec1d2f672
```

**Réponse**:
```json
{
  "success": true,
  "user": { ... },
  "opportunity": { ... },
  "champs_pre_remplis": {
    "nom_entreprise": { ... },
    "email": { ... },
    "telephone": {
      "label": "Numéro de téléphone",
      "value": "+221 33 825 50 50",
      "source": "user"
    },
    "pays": { ... },
    "secteurs": { ... }
  },
  "champs_manquants": [],
  "score_completude": 100,
  "statut": "COMPLETE",
  "ready_to_submit": true
}
```

---

## 📋 Scénario 3 : Lister les Candidatures

### Requête
```http
GET /api/candidature/list/usr-ent-001
```

### Réponse
```json
{
  "success": true,
  "userId": "usr-ent-001",
  "count": 3,
  "data": [
    {
      "id": "cand_usr-ent-001_01898e2c2502",
      "utilisateur_id": "usr-ent-001",
      "opportunite_id": "01898e2c2502",
      "statut": "SOUMISE",
      "score_completude": 100,
      "champs_pre_remplis": "...",
      "champs_manquants": "[]",
      "lettre_motivation": "Dakar, le 8 septembre...",
      "date_creation": "2026-09-08T10:00:00Z",
      "date_mise_a_jour": "2026-09-08T12:30:00Z",
      "opportunite": {
        "id": "01898e2c2502",
        "title": "Fourniture de matière d'œuvre périssable...",
        "url": "https://...",
        "sectors": "agriculture,éducation",
        "country": "Sénégal",
        "source_name": "Marchés Publics Sénégal"
      }
    },
    {
      "id": "cand_usr-ent-001_02eeb6d78f48",
      "utilisateur_id": "usr-ent-001",
      "opportunite_id": "02eeb6d78f48",
      "statut": "COMPLETE",
      "score_completude": 100,
      "date_creation": "2026-09-07T15:20:00Z",
      "date_mise_a_jour": "2026-09-07T16:45:00Z",
      "opportunite": {
        "id": "02eeb6d78f48",
        "title": "Punjab Rural Sustainable Water...",
        "country": "International"
      }
    },
    {
      "id": "cand_usr-ent-001_04b8bd011a00",
      "utilisateur_id": "usr-ent-001",
      "opportunite_id": "04b8bd011a00",
      "statut": "BROUILLON",
      "score_completude": 87,
      "champs_manquants": "[{\"key\":\"cv_url\",\"label\":\"CV\"}]",
      "date_creation": "2026-09-06T09:15:00Z",
      "date_mise_a_jour": "2026-09-06T09:15:00Z",
      "opportunite": {
        "id": "04b8bd011a00",
        "title": "P-LR-HAB-001"
      }
    }
  ]
}
```

---

## 🔍 Scénario 4 : Extraction Automatique de Données

### Contexte
L'utilisateur fournit des informations dans un message libre.

### Message utilisateur
```
"Bonjour, je suis développeur Python avec 7 ans d'expérience. 
Mon numéro est le +221 77 555 44 33. 
J'ai un Master en Informatique de l'université de Dakar."
```

### Traitement automatique
```javascript
const { extractCandidateInputs } = require('./candidature-engine');

const extracted = extractCandidateInputs(message);
console.log(extracted);
```

### Résultat
```json
{
  "telephone": "+221 77 555 44 33",
  "annees_experience": 7,
  "formation_principale": "Master en Informatique",
  "ville": "Dakar"
}
```

### Enregistrement automatique
```javascript
await saveFieldsToUserProfile('usr-ent-001', extracted);
```

---

## 🚫 Scénario 5 : Respect de la Règle de Non-Hallucination

### ❌ Ce que le système NE FAIT PAS

**Profil incomplet**:
```json
{
  "nom": "Jean Dupont",
  "email": "jean@example.com",
  "telephone": null,
  "experience": null,
  "cv_url": null
}
```

**Le système N'INVENTERA PAS**:
```json
{
  "telephone": "+221 77 000 00 00",  // ❌ Inventé
  "experience": "5 ans",              // ❌ Inventé
  "cv_url": "http://fake-cv.com"     // ❌ Inventé
}
```

### ✅ Ce que le système FAIT

**Identification précise**:
```json
{
  "champs_manquants": [
    {
      "key": "telephone",
      "label": "Numéro de téléphone",
      "description": "Veuillez renseigner votre numéro de téléphone"
    },
    {
      "key": "annees_experience",
      "label": "Années d'expérience",
      "description": "Veuillez indiquer vos années d'expérience"
    },
    {
      "key": "cv_url",
      "label": "CV / Références",
      "description": "Veuillez fournir un lien vers votre CV"
    }
  ],
  "message": "❌ 3 informations obligatoires manquantes. Veuillez les compléter avant de poursuivre."
}
```

---

## 📊 Cas d'Usage Frontend

### Interface React/Vue

```javascript
// 1. Charger la candidature
const response = await fetch(`/api/candidature/prepare/${userId}/${oppId}`);
const data = await response.json();

// 2. Afficher les informations disponibles
data.champs_pre_remplis.forEach(field => {
  console.log(`✅ ${field.label}: ${field.value}`);
});

// 3. Afficher les champs manquants
data.champs_manquants.forEach(field => {
  console.log(`❌ ${field.label} - ${field.description}`);
  // Afficher un champ de formulaire pour que l'utilisateur complète
});

// 4. Calculer la progression
const progress = data.score_completude;
console.log(`Complétude: ${progress}%`);

// 5. Activer/désactiver le bouton de soumission
const canSubmit = data.ready_to_submit;
```

---

## 🎯 Bonnes Pratiques

### 1. Toujours vérifier le score avant soumission
```javascript
if (data.score_completude < 100) {
  alert(`Votre dossier est incomplet (${data.score_completude}%). Veuillez compléter les informations manquantes.`);
  return;
}
```

### 2. Enregistrer progressivement
```javascript
// Enregistrer dès qu'un champ est complété
async function onFieldChange(key, value) {
  await fetch('/api/candidature/complete', {
    method: 'POST',
    body: JSON.stringify({ userId, oppId, fields: { [key]: value } })
  });
}
```

### 3. Afficher un feedback clair
```javascript
if (data.champs_manquants.length > 0) {
  const message = `❌ ${data.champs_manquants.length} information(s) manquante(s):\n`;
  data.champs_manquants.forEach(f => {
    message += `\n• ${f.label}`;
  });
  alert(message);
}
```

---

**Dernière mise à jour**: 8 septembre 2026
