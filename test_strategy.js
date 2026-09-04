/**
 * Test du Moteur Stratégique IA Gaynaako
 * Vérifie la génération de la stratégie pour Entrepreneur, PME et ONG
 */

const { generateUserStrategy } = require('./matching/strategy-engine');

async function testStrategy() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   🎯 TEST DU MOTEUR STRATÉGIQUE IA GAYNAAKO          ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const testUserIds = ['usr-ent-001', 'usr-pme-001', 'usr-ong-001'];

  for (const userId of testUserIds) {
    console.log(`\n======================================================`);
    console.log(`📊 ANALYSE STRATÉGIQUE POUR : ${userId}`);
    console.log(`======================================================`);

    try {
      const strategy = await generateUserStrategy(userId);

      console.log(`\n👤 Profil : ${strategy.user.nom} (${strategy.user.role})`);
      console.log(`💡 Statut Marché : ${strategy.synthesis.statutMarche}`);
      console.log(`📈 Couverture Marché : ${strategy.synthesis.tauxCouvertureMarche}`);
      console.log(`📢 Conseil Clé : ${strategy.synthesis.conseilCle}\n`);

      console.log(`--- 1. MATRICE DE PRIORISATION ---`);
      console.log(`⚡ Quick Wins : ${strategy.prioritiesMatrix.counts.quickWins}`);
      console.log(`🏆 Paris Stratégiques : ${strategy.prioritiesMatrix.counts.strategicBets}`);
      console.log(`🛡️ Valeurs Sûres : ${strategy.prioritiesMatrix.counts.safeBets}`);

      console.log(`\n--- 2. ROADMAP DES CANDIDATURES ---`);
      console.log(`🔴 Cette semaine (Urgent) : ${strategy.roadmap.thisWeek.count} action(s)`);
      console.log(`🟠 Sous 15 jours : ${strategy.roadmap.next2Weeks.count} action(s)`);
      console.log(`🟢 Veille active : ${strategy.roadmap.ongoing.count} opportunité(s)`);

      console.log(`\n--- 3. GAP ANALYSIS & COMPÉTENCES DU MARCHÉ ---`);
      console.log(`🔍 Top compétences demandées sur le marché :`);
      strategy.gapAnalysis.topMarketDemands.slice(0, 3).forEach(d => {
        console.log(`   • ${d.skill} (${d.demandCount} opportunités) ➔ ${d.tip}`);
      });

      console.log(`\n📋 Actions recommandées pour ${strategy.user.role} :`);
      strategy.gapAnalysis.actionableRecommendations.forEach(r => {
        console.log(`   [${r.priority}] ${r.category} : ${r.title} - ${r.description}`);
      });

      console.log(`\n✅ Analyse réussie pour ${userId} !`);

    } catch (err) {
      console.error(`❌ Erreur pour ${userId}:`, err.message);
    }
  }

  console.log('\n🎉 TOUS LES TESTS DU MOTEUR STRATÉGIQUE SONT TERMINÉS !\n');
}

testStrategy().catch(console.error);
