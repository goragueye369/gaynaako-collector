/**
 * 🎯 GAYNAAKO — MOTEUR STRATÉGIQUE IA (Strategic Advisor)
 * 
 * Analyse avancée au-delà du matching :
 * 1. Matrice de Priorisation (Impact vs Faisabilité : Quick Wins, Paris Stratégiques)
 * 2. Roadmap temporelle des candidatures (Cette semaine, 15 jours, Veille active)
 * 3. Gap Analysis & Compétences à développer (Skills & Requirements manquants)
 * 4. Diagnostic & Synthèse personnalisée par profil
 */

const mysql = require('mysql2/promise');
const { calculatePrismaMatch } = require('./matching-backend-engine');

const DB_PROFILS = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_PROFILS_USER || 'root',
  password: process.env.DB_PROFILS_PASSWORD !== undefined ? process.env.DB_PROFILS_PASSWORD : '',
  database: process.env.DB_PROFILS_NAME || 'gaynaako_profils'
};

const DB_OPPORTUNITIES = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'gaynaako_opportunities'
};

/**
 * Charge un utilisateur complet depuis gaynaako_profils
 */
async function loadFullUser(connProfils, userId) {
  const [users] = await connProfils.query('SELECT * FROM utilisateurs WHERE id = ?', [userId]);
  if (!users || users.length === 0) return null;

  const u = users[0];
  const user = { id: u.id, email: u.email, role: u.role, statut: u.statut };

  if (u.role === 'ENTREPRENEUR') {
    const [[ep]] = await connProfils.query(`
      SELECT ep.*, s.nom AS secteur_nom, p.nom AS pays_nom, p.code AS pays_code
      FROM entrepreneur_profiles ep
      JOIN secteurs s ON ep.secteur_id = s.id
      JOIN pays p ON ep.pays_id = p.id
      WHERE ep.utilisateur_id = ?
    `, [u.id]);

    if (ep) {
      user.nom = ep.nom_complet;
      user.entrepreneur = {
        domaineExpertise: ep.domaine_expertise,
        secteur: { id: ep.secteur_id, nom: ep.secteur_nom },
        pays: { id: ep.pays_id, nom: ep.pays_nom, code: ep.pays_code },
        objectifs: ep.objectifs
      };
    }
  } else if (u.role === 'PME') {
    const [[pme]] = await connProfils.query(
      'SELECT * FROM pme_profiles WHERE utilisateur_id = ?',
      [u.id]
    );
    if (pme) {
      const [secteurs] = await connProfils.query(`
        SELECT s.id, s.nom FROM secteurs s
        JOIN pme_profiles_secteurs ps ON ps.secteur_id = s.id
        WHERE ps.pme_id = ?
      `, [pme.id]);

      user.nom = pme.nom_entreprise;
      user.pme = {
        nomEntreprise: pme.nom_entreprise,
        secteurs: secteurs,
        logoUrl: pme.logo_url
      };
    }
  } else if (u.role === 'ONG') {
    const [[ong]] = await connProfils.query(
      'SELECT * FROM ong_profiles WHERE utilisateur_id = ?',
      [u.id]
    );
    if (ong) {
      const [domaines] = await connProfils.query(`
        SELECT d.id, d.nom FROM domaines_intervention d
        JOIN ong_profiles_domaines od ON od.domaine_id = d.id
        WHERE od.ong_id = ?
      `, [ong.id]);

      user.nom = ong.nom_organisation;
      user.ong = {
        nomOrganisation: ong.nom_organisation,
        domainesIntervention: domaines,
        mission: ong.mission
      };
    }
  }

  return user;
}

/**
 * Analyse temporelle & calcul d'urgence
 */
