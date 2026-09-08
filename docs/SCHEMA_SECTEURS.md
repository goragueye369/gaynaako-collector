# 🗄️ Schéma des Secteurs - Structure Relationnelle

**Date**: 8 septembre 2026  
**Version**: 2.0 (Migration relationnelle)  
**Base de données**: `gaynaako_opportunities`

---

## 📊 Architecture Relationnelle

La gestion des secteurs utilise une **architecture relationnelle normalisée** avec 3 tables :

```
opportunities_processed (1) ────< opportunite_secteur (N) >──── (1) secteurs
```

### Avantages de cette structure :
✅ **Normalisation** : Pas de duplication des noms de secteurs  
✅ **Flexibilité** : Une opportunité peut avoir plusieurs secteurs  
✅ **Requêtes optimisées** : Jointures SQL standards  
✅ **Statistiques** : Comptage facile par secteur  
✅ **Maintenance** : Modification centralisée des secteurs  

---

## 🗂️ Tables

### 1. Table `secteurs`

Contient les **14 secteurs prédéfinis**.

```sql
CREATE TABLE secteurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    mots_cles TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Liste des secteurs

| ID | Nom | Description |
|----|-----|-------------|
| 1 | agriculture | Agriculture, élevage, pêche |
| 2 | santé | Santé et services médicaux |
| 3 | éducation | Éducation et formation |
| 4 | infrastructure | Infrastructure et construction |
| 5 | energie | Énergie et électricité |
| 6 | eau | Eau et assainissement |
| 7 | technologie | Technologies et numérique |
| 8 | finance | Finance et banque |
| 9 | environnement | Environnement et climat |
| 10 | gouvernance | Gouvernance et administration |
| 11 | commerce | Commerce et export |
| 12 | industrie | Industrie et manufacture |
| 13 | tourisme | Tourisme et culture |
| 14 | non classifié | Secteur non identifié |

---

### 2. Table `opportunite_secteur`

Table de liaison **N-N** entre opportunités et secteurs.

```sql
CREATE TABLE opportunite_secteur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunite_id VARCHAR(12) NOT NULL,
    secteur_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Clés étrangères
    FOREIGN KEY (opportunite_id) REFERENCES opportunities_processed(id) ON DELETE CASCADE,
    FOREIGN KEY (secteur_id) REFERENCES secteurs(id) ON DELETE CASCADE,
    
    -- Contrainte d'unicité
    UNIQUE KEY unique_opportunite_secteur (opportunite_id, secteur_id),
    
    -- Index pour optimisation
    INDEX idx_opportunite (opportunite_id),
    INDEX idx_secteur (secteur_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Statistiques actuelles** :
- 207 opportunités
- 269 liaisons (relations opportunité-secteur)
- Moyenne : 1.3 secteurs par opportunité
- Maximum : 5 secteurs par opportunité

---

### 3. Table `opportunities_processed`

La colonne `sectors` est **conservée pour rétrocompatibilité** (format CSV).

```sql
-- Extrait du schéma
sectors TEXT, -- Format CSV: "secteur1, secteur2, secteur3"
```

⚠️ **Note** : Utiliser la structure relationnelle (`secteurs` + `opportunite_secteur`) pour les nouvelles intégrations.

---

## 🔍 Vues SQL

### Vue `v_opportunites_avec_secteurs`

Vue dénormalisée pour **compatibilité avec l'ancien format**.

```sql
CREATE VIEW v_opportunites_avec_secteurs AS
SELECT 
    op.id,
    op.source_name,
    op.source_type,
    op.title,
    op.description,
    op.url,
    op.date_original,
    op.date_normalized,
    op.country,
    GROUP_CONCAT(s.nom ORDER BY s.nom SEPARATOR ', ') as secteurs,
    op.has_description,
    op.has_date,
    op.quality_score,
    op.collected_at
FROM opportunities_processed op
LEFT JOIN opportunite_secteur os ON op.id = os.opportunite_id
LEFT JOIN secteurs s ON os.secteur_id = s.id
GROUP BY op.id;
```

**Usage** :
```sql
SELECT * FROM v_opportunites_avec_secteurs WHERE id = '01898e2c2502';
```

---

### Vue `v_stats_secteurs`

Statistiques détaillées par secteur.

```sql
CREATE VIEW v_stats_secteurs AS
SELECT 
    s.id as secteur_id,
    s.nom as secteur_nom,
    s.description as secteur_description,
    COUNT(DISTINCT os.opportunite_id) as nombre_opportunites,
    COUNT(DISTINCT CASE WHEN op.quality_score > 70 THEN os.opportunite_id END) as opportunites_qualite,
    AVG(op.quality_score) as score_qualite_moyen,
    MAX(op.collected_at) as derniere_collecte
FROM secteurs s
LEFT JOIN opportunite_secteur os ON s.id = os.secteur_id
LEFT JOIN opportunities_processed op ON os.opportunite_id = op.id
GROUP BY s.id, s.nom, s.description
ORDER BY nombre_opportunites DESC;
```

**Résultat actuel** :
```
secteur_nom           | nombre_opportunites | opportunites_qualite | score_qualite_moyen
----------------------|---------------------|----------------------|--------------------
non classifié         | 84                  | 45                   | 72.5
technologie           | 82                  | 58                   | 78.2
eau                   | 20                  | 12                   | 68.5
infrastructure        | 20                  | 15                   | 75.1
gouvernance           | 14                  | 8                    | 70.3
commerce              | 12                  | 7                    | 69.8
```

---

### Vue `v_opportunites_multi_secteurs`

Liste des opportunités ayant **plusieurs secteurs**.

```sql
CREATE VIEW v_opportunites_multi_secteurs AS
SELECT 
    op.id,
    op.title,
    op.country,
    COUNT(os.secteur_id) as nombre_secteurs,
    GROUP_CONCAT(s.nom ORDER BY s.nom SEPARATOR ', ') as liste_secteurs,
    op.quality_score
FROM opportunities_processed op
INNER JOIN opportunite_secteur os ON op.id = os.opportunite_id
INNER JOIN secteurs s ON os.secteur_id = s.id
GROUP BY op.id
HAVING nombre_secteurs > 1
ORDER BY nombre_secteurs DESC, op.quality_score DESC;
```

**Top 3 opportunités multi-secteurs** :
1. **FORMATION PPP** (5 secteurs) : éducation, gouvernance, infrastructure, santé, technologie
2. **Common software solution for billing** (4 secteurs) : commerce, eau, industrie, technologie
3. **Travaux de captage de l'eau dans le Lac Tanganyika** (4 secteurs) : eau, industrie, infrastructure, technologie

---

## 📝 Exemples d'Utilisation

### 1. Récupérer une opportunité avec ses secteurs

```sql
SELECT 
    op.*,
    GROUP_CONCAT(s.nom SEPARATOR ', ') as secteurs
FROM opportunities_processed op
LEFT JOIN opportunite_secteur os ON op.id = os.opportunite_id
LEFT JOIN secteurs s ON os.secteur_id = s.id
WHERE op.id = '01898e2c2502'
GROUP BY op.id;
```

### 2. Filtrer par secteur

```sql
-- Opportunités du secteur "technologie"
SELECT DISTINCT op.*
FROM opportunities_processed op
INNER JOIN opportunite_secteur os ON op.id = os.opportunite_id
INNER JOIN secteurs s ON os.secteur_id = s.id
WHERE s.nom = 'technologie';
```

### 3. Filtrer par plusieurs secteurs (ET)

```sql
-- Opportunités qui ont TOUS ces secteurs
SELECT op.id, op.title
FROM opportunities_processed op
WHERE op.id IN (
    SELECT os1.opportunite_id
    FROM opportunite_secteur os1
    INNER JOIN secteurs s1 ON os1.secteur_id = s1.id
    WHERE s1.nom = 'technologie'
)
AND op.id IN (
    SELECT os2.opportunite_id
    FROM opportunite_secteur os2
    INNER JOIN secteurs s2 ON os2.secteur_id = s2.id
    WHERE s2.nom = 'eau'
);
```

### 4. Filtrer par plusieurs secteurs (OU)

```sql
-- Opportunités qui ont AU MOINS UN de ces secteurs
SELECT DISTINCT op.*
FROM opportunities_processed op
INNER JOIN opportunite_secteur os ON op.id = os.opportunite_id
INNER JOIN secteurs s ON os.secteur_id = s.id
WHERE s.nom IN ('technologie', 'eau', 'infrastructure');
```

### 5. Compter les opportunités par secteur

```sql
SELECT 
    s.nom as secteur,
    COUNT(os.opportunite_id) as total
FROM secteurs s
LEFT JOIN opportunite_secteur os ON s.id = os.secteur_id
GROUP BY s.id, s.nom
ORDER BY total DESC;
```

### 6. Ajouter un secteur à une opportunité

```sql
-- Étape 1 : Récupérer l'ID du secteur
SELECT id FROM secteurs WHERE nom = 'technologie'; -- Résultat: 7

-- Étape 2 : Créer la liaison
INSERT INTO opportunite_secteur (opportunite_id, secteur_id)
VALUES ('01898e2c2502', 7);
```

### 7. Retirer un secteur d'une opportunité

```sql
DELETE FROM opportunite_secteur 
WHERE opportunite_id = '01898e2c2502' 
AND secteur_id = (SELECT id FROM secteurs WHERE nom = 'technologie');
```

### 8. Remplacer tous les secteurs d'une opportunité

```sql
-- Supprimer tous les secteurs existants
DELETE FROM opportunite_secteur WHERE opportunite_id = '01898e2c2502';

-- Ajouter les nouveaux secteurs
INSERT INTO opportunite_secteur (opportunite_id, secteur_id)
SELECT '01898e2c2502', id FROM secteurs WHERE nom IN ('technologie', 'finance', 'commerce');
```

---

## 🔌 Intégration API Backend

### Format d'Entrée (POST/PUT)

**Option 1 : Liste d'IDs de secteurs**
```json
{
  "title": "Appel d'offres infrastructure IT",
  "country": "Sénégal",
  "secteur_ids": [7, 4, 5]  // technologie, infrastructure, energie
}
```

**Option 2 : Liste de noms de secteurs**
```json
{
  "title": "Appel d'offres infrastructure IT",
  "country": "Sénégal",
  "secteurs": ["technologie", "infrastructure", "energie"]
}
```

### Format de Sortie (GET)

**Format relationnel (recommandé)**
```json
{
  "id": "01898e2c2502",
  "title": "Appel d'offres infrastructure IT",
  "country": "Sénégal",
  "secteurs": [
    {
      "id": 7,
      "nom": "technologie",
      "description": "Technologies et numérique"
    },
    {
      "id": 4,
      "nom": "infrastructure",
      "description": "Infrastructure et construction"
    }
  ]
}
```

**Format CSV (compatibilité)**
```json
{
  "id": "01898e2c2502",
  "title": "Appel d'offres infrastructure IT",
  "country": "Sénégal",
  "secteurs": "technologie, infrastructure"
}
```

---

## 💻 Code Backend (Node.js)

### Créer une opportunité avec secteurs

```javascript
const mysql = require('mysql2/promise');

async function createOpportunity(data) {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gaynaako_opportunities'
  });

  try {
    await conn.beginTransaction();

    // 1. Insérer l'opportunité
    const [result] = await conn.execute(`
      INSERT INTO opportunities_processed (id, title, country, quality_score)
      VALUES (?, ?, ?, ?)
    `, [data.id, data.title, data.country, data.quality_score]);

    // 2. Associer les secteurs
    for (const secteurNom of data.secteurs) {
      // Récupérer l'ID du secteur
      const [secteurRows] = await conn.execute(
        'SELECT id FROM secteurs WHERE nom = ?',
        [secteurNom]
      );

      if (secteurRows.length > 0) {
        await conn.execute(`
          INSERT INTO opportunite_secteur (opportunite_id, secteur_id)
          VALUES (?, ?)
        `, [data.id, secteurRows[0].id]);
      }
    }

    await conn.commit();
    console.log('✅ Opportunité créée avec succès');

  } catch (error) {
    await conn.rollback();
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

// Usage
await createOpportunity({
  id: '01898e2c2502',
  title: 'Appel d\'offres infrastructure IT',
  country: 'Sénégal',
  quality_score: 85,
  secteurs: ['technologie', 'infrastructure', 'finance']
});
```

### Récupérer une opportunité avec secteurs

```javascript
async function getOpportunityWithSectors(opportunityId) {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gaynaako_opportunities'
  });

  // Récupérer l'opportunité
  const [oppRows] = await conn.execute(
    'SELECT * FROM opportunities_processed WHERE id = ?',
    [opportunityId]
  );

  if (oppRows.length === 0) {
    return null;
  }

  const opportunity = oppRows[0];

  // Récupérer les secteurs
  const [secteurRows] = await conn.execute(`
    SELECT s.id, s.nom, s.description
    FROM secteurs s
    INNER JOIN opportunite_secteur os ON s.id = os.secteur_id
    WHERE os.opportunite_id = ?
  `, [opportunityId]);

  opportunity.secteurs = secteurRows;

  await conn.end();
  return opportunity;
}

// Usage
const opp = await getOpportunityWithSectors('01898e2c2502');
console.log(opp);
/*
{
  id: '01898e2c2502',
  title: 'Appel d\'offres infrastructure IT',
  country: 'Sénégal',
  secteurs: [
    { id: 7, nom: 'technologie', description: 'Technologies et numérique' },
    { id: 4, nom: 'infrastructure', description: 'Infrastructure et construction' }
  ]
}
*/
```

### Filtrer par secteur

```javascript
async function getOpportunitiesBySector(secteurNom, limit = 50) {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gaynaako_opportunities'
  });

  const [rows] = await conn.execute(`
    SELECT DISTINCT op.*
    FROM opportunities_processed op
    INNER JOIN opportunite_secteur os ON op.id = os.opportunite_id
    INNER JOIN secteurs s ON os.secteur_id = s.id
    WHERE s.nom = ?
    LIMIT ?
  `, [secteurNom, limit]);

  await conn.end();
  return rows;
}

// Usage
const techOpps = await getOpportunitiesBySector('technologie', 10);
```

---

## 📊 Migration depuis l'ancien format

Si vous avez des données au **format CSV** (colonne `sectors`), voici le script de migration :

```javascript
const mysql = require('mysql2/promise');

async function migrateSectorsToRelational() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gaynaako_opportunities'
  });

  const [opportunities] = await conn.execute(
    'SELECT id, sectors FROM opportunities_processed WHERE sectors IS NOT NULL AND sectors != ""'
  );

  for (const opp of opportunities) {
    const sectors = opp.sectors.split(',').map(s => s.trim());
    
    for (const sectorName of sectors) {
      const [sectorRows] = await conn.execute(
        'SELECT id FROM secteurs WHERE nom = ?',
        [sectorName]
      );

      if (sectorRows.length > 0) {
        await conn.execute(
          'INSERT IGNORE INTO opportunite_secteur (opportunite_id, secteur_id) VALUES (?, ?)',
          [opp.id, sectorRows[0].id]
        );
      }
    }
  }

  await conn.end();
  console.log('✅ Migration terminée');
}
```

---

## 🔒 Contraintes et Validations

### Contraintes de la base

✅ **Clé primaire** sur `secteurs.id`  
✅ **Unicité** sur `secteurs.nom`  
✅ **Clé étrangère** `opportunite_secteur.opportunite_id` → `opportunities_processed.id`  
✅ **Clé étrangère** `opportunite_secteur.secteur_id` → `secteurs.id`  
✅ **Unicité composite** sur `(opportunite_id, secteur_id)`  
✅ **CASCADE DELETE** : Suppression automatique des liaisons  

### Validation backend

```javascript
function validateSectors(secteurs) {
  const secteursValides = [
    'agriculture', 'santé', 'éducation', 'infrastructure',
    'energie', 'eau', 'technologie', 'finance',
    'environnement', 'gouvernance', 'commerce',
    'industrie', 'tourisme', 'non classifié'
  ];

  for (const secteur of secteurs) {
    if (!secteursValides.includes(secteur)) {
      throw new Error(`Secteur invalide: ${secteur}`);
    }
  }
}
```

---

## 📚 Ressources

- **Script de migration** : `run-migration.js`
- **Schéma SQL complet** : `migrate-sectors.sql`
- **Documentation format opportunités** : `FORMAT_OPPORTUNITES.md`

---

## 📞 Contact

Pour toute question sur le schéma relationnel des secteurs, contacter l'équipe technique Gaynaako.

**Date de dernière mise à jour**: 8 septembre 2026
