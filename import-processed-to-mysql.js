/**
 * Import des données enrichies (processed) vers MySQL
 * Table: opportunities_processed
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Configuration MySQL
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'gaynaako_api',
  password: process.env.DB_PASSWORD || 'apipassword123',
  database: process.env.DB_NAME || 'gaynaako_opportunities'
};

/**
 * Lire le fichier CSV
 */
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const opportunities = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => opportunities.push(row))
      .on('end', () => resolve(opportunities))
      .on('error', reject);
  });
}

/**
 * Importer dans MySQL
 */
async function importToMySQL(filePath) {
  console.log('========================================');
  console.log('📥 IMPORT VERS MYSQL (PROCESSED)');
  console.log('========================================\n');
  
  console.log(`📂 Fichier: ${path.basename(filePath)}`);
  
  // Lire le CSV
  console.log('📖 Lecture du fichier CSV...');
  const opportunities = await readCSV(filePath);
  console.log(`✅ ${opportunities.length} opportunités lues\n`);
  
  // Connexion MySQL
  console.log('🔌 Connexion à MySQL...');
  console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  console.log(`   Database: ${DB_CONFIG.database}`);
  console.log(`   User: ${DB_CONFIG.user}`);
  
  const connection = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Connecté à MySQL\n');
  
  // Statistiques
  let imported = 0;
  let duplicates = 0;
  let errors = 0;
  
  console.log(`\n📊 Import de ${opportunities.length} opportunités...\n`);
  
  for (const opp of opportunities) {
    try {
      // Préparer la requête d'insertion
      const query = `
        INSERT INTO opportunities_processed (
          id, source_name, source_type, title, description, url,
          date_original, date_normalized, country, sectors,
          has_description, has_date, quality_score, collected_at,
          target_audience, experience_required, budget_range, 
          urgency, complexity_level, suggested_profiles
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          date_normalized = VALUES(date_normalized),
          country = VALUES(country),
          sectors = VALUES(sectors),
          quality_score = VALUES(quality_score),
          target_audience = VALUES(target_audience),
          experience_required = VALUES(experience_required),
          budget_range = VALUES(budget_range),
          urgency = VALUES(urgency),
          complexity_level = VALUES(complexity_level),
          suggested_profiles = VALUES(suggested_profiles),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      const values = [
        opp.id,
        opp.source,
        opp.source_type,
        opp.title,
        opp.description || null,
        opp.url,
        opp.date_original || null,
        opp.date_normalized || null,
        opp.country || null,
        opp.sectors || null,
        opp.has_description || 'non',
        opp.has_date || 'non',
        parseInt(opp.quality_score) || 0,
        opp.collected_at,
        opp.target_audience || null,
        opp.experience_required || null,
        opp.budget_range || null,
        opp.urgency || null,
        parseInt(opp.complexity_level) || 0,
        opp.suggested_profiles || null
      ];
      
      const [result] = await connection.execute(query, values);
      
      if (result.affectedRows === 1) {
        imported++;
      } else if (result.affectedRows === 2) {
        duplicates++;
      }
      
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        duplicates++;
      } else {
        errors++;
        console.error(`❌ Erreur: ${error.message}`);
      }
    }
    
    // Afficher la progression tous les 10 enregistrements
    if ((imported + duplicates + errors) % 10 === 0) {
      process.stdout.write(`\r✅ Importées: ${imported} | ⚠️ Doublons: ${duplicates} | ❌ Erreurs: ${errors}`);
    }
  }
  
  console.log(`\n\n✅ Import terminé:`);
  console.log(`   - Nouvelles opportunités: ${imported}`);
  console.log(`   - Mises à jour (doublons): ${duplicates}`);
  console.log(`   - Erreurs: ${errors}\n`);
  
  // Afficher les statistiques de la base
  console.log('========================================');
  console.log('📊 STATISTIQUES DE LA BASE DE DONNÉES');
  console.log('========================================\n');
  
  const [stats] = await connection.query(`
    SELECT 
      COUNT(*) as total,
      AVG(quality_score) as avg_quality,
      COUNT(DISTINCT country) as total_countries,
      COUNT(DISTINCT source_name) as total_sources,
      COUNT(CASE WHEN has_description = 'oui' THEN 1 END) as with_description,
      COUNT(CASE WHEN has_date = 'oui' THEN 1 END) as with_date,
      COUNT(CASE WHEN quality_score > 70 THEN 1 END) as high_quality
    FROM opportunities_processed
  `);
  
  const stat = stats[0];
  console.log(`Total d'opportunités: ${stat.total}`);
  console.log(`Score de qualité moyen: ${parseFloat(stat.avg_quality).toFixed(1)}/100`);
  console.log(`Opportunités haute qualité (>70): ${stat.high_quality}`);
  console.log(`Avec description: ${stat.with_description} (${(stat.with_description/stat.total*100).toFixed(1)}%)`);
  console.log(`Avec date normalisée: ${stat.with_date} (${(stat.with_date/stat.total*100).toFixed(1)}%)`);
  console.log(`Pays couverts: ${stat.total_countries}`);
  console.log(`Sources actives: ${stat.total_sources}\n`);
  
  // Par pays
  const [byCountry] = await connection.query(`
    SELECT country, COUNT(*) as count 
    FROM opportunities_processed 
    GROUP BY country 
    ORDER BY count DESC
  `);
  
  console.log('Par pays:');
  byCountry.forEach(row => {
    console.log(`   - ${row.country}: ${row.count}`);
  });
  
  console.log('\n========================================\n');
  
  // Fermer la connexion
  await connection.end();
  console.log('🔌 Connexion fermée\n');
}

/**
 * Fonction principale
 */
async function main() {
  try {
    // Trouver le dernier fichier processed
    const processedDir = path.join(__dirname, 'data', 'processed');
    
    if (!fs.existsSync(processedDir)) {
      console.error('❌ Le dossier data/processed/ n\'existe pas');
      console.log('💡 Lancez d\'abord: node data-cleaner.js');
      process.exit(1);
    }
    
    const files = fs.readdirSync(processedDir)
      .filter(f => f.endsWith('.csv'))
      .map(f => ({
        name: f,
        path: path.join(processedDir, f),
        time: fs.statSync(path.join(processedDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length === 0) {
      console.error('❌ Aucun fichier CSV trouvé dans data/processed/');
      console.log('💡 Lancez d\'abord: node data-cleaner.js');
      process.exit(1);
    }
    
    // Utiliser le fichier le plus récent ou celui passé en argument
    const filePath = process.argv[2] || files[0].path;
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Fichier introuvable: ${filePath}`);
      process.exit(1);
    }
    
    await importToMySQL(filePath);
    
    console.log('✅ Import terminé\n');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Lancer l'import
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, importToMySQL };
