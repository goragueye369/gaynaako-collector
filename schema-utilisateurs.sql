-- ============================================================
-- Schéma utilisateurs Gaynaako (adapté Prisma → MySQL)
-- ============================================================

USE gaynaako_opportunities;

-- ── Pays ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pays (
  id   VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nom  VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(3)  UNIQUE,
  INDEX idx_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Secteurs utilisateurs ─────────────────────────────────────
-- (table séparée de la table sectors existante pour le profil utilisateur)
CREATE TABLE IF NOT EXISTS secteurs (
  id  VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nom VARCHAR(100) NOT NULL UNIQUE,
  INDEX idx_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Domaines d'intervention (ONG) ────────────────────────────
CREATE TABLE IF NOT EXISTS domaines_intervention (
  id  VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nom VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Utilisateurs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
  id           VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  email        VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  role         ENUM('ENTREPRENEUR','PME','ONG','ADMINISTRATEUR') NOT NULL,
  statut       ENUM('EN_ATTENTE','ACTIF','SUSPENDU') NOT NULL DEFAULT 'ACTIF',
  date_creation DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  supprime_le  DATETIME     DEFAULT NULL,
  INDEX idx_email  (email),
  INDEX idx_role   (role),
  INDEX idx_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Profil Entrepreneur ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS entrepreneur_profiles (
  id                VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  utilisateur_id    VARCHAR(36)  NOT NULL UNIQUE,
  secteur_id        VARCHAR(36)  NOT NULL,
  pays_id           VARCHAR(36)  NOT NULL,
  domaine_expertise VARCHAR(255) NOT NULL,
  objectifs         TEXT         DEFAULT NULL,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (secteur_id)     REFERENCES secteurs(id),
  FOREIGN KEY (pays_id)        REFERENCES pays(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Profil PME ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pme_profiles (
  id             VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  utilisateur_id VARCHAR(36)  NOT NULL UNIQUE,
  nom_entreprise VARCHAR(255) NOT NULL,
  logo_url       VARCHAR(500) DEFAULT NULL,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pivot PME ↔ Secteurs
CREATE TABLE IF NOT EXISTS pme_secteurs (
  pme_id     VARCHAR(36) NOT NULL,
  secteur_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (pme_id, secteur_id),
  FOREIGN KEY (pme_id)     REFERENCES pme_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (secteur_id) REFERENCES secteurs(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Profil ONG ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ong_profiles (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  utilisateur_id   VARCHAR(36)  NOT NULL UNIQUE,
  nom_organisation VARCHAR(255) NOT NULL,
  mission          TEXT         DEFAULT NULL,
  logo_url         VARCHAR(500) DEFAULT NULL,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pivot ONG ↔ Domaines
CREATE TABLE IF NOT EXISTS ong_domaines (
  ong_id      VARCHAR(36) NOT NULL,
  domaine_id  VARCHAR(36) NOT NULL,
  PRIMARY KEY (ong_id, domaine_id),
  FOREIGN KEY (ong_id)     REFERENCES ong_profiles(id)          ON DELETE CASCADE,
  FOREIGN KEY (domaine_id) REFERENCES domaines_intervention(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Profil Administrateur ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS administrateur_profiles (
  id             VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  utilisateur_id VARCHAR(36) NOT NULL UNIQUE,
  niveau_acces   VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Refresh tokens ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id             VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  token_hash     VARCHAR(255) NOT NULL UNIQUE,
  utilisateur_id VARCHAR(36)  NOT NULL,
  expires_at     DATETIME     NOT NULL,
  revoked        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_utilisateur_id (utilisateur_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── OTP ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_verifications (
  id         VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  email      VARCHAR(255) NOT NULL,
  code_hash  VARCHAR(255) NOT NULL,
  purpose    ENUM('EMAIL_VERIFICATION','PASSWORD_RESET') NOT NULL,
  expires_at DATETIME     NOT NULL,
  attempts   INT          NOT NULL DEFAULT 0,
  consumed   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Candidatures ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidatures (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  statut          ENUM('BROUILLON','SOUMISE','EN_COURS','ACCEPTEE','REJETEE') NOT NULL DEFAULT 'BROUILLON',
  date_soumission DATETIME     DEFAULT NULL,
  date_creation   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  utilisateur_id  VARCHAR(36)  NOT NULL,
  opportunite_id  VARCHAR(12)  NOT NULL,
  UNIQUE KEY uq_user_opp (utilisateur_id, opportunite_id),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (opportunite_id) REFERENCES opportunities_processed(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Favoris ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favoris (
  id             VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  date_ajout     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  utilisateur_id VARCHAR(36) NOT NULL,
  opportunite_id VARCHAR(12) NOT NULL,
  UNIQUE KEY uq_favori (utilisateur_id, opportunite_id),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (opportunite_id) REFERENCES opportunities_processed(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Recommandations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommandations (
  id               VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  score_pertinence FLOAT       NOT NULL,
  date_generation  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  utilisateur_id   VARCHAR(36) NOT NULL,
  opportunite_id   VARCHAR(12) NOT NULL,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (opportunite_id) REFERENCES opportunities_processed(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id             VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  canal          ENUM('EMAIL','WHATSAPP') NOT NULL,
  contenu        TEXT         NOT NULL,
  date_envoi     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  envoyee        BOOLEAN      NOT NULL DEFAULT FALSE,
  utilisateur_id VARCHAR(36)  NOT NULL,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Journal activité ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journaux_activite (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  action           VARCHAR(500) NOT NULL,
  date_heure       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  administrateur_id VARCHAR(36) NOT NULL,
  FOREIGN KEY (administrateur_id) REFERENCES administrateur_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ Toutes les tables utilisateurs créées avec succès' AS status;
SHOW TABLES;
