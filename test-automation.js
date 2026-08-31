/**
 * Script de test pour vérifier que l'automatisation fonctionne
 * Usage: node test-automation.js
 */

const { autoCollect } = require('./auto-collect');

console.log('🧪 TEST DE L\'AUTOMATISATION\n');
console.log('Ce test va :');
console.log('  1. Collecter les données depuis toutes les sources');
console.log('  2. Nettoyer les données');
console.log('  3. Importer dans MySQL');
console.log('\nDurée estimée : 2-3 minutes\n');

// Lancer le test
autoCollect()
  .then(() => {
    console.log('\n✅ TEST RÉUSSI !');
    console.log('\nVous pouvez maintenant installer PM2 pour l\'automatisation :');
    console.log('  npm install -g pm2');
    console.log('  npm install -g pm2-windows-startup');
    console.log('  pm2 start ecosystem.config.js');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ TEST ÉCHOUÉ !');
    console.error('Erreur:', error.message);
    process.exit(1);
  });
