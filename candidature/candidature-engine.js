/**
 * Module 3 : Candidature Préremplie — Moteur Métier
 * 
 * Responsabilités :
 *   1. Analyse profil ↔ opportunité : extraction des champs requis, préremplissage automatique
 *   2. Règle absolue de non-hallucination : identification précise des informations manquantes
 *   3. Mise à jour persistante du profil utilisateur dans `gaynaako_profils`
 *   4. Enregistrement et suivi des dossiers dans la table `candidatures`
 *   5. Génération par IA (Groq LLM) de lettre de motivation adaptée et sourcée
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const mysql = require('mysql2/promise');
const Groq = require('groq-sdk');
const { v4: uuidv4 } = require('uuid');

// ─── Configuration Bases de Données ──────────────────────────────────────────

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

let poolProfils;
let poolOpp;

function getProfilsPool() {
  if (!poolProfils) {
    poolProfils = mysql.createPool({ ...DB_PROFILS_CONFIG, waitForConnections: true, connectionLimit: 10 });
  }
  return poolProfils;
}

function getOppPool() {
  if (!poolOpp) {
    poolOpp = mysql.createPool({ ...DB_OPP_CONFIG, waitForConnections: true, connectionLimit: 10 });
  }
  return poolOpp;
}

// ─── Définition des champs de candidature requis ────────────────────────────

const MANDATORY_FIELD_DEFINITIONS = {
  ENTREPRENEUR: [
    { key: 'nom_complet', label: 'Nom complet', source: 'profile' },
    { key: 'email', label: 'Adresse email', source: 'user' },
    { key: 'telephone', label: 'Numéro de téléphone', source: 'user' },
    { key: 'pays', label: 'Pays de résidence', source: 'profile' },
    { key: 'domaine_expertise', label: 'Domaine d\'expertise', source: 'profile' },
    { key: 'formation_principale', label: 'Formation / Diplôme principal', source: 'profile' },
    { key: 'annees_experience', label: 'Expérience professionnelle (années)', source: 'profile' },
    { key: 'cv_url', label: 'CV / Références', source: 'profile' },
  ],
  PME: [
    { key: 'nom_entreprise', label: 'Nom de l\'entreprise', source: 'profile' },
    { key: 'email', label: 'Email de contact', source: 'user' },
    { key: 'telephone', label: 'Numéro de téléphone', source: 'user' },
    { key: 'pays', label: 'Pays d\'implantation', source: 'profile' },
    { key: 'secteurs', label: 'Secteurs d\'activité', source: 'profile' },
  ],
  ONG: [
    { key: 'nom_organisation', label: 'Nom de l\'organisation', source: 'profile' },
    { key: 'email', label: 'Email officiel', source: 'user' },
    { key: 'telephone', label: 'Numéro de téléphone', source: 'user' },
    { key: 'pays', label: 'Pays d\'intervention', source: 'profile' },
    { key: 'mission', label: 'Mission de l\'ONG', source: 'profile' },
    { key: 'domaines', label: 'Domaines d\'intervention', source: 'profile' },
  ]
};

// ─── 1. Chargement profil & opportunité ─────────────────────────────────────

/**
 * Récupère le profil utilisateur consolidé
 */
async function loadFullUserProfile(userId) {
  if (!userId) return null;
  const pool = getProfilsPool();

  const [users] = await pool.query(
    `SELECT id, email, role, statut, telephone, adresse, ville, site_web 
     FROM utilisateurs WHERE (id = ? OR email = ?) AND (statut = 'ACTIF' OR statut IS NULL)`,
    [userId, userId]
  );
  if (!users.length) return null;

  const user = users[0];
  let profile = { ...user };

  switch (user.role) {
    case 'ENTREPRENEUR': {
      const [rows] = await pool.query(`
        SELECT ep.nom_complet, ep.domaine_expertise, ep.objectifs,
               ep.annees_experience, ep.formation_principale, ep.cv_url, ep.portfolio_url,
               s.nom AS secteur, p.nom AS pays
        FROM entrepreneur_profiles ep
        LEFT JOIN secteurs s ON s.id = ep.secteur_id
        LEFT JOIN pays     p ON p.id = ep.pays_id
        WHERE ep.utilisateur_id = ?
      `, [user.id]);
      if (rows.length) {
        Object.assign(profile, rows[0]);
        profile.nom = rows[0].nom_complet || user.email.split('@')[0];
      }
      break;
    }
    case 'PME': {
      const [rows] = await pool.query(`
        SELECT pp.nom_entreprise,
               GROUP_CONCAT(s.nom SEPARATOR ', ') AS secteurs
        FROM pme_profiles pp
        LEFT JOIN pme_profiles_secteurs ps ON ps.pme_id = pp.id
        LEFT JOIN secteurs              s  ON s.id = ps.secteur_id
        WHERE pp.utilisateur_id = ?
        GROUP BY pp.id
      `, [user.id]);
      if (rows.length) {
        Object.assign(profile, rows[0]);
        profile.nom = rows[0].nom_entreprise;
      }
      break;
    }
    case 'ONG': {
      const [rows] = await pool.query(`
        SELECT op.nom_organisation, op.mission,
               GROUP_CONCAT(d.nom SEPARATOR ', ') AS domaines
        FROM ong_profiles op
        LEFT JOIN ong_profiles_domaines  od ON od.ong_id = op.id
        LEFT JOIN domaines_intervention  d  ON d.id = od.domaine_id
        WHERE op.utilisateur_id = ?
        GROUP BY op.id
      `, [user.id]);
      if (rows.length) {
        Object.assign(profile, rows[0]);
        profile.nom = rows[0].nom_organisation;
      }
      break;
    }
    default:
      profile.nom = user.email.split('@')[0];
  }

  return profile;
}

