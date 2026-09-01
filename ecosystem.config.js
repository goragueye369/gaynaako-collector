/**
 * Configuration PM2 pour production
 * Documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      name: 'gaynaako-collector',
      script: 'scheduler.js',
      
      // Options d'exécution
      instances: 1,
      exec_mode: 'fork',
      
      // Variables d'environnement
      env: {
        NODE_ENV: 'production',
        MYSQL_HOST: 'localhost',
        MYSQL_PORT: 3306,
        MYSQL_DB: 'gaynaako_opportunities',
        MYSQL_USER: 'root',
        MYSQL_PASSWORD: ''
      },
      
      // Gestion des erreurs et redémarrages
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',  // Augmenté pour NLP/Embeddings
      
      // Logs
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Stratégie de redémarrage
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Cron pour restart quotidien à 9h (optionnel, pour libérer mémoire avant collecte à 10h)
      cron_restart: '0 9 * * *',
      
      // Autres options
      kill_timeout: 10000,  // Augmenté pour laisser le temps au NLP de finir
      wait_ready: false,
      listen_timeout: 3000
    },
    
    // API REST pour le backend
    {
      name: 'gaynaako-api',
      script: 'api-server.js',
      
      // Options d'exécution
      instances: 1,
      exec_mode: 'fork',
      
      // Variables d'environnement
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_NAME: 'gaynaako_opportunities',
        DB_USER: 'root',
        DB_PASSWORD: 'rootpassword'
      },
      
      // Gestion des erreurs et redémarrages
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      
      // Logs
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Stratégie de redémarrage
      restart_delay: 2000,
      max_restarts: 10,
      min_uptime: '5s',
      
      // Autres options
      kill_timeout: 3000,
      wait_ready: false,
      listen_timeout: 3000
    }
  ]
};
