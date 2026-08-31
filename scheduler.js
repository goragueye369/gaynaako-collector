/**
 * Scheduler avec node-cron
 * Usage: node scheduler.js (laisser tourner en arrière-plan)
 */

const cron = require('node-cron');
const { autoCollect } = require('./auto-collect');

console.log('🤖 Scheduler démarré...\n');

// OPTION 1 : Tous les jours à 10h du matin (heure Sénégal GMT+0)
cron.schedule('0 10 * * *', async () => {
  console.log('⏰ Déclenchement de la collecte automatique...');
  await autoCollect();
});

// OPTION 2 : Toutes les 6 heures
// cron.schedule('0 */6 * * *', async () => {
//   await autoCollect();
// });

// OPTION 3 : Du lundi au vendredi à 8h
// cron.schedule('0 8 * * 1-5', async () => {
//   await autoCollect();
// });

// OPTION 4 : Toutes les heures
// cron.schedule('0 * * * *', async () => {
//   await autoCollect();
// });

// OPTION 5 : Test - Toutes les 5 minutes (pour debug)
// cron.schedule('*/5 * * * *', async () => {
//   await autoCollect();
// });

console.log('⏰ Prochaine exécution : Tous les jours à 10h00 (heure Sénégal)');
console.log('📝 Logs : collector/logs/');
console.log('\n✅ Scheduler actif. Appuyez sur Ctrl+C pour arrêter.\n');

// Empêcher le script de se terminer
process.stdin.resume();
