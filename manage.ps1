# Script de gestion du collecteur Gaynaako
# Usage: .\manage.ps1 [commande]

param(
    [string]$Command = "status"
)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Gaynaako Collector Manager" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

switch ($Command.ToLower()) {
    "status" {
        Write-Host "[STATUS] Etat du systeme :" -ForegroundColor Yellow
        Write-Host ""
        pm2 list
        Write-Host ""
        Write-Host "[LOGS] Dernieres logs :" -ForegroundColor Yellow
        pm2 logs gaynaako-collector --lines 10 --nostream
    }
    
    "start" {
        Write-Host "[START] Demarrage du collecteur..." -ForegroundColor Green
        pm2 start ecosystem.config.js
    }
    
    "stop" {
        Write-Host "[STOP] Arret du collecteur..." -ForegroundColor Red
        pm2 stop gaynaako-collector
    }
    
    "restart" {
        Write-Host "[RESTART] Redemarrage du collecteur..." -ForegroundColor Yellow
        pm2 restart gaynaako-collector
        pm2 save
        Write-Host "[OK] Collecteur redémarre et configuration sauvegardee" -ForegroundColor Green
    }
    
    "logs" {
        Write-Host "[LOGS] Logs en temps reel (Ctrl+C pour quitter) :" -ForegroundColor Yellow
        Write-Host ""
        pm2 logs gaynaako-collector
    }
    
    "monitor" {
        Write-Host "[MONITOR] Monitoring en temps reel (Q pour quitter) :" -ForegroundColor Yellow
        Write-Host ""
        pm2 monit
    }
    
    "info" {
        Write-Host "[INFO] Informations detaillees :" -ForegroundColor Cyan
        Write-Host ""
        pm2 describe gaynaako-collector
    }
    
    "test" {
        Write-Host "[TEST] Test du pipeline complet..." -ForegroundColor Yellow
        Write-Host ""
        node test-automation.js
    }
    
    "collect" {
        Write-Host "[COLLECT] Collecte manuelle..." -ForegroundColor Yellow
        Write-Host ""
        node scraper.js
    }
    
    "auto" {
        Write-Host "[AUTO] Execution du pipeline complet..." -ForegroundColor Yellow
        Write-Host ""
        node auto-collect.js
    }
    
    "clean" {
        Write-Host "[CLEAN] Nettoyage des logs..." -ForegroundColor Yellow
        pm2 flush
        Write-Host "[OK] Logs nettoyes !" -ForegroundColor Green
    }
    
    "mysql" {
        Write-Host "[MYSQL] Statistiques MySQL :" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Ouvrez phpMyAdmin : http://localhost/phpmyadmin" -ForegroundColor Cyan
        Write-Host "Base de donnees : gaynaako_opportunities" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Commandes SQL utiles :" -ForegroundColor Gray
        Write-Host "  SELECT COUNT(*) FROM opportunities;" -ForegroundColor Gray
        Write-Host "  SELECT * FROM v_source_stats;" -ForegroundColor Gray
    }
    
    "help" {
        Write-Host "[HELP] Commandes disponibles :" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  status       " -NoNewline -ForegroundColor Green
        Write-Host "- Etat du systeme et dernieres logs"
        Write-Host "  start        " -NoNewline -ForegroundColor Green
        Write-Host "- Demarrer le collecteur"
        Write-Host "  stop         " -NoNewline -ForegroundColor Green
        Write-Host "- Arreter le collecteur"
        Write-Host "  restart      " -NoNewline -ForegroundColor Green
        Write-Host "- Redemarrer le collecteur"
        Write-Host "  logs         " -NoNewline -ForegroundColor Green
        Write-Host "- Voir les logs en temps reel"
        Write-Host "  monitor      " -NoNewline -ForegroundColor Green
        Write-Host "- Monitoring CPU/RAM"
        Write-Host "  info         " -NoNewline -ForegroundColor Green
        Write-Host "- Informations detaillees"
        Write-Host "  test         " -NoNewline -ForegroundColor Yellow
        Write-Host "- Tester le pipeline complet"
        Write-Host "  collect      " -NoNewline -ForegroundColor Yellow
        Write-Host "- Collecte manuelle (scraper seulement)"
        Write-Host "  auto         " -NoNewline -ForegroundColor Yellow
        Write-Host "- Pipeline complet manuel"
        Write-Host "  clean        " -NoNewline -ForegroundColor Yellow
        Write-Host "- Nettoyer les logs PM2"
        Write-Host "  mysql        " -NoNewline -ForegroundColor Cyan
        Write-Host "- Infos MySQL"
        Write-Host "  help         " -NoNewline -ForegroundColor Cyan
        Write-Host "- Afficher cette aide"
        Write-Host ""
        Write-Host "Exemples :" -ForegroundColor Gray
        Write-Host "  .\manage.ps1 status" -ForegroundColor Gray
        Write-Host "  .\manage.ps1 logs" -ForegroundColor Gray
        Write-Host "  .\manage.ps1 test" -ForegroundColor Gray
    }
    
    default {
        Write-Host "[ERROR] Commande inconnue : $Command" -ForegroundColor Red
        Write-Host ""
        Write-Host "Utilisez help pour voir les commandes disponibles :" -ForegroundColor Yellow
        Write-Host "  .\manage.ps1 help" -ForegroundColor Gray
    }
}

Write-Host ""
