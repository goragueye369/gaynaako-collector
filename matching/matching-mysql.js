/**
 * 🤖 GAYNAAKO — MOTEUR DE MATCHING (2 BASES SÉPARÉES)
 * 
 * - Profils   → gaynaako_profils       (utilisateurs, entrepreneur_profiles, pme_profiles, ong_profiles)
 * - Opportunités → gaynaako_opportunities (opportunities_processed)
 * 
 * Usage : node matching-mysql.js [ID_UTILISATEUR]
 * Exemple : node matching-mysql.js usr-ent-001
 *           node matching-mysql.js usr-pme-001
 *           node matching-mysql.js usr-ong-002
 *           (sans argument → traite tous les profils)
 */

const mysql = require('mysql2/promise');
const { calculatePrismaMatch } = require('./matching-backend-engine');

const MIN_MATCH_SCORE = 0.55;   // Seuil minimal 55%
const MAX_RECOMMENDATIONS = 5;  // Top 5

const DB_PROFILS = {
  host: 'localhost', port: 3306, user: 'root', password: '',
  database: 'gaynaako_profils'
};

const DB_OPPORTUNITIES = {
  host: 'localhost', port: 3306, user: 'root', password: '',
  database: 'gaynaako_opportunities'
};

/**
 * Charge un utilisateur complet depuis gaynaako_profils
 * Reconstitue l'objet Prisma (avec entrepreneur/pme/ong imbriqués)
 */
async function loadUserFromDB(conn, userId = null) {
  let query = 'SELECT * FROM utilisateurs';
  let params = [];
  if (userId) {
    query += ' WHERE id = ?';
    params.push(userId);
  }
  const [users] = await conn.query(query, params);

  const result = [];

  for (const u of users) {
    const user = { id: u.id, email: u.email, role: u.role, statut: u.statut };

    if (u.role === 'ENTREPRENEUR') {
      const [[ep]] = await conn.query(`
        SELECT ep.*, s.nom AS secteur_nom, p.nom AS pays_nom, p.code AS pays_code
        FROM entrepreneur_profiles ep
        JOIN secteurs s ON ep.secteur_id = s.id
        JOIN pays p ON ep.pays_id = p.id
        WHERE ep.utilisateur_id = ?
      `, [u.id]);

      if (ep) {
        user.nom = ep.nom_complet;
        user.entrepreneur = {
          domaineExpertise: ep.domaine_expertise,
          secteur: { id: ep.secteur_id, nom: ep.secteur_nom },
          pays: { id: ep.pays_id, nom: ep.pays_nom, code: ep.pays_code },
          objectifs: ep.objectifs
        };
      }

    } else if (u.role === 'PME') {
      const [[pme]] = await conn.query(`
        SELECT * FROM pme_profiles WHERE utilisateur_id = ?
      `, [u.id]);

      if (pme) {
        const [secteurs] = await conn.query(`
          SELECT s.id, s.nom FROM secteurs s
          JOIN pme_profiles_secteurs ps ON ps.secteur_id = s.id
          WHERE ps.pme_id = ?
        `, [pme.id]);

        user.nom = pme.nom_entreprise;
        user.pme = {
          nomEntreprise: pme.nom_entreprise,
          secteurs: secteurs,
          logoUrl: pme.logo_url
        };
      }

    } else if (u.role === 'ONG') {
      const [[ong]] = await conn.query(`
        SELECT * FROM ong_profiles WHERE utilisateur_id = ?
      `, [u.id]);

      if (ong) {
        const [domaines] = await conn.query(`
          SELECT d.id, d.nom FROM domaines_intervention d
          JOIN ong_profiles_domaines od ON od.domaine_id = d.id
          WHERE od.ong_id = ?
        `, [ong.id]);

        user.nom = ong.nom_organisation;
        user.ong = {
          nomOrganisation: ong.nom_organisation,
          domainesIntervention: domaines,
          mission: ong.mission,
          logoUrl: ong.logo_url
        };
      }
    }

    result.push(user);
  }

  return result;
}

