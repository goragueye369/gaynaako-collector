/**
 * 🤖 MOTEUR DE MATCHING HYBRIDE GAYNAAKO
 * 
 * Combine :
 * 1. Score IA (Similarité Sémantique BGE-M3 / Embeddings / Synonymes)
 * 2. Score Règles Métier (Études, Expérience, Secteurs, Pays, Compétences)
 * 3. Explicabilité complète (Forces & Points de vigilance)
 */

// Équivalences sémantiques et synonymes de compétences / métiers
const SYNONYMS_MAP = {
  // IA & Data
  "machine learning": ["apprentissage automatique", "ml", "ia", "intelligence artificielle", "modélisation prédictive"],
  "apprentissage automatique": ["machine learning", "ml", "ia", "intelligence artificielle"],
  "deep learning": ["apprentissage profond", "réseaux de neurones", "ia"],
  "nlp": ["traitement automatique du langage naturel", "traitement du langage naturel", "taln", "text mining"],
  "data science": ["science des données", "analyse de données", "big data", "data analytics"],
  "python": ["programmation python", "django", "fastapi", "flask", "pandas", "numpy"],

  // Agriculture & Élevage
  "chaîne de valeur agricole": ["filière agricole", "agrobusiness", "agri-business", "développement rural", "agroalimentaire"],
  "irrigation": ["hydraulique agricole", "gestion de l'eau", "maîtrise de l'eau", "aménagements hydro-agricoles"],
  "élevage": ["pastoralisme", "production animale", "agropastoral", "santé animale"],
  "sécurité alimentaire": ["résilience alimentaire", "nutrition", "autosuffisance"],

  // Énergie & Environnement
  "systèmes photovoltaïques": ["énergie solaire", "panneaux solaires", "solaire pv", "centrale solaire"],
  "énergie solaire": ["photovoltaïque", "systèmes photovoltaïques", "solaire"],
  "électrification rurale": ["accès à l'énergie", "mini-réseaux", "réseaux décentralisés"],
  "eies": ["étude d'impact environnemental et social", "évaluation environnementale", "pges", "audit environnemental"],

  // Infrastructure & BTP
  "gestion de chantier btp": ["conduite de travaux", "supervision de chantier", "ouvrages d'art", "génie civil", "bâtiment"],
  "marchés de travaux publics": ["passation des marchés", "commande publique", "dao travaux"],

  // Droit & Marchés
  "réglementation arcop": ["armp", "code des marchés publics", "passation des marchés", "commande publique", "dao"],
  "passation des marchés": ["commande publique", "procédures d'appel d'offres", "marchés publics", "audit des marchés"]
};

// Hiérarchie des niveaux d'études pour évaluation de compatibilité
const EDUCATION_RANKS = {
  'non spécifié': 0,
  'secondaire': 1,
  'bac': 2,
  'bac+2': 3,
  'bac+3': 4, // Licence / Bachelor
  'bac+4': 5,
  'bac+5': 6, // Master / Ingénieur / DEA
  'doctorat': 7 // PhD / Médecine
};

// Hiérarchie des niveaux d'expérience
const SENIORITY_RANKS = {
  'junior': 1,
  'intermédiaire': 2,
  'confirmé': 3,
  'expert': 4
};

/**
 * Normalise un texte pour comparaison souple
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calcule la proximité de niveau d'études (Score sur 100)
 */
function evaluateEducation(userLevel, requiredLevel) {
  const uRank = EDUCATION_RANKS[normalizeText(userLevel)] || 4; // Défaut Bac+3
  const rRank = EDUCATION_RANKS[normalizeText(requiredLevel)] || 4; // Défaut Bac+3

  if (uRank >= rRank) {
    return { score: 100, isMatch: true, details: `Niveau d'études adapté (${userLevel} >= ${requiredLevel || 'requis'})` };
  } else if (uRank === rRank - 1) {
    return { score: 75, isMatch: false, details: `Niveau d'études légèrement inférieur (${userLevel} vs ${requiredLevel} souhaité)` };
  } else {
    return { score: 40, isMatch: false, details: `Écart de diplôme (${userLevel} vs ${requiredLevel} requis)` };
  }
}

