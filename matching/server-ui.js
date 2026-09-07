/**
 * Serveur Web — Interface de Test Matching Gaynaako
 * Lit les profils depuis gaynaako_profils
 * Lit les opportunités depuis gaynaako_opportunities
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const { calculatePrismaMatch } = require('./matching-backend-engine');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route pour la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const DB_PROFILS = {
  host: 'localhost', port: 3306, user: 'root', password: '',
  database: 'gaynaako_profils'
};
const DB_OPPORTUNITIES = {
  host: 'localhost', port: 3306, user: 'root', password: '',
  database: 'gaynaako_opportunities'
};

// ─── API : Liste des profils ───────────────────────────────────────────────
app.get('/api/profiles', async (req, res) => {
  const conn = await mysql.createConnection(DB_PROFILS);
  try {
    const [users] = await conn.query('SELECT * FROM utilisateurs ORDER BY role, id');
    const result = [];

    for (const u of users) {
      const user = { id: u.id, email: u.email, role: u.role };

      if (u.role === 'ENTREPRENEUR') {
        const [[ep]] = await conn.query(`
          SELECT ep.*, s.nom AS secteur_nom, p.nom AS pays_nom
          FROM entrepreneur_profiles ep
          JOIN secteurs s ON ep.secteur_id = s.id
          JOIN pays p ON ep.pays_id = p.id
          WHERE ep.utilisateur_id = ?`, [u.id]);
        if (ep) {
          user.nom = ep.nom_complet;
          user.entrepreneur = {
            domaineExpertise: ep.domaine_expertise,
            secteur: { id: ep.secteur_id, nom: ep.secteur_nom },
            pays: { id: ep.pays_id, nom: ep.pays_nom },
            objectifs: ep.objectifs
          };
        }

      } else if (u.role === 'PME') {
        const [[pme]] = await conn.query('SELECT * FROM pme_profiles WHERE utilisateur_id = ?', [u.id]);
        if (pme) {
          const [secteurs] = await conn.query(`
            SELECT s.id, s.nom FROM secteurs s
            JOIN pme_profiles_secteurs ps ON ps.secteur_id = s.id
            WHERE ps.pme_id = ?`, [pme.id]);
          user.nom = pme.nom_entreprise;
          user.pme = { nomEntreprise: pme.nom_entreprise, secteurs, logoUrl: pme.logo_url };
        }

      } else if (u.role === 'ONG') {
        const [[ong]] = await conn.query('SELECT * FROM ong_profiles WHERE utilisateur_id = ?', [u.id]);
        if (ong) {
          const [domaines] = await conn.query(`
            SELECT d.id, d.nom FROM domaines_intervention d
            JOIN ong_profiles_domaines od ON od.domaine_id = d.id
            WHERE od.ong_id = ?`, [ong.id]);
          user.nom = ong.nom_organisation;
          user.ong = { nomOrganisation: ong.nom_organisation, domainesIntervention: domaines, mission: ong.mission };
        }
      }

      result.push(user);
    }

    res.json({ success: true, count: result.length, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  } finally {
    await conn.end();
  }
});

// ─── API : Matching ────────────────────────────────────────────────────────
app.post('/api/match', async (req, res) => {
  const { profile, min_score = 0.55, limit = 5 } = req.body;
  if (!profile) return res.status(400).json({ success: false, error: 'Profil requis' });

  const conn = await mysql.createConnection(DB_OPPORTUNITIES);
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const [opportunities] = await conn.query(`
      SELECT id, title, description, sectors, country, quality_score, url,
             date_normalized, has_date
      FROM opportunities_processed
      WHERE has_date = 'non'
         OR date_normalized IS NULL
         OR date_normalized >= ?
    `, [today]);

    const matches = opportunities
      .map(opp => calculatePrismaMatch(profile, opp, { minScore: min_score }))
      .filter(m => m.scorePertinence >= min_score)
      .sort((a, b) => b.scorePertinence - a.scorePertinence)
      .slice(0, limit);

    res.json({ success: true, role: profile.role, nom: profile.nom, total: matches.length, matches });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  } finally {
    await conn.end();
  }
});

// ─── API : Stratégie IA & Plan d'Action ─────────────────────────────────────
app.get('/api/strategy/:userId', async (req, res) => {
  try {
    const { generateUserStrategy } = require('./strategy-engine');
    const strategy = await generateUserStrategy(req.params.userId);
    res.json(strategy);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   🌟 INTERFACE MATCHING GAYNAAKO — PORT 3000          ║');
  console.log('║   📦 gaynaako_profils × gaynaako_opportunities        ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n🌐 http://localhost:${PORT}\n`);
});
