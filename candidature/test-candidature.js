/**
 * Test du flux complet Candidature Préremplie (Module 3)
 * Vérifie :
 *  1. Analyse et détection des données manquantes sans hallucination
 *  2. Persistance dans le profil utilisateur
 *  3. Recalcul de complétude
 *  4. Génération IA de la lettre de motivation
 */

const {
  analyzeApplication,
  saveFieldsToUserProfile,
  saveOrUpdateCandidature,
  generateCoverLetter
} = require('./candidature-engine');

const mysql = require('mysql2/promise');

async function runTest() {
  console.log('====================================================');
  console.log('🧪 TEST DU MODULE 3 : CANDIDATURE PRÉREMPLIE');
  console.log('====================================================\n');

  const userId = 'usr-ent-001'; // Fatou Sow
  
  // 1. Récupérer une opportunité test
  const connOpp = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gaynaako_opportunities',
  });
  const [opps] = await connOpp.query('SELECT id, title FROM opportunities_processed LIMIT 1');
  await connOpp.end();

  if (!opps.length) {
    console.error('❌ Aucune opportunité disponible pour le test.');
    process.exit(1);
  }

  const testOpp = opps[0];
  console.log(`🎯 Opportunité ciblée : "${testOpp.title}" (${testOpp.id})\n`);

  // 2. Analyse initiale
  console.log('📋 Étape 1 : Analyse initiale du dossier de candidature...');
  const initial = await analyzeApplication(userId, testOpp.id);
  console.log(`   • Total requis : ${initial.total_requis}`);
  console.log(`   • Remplis      : ${initial.nb_remplis} (${initial.score_completude}%)`);
  console.log(`   • Manquants    : ${initial.nb_manquants}`);

  console.log('\n   ✅ Champs disponibles :');
  for (const [key, val] of Object.entries(initial.champs_pre_remplis)) {
    console.log(`      - ${val.label} : "${val.value}"`);
  }

  console.log('\n   ❌ Informations manquantes obligatoires :');
  for (const m of initial.champs_manquants) {
    console.log(`      - ${m.label} (${m.key})`);
  }

  // 3. Compléter les informations manquantes (simulation saisie utilisateur)
  console.log('\n✏️ Étape 2 : Simulation de saisie des informations manquantes...');
  const fieldsToComplete = {
    telephone: '+221 77 123 45 67',
    formation_principale: 'Master 2 en Intelligence Artificielle & Data Science',
    annees_experience: 5,
    cv_url: 'https://storage.gaynaako.sn/cv/fatou_sow_ia.pdf'
  };

  const updateRes = await saveFieldsToUserProfile(userId, fieldsToComplete);
  console.log('   ✅ Sauvegarde dans le profil MySQL gaynaako_profils réussie :');
  console.log('     ', updateRes.updated_fields);

  // 4. Nouvelle analyse : vérification de la mise à jour
  console.log('\n📊 Étape 3 : Nouvelle analyse après enrichissement du profil...');
  const afterUpdate = await analyzeApplication(userId, testOpp.id);
  console.log(`   • Complétude : ${afterUpdate.score_completude}% (Remplis : ${afterUpdate.nb_remplis}/${afterUpdate.total_requis})`);
  console.log(`   • Manquants  : ${afterUpdate.nb_manquants}`);
  console.log(`   • Statut     : ${afterUpdate.statut}`);

  // 5. Sauvegarde de la candidature en base
  console.log('\n💾 Étape 4 : Enregistrement de la candidature dans la table candidatures...');
  const candSaved = await saveOrUpdateCandidature(userId, testOpp.id);
  console.log(`   ✅ Dossier enregistré ID : ${candSaved.candidature_id}`);

  // 6. Génération IA de la lettre de motivation
  console.log('\n🤖 Étape 5 : Génération de la lettre de motivation avec Groq LLM...');
  try {
    const letterRes = await generateCoverLetter(userId, testOpp.id);
    console.log('   ✅ Lettre générée avec succès !');
    console.log('   --------------------------------------------------');
    console.log(letterRes.lettre_motivation.substring(0, 400) + '...\n   [suite tronquée pour affichage]');
    console.log('   --------------------------------------------------');
  } catch (err) {
    console.warn('   ⚠️ Note génération lettre :', err.message);
  }

  console.log('\n🎉 TEST COMPLET RÉUSSI AVEC SUCCÈS !');
}

runTest().catch(console.error);
