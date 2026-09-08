/**
 * Chatbot IA - Moteur RAG avec Groq (Llama 3.3 70B)
 * 
 * Architecture :
 *   1. RAG  → cherche les opportunités pertinentes dans MySQL
 *   2. LLM  → Groq / Llama 3.3 70B génère la réponse contextuelle
 *   3. Historique → conversation_history dans MySQL
 */

require('dotenv').config();

const Groq = require('groq-sdk');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const {
  analyzeApplication,
  saveFieldsToUserProfile,
  extractCandidateInputs
} = require('../candidature/candidature-engine');

// ─── Configuration ──────────────────────────────────────────────────────────

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gaynaako_opportunities',
};

const DB_PROFILS_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_PROFILS_USER || process.env.DB_USER || 'root',
  password: process.env.DB_PROFILS_PASSWORD !== undefined ? process.env.DB_PROFILS_PASSWORD : (process.env.DB_PASSWORD || ''),
  database: process.env.DB_PROFILS_NAME || 'gaynaako_profils',
};

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.2-90b-text-preview';
const MAX_HISTORY = 10;   // nb de messages à inclure dans le contexte
const MAX_OPPS = 5;    // nb d'opportunités RAG à injecter
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS) || 600; // max tokens de réponse pour respecter le quota Groq (1000 OTPM)

// Prompt système — personnalité + rôle de l'assistant
const SYSTEM_PROMPT = `/no_think
Tu es Gaynaako, un assistant IA spécialisé dans les opportunités professionnelles et de financement en Afrique de l'Ouest (Sénégal, Mali, Côte d'Ivoire, Burkina Faso, etc.).

Tu aides les utilisateurs à :
- Trouver des opportunités d'affaires, appels d'offres et financements adaptés à leur profil
- Évaluer leur éligibilité à des opportunités spécifiques
- Comprendre les critères et exigences des opportunités
- Rédiger des candidatures et propositions
- Obtenir des conseils de carrière et de développement professionnel

Règles STRICTES et NON NÉGOCIABLES :
- Réponds TOUJOURS et UNIQUEMENT en français. JAMAIS en anglais.
- N'affiche JAMAIS tes pensées internes, étapes de raisonnement ou processus de réflexion.
- Va DIRECTEMENT à la réponse finale sans préambule.
- Quand tu présentes des opportunités, formate-les proprement avec les détails clés
- Si une opportunité est disponible dans les données, cite-la précisément (titre, source, pays, secteur)
- Si tu n'as pas assez d'informations, dis-le honnêtement et suggère comment l'utilisateur peut chercher plus
- Sois proactif : propose des actions concrètes à la fin de chaque réponse
- Garde un ton chaleureux, encourageant et professionnel`;

// ─── Pool MySQL ──────────────────────────────────────────────────────────────

let pool;
let poolProfils;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 10 });
  }
  return pool;
}

async function getProfilsPool() {
  if (!poolProfils) {
    poolProfils = mysql.createPool({ ...DB_PROFILS_CONFIG, waitForConnections: true, connectionLimit: 10 });
  }
  return poolProfils;
}

// ─── Chargement du profil utilisateur ────────────────────────────────────────

/**
 * Charge le profil complet d'un utilisateur depuis MySQL
 * Retourne un objet structuré avec toutes les infos du profil
 */