function evaluateUrgency(opportunity) {
  const now = new Date();
  let deadline = null;

  if (opportunity.date_normalized) {
    deadline = new Date(opportunity.date_normalized);
  } else if (opportunity.nlp_deadlines) {
    try {
      const parsed = typeof opportunity.nlp_deadlines === 'string' 
        ? JSON.parse(opportunity.nlp_deadlines) 
        : opportunity.nlp_deadlines;
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
        deadline = new Date(parsed[0]);
      }
    } catch (_) {}
  }

  if (!deadline || isNaN(deadline.getTime())) {
    return {
      deadline: null,
      daysRemaining: null,
      urgencyLevel: 'NORMALE',
      timeframe: 'ONGOING',
      label: 'Date limite non spécifiée / Continue'
    };
  }

  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 7 && diffDays >= 0) {
    return {
      deadline: deadline.toISOString().slice(0, 10),
      daysRemaining: diffDays,
      urgencyLevel: 'CRITIQUE',
      timeframe: 'THIS_WEEK',
      label: diffDays === 0 ? "Expire aujourd'hui !" : `Expire dans ${diffDays} jour(s)`
    };
  } else if (diffDays <= 21 && diffDays > 7) {
    return {
      deadline: deadline.toISOString().slice(0, 10),
      daysRemaining: diffDays,
      urgencyLevel: 'ELEVEE',
      timeframe: 'NEXT_2_WEEKS',
      label: `Expire dans ${diffDays} jours (~${Math.round(diffDays / 7)} sem.)`
    };
  } else if (diffDays > 21) {
    return {
      deadline: deadline.toISOString().slice(0, 10),
      daysRemaining: diffDays,
      urgencyLevel: 'FAIBLE',
      timeframe: 'ONGOING',
      label: `Deadline le ${deadline.toLocaleDateString('fr-FR')}`
    };
  } else {
    // Déjà expirée
    return {
      deadline: deadline.toISOString().slice(0, 10),
      daysRemaining: diffDays,
      urgencyLevel: 'EXPIREE',
      timeframe: 'EXPIRED',
      label: 'Expirée'
    };
  }
}

/**
 * Évalue l'Impact et la Faisabilité d'une opportunité
 */
function evaluateImpactAndFeasibility(matchResult, opp) {
  const scorePertinence = matchResult.scorePertinence || 0;
  const quality = (opp.quality_score || 50) / 100;
  
  // Score d'Impact : Qualité de la source, budget/financement, portée
  let impactScore = quality * 0.6;
  const highImpactSources = ['banque mondiale', 'world bank', 'bad', 'afd', 'onu', 'undp', 'usaid', 'union européenne', 'ue', 'giz'];
  const sourceName = (opp.source_name || '').toLowerCase();
  const hasHighImpactSource = highImpactSources.some(s => sourceName.includes(s));
  if (hasHighImpactSource) impactScore += 0.25;
  if (opp.budget_range || opp.nlp_amounts) impactScore += 0.15;
  impactScore = Math.min(1.0, impactScore);

  // Score de Faisabilité : Fit score + accessibilité
  let feasibilityScore = scorePertinence;
  const complexity = String(opp.complexity_level || 'MOYENNE').toUpperCase();
  if (complexity === 'FAIBLE' || complexity === 'ACCESSIBLE' || complexity === '1') feasibilityScore += 0.1;
  if (complexity === 'ELEVEE' || complexity === 'COMPLEXE' || complexity === '3') feasibilityScore -= 0.1;
  feasibilityScore = Math.max(0.0, Math.min(1.0, feasibilityScore));

  // Catégorisation dans la Matrice 2x2
  let category = 'SECONDARY';
  let categoryLabel = 'Opportunité Secondaire';
  let categoryColor = '#3B82F6'; // Bleu
  let actionAdvice = 'À garder en option secondaire';

  if (feasibilityScore >= 0.65 && impactScore >= 0.60) {
    category = 'QUICK_WIN';
    categoryLabel = '⚡ Quick Win (Priorité Absolue)';
    categoryColor = '#10B981'; // Vert
    actionAdvice = 'Forte adéquation & fort impact : postuler en priorité';
  } else if (feasibilityScore < 0.65 && impactScore >= 0.65) {
    category = 'STRATEGIC_BET';
    categoryLabel = '🏆 Pari Stratégique';
    categoryColor = '#8B5CF6'; // Violet
    actionAdvice = 'Opportunité majeure à préparer minutieusement (dossier soigné)';
  } else if (feasibilityScore >= 0.60 && impactScore < 0.60) {
    category = 'SAFE_BET';
    categoryLabel = '🛡️ Valeur Sûre / Accessible';
    categoryColor = '#06B6D4'; // Cyan
    actionAdvice = 'Dossier accessible avec bonne chance de succès';
  } else {
    category = 'LONG_SHOT';
    categoryLabel = '🎯 Opportunité Complémentaire';
    categoryColor = '#64748B'; // Gris
    actionAdvice = 'À envisager pour veille ou montée en compétences';
  }

  return {
    impactScore: Math.round(impactScore * 100),
    feasibilityScore: Math.round(feasibilityScore * 100),
    category,
    categoryLabel,
    categoryColor,
    actionAdvice
  };
}

/**
 * Analyse des compétences et écarts (Gap Analysis)
 */
