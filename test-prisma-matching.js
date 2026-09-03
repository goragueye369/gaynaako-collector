/**
 * Test du matching avec des entités compatibles Prisma Backend
 * Simule les 3 rôles : ENTREPRENEUR, PME, ONG
 */

const { generateRecommandationsForUser } = require('./matching-backend-engine');

// 1. Exemples d'utilisateurs selon le schéma Prisma
const TEST_USERS = [
  // A. Profil ENTREPRENEUR
  {
    id: "usr-ent-001",
    email: "moussa.tech@gaynaako.sn",
    role: "ENTREPRENEUR",
    entrepreneur: {
      secteur: { id: "sec-01", nom: "technologie" },
      pays: { id: "pay-01", nom: "Sénégal" },
      domaineExpertise: "Intelligence Artificielle, Machine Learning, Développement d'applications",
      objectifs: "Obtenir des subventions pour accélérer notre solution d'IA agricole"
    }
  },

  // B. Profil PME
  {
    id: "usr-pme-002",
    email: "contact@senegal-solaire.sn",
    role: "PME",
    pme: {
      nomEntreprise: "Sunu Solaire PME",
      secteurs: [
        { id: "sec-02", nom: "energie" },
        { id: "sec-03", nom: "infrastructure" }
      ]
    }
  },

  // C. Profil ONG
  {
    id: "usr-ong-003",
    email: "direction@ong-sante-sahel.org",
    role: "ONG",
    ong: {
      nomOrganisation: "Action Santé Sahel",
      domainesIntervention: [
        { id: "sec-04", nom: "santé" },
        { id: "sec-05", nom: "eau" }
      ],
      mission: "Améliorer l'accès aux soins de santé primaire et à l'eau potable dans les zones rurales"
    }
  }
];

// 2. Exemples d'opportunités selon le schéma Prisma
const TEST_OPPORTUNITIES = [
  {
    id: "opp-001",
    titre: "Fonds d'Accélération pour les Startups Numériques et l'IA",
    type: "SUBVENTION",
    pays: "Sénégal",
    dateLimite: new Date("2026-10-31"),
    criteresEligibilite: "Startups technologiques spécialisées en IA, développement logiciel et digital",
    secteur: { id: "sec-01", nom: "technologie" }
  },
  {
    id: "opp-002",
    titre: "Appel d'offres : Installation de Mini-centrales Solaires Villageoises",
    type: "APPEL_OFFRE",
    pays: "Sénégal",
    dateLimite: new Date("2026-09-30"),
    criteresEligibilite: "Entreprises et PME du secteur énergétique et solaire photovoltaïque",
    secteur: { id: "sec-02", nom: "energie" }
  },
  {
    id: "opp-003",
    titre: "Programme de Financement pour la Santé Communautaire et l'Hydraulique Rurale",
    type: "FINANCEMENT",
    pays: "Afrique",
    dateLimite: new Date("2026-11-15"),
    criteresEligibilite: "ONG et associations œuvrant dans la santé publique, l'assainissement et l'eau",
    secteur: { id: "sec-04", nom: "santé" }
  },
  {
    id: "opp-004",
    titre: "Concours National de l'Agro-business et Transformation Locale",
    type: "CONCOURS",
    pays: "Sénégal",
    dateLimite: new Date("2026-10-15"),
    criteresEligibilite: "Entrepreneurs et coopératives agricoles",
    secteur: { id: "sec-06", nom: "agriculture" }
  }
];

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║   🚀 TEST MATCHING — COMPATIBILITÉ AVEC LE SCHÉMA PRISMA BACKEND ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

TEST_USERS.forEach(user => {
  console.log('═'.repeat(70));
  console.log(`👤 RÔLE : ${user.role} | Email : ${user.email}`);
  
  if (user.role === 'ENTREPRENEUR') {
    console.log(`   Expertise : ${user.entrepreneur.domaineExpertise}`);
    console.log(`   Secteur   : ${user.entrepreneur.secteur.nom} | Pays : ${user.entrepreneur.pays.nom}`);
  } else if (user.role === 'PME') {
    console.log(`   Entreprise: ${user.pme.nomEntreprise}`);
    console.log(`   Secteurs  : ${user.pme.secteurs.map(s => s.nom).join(', ')}`);
  } else if (user.role === 'ONG') {
    console.log(`   ONG       : ${user.ong.nomOrganisation}`);
    console.log(`   Domaines  : ${user.ong.domainesIntervention.map(d => d.nom).join(', ')}`);
  }
  console.log('═'.repeat(70));

  // Générer les recommandations
  const result = generateRecommandationsForUser(user, TEST_OPPORTUNITIES, 5, 0.55);

  console.log(`\n🏆 ${result.topRecommandations.length} Recommandation(s) qualifiée(s) :\n`);
  result.topRecommandations.forEach((r, idx) => {
    console.log(`  ${idx + 1}. [Score: ${(r.scorePertinence * 100).toFixed(0)}%] — ${r.opportunite.titre}`);
    console.log(`     Type: ${r.opportunite.type} | Secteur: ${r.opportunite.secteur} | Pays: ${r.opportunite.pays}`);
  });

  console.log(`\n📦 Données prêtes pour Prisma 'prisma.recommandation.createMany' :`);
  console.log(JSON.stringify(result.prismaDataToInsert, null, 2));
  console.log('\n');
});