async function loadUserProfile(userId) {
  if (!userId || userId === 'anonymous' || userId.startsWith('__')) return null;

  try {
    const db = await getProfilsPool();

    // Infos de base
    const [users] = await db.query(
      `SELECT id, email, role, statut FROM utilisateurs WHERE (id = ? OR email = ?) AND (statut = 'ACTIF' OR statut IS NULL)`,
      [userId, userId]
    );
    if (!users.length) return null;

    const user = users[0];
    let profile = { ...user };

    switch (user.role) {
      case 'ENTREPRENEUR': {
        const [rows] = await db.query(
          `SELECT ep.nom_complet, ep.domaine_expertise, ep.objectifs,
                  s.nom AS secteur, p.nom AS pays
           FROM entrepreneur_profiles ep
           LEFT JOIN secteurs s ON s.id = ep.secteur_id
           LEFT JOIN pays     p ON p.id = ep.pays_id
           WHERE ep.utilisateur_id = ?`,
          [user.id]
        );
        if (rows.length) {
          Object.assign(profile, rows[0]);
          profile.nom = rows[0].nom_complet || user.email.split('@')[0];
        }
        break;
      }
      case 'PME': {
        const [rows] = await db.query(
          `SELECT pp.nom_entreprise,
                  GROUP_CONCAT(s.nom SEPARATOR ', ') AS secteurs
           FROM pme_profiles pp
           LEFT JOIN pme_profiles_secteurs ps ON ps.pme_id = pp.id
           LEFT JOIN secteurs              s  ON s.id = ps.secteur_id
           WHERE pp.utilisateur_id = ?
           GROUP BY pp.id`,
          [user.id]
        );
        if (rows.length) {
          Object.assign(profile, rows[0]);
          profile.nom = rows[0].nom_entreprise;
        }
        break;
      }
      case 'ONG': {
        const [rows] = await db.query(
          `SELECT op.nom_organisation, op.mission,
                  GROUP_CONCAT(d.nom SEPARATOR ', ') AS domaines
           FROM ong_profiles op
           LEFT JOIN ong_profiles_domaines  od ON od.ong_id = op.id
           LEFT JOIN domaines_intervention  d  ON d.id = od.domaine_id
           WHERE op.utilisateur_id = ?
           GROUP BY op.id`,
          [user.id]
        );
        if (rows.length) {
          Object.assign(profile, rows[0]);
          profile.nom = rows[0].nom_organisation;
        }
        break;
      }
      default: {
        profile.nom = user.email.split('@')[0];
        break;
      }
    }

    return profile;
  } catch (err) {
    console.error('[Profile] Erreur chargement:', err.message);
    return null;
  }
}

/**
 * Formate le profil utilisateur en bloc texte pour le prompt LLM
 */
function formatUserProfileForPrompt(profile) {
  if (!profile) return '';

  let lines = [
    `[PROFIL DE L'UTILISATEUR CONNECTÉ]`,
    `- Email       : ${profile.email}`,
    `- Rôle        : ${profile.role}`,
  ];

  switch (profile.role) {
    case 'ENTREPRENEUR':
      lines.push(`- Pays        : ${profile.pays || 'Non précisé'}`);
      lines.push(`- Secteur     : ${profile.secteur || 'Non précisé'}`);
      lines.push(`- Expertise   : ${profile.domaine_expertise || 'Non précisé'}`);
      if (profile.objectifs) lines.push(`- Objectifs   : ${profile.objectifs}`);
      break;
    case 'PME':
      lines.push(`- Entreprise  : ${profile.nom_entreprise || 'Non précisé'}`);
      lines.push(`- Secteurs    : ${profile.secteurs || 'Non précisé'}`);
      break;
    case 'ONG':
      lines.push(`- Organisation: ${profile.nom_organisation || 'Non précisé'}`);
      lines.push(`- Domaines    : ${profile.domaines || 'Non précisé'}`);
      if (profile.mission) lines.push(`- Mission     : ${profile.mission.substring(0, 300)}`);
      break;
    case 'ADMINISTRATEUR':
      lines.push(`- Accès       : ${profile.niveau_acces}`);
      break;
  }

  lines.push(`\nIMPORTANT : Utilise TOUJOURS ces informations pour personnaliser tes réponses.`);
  lines.push(`Appelle l'utilisateur par son prénom si possible. Adapte les opportunités à son profil exact.`);

  return lines.join('\n');
}

