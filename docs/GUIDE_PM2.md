# 🚀 Guide PM2 - Automatisation Professionnelle

## 📋 Installation (Windows Local)

### Étape 1 : Installer PM2 globalement

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

### Étape 2 : Installer node-cron

```powershell
cd collector
npm install node-cron
```

### Étape 3 : Vérifier l'installation

```powershell
pm2 --version
node --version
```

---

## 🎯 Démarrage Rapide

### Lancer le collecteur avec PM2

```powershell
cd collector

# Option 1 : Avec le fichier de configuration (recommandé)
pm2 start ecosystem.config.js

# Option 2 : Directement
pm2 start scheduler.js --name gaynaako-collector
```

### Vérifier que ça tourne

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

## 📊 Monitoring et Logs

### Voir les logs en temps réel

```powershell
pm2 logs
```

Ou pour un processus spécifique :
```powershell
pm2 logs gaynaako-collector
```

### Voir les logs des 100 dernières lignes

```powershell
pm2 logs gaynaako-collector --lines 100
```

### Monitoring en temps réel (CPU, RAM)

```powershell
pm2 monit
```

Interface interactive :
```
┌─ Process list ─────────────────────────────────┐
│[ 0] gaynaako-collector    Mem:  45 MB   CPU: 2%│
└────────────────────────────────────────────────┘
┌─ Logs ────────────────────────────────────────┐
│[2026-08-19 14:00:00] Collecte démarrée...     │
│[2026-08-19 14:02:15] ✅ 110 opportunités      │
└────────────────────────────────────────────────┘
```

### Dashboard Web (optionnel)

```powershell
pm2 plus
```

Crée un compte gratuit sur https://app.pm2.io pour :
- Dashboard web
- Monitoring à distance
- Alertes email/Slack
- Historique des métriques

---

## ⚙️ Gestion du Processus

### Redémarrer

```powershell
pm2 restart gaynaako-collector
```

### Arrêter

```powershell
pm2 stop gaynaako-collector
```

### Supprimer

```powershell
pm2 delete gaynaako-collector
```

### Recharger sans downtime

```powershell
pm2 reload gaynaako-collector
```

---

## 🔄 Démarrage Automatique au Boot

### Windows

```powershell
# Configurer le démarrage automatique
pm2-startup install

# Sauvegarder la liste des processus
pm2 save

# Désactiver le démarrage automatique
pm2-startup uninstall
```

**Important** : Après avoir configuré, PM2 démarrera automatiquement :
- Au démarrage de Windows
- Même si vous n'êtes pas connecté

---

## 📝 Configuration Avancée

### Modifier ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'gaynaako-collector',
    script: 'scheduler.js',
    
    // Changer les variables d'environnement
    env: {
      MYSQL_HOST: 'localhost',
      MYSQL_USER: 'root',
      MYSQL_PASSWORD: 'votre_mot_de_passe',
      MYSQL_DB: 'gaynaako_opportunities'
    },
    
    // Redémarrage automatique
    autorestart: true,
    
    // Redémarrer si mémoire > 500MB
    max_memory_restart: '500M',
    
    // Restart quotidien à 1h (libère la mémoire)
    cron_restart: '0 1 * * *',
    
    // Logs
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log'
  }]
};
```

Après modification :
```powershell
pm2 restart ecosystem.config.js
pm2 save
```

---

## 🐛 Dépannage

### Le processus crash constamment

```powershell
# Voir les erreurs
pm2 logs gaynaako-collector --err

# Voir les informations détaillées
pm2 describe gaynaako-collector

