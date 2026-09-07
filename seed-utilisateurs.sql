-- ============================================================
-- Données de test : 4 utilisateurs réalistes
-- ============================================================

USE gaynaako_opportunities;

-- ── Référentiels ──────────────────────────────────────────────

INSERT INTO pays (id, nom, code) VALUES
  ('pay-sn-001', 'Sénégal',       'SEN'),
  ('pay-ci-001', 'Côte d\'Ivoire','CIV'),
  ('pay-ml-001', 'Mali',          'MLI'),
  ('pay-bf-001', 'Burkina Faso',  'BFA')
ON DUPLICATE KEY UPDATE code = VALUES(code);

INSERT INTO secteurs (id, nom) VALUES
  ('sec-tech-001',  'Technologie & Numérique'),
  ('sec-agri-001',  'Agriculture & Agroalimentaire'),
  ('sec-sante-001', 'Santé & Bien-être'),
  ('sec-edu-001',   'Éducation & Formation'),
  ('sec-fin-001',   'Finance & Microfinance'),
  ('sec-env-001',   'Environnement & Énergie'),
  ('sec-com-001',   'Commerce & Export')
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO domaines_intervention (id, nom) VALUES
  ('dom-edu-001',  'Éducation des filles'),
  ('dom-eau-001',  'Accès à l\'eau potable'),
  ('dom-agri-001', 'Agriculture durable'),
  ('dom-sante-001','Santé communautaire'),
  ('dom-env-001',  'Protection de l\'environnement')
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ============================================================
-- UTILISATEUR 1 — Entrepreneur Tech (Sénégal)
-- ============================================================
INSERT INTO utilisateurs (id, email, mot_de_passe, role, statut) VALUES
  ('usr-001', 'amadou.diallo@gmail.com', '$2b$10$hashedpassword001', 'ENTREPRENEUR', 'ACTIF')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO entrepreneur_profiles
  (id, utilisateur_id, secteur_id, pays_id, domaine_expertise, objectifs)
VALUES (
  'prof-ent-001',
  'usr-001',
  'sec-tech-001',
  'pay-sn-001',
  'Développement d\'applications mobiles, Intelligence Artificielle, Data Science. 7 ans d\'expérience. Fondateur d\'une startup EdTech à Dakar.',
  'Cherche des financements pour scaler ma plateforme d\'apprentissage en ligne destinée aux jeunes sénégalais. Intéressé par les programmes d\'accélération BAD, PNUD et les subventions tech en Afrique de l\'Ouest.'
) ON DUPLICATE KEY UPDATE domaine_expertise = VALUES(domaine_expertise);

-- ============================================================
-- UTILISATEUR 2 — PME Agroalimentaire (Côte d'Ivoire)
-- ============================================================
INSERT INTO utilisateurs (id, email, mot_de_passe, role, statut) VALUES
  ('usr-002', 'fatou.kone@agriplus.ci', '$2b$10$hashedpassword002', 'PME', 'ACTIF')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO pme_profiles (id, utilisateur_id, nom_entreprise) VALUES
  ('prof-pme-002', 'usr-002', 'AgriPlus CI')
ON DUPLICATE KEY UPDATE nom_entreprise = VALUES(nom_entreprise);

INSERT INTO pme_secteurs (pme_id, secteur_id) VALUES
  ('prof-pme-002', 'sec-agri-001'),
  ('prof-pme-002', 'sec-com-001')
ON DUPLICATE KEY UPDATE pme_id = VALUES(pme_id);

-- ============================================================
-- UTILISATEUR 3 — ONG Éducation / Eau (Mali)
-- ============================================================
INSERT INTO utilisateurs (id, email, mot_de_passe, role, statut) VALUES
  ('usr-003', 'mariama.traore@espoir-mali.org', '$2b$10$hashedpassword003', 'ONG', 'ACTIF')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO ong_profiles (id, utilisateur_id, nom_organisation, mission) VALUES
  ('prof-ong-003', 'usr-003', 'Espoir Mali',
   'Améliorer l\'accès à l\'éducation des filles et à l\'eau potable dans les zones rurales du Mali. Active depuis 2015 dans les régions de Mopti et Ségou. Partenaire de l\'UNICEF et de l\'OMS.')
ON DUPLICATE KEY UPDATE mission = VALUES(mission);

INSERT INTO ong_domaines (ong_id, domaine_id) VALUES
  ('prof-ong-003', 'dom-edu-001'),
  ('prof-ong-003', 'dom-eau-001')
ON DUPLICATE KEY UPDATE ong_id = VALUES(ong_id);

-- ============================================================
-- UTILISATEUR 4 — Administrateur (Sénégal)
-- ============================================================
INSERT INTO utilisateurs (id, email, mot_de_passe, role, statut) VALUES
  ('usr-004', 'admin@gaynaako.sn', '$2b$10$hashedpassword004', 'ADMINISTRATEUR', 'ACTIF')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO administrateur_profiles (id, utilisateur_id, niveau_acces) VALUES
  ('prof-adm-004', 'usr-004', 'SUPER_ADMIN')
ON DUPLICATE KEY UPDATE niveau_acces = VALUES(niveau_acces);

-- ============================================================
-- Vérification
-- ============================================================
SELECT
  u.id,
  u.email,
  u.role,
  u.statut,
  CASE u.role
    WHEN 'ENTREPRENEUR' THEN ep.domaine_expertise
    WHEN 'PME'          THEN pp.nom_entreprise
    WHEN 'ONG'          THEN op.nom_organisation
    WHEN 'ADMINISTRATEUR' THEN ap.niveau_acces
  END AS info_profil
FROM utilisateurs u
LEFT JOIN entrepreneur_profiles  ep ON ep.utilisateur_id = u.id
LEFT JOIN pme_profiles           pp ON pp.utilisateur_id = u.id
LEFT JOIN ong_profiles           op ON op.utilisateur_id = u.id
LEFT JOIN administrateur_profiles ap ON ap.utilisateur_id = u.id;
