/**
 * Scheduler avec node-cron
 * Lance le PIPELINE COMPLET (Collecte + MySQL + NLP + Embeddings)
 * Usage: node scheduler.js (laisser tourner en arrière-plan)
 */

const cron = require('node-cron');
const { runPipeline } = require('./pipeline-complet');

console.log('🤖 Scheduler démarré (PIPELINE COMPLET)...\n');

// TEST : Exécution à 13h05 pour voir le système en action
cron.schedule('05 13 * * *', async () => {
  console.log('⏰ Déclenchement du PIPELINE COMPLET...');
  await runPipeline();
});

// OPTION 1 : Tous les jours à 10h du matin (heure Sénégal GMT+0)
// cron.schedule('0 10 * * *', async () => {
//   console.log('⏰ Déclenchement du PIPELINE COMPLET...');
//   await runPipeline();
// });

// OPTION 2 : Toutes les 6 heures (si beaucoup de nouvelles opportunités)
// cron.schedule('0 */6 * * *', async () => {
//   await runPipeline();
// });

// OPTION 3 : Du lundi au vendredi à 8h
// cron.schedule('0 8 * * 1-5', async () => {
//   await runPipeline();
// });

// OPTION 4 : Une fois par semaine le lundi à 9h
// cron.schedule('0 9 * * 1', async () => {
//   await runPipeline();
// });

console.log('⏰ Prochaine exécution : Tous les jours à 13h05 (TEST)');
console.log('📋 Pipeline : Collecte → MySQL → NLP → Embeddings');
console.log('📝 Logs : collector/logs/');
console.log('\n✅ Scheduler actif. Appuyez sur Ctrl+C pour arrêter.\n');

// Empêcher le script de se terminer
process.stdin.resume();
