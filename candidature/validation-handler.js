/**
 * Gestionnaire de Validation des Candidatures
 * Gère les cas où des informations obligatoires manquent
 */

const {
  analyzeApplication,
  saveFieldsToUserProfile,
  saveOrUpdateCandidature,
  loadFullUserProfile
} = require('./candidature-engine');

/**
 * Vérifie si une candidature peut être soumise
 * @param {string} userId - ID de l'utilisateur
 * @param {string} oppId - ID de l'opportunité
 * @returns {Object} Résultat de la validation
 */
async function validateSubmission(userId, oppId) {
  try {
    const analysis = await analyzeApplication(userId, oppId);

    // Si le dossier est complet (100%)
    if (analysis.ready_to_submit) {
      return {
        canSubmit: true,
        score: analysis.score_completude,
        message: 'Candidature complète et prête à être soumise',
        missingFields: []
      };
    }

    // Si des informations manquent
    return {
      canSubmit: false,
      score: analysis.score_completude,
      message: `Candidature incomplète (${analysis.score_completude}%). ${analysis.nb_manquants} information(s) manquante(s).`,
      missingFields: analysis.champs_manquants.map(field => ({
        key: field.key,
        label: field.label,
        description: field.description,
        source: field.source,
        required: true
      })),
      availableFields: Object.keys(analysis.champs_pre_remplis).map(key => ({
        key,
        label: analysis.champs_pre_remplis[key].label,
        value: analysis.champs_pre_remplis[key].value
      }))
    };

  } catch (error) {
    return {
      canSubmit: false,
      error: error.message,
      message: 'Erreur lors de la validation de la candidature'
    };
  }
}

/**
 * Génère un message d'erreur détaillé pour les informations manquantes
 * @param {Array} missingFields - Liste des champs manquants
 * @param {string} userRole - Rôle de l'utilisateur (ENTREPRENEUR, PME, ONG)
 * @returns {Object} Message d'erreur structuré
 */
function generateMissingFieldsError(missingFields, userRole) {
  const fieldsByCategory = {
    contact: [],
    profile: [],
    experience: [],
    documents: []
  };

  // Catégoriser les champs manquants
  missingFields.forEach(field => {
    if (['telephone', 'email'].includes(field.key)) {
      fieldsByCategory.contact.push(field);
    } else if (['cv_url', 'portfolio_url'].includes(field.key)) {
      fieldsByCategory.documents.push(field);
    } else if (['annees_experience', 'formation_principale'].includes(field.key)) {
      fieldsByCategory.experience.push(field);
    } else {
      fieldsByCategory.profile.push(field);
    }
  });

  // Construire le message
  let message = `❌ Votre candidature ne peut pas être soumise. ${missingFields.length} information(s) obligatoire(s) manquante(s) :\n\n`;

  if (fieldsByCategory.contact.length > 0) {
    message += `📞 Informations de contact :\n`;
    fieldsByCategory.contact.forEach(f => {
      message += `   • ${f.label}\n`;
    });
    message += '\n';
  }

  if (fieldsByCategory.profile.length > 0) {
    message += `👤 Informations de profil :\n`;
    fieldsByCategory.profile.forEach(f => {
      message += `   • ${f.label}\n`;
    });
    message += '\n';
  }

  if (fieldsByCategory.experience.length > 0) {
    message += `💼 Expérience & Formation :\n`;
    fieldsByCategory.experience.forEach(f => {
      message += `   • ${f.label}\n`;
    });
    message += '\n';
  }

  if (fieldsByCategory.documents.length > 0) {
    message += `📎 Documents :\n`;
    fieldsByCategory.documents.forEach(f => {
      message += `   • ${f.label}\n`;
    });
    message += '\n';
  }

  message += `💡 Veuillez compléter ces informations avant de soumettre votre candidature.\n`;
  message += `✅ Ces informations seront enregistrées dans votre profil pour vos prochaines candidatures.`;

  return {
    title: 'Candidature Incomplète',
    message,
    fields: missingFields,
    categorized: fieldsByCategory,
    actionRequired: 'complete_profile'
  };
}

