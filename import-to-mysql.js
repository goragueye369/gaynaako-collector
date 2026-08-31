/**
 * Script d'import des opportunités nettoyées vers MySQL
 * Usage: node import-to-mysql.js [fichier-csv]
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Configuration MySQL depuis les variables d'environnement ou valeurs par défaut
const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  database: process.env.MYSQL_DB || 'gaynaako_opportunities',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || ''
};

/**
 * Trouver le fichier CSV nettoyé le plus récent
 */
function findLatestCleanedCSV() {
  const cleanedDir = path.join(__dirname, 'data', 'cleaned');
  
  if (!fs.existsSync(cleanedDir)) {
    console.error('❌ Dossier data/cleaned/ introuvable');
    console.error('💡 Exécutez d\'abord le notebook pour nettoyer les données');
    process.exit(1);
  }

  const files = fs.readdirSync(cleanedDir)
    .filter(f => f.endsWith('.csv'))
    .map(f => ({
      name: f,
      path: path.join(cleanedDir, f),
      time: fs.statSync(path.join(cleanedDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    console.error('❌ Aucun fichier CSV trouvé dans data/cleaned/');
    console.error('💡 Exécutez d\'abord le notebook pour nettoyer les données');
    process.exit(1);
  }

  return files[0].path;
}

/**
 * Lire et parser le fichier CSV
 */
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/**
 * Obtenir l'ID de la source (ou la créer si elle n'existe pas)
 */
async function getSourceId(connection, sourceName) {
  const [rows] = await connection.query('SELECT id FROM sources WHERE name = ?', [sourceName]);
  
  if (rows.length > 0) {
    return rows[0].id;
  }
  
  // Créer la source si elle n'existe pas
  const [result] = await connection.query(
    'INSERT INTO sources (name, type, status) VALUES (?, ?, ?)',
    [sourceName, 'unknown', 'active']
  );
  return result.insertId;
}

/**
 * Importer les opportunités
 */
async function importOpportunities(connection, opportunities) {
  let inserted = 0;
  let duplicates = 0;
  let errors = 0;

  console.log(`\n📊 Import de ${opportunities.length} opportunités...`);
  
  for (const opp of opportunities) {
    try {
      // Obtenir l'ID de la source
      const sourceId = await getSourceId(connection, opp.source);
      
      // Préparer les données
      const collectedAt = opp.collected_at ? new Date(opp.collected_at) : new Date();
      
      // Insérer l'opportunité (ignorer les doublons)
      const query = `
        INSERT IGNORE INTO opportunities (
          source_id, 
          source_name, 
          title, 
          description, 
          url, 
          date, 
          collected_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        sourceId,
        opp.source,
        opp.title,
        opp.description || '',
        opp.url,
        opp.date || null,
        collectedAt
      ];
      
      const [result] = await connection.query(query, values);
      
      if (result.affectedRows > 0) {
        inserted++;
        if (inserted % 10 === 0) {
          process.stdout.write(`\r✅ Importées: ${inserted} | ⚠️ Doublons: ${duplicates} | ❌ Erreurs: ${errors}`);
        }
      } else {
        duplicates++;
      }
      
    } catch (error) {
      errors++;
      console.error(`\n❌ Erreur pour: ${opp.title.substring(0, 50)}...`);
      console.error(`   ${error.message}`);
    }
  }
  
  console.log(`\n\n✅ Import terminé:`);
  console.log(`   - Nouvelles opportunités: ${inserted}`);
  console.log(`   - Doublons ignorés: ${duplicates}`);
  console.log(`   - Erreurs: ${errors}`);
  
  return { inserted, duplicates, errors };
}

/**
 * Afficher les statistiques
 */
async function showStats(connection) {
  console.log('\n========================================');
  console.log('📊 STATISTIQUES DE LA BASE DE DONNÉES');
  console.log('========================================\n');
  
  // Total d'opportunités
  const [totalResult] = await connection.query('SELECT COUNT(*) as total FROM opportunities');
  console.log(`Total d'opportunités: ${totalResult[0].total}`);
  
  // Par source
  const sourceStatsQuery = `
    SELECT 
      source_name,
      COUNT(*) as count,
      MAX(collected_at) as last_collected
    FROM opportunities
    GROUP BY source_name
    ORDER BY count DESC
  `;
  const [sourceStats] = await connection.query(sourceStatsQuery);
  
  console.log('\nPar source:');
  sourceStats.forEach(row => {
    const lastCollected = new Date(row.last_collected).toLocaleString('fr-FR');
    console.log(`  - ${row.source_name}: ${row.count} (dernière: ${lastCollected})`);
  });
  
  console.log('\n========================================\n');
}

/**
 * Fonction principale
 */
async function main() {
  console.log('========================================');
  console.log('📥 IMPORT VERS MYSQL');
  console.log('========================================\n');
  
  // Trouver le fichier CSV
  const csvFile = process.argv[2] || findLatestCleanedCSV();
  console.log(`📂 Fichier: ${path.basename(csvFile)}`);
  
  // Lire le CSV
  console.log('📖 Lecture du fichier CSV...');
  const opportunities = await readCSV(csvFile);
  console.log(`✅ ${opportunities.length} opportunités lues\n`);
  
  // Connexion à MySQL
  console.log('🔌 Connexion à MySQL...');
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connecté à MySQL\n');
    
    // Import
    const stats = await importOpportunities(connection, opportunities);
    
    // Statistiques
    await showStats(connection);
    
    // Mettre à jour les timestamps des sources
    await connection.query(`
      UPDATE sources 
      SET last_scraped_at = NOW()
      WHERE name IN (
        SELECT DISTINCT source_name FROM opportunities
      )
    `);
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 La base de données n\'existe pas. Créez-la avec:');
      console.error('   mysql -u root -p < schema.sql');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée\n');
    }
  }
}

// Lancer le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, importOpportunities };
