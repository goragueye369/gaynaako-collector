-- ==========================================================
-- Schéma MySQL : Module de Matching, Stratégie & Abonnements
-- Projet : Gaynaako Collector
-- ==========================================================

USE gaynaako_opportunities;

-- ==========================================================
-- 1. Table: users (Profils Candidats & Utilisateurs)
-- ==========================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY, -- UUID ou identifiant unique
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    current_title VARCHAR(255) DEFAULT NULL,
    
    -- Niveau d'études : 'bac', 'bac+2', 'bac+3' (licence), 'bac+5' (master/ingénieur), 'doctorat'
    education_level VARCHAR(50) DEFAULT 'bac+3',
    education_field VARCHAR(255) DEFAULT NULL, -- Domaine d'études
    
    -- Expérience
    experience_years INT DEFAULT 0,
    seniority_level ENUM('junior', 'intermédiaire', 'confirmé', 'expert') DEFAULT 'intermédiaire',
    
    -- Compétences & Domaines (stockés en JSON)
    skills JSON DEFAULT NULL, -- ex: ["Python", "Machine Learning", "Gestion de projet"]
    sectors JSON DEFAULT NULL, -- ex: ["technologie", "agriculture"]
    
    -- Localisation & Préférences
    country VARCHAR(100) DEFAULT 'Sénégal',
    preferred_countries JSON DEFAULT NULL, -- ex: ["Sénégal", "Côte d'Ivoire", "International"]
    preferred_source_types JSON DEFAULT NULL, -- ex: ["national", "international"]
    min_budget DECIMAL(15, 2) DEFAULT NULL,
    
    -- Bio & Pièces jointes
    bio TEXT DEFAULT NULL,
    cv_url TEXT DEFAULT NULL,
    portfolio_url TEXT DEFAULT NULL,
    linkedin_url TEXT DEFAULT NULL,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_seniority (seniority_level),
    INDEX idx_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================================
-- 2. Table: user_subscriptions (Abonnements & Forfaits)
-- ==========================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    
    -- Plan : 'free' (5 recos/j), 'premium' (20 recos/j), 'pro' (50 recos/j)
    plan_type ENUM('free', 'premium', 'pro') DEFAULT 'free',
    daily_recommendations_limit INT NOT NULL DEFAULT 5,
    
    status ENUM('active', 'expired', 'canceled') DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_plan (user_id, plan_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================================
-- 3. Table: user_daily_recommendation_logs (Suivi Quotas)
-- ==========================================================
CREATE TABLE IF NOT EXISTS user_daily_recommendation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    log_date DATE NOT NULL,
    recommendations_count INT NOT NULL DEFAULT 0,
    last_recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, log_date),
    INDEX idx_user_date (user_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================================
-- 4. Table: applications (Candidatures & Préremplissage)
-- ==========================================================
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    opportunity_id VARCHAR(12) NOT NULL,
    
    status ENUM('draft', 'incomplete', 'ready', 'submitted') DEFAULT 'draft',
    
    -- Données de candidature et audit
    prefilled_data JSON DEFAULT NULL, -- Données complétées
    missing_fields JSON DEFAULT NULL, -- Informations manquantes identifiées
    is_profile_complete BOOLEAN DEFAULT FALSE,
    
    -- Documents générés par IA
    cover_letter TEXT DEFAULT NULL,
    elevator_pitch TEXT DEFAULT NULL,
    
    -- Métadonnées
    match_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities_processed(id) ON DELETE CASCADE,
    INDEX idx_user_opportunity (user_id, opportunity_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================================
-- 5. Table: recommendation_fairness_stats (Statistiques Équité)
-- ==========================================================
CREATE TABLE IF NOT EXISTS recommendation_fairness_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sector VARCHAR(100) NOT NULL,
    recommendations_count INT NOT NULL DEFAULT 0,
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_sector (sector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
