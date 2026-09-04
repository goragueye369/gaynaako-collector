/**
 * 🧹 DATA CLEANING & PROCESSING
 * 
 * Ce script nettoie et normalise les données collectées pour préparer
 * un dataset de qualité pour l'IA et l'analyse.
 * 
 * Étapes:
 * 1. Charger les données brutes
 * 2. Nettoyer les descriptions (encodage, HTML, etc.)
 * 3. Normaliser les dates
 * 4. Extraire et normaliser les pays
 * 5. Détecter et normaliser les secteurs d'activité
 * 6. Gérer les données manquantes
 * 7. Créer un schéma standardisé
 * 8. Sauvegarder le dataset final
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// ============================================
// CONFIGURATION
// ============================================

// Mappings des secteurs d'activité
const SECTEURS = {
  'agriculture': ['agriculture', 'agri', 'agricole', 'elevage', 'pêche', 'peche', 'rural', 'ferme'],
  'santé': ['santé', 'sante', 'health', 'medical', 'hopital', 'hôpital', 'clinique'],
  'éducation': ['education', 'éducation', 'ecole', 'école', 'formation', 'enseignement', 'universite'],
  'infrastructure': ['infrastructure', 'route', 'pont', 'transport', 'construction', 'bâtiment', 'batiment'],
  'energie': ['energie', 'énergie', 'energy', 'solaire', 'electricite', 'électricité'],
  'eau': ['eau', 'water', 'assainissement', 'hydraulique'],
  'technologie': ['tech', 'digital', 'numérique', 'numerique', 'informatique', 'IT', 'logiciel', 'software'],
  'finance': ['finance', 'bancaire', 'credit', 'crédit', 'microfinance', 'financement'],
  'environnement': ['environnement', 'environment', 'climat', 'écologie', 'ecologie', 'durable'],
  'gouvernance': ['gouvernance', 'governance', 'administration', 'public', 'politique'],
  'commerce': ['commerce', 'trade', 'export', 'import', 'marché', 'marche', 'business'],
  'industrie': ['industrie', 'industry', 'manufacture', 'usine', 'production'],
  'tourisme': ['tourisme', 'tourism', 'hotel', 'hôtel', 'culture']
};

// Mappings des pays
const PAYS = {
  'Sénégal': ['senegal', 'sénégal', 'dakar', 'der', 'arcop', 'armp', 'adepme'],
  'Côte d\'Ivoire': ['côte d\'ivoire', 'cote d\'ivoire', 'abidjan', 'ivory coast'],
  'Mali': ['mali', 'bamako'],
  'Burkina Faso': ['burkina', 'ouagadougou'],
  'Niger': ['niger', 'niamey'],
  'Guinée': ['guinée', 'guinee', 'conakry'],
  'Bénin': ['bénin', 'benin', 'cotonou'],
  'Togo': ['togo', 'lomé', 'lome'],
  'Ghana': ['ghana', 'accra'],
  'Afrique': ['afrique', 'africa', 'african', 'africain'],
  'International': ['world', 'mondial', 'international', 'global']
};

// Formats de dates reconnus
const DATE_PATTERNS = [
  /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i,
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  /(\d{4})-(\d{2})-(\d{2})/,
  /(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{1,2}),?\s+(\d{4})/i
];

const MOIS = {
  'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
  'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08',
  'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
};

// ============================================
// FONCTIONS DE NETTOYAGE
// ============================================

/**
 * Nettoyer le texte (encodage, HTML, espaces)
 */
function cleanText(text) {
  if (!text) return '';
  
  let cleaned = text
    // Décoder les entités HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    
    // Supprimer les balises HTML
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[rev_slider[^\]]*\]/g, '')
    .replace(/\[\/rev_slider\]/g, '')
    
    // Corriger l'encodage UTF-8 mal interprété
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã /g, 'à')
    .replace(/Ã§/g, 'ç')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã®/g, 'î')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã»/g, 'û')
    .replace(/Ã€/g, 'À')
    .replace(/Ã‰/g, 'É')
    .replace(/Ãˆ/g, 'È')
    .replace(/Ãª/g, 'Ê')
    .replace(/Â°/g, '°')
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/Å"/g, 'œ')
    
    // Nettoyer les espaces
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
  
  return cleaned;
}

