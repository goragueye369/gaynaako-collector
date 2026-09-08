/**
 * Module 3 : Routes Express pour l'API Candidature
 * Expose les endpoints REST pour préparer, compléter, générer la lettre et lister les dossiers
 */

const express = require('express');
const router = express.Router();
const {
  analyzeApplication,
  saveFieldsToUserProfile,
  saveOrUpdateCandidature,
  generateCoverLetter,
  loadOpportunity
} = require('./candidature-engine');

const {
  validateSubmission,
  prepareCompletionForm,
  completeAndSubmit,
  validateFieldInputs
} = require('./validation-handler');

const mysql = require('mysql2/promise');

const DB_PROFILS_CONFIG = {
  host    : process.env.DB_HOST || 'localhost',
  port    : parseInt(process.env.DB_PORT) || 3306,
  user    : process.env.DB_PROFILS_USER || process.env.DB_USER || 'root',
  password: process.env.DB_PROFILS_PASSWORD !== undefined ? process.env.DB_PROFILS_PASSWORD : (process.env.DB_PASSWORD || ''),
  database: process.env.DB_PROFILS_NAME || 'gaynaako_profils',
};

const DB_OPP_CONFIG = {
  host    : process.env.DB_HOST || 'localhost',
  port    : parseInt(process.env.DB_PORT) || 3306,
  user    : process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gaynaako_opportunities',
};

/**
 * GET /api/candidature/prepare/:userId/:oppId
 * Prépare la candidature, identifie les champs présents et manquants, sauvegarde l'état initial
 */
router.get('/prepare/:userId/:oppId', async (req, res) => {
  try {
    const { userId, oppId } = req.params;
    const result = await saveOrUpdateCandidature(userId, oppId);
    res.json(result);
  } catch (err) {
    console.error('[/api/candidature/prepare] Erreur:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/candidature/complete
 * Enregistre les informations manquantes saisies par l'utilisateur
 * 1. Persiste les données dans gaynaako_profils (utilisateurs / entrepreneur_profiles)
 * 2. Recalcule le score de complétude et met à jour la candidature
 */
router.post('/complete', async (req, res) => {
  try {
    const { userId, oppId, fields } = req.body;
    if (!userId || !fields) {
      return res.status(400).json({ success: false, error: 'userId et fields requis' });
    }

    // 1. Sauvegarde permanente dans le profil
    const updateRes = await saveFieldsToUserProfile(userId, fields);

    // 2. Si un oppId est fourni, mise à jour du dossier de candidature
    let candidatureRes = null;
    if (oppId) {
      candidatureRes = await saveOrUpdateCandidature(userId, oppId);
    }

    res.json({
      success: true,
      profile_updated: updateRes.updated_fields,
      candidature: candidatureRes,
      message: 'Informations enregistrées avec succès dans votre profil et votre dossier.'
    });
  } catch (err) {
    console.error('[/api/candidature/complete] Erreur:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/candidature/letter
 * Génère une lettre de motivation adaptée avec Groq LLM (sans hallucination)
 */
router.post('/letter', async (req, res) => {
  try {
    const { userId, oppId } = req.body;
    if (!userId || !oppId) {
      return res.status(400).json({ success: false, error: 'userId et oppId requis' });
    }

    const result = await generateCoverLetter(userId, oppId);
    res.json(result);
  } catch (err) {
    console.error('[/api/candidature/letter] Erreur:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/candidature/list/:userId
 * Liste l'ensemble des candidatures pour un utilisateur donné
 */
router.get('/list/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const connProfils = await mysql.createConnection(DB_PROFILS_CONFIG);
    const connOpp = await mysql.createConnection(DB_OPP_CONFIG);

    const [candidatures] = await connProfils.query(
      `SELECT id, utilisateur_id, opportunite_id, statut, score_completude,
              champs_pre_remplis, champs_manquants, lettre_motivation,
              date_creation, date_mise_a_jour
       FROM candidatures
       WHERE utilisateur_id = ?
       ORDER BY date_mise_a_jour DESC`,
      [userId]
    );

    const oppIds = candidatures.map(c => c.opportunite_id);
    let oppMap = new Map();

    if (oppIds.length > 0) {
      const placeholders = oppIds.map(() => '?').join(',');
      const [opps] = await connOpp.query(
        `SELECT id, title, description, url, sectors, country, source_name
         FROM opportunities_processed
         WHERE id IN (${placeholders})`,
        oppIds
      );
      oppMap = new Map(opps.map(o => [o.id, o]));
    }

    await connProfils.end();
    await connOpp.end();

    const enriched = candidatures.map(c => ({
      ...c,
      opportunite: oppMap.get(c.opportunite_id) || {
        id: c.opportunite_id,
        title: 'Opportunité'
      }
    }));

    res.json({
      success: true,
      userId,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    console.error('[/api/candidature/list] Erreur:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/candidature/validate
 * Vérifie si une candidature peut être soumise
 * Retourne les champs manquants si incomplet
 */
router.post('/validate', async (req, res) => {
  try {
    const { userId, oppId } = req.body;
    if (!userId || !oppId) {
      return res.status(400).json({ success: false, error: 'userId et oppId requis' });
    }

    const validation = await validateSubmission(userId, oppId);
    res.json({ success: true, validation });

  } catch (err) {
    console.error('[/api/candidature/validate] Erreur:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/candidature/submit
 * Soumet une candidature (change le statut à SOUMISE)
 * Vérifie d'abord que la candidature est complète
 */
router.post('/submit', async (req, res) => {
  try {
    const { userId, oppId } = req.body;
    if (!userId || !oppId) {
      return res.status(400).json({ success: false, error: 'userId et oppId requis' });
    }

    // ÉTAPE 1 : Valider que la candidature est complète
    const validation = await validateSubmission(userId, oppId);
    
    if (!validation.canSubmit) {
      // Préparer le formulaire de complétion
      const form = await prepareCompletionForm(userId, oppId);
      
      return res.status(400).json({
        success: false,
        error: 'candidature_incomplete',
        message: validation.message,
        score: validation.score,
        missingFields: validation.missingFields,
        completionForm: form,
        action_required: 'complete_fields_before_submit'
      });
    }

    // ÉTAPE 2 : Si complet, soumettre
    const connProfils = await mysql.createConnection(DB_PROFILS_CONFIG);
    
    const [result] = await connProfils.query(`
      UPDATE candidatures 
      SET statut = 'SOUMISE',
          date_soumission = CURRENT_TIMESTAMP
      WHERE utilisateur_id = ? AND opportunite_id = ?
    `, [userId, oppId]);

    await connProfils.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Candidature soumise avec succès',
      statut: 'SOUMISE',
      date_soumission: new Date().toISOString(),
      score: 100
    });

  } catch (err) {
    console.error('[/api/candidature/submit] Erreur:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
