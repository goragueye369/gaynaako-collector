#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🤖 GAYNAAKO — MOTEUR DE MATCHING SÉMANTIQUE IA (BGE-M3 / SENTENCE-TRANSFORMERS)
Connecté directement à MySQL (gaynaako_profils & gaynaako_opportunities)

Calcule les embeddings neuronaux pour chaque profil (ENTREPRENEUR, PME, ONG)
et chaque opportunité, puis mesure la similarité cosinus (Score IA).
"""

import os
import sys
import json
import mysql.connector
import numpy as np

# Fix Windows console UTF-8 output
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Configuration des modèles
PRIMARY_MODEL = os.getenv('EMBEDDING_MODEL', 'BAAI/bge-m3')
FALLBACK_MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'

DB_PROFILS = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',
    'database': 'gaynaako_profils'
}

DB_OPPORTUNITIES = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',
    'database': 'gaynaako_opportunities'
}

def load_embedding_model(selected_model=None):
    """Charge le modèle d'embeddings IA sélectionné"""
    from sentence_transformers import SentenceTransformer
    target = selected_model or os.getenv('EMBEDDING_MODEL', FALLBACK_MODEL)
    print(f"🔄 Chargement du modèle IA : {target}...")
    try:
        model = SentenceTransformer(target)
        print(f"✅ Modèle {target} chargé avec succès !\n")
        return model, target
    except Exception as e:
        print(f"⚠️ {target} indisponible ({e})")
        print(f"🔄 Bascule automatique vers le modèle en cache : {FALLBACK_MODEL}...")
        model = SentenceTransformer(FALLBACK_MODEL)
        print(f"✅ Modèle {FALLBACK_MODEL} actif et prêt !\n")
        return model, FALLBACK_MODEL

def get_user_text(conn_prof, user_id=None):
    """Récupère et formate les textes des profils selon le rôle Prisma"""
    cursor = conn_prof.cursor(dictionary=True)
    query = "SELECT * FROM utilisateurs"
    params = ()
    if user_id:
        query += " WHERE id = %s"
        params = (user_id,)
    cursor.execute(query, params)
    users = cursor.fetchall()

    enriched_users = []
    for u in users:
        role = u['role']
        nom = ''
        sectors = []
        country = 'Sénégal'
        desc = ''

        if role == 'ENTREPRENEUR':
            cursor.execute("""
                SELECT ep.*, s.nom AS secteur_nom, p.nom AS pays_nom
                FROM entrepreneur_profiles ep
                JOIN secteurs s ON ep.secteur_id = s.id
                JOIN pays p ON ep.pays_id = p.id
                WHERE ep.utilisateur_id = %s
            """, (u['id'],))
            ep = cursor.fetchone()
            if ep:
                nom = ep['nom_complet'] or ''
                sectors = [ep['secteur_nom']]
                country = ep['pays_nom'] or 'Sénégal'
                desc = ep['objectifs'] or ''
                expertise = ep['domaine_expertise'] or ''
                text = f"Entrepreneur: {nom}. Domaine d'expertise: {expertise}. Secteur: {ep['secteur_nom']}. Pays: {country}. Objectifs: {desc}"
        elif role == 'PME':
            cursor.execute("SELECT * FROM pme_profiles WHERE utilisateur_id = %s", (u['id'],))
            pme = cursor.fetchone()
            if pme:
                nom = pme['nom_entreprise']
                cursor.execute("""
                    SELECT s.nom FROM secteurs s
                    JOIN pme_profiles_secteurs ps ON ps.secteur_id = s.id
                    WHERE ps.pme_id = %s
                """, (pme['id'],))
                sectors = [row['nom'] for row in cursor.fetchall()]
                text = f"PME: {nom}. Secteurs d'activité: {', '.join(sectors)}. Entreprise basée au Sénégal."
        elif role == 'ONG':
            cursor.execute("SELECT * FROM ong_profiles WHERE utilisateur_id = %s", (u['id'],))
            ong = cursor.fetchone()
            if ong:
                nom = ong['nom_organisation']
                cursor.execute("""
                    SELECT d.nom FROM domaines_intervention d
                    JOIN ong_profiles_domaines od ON od.domaine_id = d.id
                    WHERE od.ong_id = %s
                """, (ong['id'],))
                sectors = [row['nom'] for row in cursor.fetchall()]
                desc = ong['mission'] or ''
                text = f"Organisation Non Gouvernementale: {nom}. Domaines d'intervention: {', '.join(sectors)}. Mission: {desc}"

        enriched_users.append({
            'id': u['id'],
            'email': u['email'],
            'role': role,
            'nom': nom,
            'sectors': sectors,
            'country': country,
            'text_for_embedding': text
        })

    cursor.close()
    return enriched_users

