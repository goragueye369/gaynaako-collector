/**
 * 🤖 MOTEUR DE MATCHING ALIGNÉ SUR LE SCHÉMA BACKEND PRISMA
 * 
 * Compatible avec les 3 rôles utilisateurs :
 * 1. ENTREPRENEUR (domaineExpertise, secteur, pays, objectifs)
 * 2. PME (nomEntreprise, secteurs)
 * 3. ONG (nomOrganisation, domainesIntervention, mission)
 * 
 * Calcule une adéquation stricte et précise (Secteur + Mots-clés + Localisation)
 */

// Lexique étendu de synonymes et correspondances thématiques
const SYNONYMS_MAP = {
  "machine learning": ["apprentissage automatique", "ia", "intelligence artificielle", "data science", "nlp", "algorithme"],
  "apprentissage automatique": ["machine learning", "ia", "intelligence artificielle", "data science"],
  "technologie": ["digital", "numerique", "logiciel", "informatique", "web", "mobile", "app", "tech", "it"],
  "agriculture": ["agrobusiness", "agri", "agricole", "elevage", "riz", "rizplus", "pastoral", "culture", "semences", "paysan"],
  "energie": ["solaire", "photovoltaique", "renouvelable", "electrification", "electricite", "mini-reseaux"],
  "infrastructure": ["btp", "travaux", "construction", "batiment", "routes", "voirie", "genie civil", "ouvrages"],
  "eau": ["assainissement", "hydraulique", "forage", "irrigation", "fleuve", "barrage"],
  "sante": ["medical", "epidemiologie", "soins", "hopital", "nutrition", "sanitaire", "oms"],
  "finance": ["microfinance", "credit", "banque", "investissement", "fonds", "placement", "capital", "ppp"],
  "gouvernance": ["marches publics", "arcop", "armp", "commande publique", "regulation", "administration"],
  "environnement": ["climat", "eies", "pges", "ecologie", "carbone", "developpement durable"]
};

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
 * Extrait les informations structurées d'un profil Prisma
 */
function extractUserText(user) {
  const role = user.role;
  let text = '';
  let sectors = [];
  let country = 'Sénégal';

  if (role === 'ENTREPRENEUR' && user.entrepreneur) {
    const ep = user.entrepreneur;
    const sec = ep.secteur?.nom || ep.secteurId || '';
    if (sec) sectors.push(sec);
    country = ep.pays?.nom || ep.paysId || 'Sénégal';
    text = `${ep.domaineExpertise || ''} ${sec} ${ep.objectifs || ''} ${user.nom || ''}`;
  } else if (role === 'PME' && user.pme) {
    const pme = user.pme;
    sectors = (pme.secteurs || []).map(s => s.nom || s);
    country = 'Sénégal';
    text = `${pme.nomEntreprise || ''} ${sectors.join(' ')} ${user.nom || ''}`;
  } else if (role === 'ONG' && user.ong) {
    const ong = user.ong;
    sectors = (ong.domainesIntervention || []).map(d => d.nom || d);
    country = 'Sénégal';
    text = `${ong.nomOrganisation || ''} ${ong.mission || ''} ${sectors.join(' ')} ${user.nom || ''}`;
  }

  return {
    role,
    sectors: sectors.filter(Boolean),
    country,
    fullText: normalizeText(text)
  };
}

/**
 * Calcule le score de correspondance exact entre un Utilisateur et une Opportunité
 */
