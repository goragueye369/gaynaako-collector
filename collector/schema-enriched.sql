-- ============================================
-- Schéma MySQL Enrichi pour Gaynaako Opportunities
-- Inclut les données nettoyées et normalisées pour l'IA
-- ============================================

USE gaynaako_opportunities;

-- ============================================
-- Table enrichie: opportunities_processed
-- AVEC COLONNES NLP INTÉGRÉES (1 SEULE TABLE)
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities_processed (
    id VARCHAR(12) PRIMARY KEY,
    
    -- Informations source
    source_name VARCHAR(255) NOT NULL,
    source_type ENUM('national', 'international') NOT NULL,
    
    -- Contenu nettoyé
    title VARCHAR(300) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    
    -- Dates
    date_original VARCHAR(255),
    date_normalized DATE,
    
    -- Classification géographique
    country VARCHAR(100),
    
    -- Classification sectorielle (multi-secteurs possibles)
    sectors TEXT, -- Format: "secteur1, secteur2, secteur3"
    
    -- Indicateurs de qualité
    has_description ENUM('oui', 'non') DEFAULT 'non',
    has_date ENUM('oui', 'non') DEFAULT 'non',
    quality_score INT DEFAULT 0, -- Score sur 100
    
    -- ============================================
    -- COLONNES NLP (Analyse IA)
    -- ============================================
    nlp_amounts JSON DEFAULT NULL, -- [{"amount": 50, "currency": "USD", "unit": "millions"}]
    nlp_deadlines JSON DEFAULT NULL, -- ["2024-12-31", "2025-01-15"]
    nlp_organizations JSON DEFAULT NULL, -- ["Banque Mondiale", "USAID"]
    nlp_emails JSON DEFAULT NULL, -- ["contact@example.com"]
    nlp_phones JSON DEFAULT NULL, -- ["+221 77 123 45 67"]
    nlp_keywords JSON DEFAULT NULL, -- ["financement", "technologie", "infrastructure"]
    nlp_quality_score INT DEFAULT 0, -- Score NLP sur 10
    nlp_processed_at TIMESTAMP NULL, -- Date du traitement NLP
    
    -- Métadonnées
    collected_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Index pour la recherche
    INDEX idx_source_name (source_name),
    INDEX idx_source_type (source_type),
    INDEX idx_country (country),
    INDEX idx_date_normalized (date_normalized DESC),
    INDEX idx_quality_score (quality_score DESC),
    INDEX idx_nlp_quality_score (nlp_quality_score DESC),
    INDEX idx_collected_at (collected_at DESC),
    INDEX idx_nlp_processed_at (nlp_processed_at DESC),
    
    -- Index FULLTEXT pour la recherche
    FULLTEXT INDEX idx_title (title),
    FULLTEXT INDEX idx_description (description),
    FULLTEXT INDEX idx_sectors (sectors),
    FULLTEXT INDEX idx_fulltext (title, description, sectors)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: sectors (référentiel des secteurs)
-- ============================================
CREATE TABLE IF NOT EXISTS sectors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    keywords TEXT, -- Mots-clés pour la détection automatique
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insérer les secteurs prédéfinis
INSERT INTO sectors (name, description, keywords) VALUES
    ('agriculture', 'Agriculture, élevage, pêche', 'agriculture,agri,agricole,elevage,pêche,peche,rural,ferme'),
    ('santé', 'Santé et services médicaux', 'santé,sante,health,medical,hopital,hôpital,clinique'),
    ('éducation', 'Éducation et formation', 'education,éducation,ecole,école,formation,enseignement,universite'),
    ('infrastructure', 'Infrastructure et construction', 'infrastructure,route,pont,transport,construction,bâtiment,batiment'),
    ('energie', 'Énergie et électricité', 'energie,énergie,energy,solaire,electricite,électricité'),
    ('eau', 'Eau et assainissement', 'eau,water,assainissement,hydraulique'),
    ('technologie', 'Technologies et numérique', 'tech,digital,numérique,numerique,informatique,IT,logiciel,software'),
    ('finance', 'Finance et banque', 'finance,bancaire,credit,crédit,microfinance,financement'),
    ('environnement', 'Environnement et climat', 'environnement,environment,climat,écologie,ecologie,durable'),
    ('gouvernance', 'Gouvernance et administration', 'gouvernance,governance,administration,public,politique'),
    ('commerce', 'Commerce et export', 'commerce,trade,export,import,marché,marche,business'),
    ('industrie', 'Industrie et manufacture', 'industrie,industry,manufacture,usine,production'),
    ('tourisme', 'Tourisme et culture', 'tourisme,tourism,hotel,hôtel,culture')
ON DUPLICATE KEY UPDATE description = VALUES(description), keywords = VALUES(keywords);

-- ============================================
-- Table: countries (référentiel des pays)
-- ============================================
CREATE TABLE IF NOT EXISTS countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(3), -- Code ISO 3166-1 alpha-3
    region VARCHAR(100), -- Afrique de l'Ouest, etc.
    keywords TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insérer les pays prédéfinis
INSERT INTO countries (name, code, region, keywords) VALUES
    ('Sénégal', 'SEN', 'Afrique de l\'Ouest', 'senegal,sénégal,dakar,der,arcop,armp,adepme'),
    ('Côte d\'Ivoire', 'CIV', 'Afrique de l\'Ouest', 'côte d\'ivoire,cote d\'ivoire,abidjan,ivory coast'),
    ('Mali', 'MLI', 'Afrique de l\'Ouest', 'mali,bamako'),
    ('Burkina Faso', 'BFA', 'Afrique de l\'Ouest', 'burkina,ouagadougou'),
    ('Niger', 'NER', 'Afrique de l\'Ouest', 'niger,niamey'),
    ('Guinée', 'GIN', 'Afrique de l\'Ouest', 'guinée,guinee,conakry'),
    ('Bénin', 'BEN', 'Afrique de l\'Ouest', 'bénin,benin,cotonou'),
    ('Togo', 'TGO', 'Afrique de l\'Ouest', 'togo,lomé,lome'),
    ('Ghana', 'GHA', 'Afrique de l\'Ouest', 'ghana,accra'),
    ('Afrique', 'AFR', 'Continental', 'afrique,africa,african,africain'),
    ('International', 'INT', 'Global', 'world,mondial,international,global')
ON DUPLICATE KEY UPDATE keywords = VALUES(keywords);

-- ============================================
-- Vues utiles pour l'analyse
-- ============================================

-- Vue: Statistiques par secteur
CREATE OR REPLACE VIEW v_stats_by_sector AS
SELECT 
    s.name as sector,
    COUNT(*) as total_opportunities,
    AVG(op.quality_score) as avg_quality_score,
    MAX(op.collected_at) as last_collection
FROM sectors s
INNER JOIN opportunities_processed op ON FIND_IN_SET(s.name, op.sectors) > 0
GROUP BY s.name
ORDER BY total_opportunities DESC;

-- Vue: Statistiques par pays
CREATE OR REPLACE VIEW v_stats_by_country AS
SELECT 
    op.country,
    COUNT(*) as total_opportunities,
    AVG(op.quality_score) as avg_quality_score,
    COUNT(CASE WHEN op.has_description = 'oui' THEN 1 END) as with_description,
    COUNT(CASE WHEN op.has_date = 'oui' THEN 1 END) as with_date,
    MAX(op.collected_at) as last_collection
FROM opportunities_processed op
GROUP BY op.country
ORDER BY total_opportunities DESC;

-- Vue: Opportunités de haute qualité (score > 70)
CREATE OR REPLACE VIEW v_high_quality_opportunities AS
SELECT 
    id,
    source_name,
    title,
    description,
    url,
    country,
    sectors,
    quality_score,
    date_normalized,
    collected_at
FROM opportunities_processed
WHERE quality_score > 70
ORDER BY quality_score DESC, collected_at DESC;

-- Vue: Opportunités récentes (7 derniers jours)
CREATE OR REPLACE VIEW v_recent_opportunities AS
SELECT 
    id,
    source_name,
    source_type,
    title,
    LEFT(description, 200) as description_preview,
    url,
    country,
    sectors,
    quality_score,
    date_normalized,
    collected_at
FROM opportunities_processed
WHERE collected_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY collected_at DESC;

-- Vue: Dashboard complet
CREATE OR REPLACE VIEW v_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM opportunities_processed) as total_opportunities,
    (SELECT COUNT(*) FROM opportunities_processed WHERE quality_score > 70) as high_quality_opportunities,
    (SELECT COUNT(DISTINCT country) FROM opportunities_processed) as total_countries,
    (SELECT COUNT(DISTINCT source_name) FROM opportunities_processed) as total_sources,
    (SELECT AVG(quality_score) FROM opportunities_processed) as avg_quality_score,
    (SELECT COUNT(*) FROM opportunities_processed WHERE has_description = 'oui') as with_description,
    (SELECT COUNT(*) FROM opportunities_processed WHERE has_date = 'oui') as with_date,
    (SELECT MAX(collected_at) FROM opportunities_processed) as last_collection;

-- ============================================
-- Afficher les statistiques
-- ============================================
SELECT '✅ Schéma enrichi créé avec succès' as status;
SELECT * FROM v_dashboard;