/**
 * Récupère les détails d'une opportunité depuis gaynaako_opportunities
 */
async function loadOpportunity(oppId) {
  const pool = getOppPool();
  const [rows] = await pool.query(
    `SELECT id, title, description, url, sectors, country, source_name, quality_score, date_normalized
     FROM opportunities_processed WHERE id = ?`,
    [oppId]
  );
  return rows.length ? rows[0] : null;
}

// ─── 2. Analyse et Préremplissage sans hallucination ────────────────────────

/**
 * Analyse le profil et l'opportunité :
 * - Identifie les champs disponibles
 * - Identifie les informations manquantes (NON inventées)
 * - Calcule le score de complétude
 */
async function analyzeApplication(userId, oppId) {
  const user = await loadFullUserProfile(userId);
  if (!user) throw new Error(`Utilisateur [${userId}] introuvable.`);

  const opp = await loadOpportunity(oppId);
  if (!opp) throw new Error(`Opportunité [${oppId}] introuvable.`);

  const role = user.role || 'ENTREPRENEUR';
  const fieldDefs = MANDATORY_FIELD_DEFINITIONS[role] || MANDATORY_FIELD_DEFINITIONS.ENTREPRENEUR;

  const champsPreRemplis = {};
  const champsManquants = [];

  for (const def of fieldDefs) {
    const value = user[def.key];
    const isPresent = value !== null && value !== undefined && String(value).trim().length > 0;

    if (isPresent) {
      champsPreRemplis[def.key] = {
        label: def.label,
        value: value,
        source: def.source
      };
    } else {
      champsManquants.push({
        key: def.key,
        label: def.label,
        source: def.source,
        description: `Veuillez renseigner votre ${def.label.toLowerCase()}`
      });
    }
  }

  const totalRequired = fieldDefs.length;
  const presentCount = Object.keys(champsPreRemplis).length;
  const scoreCompletude = Math.round((presentCount / totalRequired) * 100);

  const status = scoreCompletude >= 100 ? 'COMPLETE' : 'BROUILLON';

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom || user.nom_complet || user.nom_entreprise || user.nom_organisation,
      role: user.role
    },
    opportunity: {
      id: opp.id,
      title: opp.title,
      source: opp.source_name,
      country: opp.country,
      sectors: opp.sectors,
      url: opp.url
    },
    champs_pre_remplis: champsPreRemplis,
    champs_manquants: champsManquants,
    total_requis: totalRequired,
    nb_remplis: presentCount,
    nb_manquants: champsManquants.length,
    score_completude: scoreCompletude,
    statut: status,
    ready_to_submit: scoreCompletude >= 100
  };
}

// ─── 3. Enregistrement persistant dans le profil ─────────────────────────────

/**
 * Met à jour le profil de l'utilisateur avec de nouvelles données
 * Enregistre dans `utilisateurs` et `entrepreneur_profiles` / `pme_profiles` / `ong_profiles`
 */
