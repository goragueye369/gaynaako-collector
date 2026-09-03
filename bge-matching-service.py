#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BGE-M3 Semantic Matching Service pour Gaynaako
Vectorise les profils utilisateurs et les opportunités avec BAAI/bge-m3
et calcule les scores de similarité sémantique par similarité cosinus.
"""

import os
import sys
import json
import argparse
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Tuple

# Modèles supportés (Priorité à BAAI/bge-m3)
DEFAULT_MODEL = os.getenv('EMBEDDING_MODEL', 'BAAI/bge-m3')
FALLBACK_MODEL = 'paraphrase-multilingual-MiniLM-L12-v2'

class BGEMatcher:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name
        self.model = None
        self._load_model()

    def _load_model(self):
        """Charge le modèle SentenceTransformer avec fallback gracieux"""
        try:
            from sentence_transformers import SentenceTransformer
            print(f"🔄 Chargement du modèle sémantique : {self.model_name}...")
            self.model = SentenceTransformer(self.model_name)
            print(f"✅ Modèle {self.model_name} chargé avec succès.\n")
        except Exception as e:
            print(f"⚠️ Impossible de charger {self.model_name} : {e}")
            print(f"🔄 Tentative avec le modèle de secours : {FALLBACK_MODEL}...")
            try:
                from sentence_transformers import SentenceTransformer
                self.model_name = FALLBACK_MODEL
                self.model = SentenceTransformer(self.model_name)
                print(f"✅ Modèle de secours {FALLBACK_MODEL} chargé avec succès.\n")
            except Exception as e2:
                print(f"❌ Erreur critique lors du chargement des modèles : {e2}")
                self.model = None

    @staticmethod
    def profile_to_text(profile: Dict[str, Any]) -> str:
        """Formate le profil candidat en texte riche pour la vectorisation"""
        title = profile.get('current_title', '')
        skills = ", ".join(profile.get('skills', [])) if isinstance(profile.get('skills'), list) else str(profile.get('skills', ''))
        sectors = ", ".join(profile.get('sectors', [])) if isinstance(profile.get('sectors'), list) else str(profile.get('sectors', ''))
        education = f"{profile.get('education_level', '')} en {profile.get('education_field', '')}"
        experience = f"{profile.get('experience_years', 0)} ans d'expérience ({profile.get('seniority_level', '')})"
        bio = profile.get('bio', '')

        text = f"Titre: {title}. Domaines: {sectors}. Compétences: {skills}. Formation: {education}. Expérience: {experience}. Description: {bio}"
        return text.strip()

    @staticmethod
    def opportunity_to_text(opp: Dict[str, Any]) -> str:
        """Formate l'opportunité en texte riche pour la vectorisation"""
        title = opp.get('title', '')
        desc = opp.get('description', '') or ''
        sectors = opp.get('sectors', '') or ''
        country = opp.get('country', '') or ''
        target = opp.get('target_audience', '') or ''
        
        keywords = ""
        if 'nlp_keywords' in opp and opp['nlp_keywords']:
            kw = opp['nlp_keywords']
            if isinstance(kw, str):
                try:
                    kw = json.loads(kw)
                except Exception:
                    pass
            if isinstance(kw, list):
                keywords = ", ".join(kw)

        text = f"Titre: {title}. Secteurs: {sectors}. Pays: {country}. Public: {target}. Mots-clés: {keywords}. Description: {desc}"
        return text.strip()

    def encode_text(self, text: str) -> np.ndarray:
        """Génère l'embedding d'un texte"""
        if not self.model:
            # Fallback simple pour simulation si dépendances manquantes
            return np.zeros(384)
        embedding = self.model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
        return embedding

    @staticmethod
    def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
        """Calcule la similarité cosinus (0.0 à 1.0)"""
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        score = np.dot(emb1, emb2) / (norm1 * norm2)
        return float(np.clip(score, 0.0, 1.0))

    def match_profile_with_opportunities(
        self, 
        profile: Dict[str, Any], 
        opportunities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Calcule le score de similarité IA entre un profil et une liste d'opportunités"""
        profile_text = self.profile_to_text(profile)
        profile_emb = self.encode_text(profile_text)

        results = []
        for opp in opportunities:
            opp_text = self.opportunity_to_text(opp)
            opp_emb = self.encode_text(opp_text)
            ai_score = self.cosine_similarity(profile_emb, opp_emb)

            results.append({
                'opportunity_id': opp.get('id'),
                'title': opp.get('title'),
                'sectors': opp.get('sectors'),
                'country': opp.get('country'),
                'ai_similarity_score': round(ai_score * 100, 2),
                'ai_score_raw': float(ai_score)
            })

        results.sort(key=lambda x: x['ai_similarity_score'], reverse=True)
        return results


def main():
    parser = argparse.ArgumentParser(description="Service de Matching Sémantique BGE-M3")
    parser.add_argument('--profile-id', type=str, help="ID du profil de benchmark à tester (ex: prof_001)")
    parser.add_argument('--limit', type=int, default=5, help="Nombre d'opportunités à retourner")
    args = parser.parse_args()

    # Charger les profils de référence
    profiles_path = os.path.join(os.path.dirname(__file__), 'data', 'benchmark_profiles.json')
    if not os.path.exists(profiles_path):
        print(f"❌ Fichier de profils introuvable : {profiles_path}")
        sys.exit(1)

    with open(profiles_path, 'r', encoding='utf-8') as f:
        profiles = json.load(f)

    target_profile = profiles[0]
    if args.profile_id:
        found = [p for p in profiles if p.get('id') == args.profile_id]
        if found:
            target_profile = found[0]

    print("=" * 70)
    print(f"🎯 MATCHING SÉMANTIQUE BGE-M3 POUR : {target_profile.get('full_name')} ({target_profile.get('current_title')})")
    print("=" * 70)

    matcher = BGEMatcher()
    profile_text = matcher.profile_to_text(target_profile)
    print(f"\n📝 Représentation textuelle du profil :\n{profile_text}\n")

    # Charger quelques opportunités de test ou depuis data/processed
    processed_dir = os.path.join(os.path.dirname(__file__), 'data', 'processed')
    opportunities = []

    if os.path.exists(processed_dir):
        files = [f for f in os.listdir(processed_dir) if f.endswith('.csv')]
        if files:
            import pandas as pd
            latest_file = sorted(files)[-1]
            df = pd.read_csv(os.path.join(processed_dir, latest_file))
            opportunities = df.head(20).to_dict(orient='records')

    if not opportunities:
        # Exemples simulés si pas de fichier CSV disponible
        opportunities = [
            {
                "id": "opp_1",
                "title": "Recrutement d'un Consultant Expert en Intelligence Artificielle et Machine Learning",
                "description": "Projet de transformation numérique visant à déployer des algorithmes de NLP et d'apprentissage automatique pour l'analyse prédictive des données.",
                "sectors": "technologie",
                "country": "Sénégal"
            },
            {
                "id": "opp_2",
                "title": "Fourniture et installation de mini-centrales solaires photovoltaïques en milieu rural",
                "description": "Projet d'électrification rurale par énergie solaire, audit énergétique et raccordement au réseau.",
                "sectors": "energie, infrastructure",
                "country": "Sénégal"
            },
            {
                "id": "opp_3",
                "title": "Appui au développement de la filière agropastorale et irrigation dans la vallée du fleuve",
                "description": "Renforcement de la chaîne de valeur agricole, formation des coopératives paysannes et gestion durable de l'eau.",
                "sectors": "agriculture, eau",
                "country": "Sénégal"
            }
        ]

    matches = matcher.match_profile_with_opportunities(target_profile, opportunities)

    print(f"\n🏆 Top {min(args.limit, len(matches))} des opportunités par similarité sémantique :")
    for i, m in enumerate(matches[:args.limit], 1):
        print(f"\n{i}. [{m['ai_similarity_score']}%] {m['title']}")
        print(f"   Secteurs : {m.get('sectors')} | Pays : {m.get('country')}")

if __name__ == '__main__':
    main()