/**
 * Suggère des valeurs par défaut ou des aides pour les champs manquants
 * @param {Array} missingFields - Champs manquants
 * @param {Object} userProfile - Profil utilisateur
 * @returns {Array} Champs avec suggestions
 */
function suggestFieldValues(missingFields, userProfile) {
  return missingFields.map(field => {
    const suggestion = {
      ...field,
      placeholder: '',
      hint: '',
      example: ''
    };

    switch (field.key) {
      case 'telephone':
        suggestion.placeholder = '+221 77 123 45 67';
        suggestion.hint = 'Format international recommandé';
        suggestion.example = '+221 77 123 45 67';
        break;

      case 'annees_experience':
        suggestion.placeholder = '5';
        suggestion.hint = 'Nombre d\'années d\'expérience professionnelle';
        suggestion.example = '5';
        break;

      case 'cv_url':
        suggestion.placeholder = 'https://linkedin.com/in/votre-profil';
        suggestion.hint = 'Lien vers votre CV en ligne (LinkedIn, Google Drive, etc.)';
        suggestion.example = 'https://linkedin.com/in/jean-dupont';
        break;

      case 'formation_principale':
        suggestion.placeholder = 'Master en Informatique';
        suggestion.hint = 'Votre diplôme le plus élevé';
        suggestion.example = 'Master 2 en Intelligence Artificielle';
        break;

      case 'domaine_expertise':
        suggestion.placeholder = 'Développement Web, Python, React';
        suggestion.hint = 'Vos compétences principales séparées par des virgules';
        suggestion.example = 'Intelligence Artificielle, Machine Learning, Python';
        break;

      case 'pays':
        suggestion.placeholder = 'Sénégal';
        suggestion.hint = 'Pays de résidence ou d\'implantation';
        suggestion.example = 'Sénégal';
        break;

      case 'nom_complet':
      case 'nom_entreprise':
      case 'nom_organisation':
        suggestion.hint = 'Nom complet tel qu\'il apparaîtra sur les documents officiels';
        break;

      default:
        suggestion.hint = field.description;
    }

    return suggestion;
  });
}

/**
 * Prépare un formulaire de complétion avec validation
 * @param {string} userId - ID utilisateur
 * @param {string} oppId - ID opportunité
 * @returns {Object} Formulaire structuré
 */
async function prepareCompletionForm(userId, oppId) {
  const validation = await validateSubmission(userId, oppId);

  if (validation.canSubmit) {
    return {
      success: true,
      needsCompletion: false,
      message: 'Candidature complète',
      score: validation.score
    };
  }

  const profile = await loadFullUserProfile(userId);
  const fieldsWithSuggestions = suggestFieldValues(validation.missingFields, profile);

  return {
    success: true,
    needsCompletion: true,
    score: validation.score,
    missingCount: validation.missingFields.length,
    fields: fieldsWithSuggestions,
    errorMessage: generateMissingFieldsError(validation.missingFields, profile.role),
    form: {
      title: 'Compléter Votre Candidature',
      subtitle: `${validation.missingFields.length} information(s) obligatoire(s) manquante(s)`,
      instructions: [
        'Remplissez les champs ci-dessous pour compléter votre candidature.',
        'Ces informations seront enregistrées dans votre profil.',
        'Vous n\'aurez pas à les ressaisir pour vos prochaines candidatures.'
      ],
      submitLabel: 'Enregistrer et Continuer',
      cancelLabel: 'Annuler'
    }
  };
}

/**
 * Valide et formate les données saisies avant enregistrement
 * @param {Object} fields - Champs saisis par l'utilisateur
 * @returns {Object} Résultat de la validation
 */