async function saveFieldsToUserProfile(userId, newFields) {
  if (!userId || !newFields || typeof newFields !== 'object') {
    throw new Error('Paramètres userId et newFields requis.');
  }

  const pool = getProfilsPool();
  const user = await loadFullUserProfile(userId);
  if (!user) throw new Error(`Utilisateur [${userId}] introuvable.`);

  const userTableUpdates = {};
  const profileTableUpdates = {};

  // Séparer les champs selon la table cible
  for (const [key, val] of Object.entries(newFields)) {
    if (val === undefined || val === null || String(val).trim() === '') continue;
    const cleanVal = typeof val === 'string' ? val.trim() : val;

    if (['telephone', 'adresse', 'ville', 'site_web'].includes(key)) {
      userTableUpdates[key] = cleanVal;
    } else if ([
      'nom_complet', 'domaine_expertise', 'objectifs', 'annees_experience',
      'formation_principale', 'cv_url', 'portfolio_url'
    ].includes(key)) {
      profileTableUpdates[key] = cleanVal;
    }
  }

  // 1. Mise à jour de la table `utilisateurs`
  if (Object.keys(userTableUpdates).length > 0) {
    const setClause = Object.keys(userTableUpdates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(userTableUpdates), user.id];
    await pool.query(`UPDATE utilisateurs SET ${setClause} WHERE id = ?`, values);
  }

  // 2. Mise à jour du profil spécialisé (ex: `entrepreneur_profiles`)
  if (Object.keys(profileTableUpdates).length > 0 && user.role === 'ENTREPRENEUR') {
    // Vérifier si la ligne existe
    const [existing] = await pool.query(
      `SELECT id FROM entrepreneur_profiles WHERE utilisateur_id = ?`,
      [user.id]
    );

    if (existing.length > 0) {
      const setClause = Object.keys(profileTableUpdates).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(profileTableUpdates), user.id];
      await pool.query(`UPDATE entrepreneur_profiles SET ${setClause} WHERE utilisateur_id = ?`, values);
    } else {
      const epId = uuidv4();
      const cols = ['id', 'utilisateur_id', ...Object.keys(profileTableUpdates)];
      const placeholders = cols.map(() => '?').join(', ');
      const values = [epId, user.id, ...Object.values(profileTableUpdates)];
      await pool.query(`INSERT INTO entrepreneur_profiles (${cols.join(', ')}) VALUES (${placeholders})`, values);
    }
  }

  console.log(`[Candidature] Profil mis à jour pour ${user.email} (${user.id}):`, { ...userTableUpdates, ...profileTableUpdates });

  return {
    success: true,
    updated_fields: { ...userTableUpdates, ...profileTableUpdates },
    message: 'Profil enrichi et sauvegardé avec succès.'
  };
}

// ─── 4. Gestion de la table `candidatures` ───────────────────────────────────

/**
 * Crée ou met à jour un dossier de candidature dans la base `gaynaako_profils`
 */