function performGapAnalysis(profile, opportunities) {
  // Extraire les mots-clés du profil
  const profileTokens = new Set();
  const addTokens = (text) => {
    if (!text) return;
    const words = text.toLowerCase()
      .replace(/[^\w\sàâéèêëîïôùûç]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    words.forEach(w => profileTokens.add(w));
  };

  if (profile.role === 'ENTREPRENEUR' && profile.entrepreneur) {
    addTokens(profile.entrepreneur.domaineExpertise);
    addTokens(profile.entrepreneur.objectifs);
    if (profile.entrepreneur.secteur) addTokens(profile.entrepreneur.secteur.nom);
  } else if (profile.role === 'PME' && profile.pme) {
    addTokens(profile.pme.nomEntreprise);
    (profile.pme.secteurs || []).forEach(s => addTokens(s.nom));
  } else if (profile.role === 'ONG' && profile.ong) {
    addTokens(profile.ong.mission);
    (profile.ong.domainesIntervention || []).forEach(d => addTokens(d.nom));
  }

  // Identifier les secteurs du profil
  const userSectors = new Set();
  if (profile.entrepreneur && profile.entrepreneur.secteur) {
    userSectors.add(profile.entrepreneur.secteur.nom.toLowerCase());
  }
  if (profile.pme && profile.pme.secteurs) {
    profile.pme.secteurs.forEach(s => userSectors.add(s.nom.toLowerCase()));
  }
  if (profile.ong && profile.ong.domainesIntervention) {
    profile.ong.domainesIntervention.forEach(d => userSectors.add(d.nom.toLowerCase()));
  }

  // Filtrer les opportunités pertinentes pour ce profil ou son secteur
  const relevantOpps = opportunities.filter(opp => {
    const oppSectors = (opp.sectors || '').toLowerCase();
    const sectorMatch = Array.from(userSectors).some(s => oppSectors.includes(s));
    return sectorMatch || opportunities.length < 20;
  });

  const targetOpps = relevantOpps.length >= 3 ? relevantOpps : opportunities;
  const marketKeywordCounts = {};

  targetOpps.forEach(opp => {
    let keywords = [];
    if (opp.nlp_keywords) {
      try {
        const parsed = typeof opp.nlp_keywords === 'string' ? JSON.parse(opp.nlp_keywords) : opp.nlp_keywords;
        if (Array.isArray(parsed)) keywords = parsed;
      } catch (_) {}
    }

    if (keywords.length === 0 && opp.description) {
      const words = opp.description.toLowerCase()
        .replace(/[^\w\sàâéèêëîïôùûç]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4);
      keywords = Array.from(new Set(words)).slice(0, 10);
    }

    keywords.forEach(kw => {
      const cleaned = kw.trim().toLowerCase();
      if (cleaned.length < 3) return;
      marketKeywordCounts[cleaned] = (marketKeywordCounts[cleaned] || 0) + 1;
    });
  });

  // Identifier les compétences/mots-clés très demandés mais absents du profil
  const stopWords = new Set([
    'dans', 'pour', 'avec', 'plus', 'cette', 'tous', 'projet', 'mission',
    'avis', 'appel', 'offres', 'services', 'termes', 'reference', 'offre',
    'national', 'region', 'dakar', 'senegal', 'prestataire', 'consultant',
    'works', 'procurement', 'bidding', 'contract', 'goods', 'supplier',
    'request', 'proposal', 'general', 'notice', 'international', 'support',
    'selection', 'development', 'management', 'technical', 'individual'
  ]);

  const skillGaps = Object.entries(marketKeywordCounts)
    .filter(([kw, count]) => !stopWords.has(kw) && !profileTokens.has(kw))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([keyword, demandCount]) => ({
      skill: keyword.charAt(0).toUpperCase() + keyword.slice(1),
      demandCount,
      relevance: `${demandCount} opportunité(s) ciblée(s) recherchent ce profil/critère`,
      tip: generateSkillTip(keyword, profile.role)
    }));

  // Recommandations spécifiques d'amélioration selon le rôle
  const actionableRecommendations = generateRoleRecommendations(profile, skillGaps);

  return {
    profileStrengthKeywords: Array.from(profileTokens).slice(0, 8),
    topMarketDemands: skillGaps,
    actionableRecommendations
  };
}

/**
 * Conseil ciblé pour une compétence / un mot-clé
 */
