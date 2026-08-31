/**
 * Script d'automatisation complète
 * Collecte → Nettoyage → Import MySQL
 * Usage: node auto-collect.js
 */

const { collect } = require('./scraper');
const { main: importToMySQL } = require('./import-to-mysql');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

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
 * Sauvegarder les données nettoyées
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
    console.log('📥 ÉTAPE 1/3 : Collecte des données...\n');
    await collect();
    
    const rawFile = findLatestRawCSV();
    if (!rawFile) {
      throw new Error('Aucun fichier CSV brut trouvé après la collecte');
    }
    
    console.log(`✅ Collecte terminée : ${path.basename(rawFile)}\n`);

    // ÉTAPE 2 : Nettoyage
    console.log('🧹 ÉTAPE 2/3 : Nettoyage des données...\n');
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

    // ÉTAPE 3 : Import MySQL
    console.log('💾 ÉTAPE 3/3 : Import vers MySQL...\n');
    
    // Passer le fichier nettoyé en argument
    process.argv[2] = cleanedFile;
    await importToMySQL();
    
    console.log('✅ Import terminé\n');

    // Résumé
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✅ AUTOMATISATION RÉUSSIE           ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log(`⏱️  Durée totale : ${duration}s`);
    console.log(`📊 Opportunités collectées : ${rawOpportunities.length}`);
    console.log(`🧹 Opportunités nettoyées : ${uniqueOpportunities.length}`);
    console.log(`💾 Fichier brut : ${path.basename(rawFile)}`);
    console.log(`💾 Fichier nettoyé : ${path.basename(cleanedFile)}`);
    console.log(`📅 Date : ${new Date().toLocaleString('fr-FR')}\n`);

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
