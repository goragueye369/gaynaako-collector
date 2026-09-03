/**
 * Test et Démonstration du Moteur de Matching Hybride Gaynaako
 * Exécute le matching sur les profils de référence face aux opportunités réelles
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { calculateMatch } = require('./matching-engine');

async function loadLatestProcessedOpportunities() {
  const processedDir = path.join(__dirname, 'data', 'processed');
  if (!fs.existsSync(processedDir)) return [];

  const files = fs.readdirSync(processedDir).filter(f => f.endsWith('.csv'));
  if (files.length === 0) return [];

  const latestFile = path.join(processedDir, files.sort().reverse()[0]);
  console.log(`📂 Chargement des opportunités depuis : ${path.basename(latestFile)}`);

  return new Promise((resolve, reject) => {
    const opportunities = [];
    fs.createReadStream(latestFile)
      .pipe(csv())
      .on('data', (row) => opportunities.push(row))
      .on('end', () => resolve(opportunities))
      .on('error', reject);
  });
}

async function runMatchingDemo() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🤖 DÉMONSTRATION DU MATCHING HYBRIDE GAYNAAKO          ║');
  console.log('║   (IA Sémantique + Règles Métier + Explicabilité)        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Charger les profils de référence
  const profilesPath = path.join(__dirname, 'data', 'benchmark_profiles.json');
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  console.log(`👤 ${profiles.length} profils de référence chargés.\n`);

  // 2. Charger les opportunités
  const opportunities = await loadLatestProcessedOpportunities();
  console.log(`📄 ${opportunities.length} opportunités prêtes pour le matching.\n`);

  // Tester sur 3 profils types très différents
  const testProfiles = [
    profiles[0], // Fatou Sow (Data Scientist)
    profiles[1], // Moussa Diop (Agronome)
    profiles[2]  // Awa Ndiaye (Énergie Solaire)
  ];

  for (const profile of testProfiles) {
    console.log('═'.repeat(60));
    console.log(`🎯 CANDIDAT : ${profile.full_name.toUpperCase()}`);
    console.log(`   Titre : ${profile.current_title}`);
    console.log(`   Études : ${profile.education_level} | Expérience : ${profile.experience_years} ans (${profile.seniority_level})`);
    console.log(`   Secteurs : ${profile.sectors.join(', ')}`);
    console.log(`   Compétences : ${profile.skills.slice(0, 4).join(', ')}...`);
    console.log('═'.repeat(60));

    // Calculer le matching avec toutes les opportunités
    const matches = opportunities.map(opp => calculateMatch(profile, opp));

    // Trier par score final décroissant
    matches.sort((a, b) => b.final_score - a.final_score);

    // Afficher le Top 3
    console.log('\n🏆 TOP 3 DES OPPORTUNITÉS CORRESPONDANTES :\n');
    matches.slice(0, 3).forEach((m, idx) => {
      console.log(`  ${idx + 1}. [SCORE FINAL : ${m.final_score}%] (${m.match_category})`);
      console.log(`     📌 Titre : ${m.title}`);
      console.log(`     📍 Pays : ${m.country} | Secteurs : ${m.sectors}`);
      console.log(`     📊 Détail : IA Sémantique: ${m.ai_score}% | Règles Métier: ${m.rules_score}%`);
      console.log(`        - Compétences: ${m.breakdown.skills_score}% | Secteurs: ${m.breakdown.sectors_score}% | Exp: ${m.breakdown.experience_score}%`);
      
      console.log('     💬 Explications :');
      m.explanation.strengths.forEach(s => console.log(`        ✅ ${s}`));
      m.explanation.warnings.forEach(w => console.log(`        ⚠️  ${w}`));
      console.log('');
    });
  }

  console.log('✅ Démonstration terminée avec succès !\n');
}

if (require.main === module) {
  runMatchingDemo().catch(console.error);
}

module.exports = { runMatchingDemo };