function generateSkillTip(skill, role) {
  const s = skill.toLowerCase();
  if (s.includes('evaluat') || s.includes('suivi') || s.includes('mel')) {
    return 'Ajoutez vos méthodologies de Suivi-Évaluation (indicateurs d\'impact) dans vos propositions.';
  }
  if (s.includes('iso') || s.includes('qualite') || s.includes('norme')) {
    return 'Mettez en avant vos certifications de qualité ou démarches de conformité.';
  }
  if (s.includes('cloud') || s.includes('data') || s.includes('ia') || s.includes('numerique')) {
    return 'Valorisez vos compétences techniques modernes et vos outils digitaux.';
  }
  if (s.includes('gestion') || s.includes('finance') || s.includes('budget')) {
    return 'Démontrez votre rigueur de gestion budgétaire avec des exemples de projets passés.';
  }
  if (s.includes('genre') || s.includes('climat') || s.includes('durab')) {
    return 'Intégrez une dimension RSE, inclusion ou développement durable dans vos réponses.';
  }
  return `Mentionnez vos réalisations concrètes liées à "${skill}" dans vos candidatures.`;
}

/**
 * Recommandations d'actions par rôle
 */
function generateRoleRecommendations(profile, skillGaps) {
  const role = profile.role;
  const list = [];

  if (role === 'ENTREPRENEUR') {
    list.push({
      category: '🎓 Montée en compétences',
      title: 'Enrichir votre portfolio technique',
      description: 'Documentez vos 2 ou 3 projets phares avec des métriques précises (chiffres d\'impact, délais respectés).',
      priority: 'HAUTE'
    });
    list.push({
      category: '📄 Optimisation de profil',
      title: 'Aligner votre CV avec les standards des bailleurs',
      description: 'Adoptez le format de CV standard UE/Banque Mondiale pour valoriser vos années d\'expérience.',
      priority: 'MOYENNE'
    });
  } else if (role === 'PME') {
    list.push({
      category: '🤝 Partenariat & Consortium',
      title: 'Répondre en groupement d\'entreprises',
      description: 'Pour les marchés de taille supérieure, constituez un groupement solidaire avec une PME complémentaire.',
      priority: 'HAUTE'
    });
    list.push({
      category: '📑 Conformité & Références',
      title: 'Pré-constituer le dossier administratif',
      description: 'Gardez à jour votre quitus fiscal, attestations IPRES/CSS et bilans certifiés pour postuler en moins de 48h.',
      priority: 'HAUTE'
    });
  } else if (role === 'ONG') {
    list.push({
      category: '📊 Cadre de Mesure de Résultats',
      title: 'Renforcer la matrice d\'impact (MEL)',
      description: 'Les bailleurs internationaux exigent une théorie du changement claire et des indicateurs SMART mesurables.',
      priority: 'HAUTE'
    });
    list.push({
      category: '🌍 Ancrage Communautaire',
      title: 'Valoriser les partenariats locaux',
      description: 'Mettez en avant vos lettres de soutien des autorités locales et des bénéficiaires finaux.',
      priority: 'MOYENNE'
    });
  }

  return list;
}

/**
 * Générateur principal de stratégie complète pour un profil
 */