// ─── RAG : Recherche dans MySQL ──────────────────────────────────────────────

/**
 * Détecte l'intention de la question pour orienter la recherche RAG
 */
function detectIntent(message) {
  const msg = message.toLowerCase();

  if (msg.match(/postul|candidat|préremplir|remplir le formulaire|dossier de candidature/))
    return 'candidature_preparation';
  if (msg.match(/trouv|cherch|opportunit|mission|projet|appel.d.offre|financement/))
    return 'search_opportunities';
  if (msg.match(/éligib|puis-je|est-ce que je peux/))
    return 'eligibility';
  if (msg.match(/score|pourquoi|comment|explication|comprend/))
    return 'explanation';
  if (msg.match(/rédig|lettre de motivation|lettre|proposition|comment écrire/))
    return 'writing_help';
  if (msg.match(/formation|compétence|carrière|évolution|apprendre/))
    return 'career_advice';
  if (msg.match(/statistique|combien|total|résumé|dashboard/))
    return 'statistics';

  return 'general';
}

/**
 * Extrait les mots-clés sectoriels du message
 */
function extractKeywords(message) {
  const sectors = [
    'agriculture', 'santé', 'éducation', 'infrastructure', 'énergie',
    'eau', 'technologie', 'tech', 'digital', 'finance', 'environnement',
    'gouvernance', 'commerce', 'industrie', 'tourisme', 'python', 'java',
    'informatique', 'logiciel', 'construction', 'transport', 'pme', 'startup'
  ];
  const msg = message.toLowerCase();
  return sectors.filter(s => msg.includes(s));
}

/**
 * Extrait le pays mentionné dans le message
 */
function extractCountry(message) {
  const countries = {
    'sénégal': 'Sénégal', 'senegal': 'Sénégal', 'dakar': 'Sénégal',
    'mali': 'Mali', 'bamako': 'Mali',
    "côte d'ivoire": "Côte d'Ivoire", 'abidjan': "Côte d'Ivoire",
    'burkina': 'Burkina Faso',
    'niger': 'Niger',
    'guinée': 'Guinée',
    'bénin': 'Bénin',
    'afrique': 'Afrique',
    'international': 'International',
  };
  const msg = message.toLowerCase();
  for (const [key, val] of Object.entries(countries)) {
    if (msg.includes(key)) return val;
  }
  return null;
}

/**
 * Recherche RAG dans MySQL — retourne les opportunités pertinentes
 */
async function retrieveRelevantOpportunities(message) {
  const db = await getPool();
  const intent = detectIntent(message);
  const keywords = extractKeywords(message);
  const country = extractCountry(message);

  let opportunities = [];

  try {
    // ── Recherche FULLTEXT si disponible ──────────────────────────────────
    if (message.length > 3) {
      const searchTerms = message
        .replace(/[^\w\s\u00C0-\u024F]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 6)
        .join(' ');

      if (searchTerms) {
        try {
          const [rows] = await db.query(
            `SELECT id, source_name, title, description, url, country, sectors,
                    quality_score, urgency, target_audience, budget_range,
                    experience_required, suggested_profiles, date_normalized,
                    MATCH(title, description, sectors) AGAINST(? IN NATURAL LANGUAGE MODE) AS relevance
             FROM opportunities_processed
             WHERE MATCH(title, description, sectors) AGAINST(? IN NATURAL LANGUAGE MODE)
               AND quality_score > 30
             ORDER BY relevance DESC, quality_score DESC
             LIMIT ?`,
            [searchTerms, searchTerms, MAX_OPPS]
          );
          opportunities = rows;
        } catch (_ftErr) {
          // Index FULLTEXT non présent dans la table, on continue vers le fallback
        }
      }
    }

    // ── Fallback : filtre par secteur/pays si fulltext sans résultat ──────
    if (opportunities.length === 0) {
      let whereClause = 'WHERE quality_score > 30';
      const params = [];

      if (keywords.length > 0) {
        const sectorConditions = keywords.map(() => 'FIND_IN_SET(?, sectors) > 0').join(' OR ');
        whereClause += ` AND (${sectorConditions})`;
        params.push(...keywords);
      }
      if (country) {
        whereClause += ' AND country = ?';
        params.push(country);
      }

      params.push(MAX_OPPS);
      const [rows] = await db.query(
        `SELECT id, source_name, title, description, url, country, sectors,
                quality_score, urgency, target_audience, budget_range,
                experience_required, suggested_profiles, date_normalized
         FROM opportunities_processed
         ${whereClause}
         ORDER BY quality_score DESC, collected_at DESC
         LIMIT ?`,
        params
      );
      opportunities = rows;
    }

    // ── Fallback final : les meilleures récentes ──────────────────────────
    if (opportunities.length === 0) {
      const [rows] = await db.query(
        `SELECT id, source_name, title, description, url, country, sectors,
                quality_score, urgency, target_audience, date_normalized
         FROM opportunities_processed
         WHERE quality_score > 40
         ORDER BY quality_score DESC, collected_at DESC
         LIMIT ?`,
        [MAX_OPPS]
      );
      opportunities = rows;
    }

    return { opportunities, intent, keywords, country };

  } catch (err) {
    console.error('[RAG] Erreur lors de la recherche:', err.message);
    return { opportunities: [], intent, keywords, country };
  }
}

