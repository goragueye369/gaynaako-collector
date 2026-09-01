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

// Configuration MySQL
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'gaynaako_opportunities'
};

// Pool de connexions
const pool = mysql.createPool(DB_CONFIG);

// ============================================
// ROUTES API
// ============================================

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
 * Statistiques globales
 */
app.get('/api/statistics', async (req, res) => {
  try {
    // Stats globales
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_opportunities,
        AVG(quality_score) as avg_quality_score,
        COUNT(DISTINCT country) as total_countries,
        COUNT(DISTINCT source_name) as total_sources,
        COUNT(CASE WHEN quality_score > 70 THEN 1 END) as high_quality_count
      FROM opportunities_processed
    `);

    // Par secteur
    const [bySector] = await pool.query(`
      SELECT 
        s.name as sector,
        COUNT(*) as count
      FROM sectors s
      INNER JOIN opportunities_processed op ON FIND_IN_SET(s.name, op.sectors) > 0
      GROUP BY s.name
      ORDER BY count DESC
    `);

    // Par pays
    const [byCountry] = await pool.query(`
      SELECT 
        country,
        COUNT(*) as count
      FROM opportunities_processed
      GROUP BY country
      ORDER BY count DESC
    `);

    // Par public cible
    const [byAudience] = await pool.query(`
      SELECT 
        target_audience,
        COUNT(*) as count
      FROM opportunities_processed
      GROUP BY target_audience
      ORDER BY count DESC
    `);

    // Par urgence
    const [byUrgency] = await pool.query(`
      SELECT 
        urgency,
        COUNT(*) as count
      FROM opportunities_processed
      GROUP BY urgency
      ORDER BY 
        FIELD(urgency, 'Urgente', 'Haute', 'Normale', 'Flexible', 'Expirée')
    `);

    res.json({
      success: true,
      data: {
        global: stats[0],
        by_sector: bySector,
        by_country: byCountry,
        by_audience: byAudience,
        by_urgency: byUrgency
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

    const [opportunities] = await pool.query(
      `SELECT *, 
        MATCH(title, description, sectors) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
       FROM opportunities_processed
       WHERE MATCH(title, description, sectors) AGAINST(? IN NATURAL LANGUAGE MODE)
       ORDER BY relevance DESC
       LIMIT ?`,
      [q, q, parseInt(limit)]
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
 * GET /api/sectors
 * Liste des secteurs disponibles
 */
app.get('/api/sectors', async (req, res) => {
  try {
    const [sectors] = await pool.query(
      'SELECT * FROM sectors ORDER BY name'
    );

    res.json({
      success: true,
      data: sectors
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
 * Liste des pays disponibles
 */
app.get('/api/countries', async (req, res) => {
  try {
    const [countries] = await pool.query(
      'SELECT * FROM countries ORDER BY name'
    );

    res.json({
      success: true,
      data: countries
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
 * Trouve les opportunités similaires
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
 * GET /api/opportunities/nlp/:id
 * Informations NLP extraites pour une opportunité
 */
app.get('/api/opportunities/nlp/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [nlpData] = await pool.query(
      'SELECT * FROM opportunity_nlp WHERE opportunity_id = ?',
      [id]
    );

    if (nlpData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Données NLP non trouvées'
      });
    }

    res.json({
      success: true,
      data: nlpData[0]
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