/**
 * Calcule la proximité d'expérience (Score sur 100)
 */
function evaluateExperience(userYears, userSeniority, requiredExperience) {
  const reqNorm = normalizeText(requiredExperience);
  let requiredYears = 2; // Défaut
  let requiredSeniority = 'intermédiaire';

  if (reqNorm.includes('expert') || reqNorm.includes('senior') || reqNorm.includes('10 ans') || reqNorm.includes('7 ans')) {
    requiredYears = 7;
    requiredSeniority = 'expert';
  } else if (reqNorm.includes('confirme') || reqNorm.includes('5 ans') || reqNorm.includes('3 ans')) {
    requiredYears = 4;
    requiredSeniority = 'confirmé';
  } else if (reqNorm.includes('junior') || reqNorm.includes('debutant') || reqNorm.includes('1 an')) {
    requiredYears = 1;
    requiredSeniority = 'junior';
  }

  const uYears = parseInt(userYears) || 0;
  const uRank = SENIORITY_RANKS[normalizeText(userSeniority)] || 2;
  const rRank = SENIORITY_RANKS[requiredSeniority] || 2;

  if (uYears >= requiredYears || uRank >= rRank) {
    return {
      score: 100,
      isMatch: true,
      details: `Expérience suffisante (${uYears} ans, niveau ${userSeniority})`
    };
  } else if (uYears >= requiredYears * 0.7 || uRank === rRank - 1) {
    return {
      score: 70,
      isMatch: false,
      details: `Expérience proche du seuil recommandé (${uYears} ans vs ~${requiredYears} ans)`
    };
  } else {
    return {
      score: 40,
      isMatch: false,
      details: `Expérience inférieure aux exigences du poste (${uYears} ans vs ~${requiredYears} ans souhaités)`
    };
  }
}

/**
 * Évalue l'adéquation sectorielle et domaine (Score sur 100)
 */
function evaluateSectors(userSectors, opportunitySectors) {
  if (!opportunitySectors || !userSectors) {
    return { score: 70, matchedSectors: [], details: "Secteurs non spécifiés" };
  }

  const uSectors = (Array.isArray(userSectors) ? userSectors : userSectors.split(','))
    .map(s => normalizeText(s));
  
  const oSectors = (Array.isArray(opportunitySectors) ? opportunitySectors : opportunitySectors.split(','))
    .map(s => normalizeText(s));

  const matched = uSectors.filter(s => oSectors.some(os => os.includes(s) || s.includes(os)));

  if (matched.length > 0) {
    const score = Math.min(100, 70 + (matched.length * 15));
    return {
      score: score,
      isMatch: true,
      matchedSectors: matched,
      details: `Secteur(s) en adéquation directe : ${matched.join(', ')}`
    };
  }

  return {
    score: 25,
    isMatch: false,
    matchedSectors: [],
    details: `Secteurs distincts (${uSectors.join(', ')} vs ${oSectors.join(', ')})`
  };
}

/**
 * Évalue la localisation et préférences pays (Score sur 100)
 */
function evaluateLocation(userCountry, preferredCountries, oppCountry) {
  if (!oppCountry) return { score: 80, details: "Localisation globale ou non restreinte" };

  const normOppCountry = normalizeText(oppCountry);
  const normUserCountry = normalizeText(userCountry || 'Sénégal');
  
  const prefs = (preferredCountries || [userCountry || 'Sénégal']).map(c => normalizeText(c));

  if (prefs.includes('international') || prefs.includes('afrique') || normOppCountry.includes('international')) {
    return { score: 100, isMatch: true, details: `Éligibilité internationale / sous-régionale confirmée` };
  }

  if (prefs.some(p => normOppCountry.includes(p) || p.includes(normOppCountry))) {
    return { score: 100, isMatch: true, details: `Localisation cible conforme : ${oppCountry}` };
  }

  if (normOppCountry.includes(normUserCountry)) {
    return { score: 100, isMatch: true, details: `Opportunité nationale : ${oppCountry}` };
  }

  return { score: 50, isMatch: false, details: `Opportunité située à l'étranger (${oppCountry})` };
}