# Désactiver le redémarrage automatique temporairement
pm2 stop gaynaako-collector --no-autorestart
```

### Nettoyer les logs

```powershell
pm2 flush
```

### Réinitialiser PM2

```powershell
pm2 kill
pm2 start ecosystem.config.js
pm2 save
```

### Vérifier la syntaxe du fichier de config

```powershell
node ecosystem.config.js
```

---

## 📊 Statistiques et Rapports

### Voir les statistiques

```powershell
pm2 describe gaynaako-collector
```

Affiche :
- Uptime (temps de fonctionnement)
- Nombre de restarts
- CPU moyen
- Mémoire utilisée
- Version de Node.js

### Voir l'historique des restarts

```powershell
pm2 logs gaynaako-collector | findstr "restart"
```

---

## 🔔 Notifications (Optionnel)

### Installer le module de notification

```powershell
pm2 install pm2-notify
```

### Configurer pour recevoir des alertes

```powershell
pm2 set pm2-notify:email your@email.com
```

---

## 🌐 Accès à Distance

### PM2 Plus (Dashboard cloud gratuit)

```powershell
pm2 plus
```

Fonctionnalités :
- ✅ Dashboard web accessible de partout
- ✅ Monitoring en temps réel
- ✅ Alertes par email
- ✅ Historique des métriques
- ✅ Gratuit jusqu'à 4 serveurs

---

## 📦 Mise à Jour du Code

### Workflow de déploiement

```powershell
# 1. Arrêter le processus
pm2 stop gaynaako-collector

# 2. Mettre à jour le code
git pull
npm install

# 3. Redémarrer
pm2 restart gaynaako-collector

# Ou en une commande
pm2 reload gaynaako-collector
```

### Déploiement automatique avec Git

Créer un script `deploy.ps1` :
```powershell
Write-Host "Deploiement en cours..."
git pull
npm install
pm2 reload gaynaako-collector
Write-Host "Deploiement termine!"
```

---

## 🔒 Bonnes Pratiques

### 1. Toujours sauvegarder après modifications

```powershell
pm2 save
```

### 2. Utiliser le fichier ecosystem.config.js

Plus facile à versionner et à partager :
```powershell
pm2 start ecosystem.config.js
```

### 3. Consulter les logs régulièrement

```powershell
pm2 logs --lines 50
```

### 4. Monitorer les performances

```powershell
pm2 monit
```

### 5. Configurer les alertes

Via PM2 Plus ou par email

---

## 📚 Commandes Utiles Résumées

```powershell
# Gestion de base
pm2 start ecosystem.config.js    # Démarrer
pm2 list                          # Lister les processus
pm2 logs                          # Voir les logs
pm2 monit                         # Monitoring
pm2 restart gaynaako-collector    # Redémarrer
pm2 stop gaynaako-collector       # Arrêter
pm2 delete gaynaako-collector     # Supprimer

# Démarrage automatique
pm2-startup install               # Configurer
pm2 save                          # Sauvegarder

# Informations
pm2 describe gaynaako-collector   # Détails
pm2 logs --lines 100              # Derniers logs

# Maintenance
pm2 flush                         # Nettoyer logs
pm2 kill                          # Arrêter PM2
pm2 update                        # Mettre à jour PM2
```

---

## 🎯 Scénarios d'Utilisation

### Test Local (Développement)

```powershell
cd collector
pm2 start scheduler.js --name gaynaako-test
pm2 logs gaynaako-test
```

### Production

```powershell
cd collector
pm2 start ecosystem.config.js
pm2-startup install
pm2 save
pm2 monit
```

### Debug

```powershell
pm2 logs gaynaako-collector --err --lines 200
pm2 describe gaynaako-collector
```

---

## ✅ Checklist de Déploiement

- [ ] PM2 installé (`pm2 --version`)
- [ ] node-cron installé (`npm list node-cron`)
- [ ] ecosystem.config.js configuré
- [ ] Variables MySQL correctes
- [ ] Processus démarré (`pm2 start`)
- [ ] Logs sans erreur (`pm2 logs`)
- [ ] Démarrage auto configuré (`pm2-startup install`)
- [ ] Configuration sauvegardée (`pm2 save`)
- [ ] Monitoring actif (`pm2 monit`)
- [ ] Test de redémarrage OK (`pm2 restart`)

---

## 🆘 Support

- Documentation officielle : https://pm2.keymetrics.io/
- Troubleshooting : https://pm2.keymetrics.io/docs/usage/quick-start/
- GitHub : https://github.com/Unitech/pm2
- Forum : https://github.com/Unitech/pm2/discussions

---

**PM2 est maintenant configuré ! 🚀**

Le système collecte automatiquement tous les jours à 2h du matin.