function validateFieldInputs(fields) {
  const errors = [];
  const validated = {};

  for (const [key, value] of Object.entries(fields)) {
    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    // Validation par type de champ
    switch (key) {
      case 'telephone':
        if (!trimmedValue || trimmedValue.length < 8) {
          errors.push({
            field: key,
            message: 'Numéro de téléphone invalide (minimum 8 caractères)'
          });
        } else {
          validated[key] = trimmedValue;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedValue)) {
          errors.push({
            field: key,
            message: 'Adresse email invalide'
          });
        } else {
          validated[key] = trimmedValue.toLowerCase();
        }
        break;

      case 'annees_experience':
        const years = parseInt(trimmedValue);
        if (isNaN(years) || years < 0 || years > 50) {
          errors.push({
            field: key,
            message: 'Années d\'expérience invalides (0-50)'
          });
        } else {
          validated[key] = years;
        }
        break;

      case 'cv_url':
      case 'portfolio_url':
        const urlRegex = /^https?:\/\/.+/;
        if (trimmedValue && !urlRegex.test(trimmedValue)) {
          errors.push({
            field: key,
            message: 'URL invalide (doit commencer par http:// ou https://)'
          });
        } else {
          validated[key] = trimmedValue;
        }
        break;

      default:
        if (!trimmedValue || trimmedValue.length === 0) {
          errors.push({
            field: key,
            message: 'Ce champ est obligatoire'
          });
        } else if (trimmedValue.length < 2) {
          errors.push({
            field: key,
            message: 'Valeur trop courte (minimum 2 caractères)'
          });
        } else {
          validated[key] = trimmedValue;
        }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    validated
  };
}

/**
 * Workflow complet : Validation → Complétion → Soumission
 * @param {string} userId - ID utilisateur
 * @param {string} oppId - ID opportunité
 * @param {Object} providedFields - Champs fournis par l'utilisateur
 * @returns {Object} Résultat du workflow
 */
async function completeAndSubmit(userId, oppId, providedFields = {}) {
  try {
    // 1. Validation initiale
    const initialValidation = await validateSubmission(userId, oppId);

    // Si déjà complet, soumettre directement
    if (initialValidation.canSubmit) {
      return {
        success: true,
        action: 'submitted',
        message: 'Candidature déjà complète et soumise',
        score: 100
      };
    }

    // 2. Si des champs sont fournis, les valider
    if (Object.keys(providedFields).length > 0) {
      const validation = validateFieldInputs(providedFields);

      if (!validation.isValid) {
        return {
          success: false,
          action: 'validation_failed',
          errors: validation.errors,
          message: 'Certains champs sont invalides'
        };
      }

      // 3. Enregistrer les champs validés
      await saveFieldsToUserProfile(userId, validation.validated);
      await saveOrUpdateCandidature(userId, oppId);

      // 4. Revérifier si complet maintenant
      const newValidation = await validateSubmission(userId, oppId);

      if (newValidation.canSubmit) {
        return {
          success: true,
          action: 'completed',
          message: 'Candidature complétée avec succès',
          score: 100,
          fieldsAdded: Object.keys(validation.validated)
        };
      } else {
        return {
          success: true,
          action: 'partially_completed',
          message: 'Informations enregistrées, mais d\'autres champs sont encore manquants',
          score: newValidation.score,
          remainingFields: newValidation.missingFields
        };
      }
    }

    // 5. Si aucun champ fourni, retourner le formulaire à compléter
    const form = await prepareCompletionForm(userId, oppId);
    return {
      success: true,
      action: 'needs_completion',
      ...form
    };

  } catch (error) {
    return {
      success: false,
      action: 'error',
      message: error.message
    };
  }
}

module.exports = {
  validateSubmission,
  generateMissingFieldsError,
  suggestFieldValues,
  prepareCompletionForm,
  validateFieldInputs,
  completeAndSubmit
};