/**
 * Normaliser une date au format ISO (YYYY-MM-DD)
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  
  const text = dateStr.toLowerCase().trim();
  
  // Déjà au format ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return text.split('T')[0];
  }
  
  // Format: "9 juin 2026" ou "Juin 9, 2026"
  const match1 = text.match(/(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/);
  if (match1) {
    const day = match1[1].padStart(2, '0');
    const month = MOIS[match1[2]];
    const year = match1[3];
    return `${year}-${month}-${day}`;
  }
  
  const match2 = text.match(/(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{1,2}),?\s+(\d{4})/);
  if (match2) {
    const month = MOIS[match2[1]];
    const day = match2[2].padStart(2, '0');
    const year = match2[3];
    return `${year}-${month}-${day}`;
  }
  
  // Format: "31/08/2026"
  const match3 = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match3) {
    const day = match3[1].padStart(2, '0');
    const month = match3[2].padStart(2, '0');
    const year = match3[3];
    return `${year}-${month}-${day}`;
  }
  
  // Format: "2026-08-31"
  const match4 = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match4) {
    return match4[0];
  }
  
  return null;
}

/**
 * Détecter le pays depuis le texte
 */
function detectCountry(text, source) {
  const searchText = (text + ' ' + source).toLowerCase();
  
  for (const [country, keywords] of Object.entries(PAYS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return country;
      }
    }
  }
  
  // Défaut selon la source
  if (source.includes('Sénégal') || source.includes('DER') || source.includes('ARCOP') || source.includes('ADEPME')) {
    return 'Sénégal';
  }
  
  if (source.includes('Banque Mondiale') || source.includes('BAD') || source.includes('PNUD')) {
    return 'Afrique';
  }
  
  return 'International';
}

/**
 * Détecter les secteurs d'activité
 */
function detectSectors(text) {
  const searchText = text.toLowerCase();
  const detectedSectors = [];
  
  for (const [sector, keywords] of Object.entries(SECTEURS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        if (!detectedSectors.includes(sector)) {
          detectedSectors.push(sector);
        }
        break;
      }
    }
  }
  
  return detectedSectors.length > 0 ? detectedSectors : ['non classifié'];
}

/**
 * Détecter le public cible
 */
function detectTargetAudience(text) {
  const searchText = text.toLowerCase();
  
  if (searchText.match(/pme|petite.?et.?moyenne.?entreprise|small.?business/i)) {
    return 'PME';
  }
  if (searchText.match(/startup|jeune.?entreprise|entrepreneur/i)) {
    return 'Startup';
  }
  if (searchText.match(/grande.?entreprise|corporation|multinationale/i)) {
    return 'Grande entreprise';
  }
  if (searchText.match(/ong|association|organisation/i)) {
    return 'ONG/Association';
  }
  if (searchText.match(/gouvernement|public|administration/i)) {
    return 'Public';
  }
  
  return 'Tout public';
}

/**
 * Détecter le niveau d'expérience requis
 */
function detectExperienceRequired(text) {
  const searchText = text.toLowerCase();
  
  // Mots-clés pour expérience élevée
  if (searchText.match(/expert|senior|confirmé|expérimenté|minimum.?\d+.?ans/i)) {
    return 'Expert';
  }
  
  // Mots-clés pour expérience moyenne
  if (searchText.match(/intermédiaire|junior|débutant.?accepté/i)) {
    return 'Intermédiaire';
  }
  
  // Par défaut
  return 'Confirmé';
}

/**
 * Détecter la fourchette de budget
 */
function detectBudgetRange(text) {
  const searchText = text.toLowerCase();
  
  // Chercher des montants
  const amounts = searchText.match(/(\d+[\s,.]?\d*)\s*(millions?|milliards?|k|m|mds?)/gi);
  
  if (amounts && amounts.length > 0) {
    const firstAmount = amounts[0].toLowerCase();
    if (firstAmount.includes('milliard') || firstAmount.includes('mds')) {
      return 'Grand (>1 Mrd)';
    }
    if (firstAmount.includes('million')) {
      const num = parseInt(firstAmount.match(/\d+/)[0]);
      if (num > 100) return 'Grand (>100M)';
      if (num > 10) return 'Moyen (10-100M)';
      return 'Petit (<10M)';
    }
  }
  
  // Mots-clés
  if (searchText.match(/petit.?budget|faible.?montant/i)) {
    return 'Petit';
  }
  if (searchText.match(/gros.?budget|important.?montant/i)) {
    return 'Grand';
  }
  
  return 'Non spécifié';
}

