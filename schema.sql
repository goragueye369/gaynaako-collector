-- ============================================
-- Schéma MySQL pour Gaynaako Opportunities
-- ============================================

-- Créer la base de données (si elle n'existe pas)
CREATE DATABASE IF NOT EXISTS gaynaako_opportunities
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Utiliser la base de données
USE gaynaako_opportunities;

-- Supprimer les tables existantes (si on recommence)
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS sources;

-- ============================================
-- Table: sources
-- ============================================
CREATE TABLE sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    url TEXT,
    type VARCHAR(50), -- 'senegal' ou 'international'
    status VARCHAR(50) DEFAULT 'active', -- 'active' ou 'inactive'
    last_scraped_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sources_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: opportunities
-- ============================================
CREATE TABLE opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT,
    source_name VARCHAR(255) NOT NULL, -- Dénormalisé pour performance
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    date VARCHAR(255), -- Date au format texte (variable selon les sources)
    collected_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clé étrangère
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    
    -- Index pour les recherches
    INDEX idx_opportunities_source_name (source_name),
    INDEX idx_opportunities_collected_at (collected_at DESC),
    
    -- Index FULLTEXT pour la recherche
    FULLTEXT INDEX idx_opportunities_title (title),
    FULLTEXT INDEX idx_opportunities_description (description),
    FULLTEXT INDEX idx_opportunities_fulltext (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index sur URL (limité à 255 caractères car TEXT ne peut pas être indexé complètement)
ALTER TABLE opportunities ADD INDEX idx_opportunities_url (url(255));

-- Contrainte d'unicité pour éviter les doublons (limiter les colonnes TEXT)
ALTER TABLE opportunities 
    ADD UNIQUE KEY unique_opportunity (url(255), title(255));

-- ============================================
-- Vues utiles
-- ============================================

-- Vue: Statistiques par source
CREATE OR REPLACE VIEW v_source_stats AS
SELECT 
    s.id,
    s.name,
    s.type,
    s.status,
    COUNT(o.id) as total_opportunities,
    MAX(o.collected_at) as last_collection,
    MIN(o.collected_at) as first_collection
FROM sources s
LEFT JOIN opportunities o ON s.id = o.source_id
GROUP BY s.id, s.name, s.type, s.status;

-- Vue: Opportunités récentes (dernières 24h)
CREATE OR REPLACE VIEW v_recent_opportunities AS
SELECT 
    o.id,
    o.source_name,
    o.title,
    o.description,
    o.url,
    o.collected_at
FROM opportunities o
WHERE o.collected_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY o.collected_at DESC;

-- ============================================
-- Données initiales: Sources
-- ============================================
INSERT INTO sources (name, type, status) VALUES
    ('DER Sénégal', 'senegal', 'active'),
    ('ARCOP (ex-ARMP) Sénégal', 'senegal', 'active'),
    ('ADEPME', 'senegal', 'active'),
    ('Banque Mondiale', 'international', 'active'),
    ('BAD - Banque Africaine de Développement', 'international', 'active'),
    ('Union Européenne', 'international', 'active'),
    ('PNUD Sénégal', 'international', 'active'),
    ('GIZ Sénégal', 'international', 'active'),
    ('USAID', 'international', 'active'),
    ('JSONPlaceholder (Test)', 'test', 'inactive')
ON DUPLICATE KEY UPDATE status = status;

-- ============================================
-- Afficher les tables créées
-- ============================================
SHOW TABLES;

-- Afficher les statistiques
SELECT * FROM v_source_stats ORDER BY total_opportunities DESC;

