/**
 * API REST pour le Backend
 * Expose les opportunités enrichies avec métadonnées d'attribution
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration MySQL (Opportunités)
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'gaynaako_api',
  password: process.env.DB_PASSWORD || 'apipassword123',
  database: process.env.DB_NAME || 'gaynaako_opportunities'
};

// Configuration MySQL (Profils & Recommandations)
const DB_PROFILS_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_PROFILS_USER || 'root',
  password: process.env.DB_PROFILS_PASSWORD !== undefined ? process.env.DB_PROFILS_PASSWORD : '',
  database: process.env.DB_PROFILS_NAME || 'gaynaako_profils'
};

// Pools de connexions
const pool = mysql.createPool(DB_CONFIG);
const poolProfils = mysql.createPool(DB_PROFILS_CONFIG);
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ============================================
// ROUTES API
// ============================================

/**
 * GET /
 * Page d'accueil de l'API
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Gaynaako Opportunity Agent API',
    version: '1.0.0',
    status: 'online',
    description: 'API REST pour les opportunités enrichies avec IA',
    endpoints: {
      health: '/api/health',
      opportunities: {
        list: '/api/opportunities?limit=10',
        byId: '/api/opportunities/:id',
        similar: '/api/opportunities/:id/similar',
        nlp: '/api/opportunities/:id/nlp',
        byProfile: '/api/opportunities/profile/:profiles'
      },
      search: '/api/search?q=keyword',
      statistics: '/api/statistics',
      reference: {
        sectors: '/api/sectors',
        countries: '/api/countries'
      },
      recommendations: {
        byUser: '/api/recommendations/:userId',
        triggerMatching: 'POST /api/matching/run'
      },
      strategy: {
        byUser: '/api/strategy/:userId'
      }
    },
    documentation: 'Voir API_DOCUMENTATION.md',
    contact: 'contact@gaynaakoit.com'
  });
});

/**
 * GET /api
 * Documentation API
 */
app.get('/api', (req, res) => {
  res.json({
    message: 'Bienvenue sur l\'API Gaynaako',
    version: '1.0.0',
    endpoints: [
      'GET /api/health - Santé de l\'API',
      'GET /api/opportunities - Liste des opportunités',
      'GET /api/opportunities/:id - Détails d\'une opportunité',
      'GET /api/opportunities/:id/similar - Opportunités similaires',
      'GET /api/opportunities/:id/nlp - Données NLP',
      'GET /api/opportunities/profile/:profiles - Par profils',
      'GET /api/search?q=keyword - Recherche',
      'GET /api/statistics - Statistiques',
      'GET /api/sectors - Secteurs',
      'GET /api/countries - Pays',
      'GET /api/recommendations/:userId - Top recommandations personnalisées d\'un profil',
      'GET /api/strategy/:userId - Diagnostic stratégique & plan d\'action IA d\'un profil',
      'POST /api/matching/run - Déclencher le calcul et la persistance du matching'
    ],
    examples: [
      'http://localhost:3001/api/opportunities?limit=5',
      'http://localhost:3001/api/search?q=python',
      'http://localhost:3001/api/statistics'
    ]
  });
});

/**
 * GET /api/opportunities
 * Liste toutes les opportunités avec filtres
 */