/**
 * Calculer l'urgence basée sur la date
 */
function calculateUrgency(dateNormalized) {
  if (!dateNormalized) return 'Normale';
  
  const deadline = new Date(dateNormalized);
  const today = new Date();
  const daysUntil = Math.floor((deadline - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) return 'Expirée';
  if (daysUntil <= 7) return 'Urgente';
  if (daysUntil <= 30) return 'Haute';
  if (daysUntil <= 60) return 'Normale';
  return 'Flexible';
}

/**
 * Calculer le niveau de complexité (1-5)
 */
function calculateComplexity(text, sectors) {
  const searchText = text.toLowerCase();
  let complexity = 1;
  
  // Longueur du texte
  if (text.length > 500) complexity += 1;
  if (text.length > 1000) complexity += 1;
  
  // Nombre de secteurs
  const sectorCount = sectors.length;
  if (sectorCount > 2) complexity += 1;
  
  // Mots-clés de complexité
  if (searchText.match(/international|multinational|complexe/i)) complexity += 1;
  if (searchText.match(/infrastructure|développement|construction/i)) complexity += 1;
  
  return Math.min(complexity, 5);
}

/**
 * Suggérer des profils basés sur les secteurs
 */
function suggestProfiles(sectors, country, targetAudience) {
  const profiles = [];
  const sectorList = Array.isArray(sectors) ? sectors : sectors.split(', ');
  
  // Profils par secteur
  const sectorProfiles = {
    'agriculture': ['expert_agriculture', 'consultant_agro', 'ingenieur_agronome'],
    'santé': ['expert_sante', 'consultant_medical', 'gestionnaire_sante'],
    'éducation': ['expert_education', 'consultant_formation', 'pedagogie'],
    'infrastructure': ['ingenieur_civil', 'architecte', 'expert_infrastructure'],
    'energie': ['ingenieur_energie', 'expert_renewable', 'consultant_energie'],
    'eau': ['ingenieur_hydraulique', 'expert_eau', 'environnement'],
    'technologie': ['expert_tech', 'consultant_digital', 'developpeur', 'it_manager'],
    'finance': ['expert_finance', 'consultant_finance', 'comptable', 'auditeur'],
    'environnement': ['expert_environnement', 'consultant_climat', 'eco_conseiller'],
    'gouvernance': ['expert_gouvernance', 'consultant_public', 'administrateur'],
    'commerce': ['expert_commerce', 'consultant_export', 'business_dev'],
    'industrie': ['ingenieur_industriel', 'expert_production', 'qualite'],
    'tourisme': ['expert_tourisme', 'consultant_hotellerie', 'culture']
  };
  
  sectorList.forEach(sector => {
    const sectorProfs = sectorProfiles[sector.toLowerCase()];
    if (sectorProfs) {
      profiles.push(...sectorProfs);
    }
  });
  
  // Ajouter profils génériques
  if (country === 'Sénégal' || country === 'Afrique') {
    profiles.push('expert_afrique_ouest');
  }
  
  if (targetAudience === 'PME' || targetAudience === 'Startup') {
    profiles.push('consultant_pme', 'accompagnement_startup');
  }
  
  // Dédupliquer
  return [...new Set(profiles)];
}

/**
 * Calculer un score de qualité des données
 */
function calculateQualityScore(opportunity) {
  let score = 0;
  
  // Titre présent et de bonne longueur (0-30 points)
  if (opportunity.title_clean) {
    const titleLen = opportunity.title_clean.length;
    if (titleLen >= 20 && titleLen <= 200) score += 30;
    else if (titleLen >= 10) score += 20;
    else score += 10;
  }
  
  // Description présente et de bonne longueur (0-30 points)
  if (opportunity.description_clean) {
    const descLen = opportunity.description_clean.length;
    if (descLen >= 100) score += 30;
    else if (descLen >= 50) score += 20;
    else score += 10;
  }
  
  // Date normalisée (0-15 points)
  if (opportunity.date_normalized) score += 15;
  
  // Secteur détecté (0-10 points)
  if (opportunity.sectors && opportunity.sectors.length > 0 && !opportunity.sectors.includes('non classifié')) {
    score += 10;
  }
  
  // Pays détecté (0-10 points)
  if (opportunity.country && opportunity.country !== 'International') score += 10;
  
  // URL valide (0-5 points)
  if (opportunity.url && opportunity.url.startsWith('http')) score += 5;
  
  return score;
}

/**
 * Créer un identifiant unique
 */
function createId(url, title) {
  const hash = require('crypto')
    .createHash('md5')
    .update(url + title)
    .digest('hex')
    .substring(0, 12);
  return hash;
}

// ============================================
// TRAITEMENT PRINCIPAL
// ============================================

async function processData(inputFile) {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🧹 DATA CLEANING & PROCESSING       ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  console.log(`📂 Fichier d'entrée: ${path.basename(inputFile)}\n`);
  
  const opportunities = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(inputFile)
      .pipe(csv())
      .on('data', (row) => {
        // Ignorer les sources de test
        if (row.source && row.source.includes('Test')) {
          return;
        }
        
        // Nettoyer les données
        const titleClean = cleanText(row.title);
        const descriptionClean = cleanText(row.description);
        const fullText = `${titleClean} ${descriptionClean}`;
        
        // Valider la longueur minimale du titre
        if (titleClean.length < 10) {
          return; // Ignorer les titres trop courts
        }
        
        // Normaliser la date
        const dateNormalized = normalizeDate(row.date);
        
        // Détecter le pays
        const country = detectCountry(fullText, row.source);
        
        // Détecter les secteurs
        const sectors = detectSectors(fullText);
        
        // Métadonnées d'attribution
        const targetAudience = detectTargetAudience(fullText);
        const experienceRequired = detectExperienceRequired(fullText);
        const budgetRange = detectBudgetRange(fullText);
        const urgency = calculateUrgency(dateNormalized);
        const complexity = calculateComplexity(fullText, sectors);
        const suggestedProfiles = suggestProfiles(sectors, country, targetAudience);
        
        // Créer l'opportunité nettoyée
        const cleanedOpportunity = {
          id: createId(row.url, titleClean),
          source: row.source,
          source_type: row.source.includes('Sénégal') || ['DER', 'ARCOP', 'ADEPME'].some(s => row.source.includes(s)) ? 'national' : 'international',
          title_clean: titleClean.substring(0, 300),
          description_clean: descriptionClean.substring(0, 1000),
          url: row.url,
          date_original: row.date || '',
          date_normalized: dateNormalized || '',
          country: country,
          sectors: sectors.join(', '),
          has_description: descriptionClean.length > 0 ? 'oui' : 'non',
          has_date: dateNormalized ? 'oui' : 'non',
          quality_score: 0, // Calculé après
          collected_at: row.collected_at,
          
          // MÉTADONNÉES D'ATTRIBUTION
          target_audience: targetAudience,
          experience_required: experienceRequired,
          budget_range: budgetRange,
          urgency: urgency,
          complexity_level: complexity,
          suggested_profiles: suggestedProfiles.join(', ')
        };
        
        // Calculer le score de qualité
        cleanedOpportunity.quality_score = calculateQualityScore(cleanedOpportunity);
        
        opportunities.push(cleanedOpportunity);
      })
      .on('end', () => resolve(opportunities))
      .on('error', reject);
  });
}