def get_opportunities(conn_opp):
    """Charge les opportunités non expirées depuis gaynaako_opportunities"""
    cursor = conn_opp.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, title, description, sectors, country, quality_score, url, date_normalized, has_date
        FROM opportunities_processed
        WHERE has_date = 'non' OR date_normalized IS NULL OR date_normalized >= CURDATE()
        ORDER BY quality_score DESC
    """)
    opps = cursor.fetchall()
    cursor.close()

    for opp in opps:
        t = opp['title'] or ''
        s = opp['sectors'] or ''
        d = (opp['description'] or '')[:300]
        c = opp['country'] or 'Afrique'
        opp['text_for_embedding'] = f"Opportunité: {t}. Secteurs concernés: {s}. Pays: {c}. Description: {d}"

    return opps

def cosine_similarity(vec_a, vec_b):
    """Calcule la similarité cosinus entre 2 vecteurs"""
    dot = np.dot(vec_a, vec_b)
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))

def main():
    target_user_id = sys.argv[1] if len(sys.argv) > 1 else None

    print('╔══════════════════════════════════════════════════════════════════════╗')
    print('║   🧠 GAYNAAKO — RECOMMANDATION PAR EMBEDDINGS IA (BGE-M3 / MINI-LM)  ║')
    print('║   📊 Vectorisation neuronale + Similarité Cosinus + Règles Métier    ║')
    print('╚══════════════════════════════════════════════════════════════════════╝\n')

    # 1. Charger le modèle IA
    model, model_name = load_embedding_model()

    # 2. Connexions MySQL
    conn_prof = mysql.connector.connect(**DB_PROFILS)
    conn_opp = mysql.connector.connect(**DB_OPPORTUNITIES)

    try:
        users = get_user_text(conn_prof, target_user_id)
        opps = get_opportunities(conn_opp)

        print(f"👥 {len(users)} profil(s) chargé(s) depuis gaynaako_profils")
        print(f"📦 {len(opps)} opportunités valides chargées depuis gaynaako_opportunities\n")

        # 3. Précalculer les embeddings des opportunités (par batch pour la rapidité)
        print("⚡ Vectorisation des opportunités avec le modèle IA...")
        opp_texts = [o['text_for_embedding'] for o in opps]
        opp_embeddings = model.encode(opp_texts, show_progress_bar=False, normalize_embeddings=True)
        print("✅ Opportunités vectorisées en espace sémantique !\n")

        # 4. Pour chaque utilisateur, vectoriser et calculer les scores
        for u in users:
            print('═' * 70)
            role_icon = '👤' if u['role'] == 'ENTREPRENEUR' else ('🏢' if u['role'] == 'PME' else '🌍')
            print(f"{role_icon} [{u['role']}] — {u['nom'].upper()} ({u['email']})")
            print(f"   Secteurs / Domaines : {', '.join(u['sectors'])}")
            print(f"   📝 Texte vectorisé : {u['text_for_embedding'][:120]}...")
            print('═' * 70)

            # Embedding du profil utilisateur
            user_emb = model.encode(u['text_for_embedding'], normalize_embeddings=True)

            scored = []
            for i, opp in enumerate(opps):
                # Similarité sémantique pure IA (cosinus entre 0 et 1)
                ai_sim = cosine_similarity(user_emb, opp_embeddings[i])

                # Règle métier secteur (bonus / filtre)
                opp_sec = (opp['sectors'] or '').lower()
                sector_bonus = 0.0
                for sec in u['sectors']:
                    if sec.lower() in opp_sec:
                        sector_bonus = 0.15
                        break

                # Score Hybride : 70% Compréhension Sémantique IA + 30% Adéquation Métier
                final_score = min(1.0, (ai_sim * 0.70) + (sector_bonus * 0.30) + 0.10)

                scored.append({
                    'opp': opp,
                    'ai_similarity': ai_sim,
                    'final_score': final_score,
                    'pct': int(round(final_score * 100))
                })

            # Filtrer seuil 55% et trier
            qualified = [s for s in scored if s['pct'] >= 55]
            qualified.sort(key=lambda x: x['final_score'], reverse=True)
            top5 = qualified[:5]

            if not top5:
                print("⚠️ Aucune opportunité n'atteint le seuil minimal de 55% pour ce profil.\n")
                continue

            print(f"\n🏆 TOP {len(top5)} RECOMMANDATIONS PAR SIMILARITÉ IA ({model_name}) :\n")
            for rank, item in enumerate(top5, 1):
                opp = item['opp']
                pct = item['pct']
                bar = '█' * (pct // 10) + '░' * (10 - (pct // 10))
                print(f"  {rank}. [{pct}%] {bar}  {opp['title']}")
                print(f"     🧠 Similarité cosinus IA : {item['ai_similarity']:.3f} | Secteur : {opp['sectors'] or 'Général'}")
                if opp['url']:
                    print(f"     🔗 {opp['url']}")
                print()

        print("✅ Matching par IA terminé avec succès !\n")

    finally:
        conn_prof.close()
        conn_opp.close()

if __name__ == '__main__':
    main()