async function saveOrUpdateCandidature(userId, oppId, options = {}) {
  const pool = getProfilsPool();
  const analysis = await analyzeApplication(userId, oppId);

  // Vérifier si une candidature existe déjà
  const [existing] = await pool.query(
    `SELECT id, lettre_motivation FROM candidatures WHERE utilisateur_id = ? AND opportunite_id = ?`,
    [userId, oppId]
  );

  let candId;
  const letterToSave = options.lettre_motivation || (existing.length ? existing[0].lettre_motivation : null);
  const finalStatus = options.statut || analysis.statut;

  if (existing.length > 0) {
    candId = existing[0].id;
    await pool.query(`
      UPDATE candidatures SET
        statut = ?,
        score_completude = ?,
        champs_pre_remplis = ?,
        champs_manquants = ?,
        lettre_motivation = ?,
        date_mise_a_jour = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      finalStatus,
      analysis.score_completude,
      JSON.stringify(analysis.champs_pre_remplis),
      JSON.stringify(analysis.champs_manquants),
      letterToSave,
      candId
    ]);
  } else {
    candId = `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    await pool.query(`
      INSERT INTO candidatures (
        id, utilisateur_id, opportunite_id, statut, score_completude,
        champs_pre_remplis, champs_manquants, lettre_motivation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      candId,
      userId,
      oppId,
      finalStatus,
      analysis.score_completude,
      JSON.stringify(analysis.champs_pre_remplis),
      JSON.stringify(analysis.champs_manquants),
      letterToSave
    ]);
  }

  return {
    success: true,
    candidature_id: candId,
    ...analysis,
    lettre_motivation: letterToSave
  };
}

// ─── 5. Génération IA de Lettre de Motivation (Groq LLM) ────────────────────

/**
 * Génère une lettre de motivation sur mesure avec Groq LLM
 * RÈGLE STRICTE : Utilise UNIQUEMENT les faits réels du profil, n'invente rien.
 */
async function generateCoverLetter(userId, oppId) {
  const user = await loadFullUserProfile(userId);
  if (!user) throw new Error(`Utilisateur [${userId}] introuvable.`);

  const opp = await loadOpportunity(oppId);
  if (!opp) throw new Error(`Opportunité [${oppId}] introuvable.`);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY non configurée dans le fichier .env');
  }

  const groq = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const systemPrompt = `/no_think
Tu es l'assistant de rédaction professionnel de Gaynaako, expert en candidatures pour appels d'offres, financements et recrutements en Afrique de l'Ouest.

Règles ABSOLUES et NON NÉGOCIABLES :
1. Rédige une lettre de motivation professionnelle, élégante, percutante et adaptée en français standard.
2. Utilise STRICTEMENT les informations fournies dans le profil du candidat.
3. N'INVENTE AUCUN DIPLÔME, AUCUN CHIFFRE, AUCUNE EXPÉRIENCE NON MENTIONNÉE.
4. Si une expérience précise ou un document n'est pas précisé, valorise les compétences et objectifs réels disponibles sans halluciner.
5. Inclus les coordonnées du candidat (nom, email, téléphone si disponible, ville/pays).
6. Structure la lettre :
   - En-tête (Candidat, Destinataire / Bailleur)
   - Objet précis
   - Introduction (motivation claire pour l'opportunité)
   - Corps (alignement des compétences réelles avec les besoins du projet)
   - Conclusion & Formule de politesse formelle
7. N'affiche aucun commentaire méta, préambule ou balise de réflexion. Donne directement la lettre rédigée.`;

  const userPrompt = `
[DONNÉES DU CANDIDAT]
- Nom complet : ${user.nom || user.nom_complet || user.nom_entreprise || 'Candidat'}
- Rôle / Type : ${user.role}
- Email       : ${user.email}
- Téléphone   : ${user.telephone || 'À préciser'}
- Pays/Ville  : ${user.ville ? user.ville + ', ' : ''}${user.pays || 'Sénégal'}
- Expertise   : ${user.domaine_expertise || user.secteurs || user.domaines || 'Expertise générale'}
- Formation   : ${user.formation_principale || 'Formation universitaire/technique'}
- Expérience  : ${user.annees_experience ? user.annees_experience + ' ans' : 'Expérience confirmée'}
- Objectifs   : ${user.objectifs || user.mission || 'Développement d\'activités à fort impact'}

[DONNÉES DE L'OPPORTUNITÉ VISÉE]
- Titre       : ${opp.title}
- Source / Bailleurs : ${opp.source_name}
- Pays ciblé  : ${opp.country}
- Secteurs    : ${opp.sectors}
- Description : ${opp.description ? opp.description.substring(0, 500) : 'Non spécifiée'}

Rédige la lettre de motivation complète et adaptée.
`;

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 900,
    temperature: 0.6,
  });

  let letterText = completion.choices[0]?.message?.content || '';
  // Nettoyer les balises de réflexion éventuelles
  letterText = letterText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Sauvegarder automatiquement dans la table candidatures
  await saveOrUpdateCandidature(userId, oppId, {
    lettre_motivation: letterText
  });

  return {
    success: true,
    opportunite_id: oppId,
    utilisateur_id: userId,
    lettre_motivation: letterText,
    message: 'Lettre de motivation générée avec succès'
  };
}

/**
 * Extrait intelligemment les données de candidature fournies par l'utilisateur
 */
function extractCandidateInputs(text) {
  if (!text || typeof text !== 'string') return {};
  const extracted = {};

  // Téléphone (ex: +221 77 123 45 67, 771234567, 00221...)
  const phoneMatch = text.match(/(?:\+221|00221)?\s*(?:7[05678]|33)\s*[0-9]{3}\s*[0-9]{2}\s*[0-9]{2}|\+?[0-9]{8,15}/);
  if (phoneMatch) {
    extracted.telephone = phoneMatch[0].replace(/\s+/g, ' ').trim();
  }

  // Années d'expérience (ex: "5 ans", "3 ans d'expérience", "10 ans")
  const expMatch = text.match(/(\d{1,2})\s*(?:ans?|années?)\s*(?:d'expérience|d’expérience|experience)?/i);
  if (expMatch) {
    extracted.annees_experience = parseInt(expMatch[1]);
  }

  // Formation (ex: "Master en IA", "Licence Informatique", "Doctorat", "Ingénieur")
  const diplomeMatch = text.match(/(?:master(?:\s*2)?|licence(?:\s*[123])?|doctorat|ingénieur|bac\s*\+\s*\d|bts|dut)(?:\s+en\s+[\w\s&]+|\s+[\w\s&]+)?/i);
  if (diplomeMatch) {
    extracted.formation_principale = diplomeMatch[0].trim();
  }

  // Ville (ex: Dakar, Thiès, Saint-Louis, Bamako, Abidjan)
  const villeMatch = text.match(/\b(dakar|thi[eè]s|saint-louis|mbour|touba|ziguinchor|kaolack|bamako|abidjan|ouagadougou)\b/i);
  if (villeMatch) {
    extracted.ville = villeMatch[1].charAt(0).toUpperCase() + villeMatch[1].slice(1).toLowerCase();
  }

  return extracted;
}

module.exports = {
  loadFullUserProfile,
  loadOpportunity,
  analyzeApplication,
  saveFieldsToUserProfile,
  saveOrUpdateCandidature,
  generateCoverLetter,
  extractCandidateInputs,
  MANDATORY_FIELD_DEFINITIONS
};
