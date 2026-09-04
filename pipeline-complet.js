/**
 * Pipeline Complet Automatisé
 * Collecte → Nettoyage → MySQL → NLP → Embeddings
 * Usage: node pipeline-complet.js
 */

const { autoCollect } = require('./collector/auto-collect');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Exécuter une commande et afficher le résultat
 */
async function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  console.log(`   Commande: ${command}\n`);
  
  try {
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
      cwd: __dirname 
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.warn(stderr);
    
    console.log(`✅ ${description} terminé\n`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de ${description}:`);
    console.error(error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

/**
 * Pipeline complet
 */
async function runPipeline() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   🚀 PIPELINE COMPLET AUTOMATISÉ                ║');
  console.log('║   Collecte → MySQL → NLP → Embeddings           ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // ÉTAPE 1 : Collecte + Nettoyage + Import MySQL
    console.log('═══════════════════════════════════════════════════');
    console.log('PHASE 1 : COLLECTE ET IMPORT MYSQL');
    console.log('═══════════════════════════════════════════════════\n');
    
    await autoCollect();

    // ÉTAPE 2 : Analyse NLP
    console.log('\n═══════════════════════════════════════════════════');
    console.log('PHASE 2 : ANALYSE NLP (Intelligence Artificielle)');
    console.log('═══════════════════════════════════════════════════\n');
    
    await runCommand(
      'python collector/nlp-processor.py',
      'Analyse NLP (montants, deadlines, organisations)'
    );

    // ÉTAPE 3 : Génération des Embeddings
    console.log('\n═══════════════════════════════════════════════════');
    console.log('PHASE 3 : GÉNÉRATION DES EMBEDDINGS');
    console.log('═══════════════════════════════════════════════════\n');
    
    await runCommand(
      'python collector/embedding-generator.py',
      'Génération des vecteurs sémantiques'
    );

    // ÉTAPE 4 : Calcul et Mise à jour du Matching par IA Sémantique
    console.log('\n═══════════════════════════════════════════════════');
    console.log('PHASE 4 : RECOMMANDATIONS PAR IA (BGE-M3 / Embeddings)');
    console.log('═══════════════════════════════════════════════════\n');
    
    await runCommand(
      'python matching/bge-matching-mysql.py',
      'Matching IA sémantique et persistance des recommandations'
    );

    // Résumé final
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   ✅ PIPELINE COMPLET RÉUSSI                    ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    console.log(`⏱️  Durée totale : ${duration}s`);
    console.log(`\n📊 Résumé des opérations :`);
    console.log(`   ✅ Collecte des opportunités`);
    console.log(`   ✅ Nettoyage et enrichissement`);
    console.log(`   ✅ Import dans MySQL (opportunities_processed)`);
    console.log(`   ✅ Analyse NLP (colonnes nlp_* dans MySQL)`);
    console.log(`   ✅ Embeddings (fichiers JSON dans data/embeddings/)`);
    console.log(`   ✅ Matching sémantique IA (BGE-M3) & persistance des recommandations`);
    console.log(`\n📅 Date : ${new Date().toLocaleString('fr-FR')}`);
    console.log(`\n🎉 Le système de recommandation par IA est prêt et à jour !\n`);

  } catch (error) {
    console.error('\n❌ Erreur lors du pipeline:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Lancer le pipeline
if (require.main === module) {
  runPipeline().catch(console.error);
}

module.exports = { runPipeline };