async function generateUserStrategy(userId) {
  const connProfils = await mysql.createConnection(DB_PROFILS);
  const connOpportunities = await mysql.createConnection(DB_OPPORTUNITIES);

  try {
    // 1. Charger le profil utilisateur complet
    const user = await loadFullUser(connProfils, userId);
    if (!user) {
      throw new Error(`Utilisateur introuvable avec l'ID ${userId}`);
    }

    // 2. Charger les opportunités actives
    const today = new Date().toISOString().slice(0, 10);
    const [opportunities] = await connOpportunities.query(`
      SELECT *
      FROM opportunities_processed
      WHERE has_date = 'non'
         OR date_normalized IS NULL
         OR date_normalized >= ?
      ORDER BY quality_score DESC
    `, [today]);

    // 3. Calculer le matching pour toutes les opportunités
    const evaluatedOpportunities = opportunities.map(opp => {
      const match = calculatePrismaMatch(user, opp, { minScore: 0.20 });
      const urgency = evaluateUrgency(opp);
      const impactFeasibility = evaluateImpactAndFeasibility(match, opp);

      // Score de priorité global pondéré
      // Pertinence (50%) + Urgence (30%) + Impact/Qualité (20%)
      let urgencyWeight = 0.5;
      if (urgency.timeframe === 'THIS_WEEK') urgencyWeight = 1.0;
      else if (urgency.timeframe === 'NEXT_2_WEEKS') urgencyWeight = 0.8;
      else if (urgency.timeframe === 'ONGOING') urgencyWeight = 0.6;

      const priorityScore = Math.round(
        (match.scorePertinence * 50) +
        (urgencyWeight * 30) +
        ((opp.quality_score || 50) / 100 * 20)
      );

      return {
        id: opp.id,
        title: opp.title,
        description: opp.description ? opp.description.slice(0, 220) + '...' : '',
        sectors: opp.sectors,
        country: opp.country,
        source_name: opp.source_name,
        url: opp.url,
        quality_score: opp.quality_score,
        budget_range: opp.budget_range,
        score_pertinence: Math.round(match.scorePertinence * 100),
        priority_score: priorityScore,
        urgency,
        ...impactFeasibility,
        criteres_match: match.criteres
      };
    });

    // Trier par score de priorité décroissant
    evaluatedOpportunities.sort((a, b) => b.priority_score - a.priority_score);

    // 4. Matrice de Priorisation
    const quickWins = evaluatedOpportunities.filter(o => o.category === 'QUICK_WIN').slice(0, 5);
    const strategicBets = evaluatedOpportunities.filter(o => o.category === 'STRATEGIC_BET').slice(0, 5);
    const safeBets = evaluatedOpportunities.filter(o => o.category === 'SAFE_BET').slice(0, 5);
    const topRecommended = evaluatedOpportunities.filter(o => o.score_pertinence >= 55).slice(0, 5);

    // 5. Roadmap Temporelle des Candidatures
    const thisWeek = evaluatedOpportunities
      .filter(o => o.urgency.timeframe === 'THIS_WEEK' && o.score_pertinence >= 40)
      .slice(0, 4);

    const next2Weeks = evaluatedOpportunities
      .filter(o => o.urgency.timeframe === 'NEXT_2_WEEKS' && o.score_pertinence >= 45)
      .slice(0, 5);

    const ongoing = evaluatedOpportunities
      .filter(o => o.urgency.timeframe === 'ONGOING' && o.score_pertinence >= 55)
      .slice(0, 5);

    // 6. Gap Analysis & Compétences à développer
    const gapAnalysis = performGapAnalysis(user, opportunities);

    // 7. Diagnostic de Synthèse
    const totalMarketOpps = opportunities.length;
    const highlyRelevantCount = evaluatedOpportunities.filter(o => o.score_pertinence >= 60).length;
    const marketFitPercentage = Math.round((highlyRelevantCount / Math.max(1, totalMarketOpps)) * 100);

    const synthesis = {
      profilNom: user.nom || user.email,
      role: user.role,
      statutMarche: marketFitPercentage >= 15 ? 'EXCELLENT' : marketFitPercentage >= 8 ? 'BON' : 'MODÉRÉ',
      tauxCouvertureMarche: `${marketFitPercentage}% du marché actif vous correspond directement (${highlyRelevantCount} opportunités cibles sur ${totalMarketOpps})`,
      conseilCle: generateMainStrategicAdvice(user, quickWins.length, strategicBets.length, thisWeek.length)
    };

    return {
      success: true,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        details: user.entrepreneur || user.pme || user.ong
      },
      synthesis,
      prioritiesMatrix: {
        quickWins,
        strategicBets,
        safeBets,
        counts: {
          quickWins: quickWins.length,
          strategicBets: strategicBets.length,
          safeBets: safeBets.length
        }
      },
      roadmap: {
        thisWeek: {
          label: '🔴 À postuler en urgence (Cette semaine)',
          count: thisWeek.length,
          items: thisWeek
        },
        next2Weeks: {
          label: '🟠 À préparer activement (Sous 15 jours)',
          count: next2Weeks.length,
          items: next2Weeks
        },
        ongoing: {
          label: '🟢 Veille & Opportunités continues',
          count: ongoing.length,
          items: ongoing
        }
      },
      topAdaptedOpportunities: topRecommended,
      gapAnalysis,
      generatedAt: new Date().toISOString()
    };

  } finally {
    await connProfils.end();
    await connOpportunities.end();
  }
}

/**
 * Conseil stratégique global
 */
function generateMainStrategicAdvice(user, quickWinCount, strategicBetCount, urgentCount) {
  if (urgentCount > 0) {
    return `Vous avez ${urgentCount} opportunité(s) hautement compatible(s) qui expirent dans moins de 7 jours. Concentrez 80% de vos efforts sur ces dossiers immédiatement.`;
  }
  if (quickWinCount > 0) {
    return `Vous disposez de ${quickWinCount} opportunités "Quick Win" idéales. Votre profil présente tous les prérequis exigés avec un fort taux de succès prévisionnel.`;
  }
  if (strategicBetCount > 0) {
    return `Le marché propose des opportunités majeures à fort financement dans votre secteur. Préparez des dossiers complets avec des partenaires pour maximiser vos chances.`;
  }
  return `Continuez à surveiller les nouveaux appels d'offres et renforcez les compétences clés identifiées pour élargir votre vivier d'opportunités.`;
}

module.exports = {
  generateUserStrategy,
  evaluateUrgency,
  evaluateImpactAndFeasibility,
  performGapAnalysis
};
