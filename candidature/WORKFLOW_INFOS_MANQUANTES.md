# 🔄 Workflow : Gestion des Informations Manquantes

**Scénario** : Un utilisateur essaie de soumettre une candidature mais il lui manque des informations obligatoires.

---

## 📊 Diagramme du Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. L'utilisateur clique sur "Soumettre ma candidature"     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Le système vérifie le score de complétude               │
│    POST /api/candidature/submit                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼ (Score < 100%)      ▼ (Score = 100%)
   ┌────────────┐      ┌──────────────┐
   │ INCOMPLET  │      │   COMPLET    │
   └──────┬─────┘      └──────┬───────┘
          │                   │
          ▼                   ▼
┌─────────────────────┐  ┌────────────────┐
│ 3a. Erreur 400      │  │ 3b. Soumission │
│ + Liste des champs  │  │     réussie    │
│     manquants       │  │   ✅ SOUMISE   │
└──────┬──────────────┘  └────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 4. Afficher un modal/formulaire avec :                  │
│    ❌ Champs manquants (téléphone, CV, etc.)            │
│    💡 Exemples et suggestions                           │
│    ✏️  Formulaire de saisie                             │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 5. L'utilisateur remplit les champs                     │
│    Clic sur "Enregistrer"                               │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 6. POST /api/candidature/complete                       │
│    { userId, oppId, fields: {...} }                     │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 7. Enregistrement dans le profil ✅                     │
│    gaynaako_profils.utilisateurs                        │
│    gaynaako_profils.entrepreneur_profiles               │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ 8. Recalcul du score de complétude                      │
│    Nouvelle analyse : analyzeApplication()              │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼ (Score = 100%)
┌──────────────────────────────────────────────────────────┐
│ 9. Candidature maintenant complète !                    │
│    Proposition de soumettre à nouveau                    │
└──────────────────────────────────────────────────────────┘
```

---

## 🔍 Étape 1 : Tentative de Soumission

### Requête Initiale

```http
POST /api/candidature/submit
Content-Type: application/json

{
  "userId": "usr-ent-001",
  "oppId": "01898e2c2502"
}
```

---

## ❌ Cas 1 : Candidature Incomplète (Score < 100%)

### Réponse API (Status 400)

```json
{
  "success": false,
  "error": "candidature_incomplete",
  "message": "Candidature incomplète (62%). 3 information(s) manquante(s).",
  "score": 62,
  "missingFields": [
    {
      "key": "telephone",
      "label": "Numéro de téléphone",
      "description": "Veuillez renseigner votre numéro de téléphone",
      "source": "user",
      "required": true
    },
    {
      "key": "annees_experience",
      "label": "Années d'expérience",
      "description": "Veuillez indiquer vos années d'expérience professionnelle",
      "source": "profile",
      "required": true
    },
    {
      "key": "cv_url",
      "label": "CV / Références",
      "description": "Veuillez fournir un lien vers votre CV",
      "source": "profile",
      "required": true
    }
  ],
  "completionForm": {
    "needsCompletion": true,
    "score": 62,
    "missingCount": 3,
    "fields": [
      {
        "key": "telephone",
        "label": "Numéro de téléphone",
        "placeholder": "+221 77 123 45 67",
        "hint": "Format international recommandé",
        "example": "+221 77 123 45 67",
        "required": true
      },
      {
        "key": "annees_experience",
        "label": "Années d'expérience",
        "placeholder": "5",
        "hint": "Nombre d'années d'expérience professionnelle",
        "example": "5",
        "required": true
      },
      {
        "key": "cv_url",
        "label": "CV / Références",
        "placeholder": "https://linkedin.com/in/votre-profil",
        "hint": "Lien vers votre CV en ligne",
        "example": "https://linkedin.com/in/jean-dupont",
        "required": true
      }
    ],
    "errorMessage": {
      "title": "Candidature Incomplète",
      "message": "❌ Votre candidature ne peut pas être soumise. 3 information(s) obligatoire(s) manquante(s) :\n\n📞 Informations de contact :\n   • Numéro de téléphone\n\n💼 Expérience & Formation :\n   • Années d'expérience\n\n📎 Documents :\n   • CV / Références\n\n💡 Veuillez compléter ces informations avant de soumettre votre candidature.\n✅ Ces informations seront enregistrées dans votre profil pour vos prochaines candidatures."
    },
    "form": {
      "title": "Compléter Votre Candidature",
      "subtitle": "3 information(s) obligatoire(s) manquante(s)",
      "instructions": [
        "Remplissez les champs ci-dessous pour compléter votre candidature.",
        "Ces informations seront enregistrées dans votre profil.",
        "Vous n'aurez pas à les ressaisir pour vos prochaines candidatures."
      ],
      "submitLabel": "Enregistrer et Continuer",
      "cancelLabel": "Annuler"
    }
  },
  "action_required": "complete_fields_before_submit"
}
```

---

## ✏️  Étape 2 : Afficher le Formulaire de Complétion

### Interface Utilisateur (Exemple React)

```jsx
function CandidatureSubmitModal({ userId, oppId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Tentative de soumission
      const response = await fetch('/api/candidature/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, oppId })
      });

      const data = await response.json();

      if (data.success) {
        // ✅ Soumission réussie
        alert('Candidature soumise avec succès !');
        window.location.reload();
      } else if (data.error === 'candidature_incomplete') {
        // ❌ Informations manquantes
        setError(data);
        // Afficher le formulaire de complétion
      }
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteFields = async () => {
    // Enregistrer les champs saisis
    const response = await fetch('/api/candidature/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        oppId,
        fields: formData
      })
    });

    const result = await response.json();

    if (result.success) {
      // Réessayer la soumission
      handleSubmit();
    }
  };

  if (error) {
    return (
      <div className="modal">
        <h2>{error.completionForm.form.title}</h2>
        <p>{error.completionForm.form.subtitle}</p>
        
        <div className="error-message">
          {error.completionForm.errorMessage.message}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleCompleteFields(); }}>
          {error.completionForm.fields.map(field => (
            <div key={field.key} className="form-group">
              <label>{field.label} *</label>
              <input
                type="text"
                placeholder={field.placeholder}
                onChange={(e) => setFormData({
                  ...formData,
                  [field.key]: e.target.value
                })}
                required
              />
              <small>{field.hint}</small>
            </div>
          ))}

          <div className="buttons">
            <button type="button" onClick={() => setError(null)}>
              {error.completionForm.form.cancelLabel}
            </button>
            <button type="submit" className="primary">
              {error.completionForm.form.submitLabel}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? 'Soumission...' : '🚀 Soumettre ma candidature'}
    </button>
  );
}
```

---

## 📝 Étape 3 : Enregistrement des Informations

### Requête de Complétion

```http
POST /api/candidature/complete
Content-Type: application/json

