let allProfiles = [];
let currentRole = 'ALL';
let currentProfile = null;
let currentTab = 'strategy';

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

  // Navigation par onglets
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;

      document.getElementById('tab-strategy').style.display = currentTab === 'strategy' ? 'block' : 'none';
      document.getElementById('tab-matching').style.display = currentTab === 'matching' ? 'block' : 'none';
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

    if (allProfiles.length > 0) {
      handleSelectProfile(allProfiles[0].id);
    }
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

    const isActive = currentProfile && currentProfile.id === p.id ? 'active' : '';

    return `
      <div class="profile-item ${isActive}" data-id="${p.id}" onclick="handleSelectProfile('${p.id}')">
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
    currentProfile = profile;
    document.querySelectorAll('.profile-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.profile-item[data-id="${id}"]`)?.classList.add('active');
    selectProfile(profile);
  }
}

function selectProfile(profile) {
  // Afficher la carte profil et les onglets
  document.getElementById('profile-card').style.display = 'block';
  document.getElementById('tabs-nav').style.display = 'flex';

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
    sectors = `${profile.entrepreneur?.secteur?.nom || ''} · 📍 ${profile.entrepreneur?.pays?.nom || 'Sénégal'}`;
    mission = profile.entrepreneur?.objectifs || '';
  } else if (profile.role === 'PME') {
    sub = profile.pme?.nomEntreprise || '';
    sectors = (profile.pme?.secteurs || []).map(s => s.nom).join(', ');
    mission = 'PME — Développement d\'activités & Marchés';
  } else if (profile.role === 'ONG') {
    sub = profile.ong?.nomOrganisation || '';
    sectors = (profile.ong?.domainesIntervention || []).map(d => d.nom).join(', ');
    mission = profile.ong?.mission || '';
  }

  document.getElementById('prof-sub').textContent = sub;
  document.getElementById('prof-sectors').innerHTML = `<strong>Secteurs / Domaines :</strong> ${sectors}`;
  document.getElementById('prof-mission').innerHTML = `<strong>Objectifs / Mission :</strong> ${mission}`;

  // Lancer le calcul stratégique et le matching
  loadStrategy(profile.id);
  runMatching(profile);
}

// ─── CHARGEMENT DE LA STRATÉGIE IA ──────────────────────────────────────────
async function loadStrategy(userId) {
  const container = document.getElementById('strategy-view');
  container.innerHTML = `<div class="loading">🎯 Analyse stratégique IA en cours pour ce profil...</div>`;

  try {
    const res = await fetch(`/api/strategy/${userId}`);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Impossible de générer la stratégie');
    }

    renderStrategyView(data);
  } catch (e) {
    container.innerHTML = `<div class="loading">❌ Erreur lors de l'analyse stratégique : ${e.message}</div>`;
  }
}