/**
 * Sauvegarder les données nettoyées
 */
async function saveCleanedData(opportunities) {
  const outputDir = path.join(__dirname, '..', 'data', 'processed');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `opportunities_processed_${timestamp}.csv`;
  const filepath = path.join(outputDir, filename);
  
  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: 'id', title: 'id' },
      { id: 'source', title: 'source' },
      { id: 'source_type', title: 'source_type' },
      { id: 'title_clean', title: 'title' },
      { id: 'description_clean', title: 'description' },
      { id: 'url', title: 'url' },
      { id: 'date_original', title: 'date_original' },
      { id: 'date_normalized', title: 'date_normalized' },
      { id: 'country', title: 'country' },
      { id: 'sectors', title: 'sectors' },
      { id: 'has_description', title: 'has_description' },
      { id: 'has_date', title: 'has_date' },
      { id: 'quality_score', title: 'quality_score' },
      { id: 'collected_at', title: 'collected_at' },
      // Métadonnées d'attribution
      { id: 'target_audience', title: 'target_audience' },
      { id: 'experience_required', title: 'experience_required' },
      { id: 'budget_range', title: 'budget_range' },
      { id: 'urgency', title: 'urgency' },
      { id: 'complexity_level', title: 'complexity_level' },
      { id: 'suggested_profiles', title: 'suggested_profiles' }
    ]
  });
  
  await csvWriter.writeRecords(opportunities);
  
  return { filepath, filename };
}