{
  "userId": "usr-ent-001",
  "oppId": "01898e2c2502",
  "fields": {
    "telephone": "+221 77 123 45 67",
    "annees_experience": 5,
    "cv_url": "https://linkedin.com/in/fatou-sow"
  }
}
```

### Réponse

```json
{
  "success": true,
  "profile_updated": {
    "telephone": "+221 77 123 45 67",
    "annees_experience": 5,
    "cv_url": "https://linkedin.com/in/fatou-sow"
  },
  "candidature": {
    "success": true,
    "candidature_id": "cand_usr-ent-001_01898e2c2502",
    "score_completude": 100,
    "statut": "COMPLETE",
    "ready_to_submit": true,
    "champs_manquants": []
  },
  "message": "Informations enregistrées avec succès dans votre profil et votre dossier."
}
```

---

## ✅ Cas 2 : Candidature Complète (Score = 100%)

### Tentative de Soumission (après complétion)

```http
POST /api/candidature/submit
Content-Type: application/json

{
  "userId": "usr-ent-001",
  "oppId": "01898e2c2502"
}
```

### Réponse (Status 200)

```json
{
  "success": true,
  "message": "Candidature soumise avec succès",
  "statut": "SOUMISE",
  "date_soumission": "2026-09-08T14:30:00Z",
  "score": 100
}
```

---

## 🔄 Endpoint de Validation Préalable

### Vérifier Avant Soumission

```http
POST /api/candidature/validate
Content-Type: application/json

{
  "userId": "usr-ent-001",
  "oppId": "01898e2c2502"
}
```

### Réponse si Incomplet

```json
{
  "success": true,
  "validation": {
    "canSubmit": false,
    "score": 62,
    "message": "Candidature incomplète (62%). 3 information(s) manquante(s).",
    "missingFields": [...],
    "availableFields": [...]
  }
}
```

### Réponse si Complet

```json
{
  "success": true,
  "validation": {
    "canSubmit": true,
    "score": 100,
    "message": "Candidature complète et prête à être soumise",
    "missingFields": []
  }
}
```

---

## 💡 Bonnes Pratiques Frontend

### 1. Valider Avant d'Afficher le Bouton

```javascript
// Désactiver le bouton si incomplet
const [canSubmit, setCanSubmit] = useState(false);

useEffect(() => {
  fetch(`/api/candidature/validate`, {
    method: 'POST',
    body: JSON.stringify({ userId, oppId })
  })
    .then(r => r.json())
    .then(data => setCanSubmit(data.validation.canSubmit));
}, [userId, oppId]);

return (
  <button disabled={!canSubmit}>
    {canSubmit ? '🚀 Soumettre' : '⚠️ Compléter avant soumission'}
  </button>
);
```

### 2. Afficher le Score en Temps Réel

```javascript
<div className="progress-bar">
  <div className="fill" style={{ width: `${score}%` }} />
  <span>{score}% complet</span>
</div>
```

### 3. Afficher les Champs Manquants

```javascript
{missingFields.length > 0 && (
  <div className="alert warning">
    ⚠️ {missingFields.length} information(s) manquante(s)
    <ul>
      {missingFields.map(f => (
        <li key={f.key}>❌ {f.label}</li>
      ))}
    </ul>
  </div>
)}
```

---

## 📊 Résumé du Workflow

| Étape | Action | Endpoint | Statut |
|-------|--------|----------|--------|
| 1 | Validation préalable | `POST /validate` | Vérifier |
| 2 | Tentative soumission | `POST /submit` | 400 si incomplet |
| 3 | Afficher formulaire | Frontend | Formulaire modal |
| 4 | Compléter infos | `POST /complete` | Enregistrer |
| 5 | Nouvelle tentative | `POST /submit` | 200 si complet |

---

**Dernière mise à jour** : 8 septembre 2026