app.get('/api/opportunities', async (req, res) => {
  try {
    const {
      sector,
      country,
      source_type,
      min_quality,
      target_audience,
      urgency,
      limit = 50,
      offset = 0
    } = req.query;

    let query = 'SELECT * FROM opportunities_processed WHERE 1=1';
    const params = [];

    // Filtres
    if (sector) {
      query += ' AND FIND_IN_SET(?, sectors) > 0';
      params.push(sector);
    }
    if (country) {
      query += ' AND country = ?';
      params.push(country);
    }
    if (source_type) {
      query += ' AND source_type = ?';
      params.push(source_type);
    }
    if (min_quality) {
      query += ' AND quality_score >= ?';
      params.push(parseInt(min_quality));
    }
    if (target_audience) {
      query += ' AND target_audience = ?';
      params.push(target_audience);
    }
    if (urgency) {
      query += ' AND urgency = ?';
      params.push(urgency);
    }

    // Pagination
    query += ' ORDER BY collected_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [opportunities] = await pool.query(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) as total FROM opportunities_processed WHERE 1=1';
    const countParams = params.slice(0, -2); // Enlever limit et offset

    if (sector) countQuery += ' AND FIND_IN_SET(?, sectors) > 0';
    if (country) countQuery += ' AND country = ?';
    if (source_type) countQuery += ' AND source_type = ?';
    if (min_quality) countQuery += ' AND quality_score >= ?';
    if (target_audience) countQuery += ' AND target_audience = ?';
    if (urgency) countQuery += ' AND urgency = ?';

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: opportunities,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/opportunities/:id
 * Détails d'une opportunité
 */
app.get('/api/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [opportunities] = await pool.query(
      'SELECT * FROM opportunities_processed WHERE id = ?',
      [id]
    );

    if (opportunities.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    res.json({
      success: true,
      data: opportunities[0]
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/opportunities/profile/:profiles
 * Opportunités suggérées pour un ou plusieurs profils
 */
app.get('/api/opportunities/profile/:profiles', async (req, res) => {
  try {
    const { profiles } = req.params;
    const profileList = profiles.split(',');
    
    const { limit = 20 } = req.query;

    // Chercher les opportunités qui suggèrent ces profils
    const conditions = profileList.map(() => 'FIND_IN_SET(?, suggested_profiles) > 0').join(' OR ');
    
    const [opportunities] = await pool.query(
      `SELECT * FROM opportunities_processed 
       WHERE ${conditions}
       ORDER BY quality_score DESC, collected_at DESC
       LIMIT ?`,
      [...profileList, parseInt(limit)]
    );

    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/statistics
 * Statistiques globales (avec NLP intégré)
 */
app.get('/api/statistics', async (req, res) => {
  try {
    // Stats globales
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_opportunities,
        COUNT(nlp_processed_at) as with_nlp_analysis,
        AVG(quality_score) as avg_quality_score,
        AVG(nlp_quality_score) as avg_nlp_score,
        COUNT(DISTINCT country) as total_countries,
        COUNT(CASE WHEN quality_score > 70 THEN 1 END) as high_quality_count,
        COUNT(CASE WHEN nlp_amounts IS NOT NULL THEN 1 END) as with_budget,
        COUNT(CASE WHEN nlp_deadlines IS NOT NULL THEN 1 END) as with_deadline,
        COUNT(CASE WHEN nlp_organizations IS NOT NULL THEN 1 END) as with_organization,
        COUNT(CASE WHEN nlp_emails IS NOT NULL THEN 1 END) as with_email
      FROM opportunities_processed
    `);

    // Par public cible
    const [byAudience] = await pool.query(`
      SELECT 
        target_audience,
        COUNT(*) as count
      FROM opportunities_processed
      WHERE target_audience IS NOT NULL
      GROUP BY target_audience
      ORDER BY count DESC
    `);

    // Par urgence
    const [byUrgency] = await pool.query(`
      SELECT 
        urgency,
        COUNT(*) as count
      FROM opportunities_processed
      WHERE urgency IS NOT NULL
      GROUP BY urgency
      ORDER BY count DESC
    `);

    // Par niveau d'expérience
    const [byExperience] = await pool.query(`
      SELECT 
        experience_required,
        COUNT(*) as count
      FROM opportunities_processed
      WHERE experience_required IS NOT NULL
      GROUP BY experience_required
      ORDER BY count DESC
    `);

    // Par gamme de budget
    const [byBudget] = await pool.query(`
      SELECT 
        budget_range,
        COUNT(*) as count
      FROM opportunities_processed
      WHERE budget_range IS NOT NULL
      GROUP BY budget_range
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        global: stats[0],
        by_audience: byAudience,
        by_urgency: byUrgency,
        by_experience: byExperience,
        by_budget: byBudget
      }
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/search
 * Recherche textuelle dans les opportunités
 */
app.get('/api/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "q" requis'
      });
    }

    // Recherche simple avec LIKE
    const searchPattern = `%${q}%`;
    const [opportunities] = await pool.query(
      `SELECT * FROM opportunities_processed
       WHERE title LIKE ? OR description LIKE ? OR sectors LIKE ?
       ORDER BY quality_score DESC, collected_at DESC
       LIMIT ?`,
      [searchPattern, searchPattern, searchPattern, parseInt(limit)]
    );

    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
      query: q
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sectors
 * Liste des secteurs disponibles (depuis les données)
 */
app.get('/api/sectors', async (req, res) => {
  try {
    const [result] = await pool.query(`
      SELECT DISTINCT sectors
      FROM opportunities_processed
      WHERE sectors IS NOT NULL AND sectors != ''
    `);

    // Extraire tous les secteurs uniques
    const sectorsSet = new Set();
    result.forEach(row => {
      if (row.sectors) {
        const sectors = row.sectors.split(',').map(s => s.trim());
        sectors.forEach(s => sectorsSet.add(s));
      }
    });

    const sectors = Array.from(sectorsSet).sort().map(s => ({ name: s }));

    res.json({
      success: true,
      data: sectors,
      count: sectors.length
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/countries
 * Liste des pays disponibles (depuis les données)
 */
app.get('/api/countries', async (req, res) => {
  try {
    const [countries] = await pool.query(`
      SELECT DISTINCT country as name, COUNT(*) as count
      FROM opportunities_processed
      WHERE country IS NOT NULL AND country != ''
      GROUP BY country
      ORDER BY count DESC, country
    `);

    res.json({
      success: true,
      data: countries,
      count: countries.length
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/**
 * GET /api/opportunities/:id/similar
 * Trouve les opportunités similaires (utilise embeddings)
 */
app.get('/api/opportunities/:id/similar', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    // Récupérer l'embedding de l'opportunité
    const [target] = await pool.query(
      'SELECT embedding FROM opportunity_embeddings WHERE opportunity_id = ?',
      [id]
    );

    if (target.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Opportunité ou embedding non trouvé'
      });
    }

    const targetEmbedding = JSON.parse(target[0].embedding);

    // Récupérer tous les autres embeddings avec infos
    const [others] = await pool.query(`
      SELECT 
        oe.opportunity_id,
        oe.embedding,
        op.title,
        op.description,
        op.sectors,
        op.country,
        op.quality_score,
        op.url
      FROM opportunity_embeddings oe
      JOIN opportunities_processed op ON oe.opportunity_id = op.id
      WHERE oe.opportunity_id != ?
    `, [id]);

    // Calculer similarités
    const similarities = others.map(other => {
      const otherEmbedding = JSON.parse(other.embedding);
      const similarity = cosineSimilarity(targetEmbedding, otherEmbedding);
      
      return {
        id: other.opportunity_id,
        title: other.title,
        description: other.description ? other.description.substring(0, 200) : null,
        sectors: other.sectors,
        country: other.country,
        quality_score: other.quality_score,
        url: other.url,
        similarity: similarity
      };
    });

    // Trier par similarité
    similarities.sort((a, b) => b.similarity - a.similarity);

    res.json({
      success: true,
      data: similarities.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/opportunities/:id/nlp
 * Informations NLP extraites pour une opportunité (colonnes NLP intégrées)
 */
app.get('/api/opportunities/:id/nlp', async (req, res) => {
  try {
    const { id } = req.params;

    const [opportunity] = await pool.query(
      `SELECT 
        id,
        title,
        nlp_amounts,
        nlp_deadlines,
        nlp_organizations,
        nlp_emails,
        nlp_phones,
        nlp_keywords,
        nlp_quality_score,
        nlp_processed_at
      FROM opportunities_processed 
      WHERE id = ?`,
      [id]
    );

    if (opportunity.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Opportunité non trouvée'
      });
    }

    const data = opportunity[0];

    // Parser les JSON
    if (data.nlp_amounts) data.nlp_amounts = JSON.parse(data.nlp_amounts);
    if (data.nlp_deadlines) data.nlp_deadlines = JSON.parse(data.nlp_deadlines);
    if (data.nlp_organizations) data.nlp_organizations = JSON.parse(data.nlp_organizations);
    if (data.nlp_emails) data.nlp_emails = JSON.parse(data.nlp_emails);
    if (data.nlp_phones) data.nlp_phones = JSON.parse(data.nlp_phones);
    if (data.nlp_keywords) data.nlp_keywords = JSON.parse(data.nlp_keywords);

    res.json({
      success: true,
      data: data,
      has_nlp: data.nlp_processed_at !== null
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/search-semantic
 * Recherche sémantique (nécessite génération d'embedding côté Python)
 */
app.post('/api/search-semantic', async (req, res) => {
  try {
    const { text, limit = 10 } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "text" requis'
      });
    }

    // Note: L'embedding du texte de recherche doit être généré côté Python
    // Pour l'instant, on retourne une erreur expliquant la procédure
    res.status(501).json({
      success: false,
      error: 'Recherche sémantique nécessite génération d\'embedding Python',
      info: 'Utilisez le script Python embedding-generator.py pour générer l\'embedding du texte, puis interrogez l\'API avec l\'embedding'
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fonction utilitaire : Similarité cosinus
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vecteurs de tailles différentes');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

/**
 * GET /api/recommendations/:userId
 * Récupère les recommandations calculées par IA pour un utilisateur
 */
app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    // Récupérer les recommandations enregistrées pour cet utilisateur
    const [recs] = await poolProfils.query(
      `SELECT id, utilisateur_id, opportunite_id, score_pertinence, methode_matching, date_generation
       FROM recommandations
       WHERE utilisateur_id = ?
       ORDER BY score_pertinence DESC
       LIMIT ?`,
      [userId, limit]
    );

    if (recs.length === 0) {
      return res.json({
        success: true,
        userId,
        count: 0,
        recommendations: [],
        message: 'Aucune recommandation trouvée pour ce profil'
      });
    }

    // Récupérer les détails des opportunités correspondantes
    const oppIds = recs.map(r => r.opportunite_id);
    const placeholders = oppIds.map(() => '?').join(',');
    const [opps] = await pool.query(
      `SELECT id, title, description, url, sectors, country, quality_score,
              date_original, date_normalized, has_date, target_audience, budget_range
       FROM opportunities_processed
       WHERE id IN (${placeholders})`,
      oppIds
    );

    const oppMap = new Map(opps.map(o => [o.id, o]));

    const combined = recs.map(r => ({
      id: r.id,
      score_pertinence: r.score_pertinence,
      score_pourcentage: Math.round(r.score_pertinence * 100),
      methode_matching: r.methode_matching,
      date_generation: r.date_generation,
      opportunite: oppMap.get(r.opportunite_id) || { id: r.opportunite_id, title: 'Opportunité non trouvée' }
    }));

    res.json({
      success: true,
      userId,
      count: combined.length,
      recommendations: combined
    });

  } catch (error) {
    console.error('Erreur /api/recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/matching/run
 * Déclenche le matching par IA sémantique à la demande
 */
app.post('/api/matching/run', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const command = userId ? `python matching/bge-matching-mysql.py ${userId}` : 'python matching/bge-matching-mysql.py';

    const { stdout, stderr } = await execAsync(command, { cwd: __dirname });

    res.json({
      success: true,
      message: 'Matching IA exécuté avec succès',
      userId: userId || 'TOUS',
      details: stdout.split('\n').slice(-10).join('\n')
    });

  } catch (error) {
    console.error('Erreur /api/matching/run:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/strategy/:userId
 * Diagnostic stratégique, priorités et roadmap de candidature personnalisée
 */
app.get('/api/strategy/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { generateUserStrategy } = require('./matching/strategy-engine');

    const strategy = await generateUserStrategy(userId);
    res.json(strategy);

  } catch (error) {
    console.error('Erreur /api/strategy:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Santé de l'API
 */
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ============================================
// ENDPOINTS MODULE 2 : STRATÉGIE
// ============================================

/**
 * GET /api/strategy/:userId
 * Rapport stratégique complet pour un utilisateur
 */
app.get('/api/strategy/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const useRecommendations = req.query.recommendations === 'true';
    
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const command = useRecommendations 
      ? `python strategy-advisor.py ${userId} --use-recs`
      : `python strategy-advisor.py ${userId}`;
    
    const { stdout } = await execAsync(command, { 
      cwd: __dirname,
      timeout: 30000
    });
    
    // Parse the output to extract JSON data
    // For now, just return success with a message
    res.json({
      success: true,
      message: 'Rapport stratégique généré',
      userId,
      strategyAvailable: true,
      details: 'Le rapport stratégique est disponible via l\'interface ou en mode complet'
    });

  } catch (error) {
    console.error('Erreur /api/strategy:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/strategy/:userId/prioritize
 * Priorisation des opportunités
 */
app.get('/api/strategy/:userId/prioritize', async (req, res) => {
  try {
    const { userId } = req.params;
    
    res.json({
      success: true,
      message: 'Endpoint en cours de développement',
      info: 'Cette fonctionnalité permet de prioriser les opportunités pour un profil'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/strategy/:userId/skill-gaps
 * Analyse des gaps de compétences
 */
app.get('/api/strategy/:userId/skill-gaps', async (req, res) => {
  try {
    const { userId } = req.params;
    
    res.json({
      success: true,
      message: 'Endpoint en cours de développement',
      info: 'Cette fonctionnalité analyse les compétences manquantes'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/strategy/:userId/tips
 * Conseils d'optimisation
 */
app.get('/api/strategy/:userId/tips', async (req, res) => {
  try {
    const { userId } = req.params;
    
    res.json({
      success: true,
      message: 'Endpoint en cours de développement',
      info: 'Cette fonctionnalité fournit des conseils personnalisés'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ENDPOINTS MODULE 3 : CANDIDATURE
// ============================================

const candidatureRoutes = require('./candidature/candidature-routes');
app.use('/api/candidature', candidatureRoutes);

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🚀 API GAYNAAKO - DÉMARRÉE         ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`\n📚 Endpoints disponibles:`);
  console.log(`   - GET  /api/opportunities`);
  console.log(`   - GET  /api/opportunities/:id`);
  console.log(`   - GET  /api/opportunities/profile/:profiles`);
  console.log(`   - GET  /api/search?q=...`);
  console.log(`   - GET  /api/statistics`);
  console.log(`   - GET  /api/sectors`);
  console.log(`   - GET  /api/countries`);
  console.log(`   - GET  /api/health`);
  console.log(`\n💡 Exemples:`);
  console.log(`   http://localhost:${PORT}/api/opportunities?sector=technologie&limit=10`);
  console.log(`   http://localhost:${PORT}/api/opportunities/profile/expert_tech,consultant_digital`);
  console.log(`   http://localhost:${PORT}/api/search?q=agriculture`);
  console.log();
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non gérée:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Promise rejetée:', error);
});
