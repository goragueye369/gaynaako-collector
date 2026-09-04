-- ============================================================
-- GAYNAAKO — SCHÉMA DE LA TABLE RECOMMANDATIONS
-- Base de données : gaynaako_profils
-- ============================================================

USE gaynaako_profils;

CREATE TABLE IF NOT EXISTS recommandations (
  id VARCHAR(64) PRIMARY KEY,
  utilisateur_id VARCHAR(50) NOT NULL,
  opportunite_id VARCHAR(50) NOT NULL,
  score_pertinence FLOAT NOT NULL,
  methode_matching ENUM('ALGORITHMIQUE', 'IA_EMBEDDINGS') NOT NULL DEFAULT 'ALGORITHMIQUE',
  date_generation TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Index et contraintes
  UNIQUE KEY uk_user_opp (utilisateur_id, opportunite_id),
  INDEX idx_user_score (utilisateur_id, score_pertinence DESC),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
