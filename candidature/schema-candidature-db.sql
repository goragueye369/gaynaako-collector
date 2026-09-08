-- ============================================================================
-- SCHÉMA BASE DE DONNÉES : MODULE CANDIDATURE PRÉREMPLIE
-- Base: gaynaako_profils
-- Date: 2026-09-08
-- ============================================================================

USE gaynaako_profils;

-- ============================================================================
-- TABLE : candidatures
-- Stocke les dossiers de candidature avec préremplissage intelligent
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidatures (
  -- Identifiants
  id VARCHAR(255) PRIMARY KEY COMMENT 'ID unique du dossier (ex: cand_usr-ent-001_01898e2c2502)',
  utilisateur_id VARCHAR(255) NOT NULL COMMENT 'ID de l''utilisateur (FK vers utilisateurs.id)',
  opportunite_id VARCHAR(255) NOT NULL COMMENT 'ID de l''opportunité (depuis gaynaako_opportunities)',
  
  -- Statut et scoring
  statut ENUM('BROUILLON', 'COMPLETE', 'SOUMISE') DEFAULT 'BROUILLON' COMMENT 'État du dossier',
  score_completude INT DEFAULT 0 COMMENT 'Score de complétude 0-100%',
  
  -- Données structurées JSON
  champs_pre_remplis JSON COMMENT 'Champs automatiquement remplis depuis le profil',
  champs_manquants JSON COMMENT 'Liste des informations manquantes identifiées',
  
  -- Lettre de motivation générée par IA
  lettre_motivation LONGTEXT COMMENT 'Lettre de motivation générée par Groq LLM',
  
  -- Métadonnées
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de création du dossier',
  date_mise_a_jour TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Dernière modification',
  date_soumission TIMESTAMP NULL COMMENT 'Date de soumission effective',
  
  -- Contraintes et index
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_user (utilisateur_id),
  INDEX idx_opportunite (opportunite_id),
  INDEX idx_statut (statut),
  INDEX idx_score (score_completude),
  UNIQUE KEY unique_user_opp (utilisateur_id, opportunite_id) COMMENT 'Une seule candidature par couple user/opp'
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Dossiers de candidature préremplis avec détection des informations manquantes';

-- ============================================================================
-- EXEMPLES DE DONNÉES
-- ============================================================================

-- Exemple 1 : Dossier complet (score 100%)
INSERT INTO candidatures (
  id, utilisateur_id, opportunite_id, statut, score_completude,
  champs_pre_remplis, champs_manquants
) VALUES (
  'cand_usr-ent-001_01898e2c2502',
  'usr-ent-001',
  '01898e2c2502',
  'COMPLETE',
  100,
  JSON_OBJECT(
    'nom_complet', JSON_OBJECT('label', 'Nom complet', 'value', 'Fatou Sow'),
    'email', JSON_OBJECT('label', 'Email', 'value', 'fatou.sow@gaynaako.sn'),
    'telephone', JSON_OBJECT('label', 'Téléphone', 'value', '+221 77 123 45 67'),
    'pays', JSON_OBJECT('label', 'Pays', 'value', 'Sénégal'),
    'domaine_expertise', JSON_OBJECT('label', 'Expertise', 'value', 'Intelligence Artificielle'),
    'formation_principale', JSON_OBJECT('label', 'Formation', 'value', 'Master 2 en IA'),
    'annees_experience', JSON_OBJECT('label', 'Expérience', 'value', '5'),
    'cv_url', JSON_OBJECT('label', 'CV', 'value', 'https://storage.gaynaako.sn/cv/fatou_sow.pdf')
  ),
  JSON_ARRAY()
) ON DUPLICATE KEY UPDATE
  statut = VALUES(statut),
  score_completude = VALUES(score_completude);

-- Exemple 2 : Dossier incomplet (score 62%)
INSERT INTO candidatures (
  id, utilisateur_id, opportunite_id, statut, score_completude,
  champs_pre_remplis, champs_manquants
) VALUES (
  'cand_usr-pme-001_02bec1d2f672',
  'usr-pme-001',
  '02bec1d2f672',
  'BROUILLON',
  62,
  JSON_OBJECT(
    'nom_entreprise', JSON_OBJECT('label', 'Nom entreprise', 'value', 'Tech Solutions Sénégal'),
    'email', JSON_OBJECT('label', 'Email', 'value', 'contact@techsolutions.sn'),
    'pays', JSON_OBJECT('label', 'Pays', 'value', 'Sénégal'),
    'secteurs', JSON_OBJECT('label', 'Secteurs', 'value', 'technologie,services')
  ),
  JSON_ARRAY(
    JSON_OBJECT('key', 'telephone', 'label', 'Téléphone', 'description', 'Numéro de contact principal')
  )
) ON DUPLICATE KEY UPDATE
  statut = VALUES(statut),
  score_completude = VALUES(score_completude);

-- ============================================================================
-- REQUÊTES UTILES
-- ============================================================================

-- Compter les candidatures par statut
-- SELECT statut, COUNT(*) as total FROM candidatures GROUP BY statut;

-- Candidatures incomplètes (score < 100%)
-- SELECT id, utilisateur_id, score_completude, statut 
-- FROM candidatures 
-- WHERE score_completude < 100 
-- ORDER BY score_completude ASC;

-- Candidatures d'un utilisateur
-- SELECT c.id, c.opportunite_id, c.statut, c.score_completude, c.date_creation
-- FROM candidatures c
-- WHERE c.utilisateur_id = 'usr-ent-001'
-- ORDER BY c.date_mise_a_jour DESC;

-- Statistiques globales
-- SELECT 
--   COUNT(*) as total,
--   AVG(score_completude) as score_moyen,
--   COUNT(CASE WHEN statut = 'COMPLETE' THEN 1 END) as completes,
--   COUNT(CASE WHEN statut = 'SOUMISE' THEN 1 END) as soumises
-- FROM candidatures;

-- ============================================================================
-- NETTOYAGE (à utiliser avec précaution)
-- ============================================================================

-- Supprimer toutes les candidatures (ATTENTION: perte de données)
-- TRUNCATE TABLE candidatures;

-- Supprimer les candidatures en brouillon de plus de 30 jours
-- DELETE FROM candidatures 
-- WHERE statut = 'BROUILLON' 
-- AND date_creation < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- ============================================================================
-- FIN DU SCHÉMA
-- ============================================================================