/**
 * Afficher les statistiques
 */
function displayStats(opportunities) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   📊 STATISTIQUES DU NETTOYAGE        ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  console.log(`✅ Total d'opportunités nettoyées: ${opportunities.length}\n`);
  
  // Par source
  const bySources = {};
  opportunities.forEach(opp => {
    bySources[opp.source] = (bySources[opp.source] || 0) + 1;
  });
  console.log('📈 Par source:');
  Object.entries(bySources)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`   - ${source}: ${count}`);
    });
  
  // Par pays
  const byCountry = {};
  opportunities.forEach(opp => {
    byCountry[opp.country] = (byCountry[opp.country] || 0) + 1;
  });
  console.log('\n🌍 Par pays:');
  Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .forEach(([country, count]) => {
      console.log(`   - ${country}: ${count}`);
    });
  
  // Par secteur
  const bySector = {};
  opportunities.forEach(opp => {
    opp.sectors.split(', ').forEach(sector => {
      bySector[sector] = (bySector[sector] || 0) + 1;
    });
  });
  console.log('\n🏭 Top 10 secteurs:');
  Object.entries(bySector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([sector, count]) => {
      console.log(`   - ${sector}: ${count}`);
    });
  
  // Qualité des données
  const withDesc = opportunities.filter(o => o.has_description === 'oui').length;
  const withDate = opportunities.filter(o => o.has_date === 'oui').length;
  const avgQuality = (opportunities.reduce((sum, o) => sum + o.quality_score, 0) / opportunities.length).toFixed(1);
  
  console.log('\n📊 Qualité des données:');
  console.log(`   - Avec description: ${withDesc}/${opportunities.length} (${(withDesc/opportunities.length*100).toFixed(1)}%)`);
  console.log(`   - Avec date normalisée: ${withDate}/${opportunities.length} (${(withDate/opportunities.length*100).toFixed(1)}%)`);
  console.log(`   - Score de qualité moyen: ${avgQuality}/100`);
}

/**
 * Fonction principale
 */
async function main() {
  try {
    // Trouver le dernier fichier nettoyé
    const cleanedDir = path.join(__dirname, '..', 'data', 'cleaned');
    const cleanedFiles = fs.readdirSync(cleanedDir)
      .filter(f => f.endsWith('.csv'))
      .map(f => ({
        name: f,
        path: path.join(cleanedDir, f),
        time: fs.statSync(path.join(cleanedDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (cleanedFiles.length === 0) {
      console.error('❌ Aucun fichier nettoyé trouvé dans data/cleaned/');
      process.exit(1);
    }
    
    const inputFile = cleanedFiles[0].path;
    
    // Traiter les données
    const opportunities = await processData(inputFile);
    
    // Supprimer les doublons
    const uniqueOpportunities = [];
    const seen = new Set();
    
    for (const opp of opportunities) {
      if (!seen.has(opp.id)) {
        seen.add(opp.id);
        uniqueOpportunities.push(opp);
      }
    }
    
    console.log(`✅ Opportunités traitées: ${opportunities.length}`);
    console.log(`🧹 Après dédoublonnage: ${uniqueOpportunities.length}\n`);
    
    // Sauvegarder
    const { filepath, filename } = await saveCleanedData(uniqueOpportunities);
    console.log(`💾 Sauvegardé: ${filename}`);
    
    // Afficher les statistiques
    displayStats(uniqueOpportunities);
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ✅ NETTOYAGE TERMINÉ                ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log(`📁 Fichier final: data/processed/${filename}`);
    console.log(`📊 Dataset prêt pour l'IA et l'analyse\n`);
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Lancer le traitement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processData, saveCleanedData };