/**
 * Évalue les compétences avec prise en compte des synonymes et équivalences
 */
function evaluateSkills(userSkills, opportunityText, nlpKeywords) {
  if (!userSkills || userSkills.length === 0) {
    return { score: 50, matchedSkills: [], missingSkills: [], details: "Aucune compétence déclarée" };
  }

  const uSkills = Array.isArray(userSkills) ? userSkills : userSkills.split(',');
  const oppFullText = normalizeText(opportunityText + " " + (nlpKeywords || ''));

  const matched = [];
  const unmatched = [];

  uSkills.forEach(rawSkill => {
    const normSkill = normalizeText(rawSkill);
    let found = false;

    // 1. Recherche directe
    if (oppFullText.includes(normSkill)) {
      found = true;
    } else {
      // 2. Recherche par synonymes / équivalences sémantiques
      const synonyms = SYNONYMS_MAP[normSkill] || [];
      for (const syn of synonyms) {
        if (oppFullText.includes(normalizeText(syn))) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      matched.push(rawSkill);
    } else {
      unmatched.push(rawSkill);
    }
  });

  const matchRatio = uSkills.length > 0 ? (matched.length / uSkills.length) : 0;
  const score = Math.round(Math.min(100, Math.max(30, matchRatio * 100 + (matched.length * 5))));

  return {
    score: score,
    matchedSkills: matched,
    unmatchedSkills: unmatched,
    matchRatio: matchRatio
  };
}

/**
 * Calcul du Score de Similarité Sémantique (Score IA)
 * S'il y a un score d'embedding précalculé ou calcul de proximité lexicale
 */
function calculateAISemanticScore(profile, opportunity, precomputedCosine = null) {
  if (precomputedCosine !== null && precomputedCosine !== undefined) {
    return Math.round(precomputedCosine * 100);
  }

  // Calcul d'approximation sémantique textuelle si l'embedding n'est pas fourni
  const profileTokens = normalizeText(`${profile.current_title} ${profile.skills?.join(' ')} ${profile.bio}`).split(' ');
  const oppTokens = normalizeText(`${opportunity.title} ${opportunity.description} ${opportunity.sectors}`).split(' ');

  const oppSet = new Set(oppTokens);
  let intersection = 0;

  profileTokens.forEach(t => {
    if (t.length > 3 && oppSet.has(t)) {
      intersection++;
    }
  });

  const jaccard = intersection / (profileTokens.length + oppSet.size - intersection || 1);
  const approxScore = Math.round(Math.min(95, Math.max(30, jaccard * 400 + 40)));
  return approxScore;
}

/**
 * FONCTION PRINCIPALE : MATCHING HYBRIDE
 * 
 * @param {Object} profile - Profil candidat
 * @param {Object} opportunity - Opportunité
 * @param {Object} options - Options (poids, embeddings précalculés)
 * @returns {Object} Résultat de matching complet avec score final et explications
 */
function calculateMatch(profile, opportunity, options = {}) {
  // 1. Évaluation des règles métier
  const eduEval = evaluateEducation(profile.education_level, opportunity.experience_required || 'bac+3');
  const expEval = evaluateExperience(profile.experience_years, profile.seniority_level, opportunity.experience_required);
  const sectorEval = evaluateSectors(profile.sectors, opportunity.sectors);
  const locEval = evaluateLocation(profile.country, profile.preferred_countries, opportunity.country);
  const skillsEval = evaluateSkills(profile.skills, `${opportunity.title} ${opportunity.description}`, opportunity.nlp_keywords);

  // Score des règles métier (Moyenne pondérée des règles dures)
  const rulesScore = Math.round(
    (skillsEval.score * 0.35) +
    (sectorEval.score * 0.25) +
    (expEval.score * 0.15) +
    (eduEval.score * 0.15) +
    (locEval.score * 0.10)
  );

  // 2. Évaluation de l'IA (Similarité Sémantique BGE-M3)
  const aiScore = calculateAISemanticScore(profile, opportunity, options.ai_cosine_similarity);

  // 3. Fusion Hybride : Score Final
  // Poids par défaut : 40% IA sémantique + 60% Règles Métier
  const aiWeight = options.ai_weight !== undefined ? options.ai_weight : 0.40;
  const rulesWeight = 1.0 - aiWeight;

  let finalScore = Math.round((aiScore * aiWeight) + (rulesScore * rulesWeight));

  // Ajustement si incompatibilité sectorielle totale
  if (sectorEval.score <= 25 && skillsEval.matchedSkills.length === 0) {
    finalScore = Math.min(finalScore, 45); // Plafond pour éviter faux positifs
  }

  // 4. Génération des Explications & Justifications
  const strengths = [];
  const warnings = [];

  // Points forts
  if (skillsEval.matchedSkills.length > 0) {
    strengths.push(`Compétences alignées : ${skillsEval.matchedSkills.slice(0, 4).join(', ')}`);
  }
  if (sectorEval.isMatch) {
    strengths.push(sectorEval.details);
  }
  if (eduEval.isMatch) {
    strengths.push(eduEval.details);
  }
  if (expEval.isMatch) {
    strengths.push(expEval.details);
  }
  if (locEval.isMatch) {
    strengths.push(locEval.details);
  }
  if (aiScore >= 80) {
    strengths.push(`Forte cohérence sémantique IA (${aiScore}% de proximité conceptuelle)`);
  }

  // Points d'attention / Vigilance
  if (!sectorEval.isMatch) {
    warnings.push(sectorEval.details);
  }
  if (!expEval.isMatch) {
    warnings.push(expEval.details);
  }
  if (!eduEval.isMatch) {
    warnings.push(eduEval.details);
  }
  if (skillsEval.unmatchedSkills.length > 0 && skillsEval.matchedSkills.length === 0) {
    warnings.push("Peu de mots-clés techniques directement identifiés dans l'offre");
  }

  // Qualification du niveau de correspondance
  let matchCategory = 'Faible';
  if (finalScore >= 85) matchCategory = 'Excellent (Top Match)';
  else if (finalScore >= 70) matchCategory = 'Très bon';
  else if (finalScore >= 55) matchCategory = 'Moyen';

  return {
    opportunity_id: opportunity.id,
    title: opportunity.title,
    country: opportunity.country,
    sectors: opportunity.sectors,
    url: opportunity.url,
    
    // Scores
    final_score: finalScore,
    match_category: matchCategory,
    ai_score: aiScore,
    rules_score: rulesScore,

    // Décomposition détaillée
    breakdown: {
      skills_score: skillsEval.score,
      sectors_score: sectorEval.score,
      experience_score: expEval.score,
      education_score: eduEval.score,
      location_score: locEval.score
    },

    // Détails des compétences
    skills_analysis: {
      matched: skillsEval.matchedSkills,
      unmatched: skillsEval.unmatchedSkills
    },

    // Explicabilité
    explanation: {
      strengths: strengths,
      warnings: warnings
    }
  };
}

module.exports = {
  calculateMatch,
  evaluateEducation,
  evaluateExperience,
  evaluateSectors,
  evaluateLocation,
  evaluateSkills,
  SYNONYMS_MAP
};