async function runMatching(userId = null) {
  const connProfils = await mysql.createConnection(DB_PROFILS);
  const connOpp = await mysql.createConnection(DB_OPPORTUNITIES);

  try {
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║   🤖 GAYNAAKO — MATCHING (gaynaako_profils × gaynaako_opportunities) ║');
    console.log(`║   🎯 Seuil : ${(MIN_MATCH_SCORE * 100).toFixed(0)}% | 📦 Top ${MAX_RECOMMENDATIONS} recommandations par profil                    ║`);
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    // 1. Charger les opportunités NON EXPIRÉES depuis gaynaako_opportunities
    const today = new Date().toISOString().slice(0, 10);
    const [opportunities] = await connOpp.query(`
      SELECT id, title, description, sectors, country, quality_score, url,
             date_normalized, has_date
      FROM opportunities_processed
      WHERE has_date = 'non'
         OR date_normalized IS NULL
         OR date_normalized >= ?
      ORDER BY quality_score DESC
    `, [today]);
    console.log(`📦 ${opportunities.length} opportunités chargées depuis gaynaako_opportunities\n`);

    // 2. Charger les profils complets depuis gaynaako_profils
    const users = await loadUserFromDB(connProfils, userId);
    console.log(`👥 ${users.length} profil(s) chargé(s) depuis gaynaako_profils\n`);

    // 3. Matching pour chaque utilisateur
    for (const user of users) {
      const roleIcon = user.role === 'ENTREPRENEUR' ? '👤' : user.role === 'PME' ? '🏢' : '🌍';
      console.log('═'.repeat(70));
      console.log(`${roleIcon}  [${user.role}] — ${(user.nom || '').toUpperCase()}`);
      console.log(`   Email : ${user.email}`);

      if (user.role === 'ENTREPRENEUR') {
        console.log(`   Secteur : ${user.entrepreneur?.secteur?.nom} | Pays : ${user.entrepreneur?.pays?.nom}`);
        console.log(`   Expertise : ${user.entrepreneur?.domaineExpertise}`);
      } else if (user.role === 'PME') {
        console.log(`   Secteurs : ${user.pme?.secteurs?.map(s => s.nom).join(', ')}`);
      } else if (user.role === 'ONG') {
        console.log(`   Domaines : ${user.ong?.domainesIntervention?.map(d => d.nom).join(', ')}`);
        console.log(`   Mission : ${(user.ong?.mission || '').substring(0, 80)}...`);
      }
      console.log('═'.repeat(70));

      // Calculer les scores
      const allMatches = opportunities.map(opp =>
        calculatePrismaMatch(user, opp, { minScore: MIN_MATCH_SCORE })
      );
      const qualified = allMatches
        .filter(m => m.scorePertinence >= MIN_MATCH_SCORE)
        .sort((a, b) => b.scorePertinence - a.scorePertinence)
        .slice(0, MAX_RECOMMENDATIONS);

      if (qualified.length === 0) {
        console.log(`\n⚠️  Aucune opportunité ne dépasse le seuil de ${(MIN_MATCH_SCORE * 100).toFixed(0)}% pour ce profil.\n`);
        continue;
      }

      // Sauvegarder dans la table recommandations de gaynaako_profils
      for (const m of qualified) {
        const recId = `rec_${user.id}_${m.opportunite.id}`;
        await connProfils.query(`
          INSERT INTO recommandations (id, utilisateur_id, opportunite_id, score_pertinence, methode_matching)
          VALUES (?, ?, ?, ?, 'ALGORITHMIQUE')
          ON DUPLICATE KEY UPDATE
            score_pertinence = VALUES(score_pertinence),
            methode_matching = VALUES(methode_matching),
            date_generation = CURRENT_TIMESTAMP
        `, [recId, user.id, m.opportunite.id, m.scorePertinence]);
      }

      console.log(`\n🏆 ${qualified.length} RECOMMANDATION(S) (enregistrées en BDD) :\n`);
      qualified.forEach((m, i) => {
        const pct = m.scorePourcentage;
        const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
        console.log(`  ${i + 1}. [${pct}%] ${bar}  ${m.opportunite.titre}`);
        console.log(`     📍 ${m.opportunite.pays || 'N/A'} | 🏷️ ${m.opportunite.secteur || 'Général'}`);
        if (m.opportunite.url) console.log(`     🔗 ${m.opportunite.url}`);
        console.log('');
      });
    }

    console.log('✅ Matching terminé et recommandations persistées en base !\n');

  } finally {
    await connProfils.end();
    await connOpp.end();
  }
}

if (require.main === module) {
  const arg = process.argv[2] || null;
  runMatching(arg).catch(console.error);
}

module.exports = { runMatching };