function renderStrategyView(data) {
  const container = document.getElementById('strategy-view');
  const s = data.synthesis;
  const pm = data.prioritiesMatrix;
  const rm = data.roadmap;
  const ga = data.gapAnalysis;

  container.innerHTML = `
    <!-- 1. Diagnostic de Synthèse -->
    <div class="strategy-banner">
      <div class="strategy-banner-header">
        <div class="badge-status ${s.statutMarche}">Marché : ${s.statutMarche}</div>
        <span class="coverage-text">📊 ${s.tauxCouvertureMarche}</span>
      </div>
      <div class="advice-box">
        <strong>💡 Conseil Stratégique IA :</strong>
        <p>${s.conseilCle}</p>
      </div>
    </div>

    <!-- 2. Matrice de Priorisation -->
    <div class="strategy-section">
      <h3 class="section-title">🥇 1. Matrice des Opportunités (Impact vs Faisabilité)</h3>
      <p class="section-sub">Segmentation intelligente pour concentrer vos efforts là où vos chances sont maximales :</p>

      <div class="matrix-grid">
        <!-- Quick Wins -->
        <div class="matrix-col quick-win">
          <div class="matrix-col-header">
            <h4>⚡ Quick Wins (${pm.counts.quickWins})</h4>
            <span class="matrix-tag">Priorité Absolue</span>
          </div>
          <p class="matrix-desc">Forte adéquation + profil parfaitement aligné : à saisir sans attendre.</p>
          <div class="matrix-items">
            ${pm.quickWins.length === 0 ? '<div class="matrix-empty">Aucun Quick Win immédiat</div>' : pm.quickWins.map(renderMatrixItem).join('')}
          </div>
        </div>

        <!-- Paris Stratégiques -->
        <div class="matrix-col strategic-bet">
          <div class="matrix-col-header">
            <h4>🏆 Paris Stratégiques (${pm.counts.strategicBets})</h4>
            <span class="matrix-tag">Gros Enjeux</span>
          </div>
          <p class="matrix-desc">Grands bailleurs & budgets élevés : requiert un dossier très soigné / consortium.</p>
          <div class="matrix-items">
            ${pm.strategicBets.length === 0 ? '<div class="matrix-empty">Aucun pari stratégique ciblé</div>' : pm.strategicBets.map(renderMatrixItem).join('')}
          </div>
        </div>

        <!-- Valeurs Sûres -->
        <div class="matrix-col safe-bet">
          <div class="matrix-col-header">
            <h4>🛡️ Opportunités Sûres (${pm.counts.safeBets})</h4>
            <span class="matrix-tag">Accessible</span>
          </div>
          <p class="matrix-desc">Bonne adéquation, accessible facilement pour assurer un flux continu.</p>
          <div class="matrix-items">
            ${pm.safeBets.length === 0 ? '<div class="matrix-empty">Aucune opportunité secondaire</div>' : pm.safeBets.map(renderMatrixItem).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Roadmap Temporelle des Candidatures -->
    <div class="strategy-section">
      <h3 class="section-title">📅 2. Roadmap & Calendrier des Candidatures</h3>
      <p class="section-sub">Ordre chronologique d'action selon les dates limites et les délais d'instruction :</p>

      <div class="timeline-wrap">
        <!-- Cette semaine -->
        <div class="timeline-block">
          <div class="timeline-badge urgent">🔴 ${rm.thisWeek.label} (${rm.thisWeek.count})</div>
          ${rm.thisWeek.items.length === 0 ? '<p class="timeline-empty">Aucune deadline critique sous 7 jours.</p>' : rm.thisWeek.items.map(renderTimelineItem).join('')}
        </div>

        <!-- Sous 15 jours -->
        <div class="timeline-block">
          <div class="timeline-badge warning">🟠 ${rm.next2Weeks.label} (${rm.next2Weeks.count})</div>
          ${rm.next2Weeks.items.length === 0 ? '<p class="timeline-empty">Pas de date limite imminente sous 15 jours.</p>' : rm.next2Weeks.items.map(renderTimelineItem).join('')}
        </div>

        <!-- Veille active -->
        <div class="timeline-block">
          <div class="timeline-badge info">🟢 ${rm.ongoing.label} (${rm.ongoing.count})</div>
          ${rm.ongoing.items.length === 0 ? '<p class="timeline-empty">Aucune opportunité continue identifiée.</p>' : rm.ongoing.items.map(renderTimelineItem).join('')}
        </div>
      </div>
    </div>

    <!-- 4. Gap Analysis & Compétences à Développer -->
    <div class="strategy-section">
      <h3 class="section-title">📈 3. Gap Analysis : Compétences & Atouts à Développer</h3>
      <p class="section-sub">Ce qui manque dans votre profil pour décrocher encore plus d'opportunités du marché :</p>

      <div class="gap-grid">
        <div class="gap-card">
          <h4>🔍 Top Critères & Mots-Clés les plus demandés</h4>
          <p class="gap-sub">Ces éléments reviennent fréquemment dans les appels d'offres de votre secteur :</p>
          <div class="gap-list">
            ${ga.topMarketDemands.map(d => `
              <div class="gap-item">
                <div class="gap-item-top">
                  <span class="gap-keyword">🏷️ ${d.skill}</span>
                  <span class="gap-count">${d.demandCount} opportunités</span>
                </div>
                <div class="gap-tip">💡 ${d.tip}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="gap-card">
          <h4>📋 Actions Recommandées pour votre Rôle (${data.user.role})</h4>
          <p class="gap-sub">Plan d'amélioration pour optimiser votre taux de conversion :</p>
          <div class="action-list">
            ${ga.actionableRecommendations.map(a => `
              <div class="action-item">
                <div class="action-top">
                  <span class="action-cat">${a.category}</span>
                  <span class="action-priority ${a.priority}">${a.priority}</span>
                </div>
                <div class="action-title">${a.title}</div>
                <div class="action-desc">${a.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMatrixItem(opp) {
  return `
    <div class="matrix-card">
      <div class="matrix-card-title">${opp.title}</div>
      <div class="matrix-card-meta">
        <span>Score Match : <strong>${opp.score_pertinence}%</strong></span>
        <span>Impact : <strong>${opp.impactScore}%</strong></span>
      </div>
      <div class="matrix-card-advice">👉 ${opp.actionAdvice}</div>
      ${opp.url ? `<a href="${opp.url}" target="_blank" class="btn-link-sm">Voir l'offre ↗</a>` : ''}
    </div>
  `;
}

function renderTimelineItem(opp) {
  return `
    <div class="timeline-card">
      <div class="timeline-card-header">
        <span class="timeline-title">${opp.title}</span>
        <span class="timeline-deadline">${opp.urgency.label}</span>
      </div>
      <div class="timeline-meta">
        <span>📍 ${opp.country || 'Afrique'}</span>
        <span>🏷️ ${opp.sectors || 'Général'}</span>
        <span>Adéquation : <strong>${opp.score_pertinence}%</strong></span>
      </div>
      ${opp.url ? `<a href="${opp.url}" target="_blank" class="btn-link-sm">Accéder au dossier ↗</a>` : ''}
    </div>
  `;
}

// ─── CHARGEMENT DU MATCHING CLASSIQUE ───────────────────────────────────────
async function runMatching(profile) {
  document.getElementById('results-header').style.display = 'none';
  document.getElementById('results-list').innerHTML =
    `<div class="loading">🤖 Calcul du matching pour [${profile.role}] ${profile.nom}...</div>`;

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