function calculatePrismaMatch(user, opportunity, options = {}) {
  const userInfo = extractUserText(user);
  const minScore = options.minScore || 0.50;

  // Opportunité
  const oppSecteurRaw = opportunity.secteur?.nom || opportunity.secteurId || opportunity.sectors || '';
  const oppSecteur = normalizeText(oppSecteurRaw);
  const oppTitre = normalizeText(opportunity.titre || opportunity.title || '');
  const oppCriteres = normalizeText(opportunity.criteresEligibilite || opportunity.description || '');
  const oppPays = normalizeText(opportunity.pays || opportunity.country || 'Sénégal');
  const oppFullText = `${oppTitre} ${oppSecteur} ${oppCriteres} ${oppPays}`;

  // 1. ÉVALUATION SECTORIELLE (Poids 45%)
  let sectorScore = 0.0;
  const userSectorsNorm = userInfo.sectors.map(s => normalizeText(s));

  if (userSectorsNorm.length > 0 && oppSecteur && oppSecteur !== 'non classifie') {
    const oppSectorsList = oppSecteur.split(',').map(s => s.trim());
    const hasExactSector = userSectorsNorm.some(us => 
      oppSectorsList.some(os => os === us || os.includes(us) || us.includes(os))
    );

    if (hasExactSector) {
      sectorScore = 1.0;
    } else {
      // Vérifier synonymes de secteur
      let hasSynSector = false;
      userSectorsNorm.forEach(us => {
        const syns = SYNONYMS_MAP[us] || [];
        if (syns.some(syn => oppSecteur.includes(normalizeText(syn)) || oppFullText.includes(normalizeText(syn)))) {
          hasSynSector = true;
        }
      });
      sectorScore = hasSynSector ? 0.70 : 0.0;
    }
  } else if (oppSecteur === 'non classifie') {
    sectorScore = 0.40; // Neutre si non classifié
  }

  // 2. ÉVALUATION MOTS-CLÉS & EXPERTISE MÉTIER (Poids 40%)
  let keywordScore = 0.20;
  const userWords = userInfo.fullText.split(' ').filter(w => w.length > 3);
  let matchedCount = 0;

  userWords.forEach(w => {
    if (oppFullText.includes(w)) {
      matchedCount++;
    } else {
      const syns = SYNONYMS_MAP[w] || [];
      if (syns.some(syn => oppFullText.includes(normalizeText(syn)))) {
        matchedCount++;
      }
    }
  });

  if (userWords.length > 0) {
    const matchRatio = matchedCount / userWords.length;
    keywordScore = Math.min(1.0, Math.max(0.10, matchRatio * 2.0));
  }

  // 3. ÉVALUATION LOCALISATION / PAYS (Poids 15%)
  let locationScore = 0.70;
  const normUserCountry = normalizeText(userInfo.country);
  if (oppPays.includes(normUserCountry) || normUserCountry.includes(oppPays) || oppPays.includes('international') || oppPays.includes('afrique')) {
    locationScore = 1.0;
  } else {
    locationScore = 0.30;
  }

  // Calcul du score final pondéré
  // Si le secteur ne correspond pas du tout ET aucun mot-clé ne correspond -> score très bas (<35%)
  let finalScore = 0;
  if (sectorScore === 0.0 && keywordScore <= 0.20) {
    finalScore = Number(((sectorScore * 0.45) + (keywordScore * 0.40) + (locationScore * 0.15) * 0.5).toFixed(2));
  } else {
    finalScore = Number(((sectorScore * 0.45) + (keywordScore * 0.40) + (locationScore * 0.15)).toFixed(2));
  }

  const isEligible = finalScore >= minScore;

  return {
    utilisateurId: user.id,
    opportuniteId: opportunity.id,
    scorePertinence: finalScore,
    scorePourcentage: Math.round(finalScore * 100),
    isEligible: isEligible,
    opportunite: {
      id: opportunity.id,
      titre: opportunity.titre || opportunity.title,
      type: opportunity.type,
      pays: opportunity.pays || opportunity.country,
      secteur: opportunity.secteur?.nom || opportunity.sectors,
      dateLimite: opportunity.dateLimite,
      url: opportunity.url
    }
  };
}

/**
 * Génère les recommandations pour un utilisateur
 */
function generateRecommandationsForUser(user, opportunities, limit = 5, minScore = 0.50) {
  const matches = opportunities
    .map(opp => calculatePrismaMatch(user, opp, { minScore }))
    .filter(m => m.isEligible);

  matches.sort((a, b) => b.scorePertinence - a.scorePertinence);

  const topMatches = matches.slice(0, limit);

  const prismaRecommandations = topMatches.map(m => ({
    utilisateurId: m.utilisateurId,
    opportuniteId: m.opportuniteId,
    scorePertinence: m.scorePertinence,
    dateGeneration: new Date()
  }));

  return {
    utilisateurId: user.id,
    role: user.role,
    totalQualifiees: matches.length,
    topRecommandations: topMatches,
    prismaDataToInsert: prismaRecommandations
  };
}

module.exports = {
  calculatePrismaMatch,
  generateRecommandationsForUser
};