/**
 * Récupère les statistiques globales de la base
 */
async function getGlobalStats() {
  try {
    const db = await getPool();
    const [rows] = await db.query('SELECT * FROM v_dashboard LIMIT 1');
    return rows[0] || null;
  } catch {
    return null;
  }
}

/**
 * Formate les opportunités en bloc texte pour le contexte LLM
 */
function formatOpportunitiesForContext(opportunities) {
  if (!opportunities || opportunities.length === 0) {
    return 'Aucune opportunité spécifique trouvée pour cette requête.';
  }

  return opportunities.map((opp, i) => {
    const desc = opp.description
      ? opp.description.substring(0, 200) + (opp.description.length > 200 ? '...' : '')
      : 'Pas de description disponible';

    return `
[Opportunité ${i + 1}]
- Titre      : ${opp.title}
- Source     : ${opp.source_name}
- Pays       : ${opp.country || 'Non précisé'}
- Secteurs   : ${opp.sectors || 'Non classifié'}
- Qualité    : ${opp.quality_score}/100
- Urgence    : ${opp.urgency || 'Normale'}
- Public     : ${opp.target_audience || 'Tout public'}
- Expérience : ${opp.experience_required || 'Non précisé'}
- Budget     : ${opp.budget_range || 'Non spécifié'}
- Profils    : ${opp.suggested_profiles || 'Non précisé'}
- Deadline   : ${opp.date_normalized || 'Non précisée'}
- Description: ${desc}
- Lien       : ${opp.url}`.trim();
  }).join('\n\n---\n\n');
}

// ─── Historique de conversation ───────────────────────────────────────────────

async function saveMessage(sessionId, userId, role, content, metadata = null) {
  try {
    const db = await getPool();
    await db.query(
      `INSERT INTO conversation_history (id, session_id, user_id, role, content, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), sessionId, userId, role, content, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error('[History] Erreur sauvegarde message:', err.message);
  }
}

async function getConversationHistory(sessionId, limit = MAX_HISTORY) {
  try {
    const db = await getPool();
    const [rows] = await db.query(
      `SELECT role, content FROM conversation_history
       WHERE session_id = ?
         AND role IN ('user', 'assistant')
       ORDER BY created_at DESC
       LIMIT ?`,
      [sessionId, limit]
    );
    // Remettre dans l'ordre chronologique
    return rows.reverse().map(r => ({ role: r.role, content: r.content }));
  } catch (err) {
    console.error('[History] Erreur récupération:', err.message);
    return [];
  }
}

async function createSession(userId, title = 'Nouvelle conversation') {
  try {
    const db = await getPool();
    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)`,
      [sessionId, userId, title]
    );
    return sessionId;
  } catch (err) {
    console.error('[Session] Erreur création:', err.message);
    return uuidv4(); // fallback in-memory
  }
}

