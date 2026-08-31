# 🚀 Démarrage Rapide - Automatisation PM2

## ✅ Statut Actuel

- ✅ Scraper fonctionnel (110 opportunités collectées)
- ✅ Nettoyage des données opérationnel
- ✅ Base MySQL configurée (87 opportunités importées)
- ✅ Script d'automatisation complet (`auto-collect.js`)
- ✅ Scheduler avec node-cron installé
- ⏳ **PROCHAINE ÉTAPE** : Installation PM2

---

## 🎯 Prochaines Étapes (5 minutes)

### Étape 1 : Tester l'automatisation complète

```powershell
cd collector
node test-automation.js
```

**Résultat attendu** : Collecte → Nettoyage → Import MySQL en ~2-3 minutes

---

### Étape 2 : Installer PM2

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

**Vérifier l'installation** :
```powershell
pm2 --version
```

---

### Étape 3 : Démarrer le collecteur avec PM2

```powershell
cd collector
pm2 start ecosystem.config.js
```

**Vérifier que ça tourne** :
```powershell
pm2 list
```

Vous devriez voir :
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ mode    │ status  │ cpu      │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ gaynaako-collector   │ fork    │ online  │ 0%       │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

---

### Étape 4 : Voir les logs

```powershell
pm2 logs gaynaako-collector
```

**Pour sortir des logs** : `Ctrl + C`

---

### Étape 5 : Configurer le démarrage automatique

```powershell
pm2-startup install
pm2 save
```

**C'est fait ! 🎉** Le système démarre automatiquement avec Windows.

---

## 📊 Configuration Actuelle

### Schedule de Collecte

**Tous les jours à 2h00 du matin**

Modifiable dans `scheduler.js` :
```javascript
// Ligne 8 : Schedule actuel
cron.schedule('0 2 * * *', async () => {
  await autoCollect();
});
```

### Autres options disponibles (commentées) :

```javascript
// Toutes les 6 heures
cron.schedule('0 */6 * * *', ...);

// Du lundi au vendredi à 8h
cron.schedule('0 8 * * 1-5', ...);

// Toutes les heures
cron.schedule('0 * * * *', ...);

// Test - Toutes les 5 minutes
cron.schedule('*/5 * * * *', ...);
```

---

## 🔧 Commandes Utiles

### Voir l'état du collecteur
```powershell
pm2 list
```

### Voir les logs en temps réel
```powershell
pm2 logs
```

### Monitoring (CPU, RAM)
```powershell
pm2 monit
```

### Redémarrer
```powershell
pm2 restart gaynaako-collector
```

### Arrêter
```powershell
pm2 stop gaynaako-collector
```

### Relancer après modifications
```powershell
pm2 restart gaynaako-collector
pm2 save
```

---

## 📁 Structure des Fichiers

```
collector/
├── scraper.js               # Collecteur principal (10 sources)
├── auto-collect.js          # Pipeline complet (collecte + nettoyage + import)
├── scheduler.js             # Cron scheduler (2h du matin)
├── ecosystem.config.js      # Configuration PM2
├── import-to-mysql.js       # Import vers MySQL
├── test-automation.js       # Test du système
├── package.json             # Dépendances Node.js
│
├── data/
│   ├── raw/                 # CSV bruts après collecte
│   └── cleaned/             # CSV nettoyés
│
└── logs/                    # Logs PM2 (créés automatiquement)
    ├── pm2-error.log
    └── pm2-out.log
```

---

## 🔍 Vérifier les Données

### Via phpMyAdmin (WAMP)
1. Ouvrir http://localhost/phpmyadmin
2. Base de données : `gaynaako_opportunities`
3. Table : `opportunities`

### Via ligne de commande MySQL
```sql
-- Connexion MySQL
mysql -u root -p gaynaako_opportunities

-- Voir les dernières opportunités
SELECT source, title, date, collected_at 
FROM opportunities 
ORDER BY collected_at DESC 
LIMIT 10;

-- Statistiques par source
SELECT * FROM v_source_stats;

-- Compter le total
SELECT COUNT(*) FROM opportunities;
```

---

## 🐛 Dépannage

### Le processus ne démarre pas
```powershell
# Voir les erreurs
pm2 logs gaynaako-collector --err

# Vérifier la configuration
node ecosystem.config.js

# Redémarrer PM2
pm2 kill
pm2 start ecosystem.config.js
```

### Erreur MySQL
Vérifier les variables d'environnement dans `ecosystem.config.js` :
```javascript
env: {
  MYSQL_HOST: 'localhost',
  MYSQL_PORT: 3306,
  MYSQL_DB: 'gaynaako_opportunities',
  MYSQL_USER: 'root',
  MYSQL_PASSWORD: ''  // Mettre votre mot de passe si nécessaire
}
```

### Logs trop volumineux
```powershell
# Nettoyer les logs
pm2 flush
```

---

## 📈 Monitoring en Production

### Dashboard PM2 Plus (gratuit)
```powershell
pm2 plus
```

Fonctionnalités :
- ✅ Dashboard web accessible de partout
- ✅ Monitoring en temps réel
- ✅ Alertes par email
- ✅ Historique des métriques

---

## 🎯 Résumé des Commandes

```powershell
# Installation (une seule fois)
npm install -g pm2
npm install -g pm2-windows-startup

# Démarrage
cd collector
pm2 start ecosystem.config.js

# Démarrage automatique
pm2-startup install
pm2 save

# Monitoring
pm2 list
pm2 logs
pm2 monit

# Gestion
pm2 restart gaynaako-collector
pm2 stop gaynaako-collector
```

---

## ✅ Checklist

- [ ] Test d'automatisation réussi (`node test-automation.js`)
- [ ] PM2 installé (`pm2 --version`)
- [ ] Processus démarré (`pm2 start ecosystem.config.js`)
- [ ] Logs sans erreur (`pm2 logs`)
- [ ] Démarrage auto configuré (`pm2-startup install` + `pm2 save`)
- [ ] Vérification dans MySQL (nouvelles opportunités)

---

## 📚 Documentation Complète

Pour plus de détails, consulter :
- `GUIDE_PM2.md` - Guide complet PM2
- `GUIDE_AUTOMATISATION.md` - Comparaison des options
- `GUIDE_MYSQL.md` - Configuration MySQL
- `README.md` - Documentation générale

---

**🚀 Prêt à automatiser ? Suivez les 5 étapes ci-dessus !**
