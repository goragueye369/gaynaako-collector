/**
 * Script d'automatisation complète
 * Collecte → Nettoyage → Processing → Import MySQL
 * Usage: node auto-collect.js
 */

const { collect } = require('./scraper');
const { processData } = require('./data-cleaner');
const { importToMySQL: importProcessedToMySQL } = require('./import-processed-to-mysql');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

/**
 * Fonction de nettoyage des données
 */
async function cleanData(inputFile) {
  return new Promise((resolve, reject) => {
    const opportunities = [];
    
    fs.createReadStream(inputFile)
      .pipe(csv())
      .on('data', (row) => {
        // Filtrer les opportunités de test
        if (row.source && !row.source.includes('Test')) {
          // Nettoyer le titre
          const title = row.title ? row.title.trim() : '';
          
          // Garder seulement les opportunités avec titre > 10 caractères
          if (title.length >= 10) {
            opportunities.push({
              source: row.source,
              title: title.replace(/\s+/g, ' '),
              description: row.description ? row.description.trim().replace(/\s+/g, ' ') : '',
              url: row.url,
              date: row.date || '',
              collected_at: row.collected_at
            });
          }
        }
      })
      .on('end', () => resolve(opportunities))
      .on('error', reject);
  });
}

/**
 * Sauvegarder les données nettoyées (basique)
 */
function saveCleanedData(opportunities) {
  const cleanedDir = path.join(__dirname, 'data', 'cleaned');
  
  if (!fs.existsSync(cleanedDir)) {
    fs.mkdirSync(cleanedDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `opportunities_clean_${timestamp}.csv`;
  const filepath = path.join(cleanedDir, filename);

  // En-têtes CSV
  const headers = ['source', 'title', 'description', 'url', 'date', 'collected_at'];
  
  // Créer le contenu CSV
  const csvContent = [
    headers.join(','),
    ...opportunities.map(opp => 
      headers.map(h => {
        const value = opp[h] || '';
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  fs.writeFileSync(filepath, csvContent, 'utf8');
  
  return filepath;
}

/**
 * Sauvegarder les données enrichies (avec métadonnées)
 */
async function saveProcessedData(opportunities) {
  const processedDir = path.join(__dirname, 'data', 'processed');
  
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `opportunities_processed_${timestamp}.csv`;
  const filepath = path.join(processedDir, filename);
  
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
 * Trouver le dernier fichier CSV brut
 */
function findLatestRawCSV() {
  const rawDir = path.join(__dirname, 'data', 'raw');
  
  if (!fs.existsSync(rawDir)) {
    return null;
  }

  const files = fs.readdirSync(rawDir)
    .filter(f => f.endsWith('.csv'))
    .map(f => ({
      name: f,
      path: path.join(rawDir, f),
      time: fs.statSync(path.join(rawDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? files[0].path : null;
}

/**
 * Processus complet automatisé
 */
async function autoCollect() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🤖 AUTOMATISATION COMPLÈTE          ║');
  console.log('╚════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // ÉTAPE 1 : Collecte
    console.log('📥 ÉTAPE 1/4 : Collecte des données...\n');
    await collect();
    
    const rawFile = findLatestRawCSV();
    if (!rawFile) {
      throw new Error('Aucun fichier CSV brut trouvé après la collecte');
    }
    
    console.log(`✅ Collecte terminée : ${path.basename(rawFile)}\n`);

    // ÉTAPE 2 : Nettoyage basique
    console.log('🧹 ÉTAPE 2/4 : Nettoyage basique...\n');
    const rawOpportunities = await cleanData(rawFile);
    console.log(`   - Opportunités brutes : ${rawOpportunities.length}`);
    
    // Supprimer les doublons
    const uniqueOpportunities = [];
    const seen = new Set();
    
    for (const opp of rawOpportunities) {
      const key = `${opp.url}_${opp.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueOpportunities.push(opp);
      }
    }
    
    console.log(`   - Après dédoublonnage : ${uniqueOpportunities.length}`);
    
    const cleanedFile = saveCleanedData(uniqueOpportunities);
    console.log(`✅ Nettoyage terminé : ${path.basename(cleanedFile)}\n`);

    // ÉTAPE 3 : Processing avancé (normalisation, enrichissement, métadonnées)
    console.log('⚙️  ÉTAPE 3/4 : Processing avancé (métadonnées d\'attribution)...\n');
    const processedOpportunities = await processData(cleanedFile);
    console.log(`   - Opportunités traitées : ${processedOpportunities.length}`);
    
    // Dédupliquer les opportunités processées
    const uniqueProcessed = [];
    const seenProcessed = new Set();
    
    for (const opp of processedOpportunities) {
      if (!seenProcessed.has(opp.id)) {
        seenProcessed.add(opp.id);
        uniqueProcessed.push(opp);
      }
    }
    
    const { filepath: processedFile, filename: processedFilename } = await saveProcessedData(uniqueProcessed);
    console.log(`✅ Processing terminé : ${processedFilename}`);
    console.log(`   - Métadonnées générées : target_audience, experience_required, budget_range, urgency, complexity_level, suggested_profiles\n`);

    // ÉTAPE 4 : Import MySQL
    console.log('💾 ÉTAPE 4/4 : Import vers MySQL (table opportunities_processed)...\n');
    
    process.argv[2] = processedFile;
    await importProcessedToMySQL(processedFile);
    
    console.log('✅ Import MySQL terminé\n');

    // Résumé
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✅ AUTOMATISATION RÉUSSIE           ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log(`⏱️  Durée totale : ${duration}s`);
    console.log(`📊 Opportunités collectées : ${rawOpportunities.length}`);
    console.log(`🧹 Opportunités nettoyées : ${uniqueOpportunities.length}`);
    console.log(`⚙️  Opportunités enrichies : ${uniqueProcessed.length}`);
    console.log(`💾 Fichier brut : ${path.basename(rawFile)}`);
    console.log(`💾 Fichier nettoyé : ${path.basename(cleanedFile)}`);
    console.log(`💾 Dataset enrichi : ${processedFilename}`);
    console.log(`\n📊 Table MySQL mise à jour :`);
    console.log(`   - opportunities_processed (avec métadonnées d'attribution)`);
    console.log(`\n📅 Date : ${new Date().toLocaleString('fr-FR')}\n`);

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'automatisation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Lancer l'automatisation
if (require.main === module) {
  autoCollect().catch(console.error);
}

module.exports = { autoCollect };
