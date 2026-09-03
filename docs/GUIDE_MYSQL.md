# 🗄️ Guide d'Installation MySQL

## 📥 Étape 1 : Installer MySQL

### Windows

1. **Télécharger MySQL** :
   - Aller sur : https://dev.mysql.com/downloads/installer/
   - Télécharger "MySQL Installer for Windows"

2. **Installer MySQL** :
   - Exécuter l'installateur
   - Choisir "Developer Default" ou "Server only"
   - Configurer le mot de passe root lors de l'installation
   - **IMPORTANT** : Noter le mot de passe root

3. **Vérifier l'installation** :
```bash
mysql --version
```

---

## 🔧 Étape 2 : Créer la Base de Données

### Option A : Avec MySQL Workbench (Interface graphique)

1. Ouvrir MySQL Workbench
2. Se connecter avec l'utilisateur root
3. Ouvrir le fichier `schema.sql`
4. Cliquer sur l'éclair (⚡) pour exécuter tout le script

### Option B : En ligne de commande

```bash
# Se connecter à MySQL
mysql -u root -p

# Exécuter le schéma
source C:\Users\bmd\Desktop\Stage Sonatel\gaynaako-opportunity-agent-v2\collector\schema.sql

# Ou en une seule ligne
mysql -u root -p < schema.sql
```

### Option C : Avec PowerShell (recommandé)

```powershell
cd collector

# Exécuter le schéma
Get-Content schema.sql | mysql -u root -p
```

---

## ⚙️ Étape 3 : Configuration

### Créer un fichier `.env` (optionnel)

Si vous voulez utiliser des identifiants différents de ceux par défaut :

```bash
cd collector
```

Créer un fichier `.env` :

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=gaynaako_opportunities
MYSQL_USER=root
MYSQL_PASSWORD=votre_mot_de_passe
```

**IMPORTANT** : Ne pas committer le fichier `.env` (déjà dans `.gitignore`)

---

## 📊 Étape 4 : Importer les Données

### Vérifier que les données sont nettoyées

```bash
# S'assurer qu'un fichier CSV nettoyé existe
ls data/cleaned/
```

Si aucun fichier n'existe, exécuter le notebook Jupyter d'abord.

### Lancer l'import

```bash
npm run import
```

Ou directement :

```bash
node import-to-mysql.js
```

Ou avec un fichier spécifique :

```bash
node import-to-mysql.js data/cleaned/opportunities_clean_2026-08-19_23-20-34.csv
```

---

## ✅ Étape 5 : Vérifier l'Import

### En ligne de commande MySQL

```bash
mysql -u root -p gaynaako_opportunities
```

```sql
-- Compter les opportunités
SELECT COUNT(*) FROM opportunities;

-- Par source
SELECT source_name, COUNT(*) as count 
FROM opportunities 
GROUP BY source_name 
ORDER BY count DESC;

-- Opportunités récentes
SELECT * FROM v_recent_opportunities LIMIT 10;

-- Statistiques par source
SELECT * FROM v_source_stats;
```

### Avec MySQL Workbench

1. Se connecter à la base `gaynaako_opportunities`
2. Naviguer dans les tables :
   - `opportunities` : Toutes les opportunités
   - `sources` : Liste des sources
3. Utiliser les vues :
   - `v_source_stats` : Statistiques
   - `v_recent_opportunities` : Opportunités récentes

---

## 🔍 Requêtes Utiles

### Recherche full-text

```sql
-- Rechercher dans les titres et descriptions
SELECT id, source_name, title 
FROM opportunities
WHERE MATCH(title, description) AGAINST('énergie renouvelable' IN NATURAL LANGUAGE MODE)
LIMIT 10;
```

### Statistiques avancées

```sql
-- Nombre d'opportunités par mois
SELECT 
  DATE_FORMAT(collected_at, '%Y-%m') as mois,
  COUNT(*) as total
FROM opportunities
GROUP BY mois
ORDER BY mois DESC;
```

### Opportunités par type de source

```sql
SELECT 
  s.type,
  COUNT(o.id) as total
FROM sources s
LEFT JOIN opportunities o ON s.id = o.source_id
GROUP BY s.type;
```

---

## 🛠️ Maintenance

### Supprimer les doublons (si nécessaire)

```sql
-- Identifier les doublons
SELECT url, title, COUNT(*) as count
FROM opportunities
GROUP BY url, title
HAVING count > 1;

-- Supprimer les doublons en gardant le plus récent
DELETE o1 FROM opportunities o1
INNER JOIN opportunities o2 
WHERE 
  o1.id < o2.id AND
  o1.url = o2.url AND 
  o1.title = o2.title;
```

### Optimiser les tables

```sql
OPTIMIZE TABLE opportunities;
OPTIMIZE TABLE sources;
```

### Sauvegarder la base

```bash
# Sauvegarder
mysqldump -u root -p gaynaako_opportunities > backup_$(date +%Y%m%d).sql

# Restaurer
mysql -u root -p gaynaako_opportunities < backup_20260819.sql
```

---

## ❌ Dépannage

### Erreur : "Access denied for user 'root'@'localhost'"

Le mot de passe est incorrect. Réinitialiser :

```bash
# Arrêter MySQL
net stop MySQL80

# Démarrer en mode sans authentification
mysqld --skip-grant-tables

# Dans un autre terminal
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'nouveau_mot_de_passe';
FLUSH PRIVILEGES;
```

### Erreur : "Database 'gaynaako_opportunities' doesn't exist"

Créer la base de données manuellement :

```bash
mysql -u root -p
```

```sql
CREATE DATABASE gaynaako_opportunities 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE gaynaako_opportunities;

SOURCE schema.sql;
```

### Erreur : "Can't connect to MySQL server"

MySQL n'est pas démarré :

```bash
# Windows
net start MySQL80

# Vérifier le status
sc query MySQL80
```

### Import très lent

Désactiver temporairement les index :

```sql
ALTER TABLE opportunities DISABLE KEYS;
-- Faire l'import
ALTER TABLE opportunities ENABLE KEYS;
```

---

## 📚 Ressources

- [Documentation MySQL](https://dev.mysql.com/doc/)
- [MySQL Workbench](https://www.mysql.com/products/workbench/)
- [Full-Text Search MySQL](https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html)

---

## 🎯 Prochaines Étapes

Après l'import réussi :

1. ✅ Connecter l'interface web Gaynaako à MySQL
2. ✅ Implémenter la recherche full-text
3. ✅ Créer des API REST pour l'accès aux données
4. ✅ Automatiser la collecte quotidienne