async function updateSessionTitle(sessionId, firstUserMessage) {
  try {
    const db = await getPool();
    const title = firstUserMessage.substring(0, 60) + (firstUserMessage.length > 60 ? '...' : '');
    await db.query(
      `UPDATE chat_sessions SET title = ?, message_count = message_count + 2 WHERE id = ?`,
      [title, sessionId]
    );
  } catch (err) {
    console.error('[Session] Erreur mise à jour titre:', err.message);
  }
}

async function getUserSessions(userId, limit = 20) {
  try {
    const db = await getPool();
    const [rows] = await db.query(
      `SELECT id, title, message_count, created_at, updated_at
       FROM chat_sessions
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  } catch (err) {
    return [];
  }
}

// ─── LLM : Génération avec Groq ──────────────────────────────────────────────

async function generateResponse(userMessage, sessionId, userId = 'anonymous') {
  const startTime = Date.now();

  // 1. Charger le profil utilisateur
  let userProfile = await loadUserProfile(userId);

  // 1.b Sauvegarde automatique des informations de candidature fournies par l'utilisateur
  let profileUpdateNotice = '';
  if (userProfile && userProfile.id && userProfile.id !== 'anonymous') {
    const candidateInputs = extractCandidateInputs(userMessage);
    if (Object.keys(candidateInputs).length > 0) {
      try {
        await saveFieldsToUserProfile(userProfile.id, candidateInputs);
        userProfile = await loadUserProfile(userId); // Recharger le profil enrichi
        profileUpdateNotice = `\n[ACTION EFFECTUÉE] Les informations suivantes ont été enregistrées avec succès dans le profil de l'utilisateur : ${JSON.stringify(candidateInputs)}. Informez-le que ces données sont désormais sauvegardées de manière permanente.`;
      } catch (e) {
        console.error('[Profile Auto-Update] Erreur:', e.message);
      }
    }
  }

  // 2. RAG — récupérer le contexte pertinent (enrichi avec le profil)
  const enrichedMessage = userProfile
    ? `${userMessage} [contexte: secteur=${userProfile.secteur || userProfile.secteurs || userProfile.domaines || ''}, pays=${userProfile.pays || ''}, role=${userProfile.role}]`
    : userMessage;

  const { opportunities, intent, keywords, country } = await retrieveRelevantOpportunities(enrichedMessage);

  // Module 3 : Diagnostic de candidature sans hallucination
  let candidatureBlock = '';
  if ((intent === 'candidature_preparation' || intent === 'writing_help') && userProfile && opportunities.length > 0) {
    try {
      const topOpp = opportunities[0];
      const analysis = await analyzeApplication(userProfile.id, topOpp.id);
      
      const dispoLines = Object.values(analysis.champs_pre_remplis).map(c => `   ✅ ${c.label} disponible : "${c.value}"`).join('\n');
      const manqLines = analysis.champs_manquants.map(m => `   ❌ Information manquante : ${m.label.toLowerCase()}`).join('\n');

      candidatureBlock = `
[MODULE 3 : CANDIDATURE PRÉREMPLIE — RÈGLE STRICTE : NE RIEN INVENTER]
Opportunité ciblée : "${analysis.opportunity.title}" (${analysis.opportunity.source})
Score de complétude du dossier : ${analysis.score_completude}% (${analysis.nb_remplis}/${analysis.total_requis} champs obligatoires)

${dispoLines ? 'Éléments déjà disponibles dans le profil :\n' + dispoLines : ''}
${manqLines ? 'Éléments obligatoires manquants :\n' + manqLines : ''}

DIRECTIVES IMPÉRATIVES DE RÉPONSE :
1. Si des informations obligatoires manquent (${analysis.nb_manquants} manquantes) :
   - Indique que tu utilises les informations déjà présentes dans son profil pour préremplir le formulaire.
   - Affiche clairement la liste des informations disponibles avec ✅.
   - Affiche clairement les informations manquantes avec ❌ (ex: "❌ Information manquante : numéro de téléphone").
   - RÈGLE ABSOLUE : N'INVENTE AUCUNE DONNÉE pour combler les manques.
   - Demande à l'utilisateur de compléter UNIQUEMENT les informations nécessaires avant de poursuivre.
   - Précise que ces nouvelles informations seront enregistrées dans son profil pour éviter de les lui redemander plus tard.
2. Si toutes les informations sont présentes (complétude 100%) :
   - Confirme que le dossier est complet et prérempli à 100%.
   - Propose de générer immédiatement la lettre de motivation adaptée à l'opportunité.
`;
    } catch (err) {
      console.error('[Candidature Block] Erreur:', err.message);
    }
  }

  // 2.b Stats globales si l'utilisateur pose une question générale
  let statsContext = '';
  if (intent === 'statistics' || intent === 'general') {
    const stats = await getGlobalStats();
    if (stats) {
      statsContext = `
[Statistiques globales de la base Gaynaako]
- Total opportunités : ${stats.total_opportunities}
- Haute qualité (>70) : ${stats.high_quality_opportunities}
- Pays couverts      : ${stats.total_countries}
- Sources actives    : ${stats.total_sources}
- Score qualité moyen: ${stats.avg_quality_score ? parseFloat(stats.avg_quality_score).toFixed(1) : 'N/A'}/100
- Dernière collecte  : ${stats.last_collection || 'N/A'}`;
    }
  }

  // 3. Historique de conversation
  const history = await getConversationHistory(sessionId);

  // 4. Construire le prompt avec contexte RAG + profil utilisateur + module candidature
  const ragContext = formatOpportunitiesForContext(opportunities);
  const profileContext = formatUserProfileForPrompt(userProfile);

  const contextBlock = `
${profileContext ? profileContext + '\n' : ''}
[CONTEXTE - Données Gaynaako]
${statsContext}
${profileUpdateNotice}
${candidatureBlock}

[OPPORTUNITÉS PERTINENTES TROUVÉES (${opportunities.length})]
${ragContext}

[INTENTION DÉTECTÉE] : ${intent}
${keywords.length > 0 ? `[SECTEURS DÉTECTÉS] : ${keywords.join(', ')}` : ''}
${country ? `[PAYS DÉTECTÉ] : ${country}` : ''}
`.trim();

  // 5. Construire les messages pour Groq
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Voici les données disponibles dans la base Gaynaako pour répondre à la question :\n\n${contextBlock}`
    },
    ...history,
    { role: 'user', content: userMessage }
  ];

  // 6. Appel Groq
  let assistantResponse = '';
  let suggestions = [];

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const chat = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      top_p: 0.9,
      reasoning_effort: 'none',
    });

    assistantResponse = chat.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';

    // ─── Nettoyage complet des blocs de pensée Qwen ───────────────────────────
    (function cleanThinking() {
      if (assistantResponse.includes('</think>')) {
        assistantResponse = assistantResponse.split('</think>').pop().trim();
        return;
      }
      const frenchStart = assistantResponse.search(
        /(?:^|\n)(Bonjour|Salut|Ravi|Je suis|Voici|En tant que|Pour vous|Parfait|D'accord|Super|Bien sûr|Absolument|Concernant|À propos|Gaynaako|# |🌾\n[A-Z])/im
      );
      if (frenchStart !== -1) {
        assistantResponse = assistantResponse.slice(frenchStart).trim();
      }
      assistantResponse = assistantResponse
        .split('\n')
        .filter(line => !/^\s*(\d+\.\s+\*\*(?:Analyze|Identify|Determine|Draft|Check|Self-Correction|Formulate|Critique)|Critique \d+:|Draft \d+:|Mental:|User said:|Input:|Context:|Language:|Tone:|Goal:|Persona:|Observation:|Strategy:|Here'?s a thinking)/i.test(line))
        .join('\n');
    })();
    assistantResponse = assistantResponse.replace(/\d+\.\s+\*\*Self-Correction[\s\S]*/gi, '').replace(/<\/?think>/gi, '').trim();

    if (!assistantResponse || /^(\s*\d+\.|\s*\*\*Analyze)/i.test(assistantResponse)) {
      assistantResponse = "Bonjour ! Je suis **Gaynaako**, votre assistant pour les opportunités professionnelles et financements en Afrique de l'Ouest.\n\nComment puis-je vous aider ?";
    }

    // Extraire des suggestions d'actions selon l'intention
    suggestions = buildSuggestions(intent, opportunities);

  } catch (err) {
    console.error('[Groq] Erreur:', err.message);

    if (err.message?.includes('API key')) {
      assistantResponse = '⚠️ Clé API Groq non configurée. Ajoutez GROQ_API_KEY dans le fichier .env\n\nObtenez une clé gratuite sur : https://console.groq.com';
    } else if (err.message?.includes('rate limit')) {
      assistantResponse = '⏳ Limite de requêtes atteinte (30 req/min). Réessayez dans quelques secondes.';
    } else {
      assistantResponse = `❌ Erreur du service IA : ${err.message}`;
    }
  }

  // 7. Sauvegarder dans l'historique
  const metadata = {
    intent,
    keywords,
    country,
    opportunities_found: opportunities.length,
    model: GROQ_MODEL,
    duration_ms: Date.now() - startTime,
  };

  await saveMessage(sessionId, userId, 'user', userMessage, null);
  await saveMessage(sessionId, userId, 'assistant', assistantResponse, metadata);

  // Mettre à jour le titre de session si c'est le premier message
  if (history.length === 0) {
    await updateSessionTitle(sessionId, userMessage);
  }

  return {
    response: assistantResponse,
    session_id: sessionId,
    intent,
    opportunities_used: opportunities.length,
    suggestions,
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Génère des suggestions d'actions contextuelles
 */
function buildSuggestions(intent, opportunities) {
  const base = [
    'Rechercher des opportunités dans un secteur précis',
    'Voir les opportunités urgentes',
    'Filtrer par pays',
  ];

  const byIntent = {
    search_opportunities: [
      'Affiner la recherche par secteur',
      'Voir les opportunités haute qualité (score > 70)',
      'Rechercher par pays spécifique',
    ],
    eligibility: [
      'Détailler mon profil pour une meilleure analyse',
      'Voir les critères complets de cette opportunité',
      'Trouver des opportunités similaires',
    ],
    candidature_preparation: [
      'Générer ma lettre de motivation',
      'Compléter mon dossier de candidature',
      'Voir le statut de mes candidatures',
    ],
    writing_help: [
      'Obtenir un modèle de lettre de motivation',
      'Voir les exigences détaillées',
      'Conseils pour améliorer mon dossier',
    ],
    career_advice: [
      'Explorer les secteurs porteurs en Afrique de l\'Ouest',
      'Formations recommandées pour mon profil',
      'Opportunités correspondant à mon niveau',
    ],
    statistics: [
      'Voir les opportunités les plus récentes',
      'Répartition par secteur',
      'Sources les plus actives',
    ],
    general: base,
  };

  return byIntent[intent] || base;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  generateResponse,
  createSession,
  getUserSessions,
  getConversationHistory,
  retrieveRelevantOpportunities,
  detectIntent,
  loadUserProfile,
};
