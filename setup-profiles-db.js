/**
 * Setup MySQL selon le schéma Prisma Backend Gaynaako
 * Crée les tables : utilisateurs, entrepreneur_profiles, pme_profiles, ong_profiles
 * + tables référentiels : secteurs, pays, domaines_intervention
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'gaynaako_profils'
};

async function setupPrismaSchema() {
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    console.log('🚀 Création des tables selon le schéma Prisma Backend...\n');

    // ============================================================
    // TABLES RÉFÉRENTIELS
    // ============================================================
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
    await conn.query(`DROP TABLE IF EXISTS ong_profiles_domaines`);
    await conn.query(`DROP TABLE IF EXISTS ong_profiles`);
    await conn.query(`DROP TABLE IF EXISTS entrepreneur_profiles`);
    await conn.query(`DROP TABLE IF EXISTS pme_profiles_secteurs`);
    await conn.query(`DROP TABLE IF EXISTS pme_profiles`);
    await conn.query(`DROP TABLE IF EXISTS utilisateurs`);
    await conn.query(`DROP TABLE IF EXISTS secteurs`);
    await conn.query(`DROP TABLE IF EXISTS pays`);
    await conn.query(`DROP TABLE IF EXISTS domaines_intervention`);
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // TABLE : pays
    await conn.query(`
      CREATE TABLE pays (
        id VARCHAR(50) PRIMARY KEY,
        nom VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(5) UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table pays créée');

    // TABLE : secteurs
    await conn.query(`
      CREATE TABLE secteurs (
        id VARCHAR(50) PRIMARY KEY,
        nom VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table secteurs créée');

    // TABLE : domaines_intervention (pour ONG)
    await conn.query(`
      CREATE TABLE domaines_intervention (
        id VARCHAR(50) PRIMARY KEY,
        nom VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table domaines_intervention créée');

    // ============================================================
    // TABLE COMMUNE : utilisateurs
    // ============================================================
    await conn.query(`
      CREATE TABLE utilisateurs (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        mot_de_passe VARCHAR(255) NOT NULL DEFAULT 'hashed_test_password',
        role ENUM('ENTREPRENEUR', 'PME', 'ONG', 'ADMINISTRATEUR') NOT NULL,
        statut ENUM('EN_ATTENTE', 'ACTIF', 'SUSPENDU') NOT NULL DEFAULT 'ACTIF',
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        supprime_le TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table utilisateurs créée');

    // ============================================================
    // TABLE : entrepreneur_profiles (relation 1-1 avec utilisateurs)
    // ============================================================
    await conn.query(`
      CREATE TABLE entrepreneur_profiles (
        id VARCHAR(50) PRIMARY KEY,
        utilisateur_id VARCHAR(50) NOT NULL UNIQUE,
        secteur_id VARCHAR(50) NOT NULL,
        pays_id VARCHAR(50) NOT NULL,
        nom_complet VARCHAR(255),
        domaine_expertise TEXT,
        objectifs TEXT,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        FOREIGN KEY (secteur_id) REFERENCES secteurs(id),
        FOREIGN KEY (pays_id) REFERENCES pays(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table entrepreneur_profiles créée');

    // ============================================================
    // TABLE : pme_profiles (relation 1-1 avec utilisateurs)
    // ============================================================
    await conn.query(`
      CREATE TABLE pme_profiles (
        id VARCHAR(50) PRIMARY KEY,
        utilisateur_id VARCHAR(50) NOT NULL UNIQUE,
        nom_entreprise VARCHAR(255) NOT NULL,
        logo_url VARCHAR(500),
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table pme_profiles créée');

    // TABLE PIVOT : pme_profiles_secteurs (Many-to-Many PME ↔ Secteurs)
    await conn.query(`
      CREATE TABLE pme_profiles_secteurs (
        pme_id VARCHAR(50) NOT NULL,
        secteur_id VARCHAR(50) NOT NULL,
        PRIMARY KEY (pme_id, secteur_id),
        FOREIGN KEY (pme_id) REFERENCES pme_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (secteur_id) REFERENCES secteurs(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table pme_profiles_secteurs (pivot) créée');

    // ============================================================
    // TABLE : ong_profiles (relation 1-1 avec utilisateurs)
    // ============================================================
    await conn.query(`
      CREATE TABLE ong_profiles (
        id VARCHAR(50) PRIMARY KEY,
        utilisateur_id VARCHAR(50) NOT NULL UNIQUE,
        nom_organisation VARCHAR(255) NOT NULL,
        mission TEXT,
        logo_url VARCHAR(500),
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table ong_profiles créée');

    // TABLE PIVOT : ong_profiles_domaines (Many-to-Many ONG ↔ Domaines)
    await conn.query(`
      CREATE TABLE ong_profiles_domaines (
        ong_id VARCHAR(50) NOT NULL,
        domaine_id VARCHAR(50) NOT NULL,
        PRIMARY KEY (ong_id, domaine_id),
        FOREIGN KEY (ong_id) REFERENCES ong_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (domaine_id) REFERENCES domaines_intervention(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table ong_profiles_domaines (pivot) créée\n');

    // ============================================================
    // INSERTION DES DONNÉES RÉFÉRENTIELLES
    // ============================================================
    const pays = [
      { id: 'pay-sn', nom: 'Sénégal', code: 'SN' },
      { id: 'pay-ml', nom: 'Mali', code: 'ML' },
      { id: 'pay-bf', nom: 'Burkina Faso', code: 'BF' },
      { id: 'pay-ci', nom: "Côte d'Ivoire", code: 'CI' },
    ];
    for (const p of pays) {
      await conn.query('INSERT INTO pays (id, nom, code) VALUES (?, ?, ?)', [p.id, p.nom, p.code]);
    }
    console.log(`✅ ${pays.length} pays insérés`);

    const secteurs = [
      { id: 'sec-tech', nom: 'technologie' },
      { id: 'sec-agri', nom: 'agriculture' },
      { id: 'sec-energy', nom: 'energie' },
      { id: 'sec-infra', nom: 'infrastructure' },
      { id: 'sec-fin', nom: 'finance' },
      { id: 'sec-com', nom: 'commerce' },
      { id: 'sec-gouv', nom: 'gouvernance' },
      { id: 'sec-env', nom: 'environnement' },
    ];
    for (const s of secteurs) {
      await conn.query('INSERT INTO secteurs (id, nom) VALUES (?, ?)', [s.id, s.nom]);
    }
    console.log(`✅ ${secteurs.length} secteurs insérés`);

    const domaines = [
      { id: 'dom-sante', nom: 'santé' },
      { id: 'dom-eau', nom: 'eau' },
      { id: 'dom-env', nom: 'environnement' },
      { id: 'dom-energy', nom: 'energie' },
      { id: 'dom-gouv', nom: 'gouvernance' },
      { id: 'dom-infra', nom: 'infrastructure' },
    ];
    for (const d of domaines) {
      await conn.query('INSERT INTO domaines_intervention (id, nom) VALUES (?, ?)', [d.id, d.nom]);
    }
    console.log(`✅ ${domaines.length} domaines d'intervention insérés\n`);

    // ============================================================
    // CHARGEMENT DES PROFILS DE RÉFÉRENCE
    // ============================================================
    const jsonPath = path.join(__dirname, 'data', 'benchmark_profiles.json');
    const profiles = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    for (const p of profiles) {
      // 1. Insérer l'utilisateur dans la table commune
      await conn.query(`
        INSERT INTO utilisateurs (id, email, role, statut)
        VALUES (?, ?, ?, 'ACTIF')
      `, [p.id, p.email, p.role]);

      if (p.role === 'ENTREPRENEUR') {
        const ep = p.entrepreneur;
        await conn.query(`
          INSERT INTO entrepreneur_profiles (id, utilisateur_id, secteur_id, pays_id, nom_complet, domaine_expertise, objectifs)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          `ep-${p.id}`,
          p.id,
          ep.secteur.id,
          ep.pays.id,
          p.nom,
          ep.domaineExpertise,
          ep.objectifs
        ]);

      } else if (p.role === 'PME') {
        const pme = p.pme;
        const pmeId = `pme-${p.id}`;
        await conn.query(`
          INSERT INTO pme_profiles (id, utilisateur_id, nom_entreprise, logo_url)
          VALUES (?, ?, ?, ?)
        `, [pmeId, p.id, pme.nomEntreprise, pme.logoUrl]);

        // Insérer les secteurs de la PME dans la table pivot
        for (const s of pme.secteurs) {
          await conn.query(`
            INSERT INTO pme_profiles_secteurs (pme_id, secteur_id) VALUES (?, ?)
          `, [pmeId, s.id]);
        }

      } else if (p.role === 'ONG') {
        const ong = p.ong;
        const ongId = `ong-${p.id}`;
        await conn.query(`
          INSERT INTO ong_profiles (id, utilisateur_id, nom_organisation, mission, logo_url)
          VALUES (?, ?, ?, ?, ?)
        `, [ongId, p.id, ong.nomOrganisation, ong.mission, ong.logoUrl]);

        // Insérer les domaines de l'ONG dans la table pivot
        for (const d of ong.domainesIntervention) {
          await conn.query(`
            INSERT INTO ong_profiles_domaines (ong_id, domaine_id) VALUES (?, ?)
          `, [ongId, d.id]);
        }
      }
    }

    console.log(`✅ ${profiles.length} utilisateurs insérés avec leurs profils spécialisés !\n`);
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   📊 RÉCAPITULATIF DES TABLES CRÉÉES                         ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    const tables = ['utilisateurs', 'entrepreneur_profiles', 'pme_profiles', 'pme_profiles_secteurs', 'ong_profiles', 'ong_profiles_domaines', 'secteurs', 'pays', 'domaines_intervention'];
    for (const t of tables) {
      const [[{ count }]] = await conn.query(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`║   ✅ ${t.padEnd(30)} → ${String(count).padStart(3)} lignes   ║`);
    }
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  setupPrismaSchema().catch(console.error);
}

module.exports = { setupPrismaSchema };
