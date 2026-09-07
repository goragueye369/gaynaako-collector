/**
 * Chatbot API Server - Port 3002
 * 
 * Endpoints :
 *   POST /api/chat                     → envoyer un message
 *   POST /api/chat/transcribe          → transcrire un audio (Groq Whisper)
 *   POST /api/chat/session             → créer une session
 *   GET  /api/chat/session/:id/history → historique d'une session
 *   GET  /api/chat/sessions/:userId    → sessions d'un utilisateur
 *   GET  /api/chat/health              → santé du service
 */

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');
const multer   = require('multer');
const Groq     = require('groq-sdk');

// Multer : stockage temporaire en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

const {
  generateResponse,
  createSession,
  getUserSessions,
  getConversationHistory,
  loadUserProfile,
} = require('./chatbot');

const app  = express();
const PORT = process.env.CHATBOT_PORT || 3002;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Logger simple
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Interface de test ───────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'chat-interface.html'));
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/chat
 * Corps : { message, session_id?, user_id? }
 * 
 * Cas d'usage :
 *   - Recherche : "Quelles opportunités dans la tech au Sénégal ?"
 *   - Éligibilité : "Puis-je postuler avec 3 ans d'expérience en finance ?"
 *   - Rédaction  : "Comment rédiger ma candidature pour cet appel d'offres ?"
 *   - Carrière   : "Quelles formations suivre pour décrocher un projet BAD ?"
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, session_id, user_id = 'anonymous' } = req.body;

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error  : 'Le champ "message" est requis et ne peut pas être vide.',
      });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        error  : 'Le message ne peut pas dépasser 2000 caractères.',
      });
    }

    // Créer une session si aucune n'est fournie
    let sessionId = session_id;
    if (!sessionId) {
      sessionId = await createSession(user_id, message.trim().substring(0, 60));
    }

    // Générer la réponse (RAG + LLM)
    const result = await generateResponse(message.trim(), sessionId, user_id);

    res.json({
      success    : true,
      session_id : result.session_id,
      message    : result.response,
      intent     : result.intent,
      suggestions: result.suggestions,
      meta       : {
        opportunities_used: result.opportunities_used,
        duration_ms       : result.duration_ms,
        model             : 'qwen/qwen3.8-27b',
      },
    });

  } catch (err) {
    console.error('[/api/chat] Erreur:', err);
    res.status(500).json({
      success: false,
      error  : 'Erreur interne du serveur.',
      detail : process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

/**
 * POST /api/chat/session
 * Corps : { user_id?, title? }
 * Crée une nouvelle session de conversation
 */
app.post('/api/chat/session', async (req, res) => {
  try {
    const { user_id = 'anonymous', title = 'Nouvelle conversation' } = req.body;
    const sessionId = await createSession(user_id, title);

    res.json({
      success   : true,
      session_id: sessionId,
      user_id,
      title,
    });
  } catch (err) {
    console.error('[/api/chat/session] Erreur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/chat/session/:session_id/history
 * Retourne l'historique complet d'une session
 */
app.get('/api/chat/session/:session_id/history', async (req, res) => {
  try {
    const { session_id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const history = await getConversationHistory(session_id, limit);

    res.json({
      success   : true,
      session_id,
      count     : history.length,
      messages  : history,
    });
  } catch (err) {
    console.error('[history] Erreur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/chat/sessions/:user_id
 * Liste toutes les sessions d'un utilisateur
 */
app.get('/api/chat/sessions/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const sessions = await getUserSessions(user_id);

    res.json({
      success : true,
      user_id,
      count   : sessions.length,
      sessions,
    });
  } catch (err) {
    console.error('[sessions] Erreur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/chat/health
 * Vérifie la santé du service (connexion MySQL + clé Groq)
 */
app.get('/api/chat/health', async (req, res) => {
  const checks = {
    server    : true,
    groq_key  : !!process.env.GROQ_API_KEY,
    database  : false,
  };

  try {
    const mysql = require('mysql2/promise');
    const conn  = await mysql.createConnection({
      host    : process.env.DB_HOST     || 'localhost',
      port    : parseInt(process.env.DB_PORT) || 3306,
      user    : process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'gaynaako_opportunities',
    });
    await conn.query('SELECT 1');
    await conn.end();
    checks.database = true;
  } catch (err) {
    checks.db_error = err.message;
  }

  const allOk     = Object.values(checks).every(v => v === true || typeof v === 'string');
  const criticals = !checks.groq_key || !checks.database;

  res.status(criticals ? 503 : 200).json({
    success  : !criticals,
    status   : criticals ? 'degraded' : 'healthy',
    checks,
    timestamp: new Date().toISOString(),
    warnings : !checks.groq_key
      ? ['GROQ_API_KEY manquante — ajoutez-la dans .env. Clé gratuite : https://console.groq.com']
      : [],
  });
});

/**
 * GET /api/chat/examples
 * Retourne des exemples de questions pour guider l'utilisateur
 */
app.get('/api/chat/examples', (_req, res) => {
  res.json({
    success : true,
    examples: [
      {
        category: 'Recherche d\'opportunités',
        questions: [
          'Quelles missions Python sont disponibles au Sénégal ?',
          'Y a-t-il des appels d\'offres dans le secteur de la santé ?',
          'Montre-moi les opportunités de financement pour les PME',
          'Quelles sont les opportunités urgentes cette semaine ?',
        ],
      },
      {
        category: 'Analyse d\'éligibilité',
        questions: [
          'Je suis développeur avec 5 ans d\'expérience, quelles opportunités me correspondent ?',
          'Puis-je postuler à un projet Banque Mondiale avec mon profil ingénieur ?',
          'Quelles opportunités correspondent au profil startup tech ?',
        ],
      },
      {
        category: 'Aide à la candidature',
        questions: [
          'Comment rédiger une proposition pour un appel d\'offres de la BAD ?',
          'Quels documents préparer pour candidater à un projet PNUD ?',
          'Comment améliorer mon dossier de candidature ?',
        ],
      },
      {
        category: 'Conseils carrière',
        questions: [
          'Quelles compétences développer pour décrocher plus de projets ?',
          'Quels secteurs recrutent le plus en Afrique de l\'Ouest ?',
          'Comment me spécialiser pour les projets de développement international ?',
        ],
      },
      {
        category: 'Statistiques',
        questions: [
          'Combien d\'opportunités sont disponibles en ce moment ?',
          'Quels pays ont le plus d\'opportunités ?',
          'Résume les données disponibles dans la base Gaynaako',
        ],
      },
    ],
  });
});

/**
 * POST /api/chat/login
 * Corps : { email }
 * - Si l'email existe en DB → retourne le profil complet
 * - Si l'email n'existe pas → crée un compte VISITEUR et retourne le profil
 */
app.post('/api/chat/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email requis.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validation format email simple
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Format email invalide.' });
    }

    const mysql2 = require('mysql2/promise');
    const conn   = await mysql2.createConnection({
      host    : process.env.DB_HOST     || 'localhost',
      port    : parseInt(process.env.DB_PORT) || 3306,
      user    : process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'gaynaako_opportunities',
    });

    // Chercher l'utilisateur existant
    const [users] = await conn.query(
      `SELECT id, email, role, statut FROM utilisateurs WHERE email = ?`,
      [cleanEmail]
    );

    let userId;
    let isNew = false;

    if (users.length > 0) {
      // Utilisateur existant
      const existingUser = users[0];

      // Vérifier si le compte est suspendu
      if (existingUser.statut === 'SUSPENDU') {
        await conn.end();
        return res.status(403).json({
          success: false,
          error  : 'Ce compte est suspendu. Contactez l\'administrateur.'
        });
      }

      // Réactiver si EN_ATTENTE
      if (existingUser.statut === 'EN_ATTENTE') {
        await conn.query(
          `UPDATE utilisateurs SET statut = 'ACTIF' WHERE id = ?`,
          [existingUser.id]
        );
      }

      userId = existingUser.id;

    } else {
      // ── Nouvel utilisateur → créer automatiquement ──────────────
      isNew  = true;
      const { v4: uuidv4 } = require('uuid');
      userId = uuidv4();

      // Mot de passe vide hashé (pas de vrai auth pour l'instant)
      await conn.query(
        `INSERT INTO utilisateurs (id, email, mot_de_passe, role, statut)
         VALUES (?, ?, ?, 'ENTREPRENEUR', 'ACTIF')`,
        [userId, cleanEmail, '$2b$10$placeholder_no_password_set']
      );

      console.log(`[Login] Nouveau compte créé : ${cleanEmail} (${userId})`);
    }

    await conn.end();

    // Charger le profil complet
    const profile = await loadUserProfile(userId);

    res.json({
      success : true,
      is_new  : isNew,
      user    : profile,
      message : isNew
        ? `Bienvenue ! Votre compte a été créé automatiquement avec l'email ${cleanEmail}.`
        : `Connexion réussie.`
    });

  } catch (err) {
    console.error('[/api/chat/login] Erreur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/chat/transcribe
 * Reçoit un fichier audio (webm/ogg/wav/mp4) et retourne le texte transcrit
 * via Groq Whisper (whisper-large-v3-turbo)
 */
app.post('/api/chat/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier audio reçu.' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ success: false, error: 'GROQ_API_KEY manquante.' });
    }

    // Écrire le buffer dans un fichier temporaire
    // Groq Whisper accepte : mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
    const ext      = req.file.mimetype.includes('ogg')  ? '.ogg'
                   : req.file.mimetype.includes('webm') ? '.webm'
                   : req.file.mimetype.includes('wav')  ? '.wav'
                   : req.file.mimetype.includes('mp4')  ? '.mp4'
                   : '.webm';
    const tmpPath  = path.join(os.tmpdir(), `gaynaako-audio-${Date.now()}${ext}`);

    fs.writeFileSync(tmpPath, req.file.buffer);

    // Appel Groq Whisper
    const groq         = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const transcription = await groq.audio.transcriptions.create({
      file    : fs.createReadStream(tmpPath),
      model   : 'whisper-large-v3-turbo',
      language: 'fr',
      response_format: 'json',
    });

    // Nettoyer le fichier temporaire
    fs.unlinkSync(tmpPath);

    const text = transcription.text?.trim() || '';
    console.log(`[Whisper] Transcription : "${text}"`);

    res.json({ success: true, text });

  } catch (err) {
    console.error('[/api/chat/transcribe] Erreur:', err.message);
    res.status(500).json({
      success: false,
      error  : 'Erreur lors de la transcription.',
      detail : err.message,
    });
  }
});

/**
 * GET /api/chat/users/test
 * Liste les utilisateurs de test disponibles (pour l'interface de test)
 */
app.get('/api/chat/users/test', async (req, res) => {
  try {
    const mysql = require('mysql2/promise');
    const conn  = await mysql.createConnection({
      host    : process.env.DB_HOST     || 'localhost',
      port    : parseInt(process.env.DB_PORT) || 3306,
      user    : process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'gaynaako_opportunities',
    });

    const [rows] = await conn.query(`
      SELECT
        u.id, u.email, u.role,
        CASE u.role
          WHEN 'ENTREPRENEUR'   THEN ep.domaine_expertise
          WHEN 'PME'            THEN pp.nom_entreprise
          WHEN 'ONG'            THEN op.nom_organisation
          WHEN 'ADMINISTRATEUR' THEN ap.niveau_acces
        END AS description,
        COALESCE(p.nom, '') AS pays
      FROM utilisateurs u
      LEFT JOIN entrepreneur_profiles   ep ON ep.utilisateur_id = u.id
      LEFT JOIN pme_profiles            pp ON pp.utilisateur_id = u.id
      LEFT JOIN ong_profiles            op ON op.utilisateur_id = u.id
      LEFT JOIN administrateur_profiles ap ON ap.utilisateur_id = u.id
      LEFT JOIN pays p ON p.id = ep.pays_id
      WHERE u.statut = 'ACTIF'
      ORDER BY u.role
    `);

    await conn.end();
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/chat/users/:userId/profile
 * Retourne le profil complet d'un utilisateur
 */
app.get('/api/chat/users/:userId/profile', async (req, res) => {
  try {
    const profile = await loadUserProfile(req.params.userId);
    if (!profile) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error  : 'Route non trouvée',
    routes : [
      'POST /api/chat',
      'POST /api/chat/session',
      'GET  /api/chat/session/:id/history',
      'GET  /api/chat/sessions/:user_id',
      'GET  /api/chat/health',
      'GET  /api/chat/examples',
    ],
  });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🤖 GAYNAAKO CHATBOT IA                ║');
  console.log('║   Propulsé par Groq + Llama 3.3 70B     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 URL : http://localhost:${PORT}`);
  console.log(`\n📋 Endpoints disponibles :`);
  console.log(`   POST http://localhost:${PORT}/api/chat`);
  console.log(`   POST http://localhost:${PORT}/api/chat/session`);
  console.log(`   GET  http://localhost:${PORT}/api/chat/health`);
  console.log(`   GET  http://localhost:${PORT}/api/chat/examples`);
  console.log(`\n🔑 GROQ_API_KEY : ${process.env.GROQ_API_KEY ? '✅ configurée' : '❌ MANQUANTE — ajoutez dans .env'}`);
  if (!process.env.GROQ_API_KEY) {
    console.log(`   → Clé gratuite sur : https://console.groq.com\n`);
  }
  console.log('\n✅ Chatbot prêt.\n');
});

module.exports = app;
