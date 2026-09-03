let allProfiles = [];
let currentRole = 'ALL';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Filtres par rôle
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRole = btn.dataset.role;
      renderProfileList(allProfiles);
    });
  });

  await loadProfiles();
}

async function loadProfiles() {
  try {
    const res = await fetch('/api/profiles');
    const json = await res.json();
    allProfiles = json.data || [];
    renderProfileList(allProfiles);

    // Auto-sélectionner le premier
    if (allProfiles.length > 0) selectProfile(allProfiles[0]);
  } catch (e) {
    document.getElementById('profile-list').innerHTML =
      `<div class="loading">⚠️ Erreur : ${e.message}</div>`;
  }
}

function renderProfileList(profiles) {
  const filtered = currentRole === 'ALL'
    ? profiles
    : profiles.filter(p => p.role === currentRole);

  const list = document.getElementById('profile-list');

  if (filtered.length === 0) {
    list.innerHTML = `<div class="loading">Aucun profil pour ce rôle.</div>`;
    return;
  }

  list.innerHTML = filtered.map(p => {
    const initials = (p.nom || p.email).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const sub = p.role === 'ENTREPRENEUR'
      ? (p.entrepreneur?.secteur?.nom || '')
      : p.role === 'PME'
        ? (p.pme?.secteurs?.map(s => s.nom).join(', ') || '')
        : (p.ong?.domainesIntervention?.map(d => d.nom).join(', ') || '');

    return `
      <div class="profile-item" data-id="${p.id}" onclick="handleSelectProfile('${p.id}')">
        <div class="p-avatar ${p.role}">${initials}</div>
        <div class="p-info">
          <div class="p-name">${p.nom || p.email}</div>
          <div class="p-meta">${sub}</div>
        </div>
        <span class="p-role-tag ${p.role}">${p.role}</span>
      </div>
    `;
  }).join('');
}

function handleSelectProfile(id) {
  const profile = allProfiles.find(p => p.id === id);
  if (profile) {
    document.querySelectorAll('.profile-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.profile-item[data-id="${id}"]`)?.classList.add('active');
    selectProfile(profile);
  }
}

function selectProfile(profile) {
  // Afficher la carte profil
  const card = document.getElementById('profile-card');
  card.style.display = 'block';

  // Avatar
  const initials = (profile.nom || profile.email).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('prof-avatar').textContent = initials;
  document.getElementById('prof-name').textContent = profile.nom || profile.email;

  // Badge rôle
  const badge = document.getElementById('prof-role-badge');
  badge.textContent = profile.role;
  badge.className = `role-badge ${profile.role}`;

  // Infos selon le rôle
  let sub = '', sectors = '', mission = '';
  if (profile.role === 'ENTREPRENEUR') {
    sub = profile.entrepreneur?.domaineExpertise || '';
    sectors = profile.entrepreneur?.secteur?.nom || '';
    mission = profile.entrepreneur?.objectifs || '';
  } else if (profile.role === 'PME') {
    sub = profile.pme?.nomEntreprise || '';
    sectors = (profile.pme?.secteurs || []).map(s => s.nom).join(', ');
    mission = 'PME — Développement d\'activités';
  } else if (profile.role === 'ONG') {
    sub = profile.ong?.nomOrganisation || '';
    sectors = (profile.ong?.domainesIntervention || []).map(d => d.nom).join(', ');
    mission = profile.ong?.mission || '';
  }

  document.getElementById('prof-sub').textContent = sub;
  document.getElementById('prof-sectors').innerHTML = `<strong>Secteurs / Domaines :</strong> ${sectors}`;
  document.getElementById('prof-mission').innerHTML = `<strong>Objectifs / Mission :</strong> ${mission}`;

  // Lancer le matching
  runMatching(profile);
}

async function runMatching(profile) {
  document.getElementById('results-header').style.display = 'none';
  document.getElementById('results-list').innerHTML =
    `<div class="loading">🤖 Calcul en cours pour [${profile.role}] ${profile.nom}...</div>`;

  try {
    const res = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, min_score: 0.55, limit: 5 })
    });
    const json = await res.json();
    const matches = json.matches || [];

    document.getElementById('results-header').style.display = 'flex';
    document.getElementById('results-count').textContent = matches.length;

    if (matches.length === 0) {
      document.getElementById('results-list').innerHTML = `
        <div class="empty-state">
          <span>⚠️</span>
          <p>Aucune opportunité ne dépasse le seuil de 55% pour ce profil.</p>
        </div>`;
      return;
    }

    document.getElementById('results-list').innerHTML = matches.map((m, idx) => {
      const pct = m.scorePourcentage;
      const cls = pct >= 80 ? 'high' : pct >= 60 ? 'mid' : 'low';
      const opp = m.opportunite;
      const dateGen = new Date().toISOString();

      return `
        <article class="match-card">
          <div class="match-card-top">
            <h3 class="match-title">#${idx + 1}. ${opp.titre}</h3>
            <span class="score-badge ${cls}">${pct}%</span>
          </div>

          <div class="score-bar-wrap">
            <div class="score-bar-bg">
              <div class="score-bar-fill fill-${cls}" style="width: ${pct}%"></div>
            </div>
          </div>

          <div class="match-meta">
            <span>📍 ${opp.pays || 'Afrique'}</span>
            <span>🏷️ Secteur : <strong>${opp.secteur || 'Général'}</strong></span>
          </div>

          <div class="prisma-data">
            <span class="key">utilisateurId</span>: <span class="val-str">"${m.utilisateurId}"</span>,
            <span class="key">opportuniteId</span>: <span class="val-str">"${m.opportuniteId}"</span>,
            <span class="key">scorePertinence</span>: <span class="val">${m.scorePertinence}</span>,
            <span class="key">dateGeneration</span>: <span class="val-str">"${dateGen}"</span>
          </div>

          ${opp.url ? `<a href="${opp.url}" target="_blank" class="btn-link">Consulter l'opportunité officielle ↗</a>` : ''}
        </article>
      `;
    }).join('');

  } catch (e) {
    document.getElementById('results-list').innerHTML =
      `<div class="loading">❌ Erreur : ${e.message}</div>`;
  }
}
