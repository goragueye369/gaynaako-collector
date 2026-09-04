#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎯 GAYNAAKO — STRATÉGIE DE CANDIDATURE IA

Aide l'utilisateur à définir une stratégie de recherche et de candidature.
Détermine :
- Quelles opportunités privilégier
- Quelles sont les plus adaptées au profil
- Quelles candidatures faire en priorité
- Quelles compétences améliorer pour accéder à davantage d'opportunités
"""

import sys
import json
import mysql.connector
from datetime import datetime
from typing import Dict, List, Optional

# Configuration MySQL
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


class StrategyAdvisor:
    """Conseiller stratégique IA pour les candidatures"""
    
    def __init__(self):
        self.today = datetime.now().strftime('%Y-%m-%d')
    
    def load_user_profile(self, conn, user_id: str) -> Dict:
        """Charge le profil utilisateur complet"""
        cursor = conn.cursor(dictionary=True)
        
        # Récupérer l'utilisateur
        cursor.execute("SELECT * FROM utilisateurs WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return None
        
        profile = {
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'nom': '',
            'competences': [],
            'secteurs': [],
            'country': 'Sénégal',
            'objectifs': ''
        }
        
        # Récupérer les détails selon le rôle
        if user['role'] == 'ENTREPRENEUR':
            cursor.execute("""
                SELECT ep.*, s.nom AS secteur_nom, p.nom AS pays_nom
                FROM entrepreneur_profiles ep
                JOIN secteurs s ON ep.secteur_id = s.id
                JOIN pays p ON ep.pays_id = p.id
                WHERE ep.utilisateur_id = %s
            """, (user_id,))
            ep = cursor.fetchone()
            if ep:
                profile['nom'] = ep['nom_complet'] or ''
                profile['secteurs'] = [ep['secteur_nom']]
                profile['country'] = ep['pays_nom'] or 'Sénégal'
                profile['objectifs'] = ep['objectifs'] or ''
                # Extraire les compétences du domaine d'expertise
                expertise = ep['domaine_expertise'] or ''
                profile['competences'] = self._extract_skills(expertise)
        
        elif user['role'] == 'PME':
            cursor.execute("SELECT * FROM pme_profiles WHERE utilisateur_id = %s", (user_id,))
            pme = cursor.fetchone()
            if pme:
                profile['nom'] = pme['nom_entreprise']
                profile['objectifs'] = pme.get('description', '') or ''
                # Récupérer les secteurs
                cursor.execute("""
                    SELECT s.nom FROM secteurs s
                    JOIN pme_profiles_secteurs ps ON ps.secteur_id = s.id
                    WHERE ps.pme_id = %s
                """, (pme['id'],))
                profile['secteurs'] = [row['nom'] for row in cursor.fetchall()]
        
        elif user['role'] == 'ONG':
            cursor.execute("SELECT * FROM ong_profiles WHERE utilisateur_id = %s", (user_id,))
            ong = cursor.fetchone()
            if ong:
                profile['nom'] = ong['nom_organisation']
                profile['objectifs'] = ong['mission'] or ''
                # Récupérer les domaines
                cursor.execute("""
                    SELECT d.nom FROM domaines_intervention d
                    JOIN ong_profiles_domaines od ON od.domaine_id = d.id
                    WHERE od.ong_id = %s
                """, (ong['id'],))
                profile['secteurs'] = [row['nom'] for row in cursor.fetchall()]
        
        cursor.close()
        return profile
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extrait les compétences d'un texte"""
        if not text:
            return []
        
        # Liste de compétences communes (à étendre)
        common_skills = [
            'python', 'django', 'react', 'node.js', 'javascript', 'java', 'c++',
            'machine learning', 'deep learning', 'data science', 'sql', 'mysql',
            'postgres', 'docker', 'aws', 'linux', 'git', 'api rest', 'backend',
            'frontend', 'full stack', 'design', 'ui', 'ux', 'marketing',
            'finance', 'gestion', 'comptabilité', 'juridique', 'commercial',
            'vente', 'relation client', 'support', 'customer service',
            'anglais', 'français', 'rh', 'recrutement', 'formation',
            'management', 'leadership', 'stratégie', 'planning'
        ]
        
        skills_found = []
        text_lower = text.lower()
        
        for skill in common_skills:
            if skill in text_lower:
                skills_found.append(skill)
        
        return list(set(skills_found))
    
    def load_opportunities(self, conn) -> List[Dict]:
        """Charge toutes les opportunités valides"""
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, title, description, sectors, country, quality_score,
                   nlp_deadlines, nlp_amounts, target_audience, experience_required,
                   urgency, budget_range, url, collected_at
            FROM opportunities_processed
            WHERE has_date = 'non'
               OR date_normalized IS NULL
               OR date_normalized >= %s
            ORDER BY quality_score DESC
        """, (self.today,))
        
        opportunities = cursor.fetchall()
        cursor.close()
        
        return opportunities
    
    def _extract_deadline(self, opp: Dict) -> Optional[str]:
        """Extrait la deadline d'une opportunité"""
        if opp.get('nlp_deadlines'):
            try:
                deadlines = json.loads(opp['nlp_deadlines'])
                if deadlines:
                    return deadlines[0]
            except:
                pass
        return None
    
    def _extract_budget(self, opp: Dict) -> Optional[int]:
        """Extrait le budget d'une opportunité"""
        if opp.get('nlp_amounts'):
            try:
                amounts = json.loads(opp['nlp_amounts'])
                if amounts:
                    return amounts[0].get('amount', 0)
            except:
                pass
        return None
    
    def calculate_urgency_score(self, deadline: Optional[str]) -> int:
        """Calcule le score d'urgence (basé sur la deadline proche)"""
        if not deadline:
            return 0  # Pas d'urgence (pas de deadline)
        
        try:
            deadline_date = datetime.strptime(deadline, '%Y-%m-%d')
            days_until = (deadline_date - datetime.now()).days
            
            if days_until <= 7:
                return 100  # Urgent
            elif days_until <= 30:
                return 75  # Prioritaire
            elif days_until <= 90:
                return 50  # Normal
            else:
                return 25  # Pas urgent
        except:
            return 50  # Par défaut
    
    def calculate_attractiveness_score(self, opp: Dict) -> int:
        """Calcule le score d'attractivité de l'opportunité"""
        score = 0
        
        # Budget élevé = +30 points
        budget = self._extract_budget(opp)
        if budget and budget > 100000000:  # > 100M FCFA
            score += 30
        elif budget and budget > 50000000:  # > 50M FCFA
            score += 20
        elif budget and budget > 10000000:  # > 10M FCFA
            score += 10
        
        # Qualité élevée = +25 points
        quality = opp.get('quality_score', 0)
        score += min(25, quality // 4)
        
        # Urgence "Normal" = +20 points (pas trop urgent, pas trop lointain)
        urgency = opp.get('urgency', 'Normal')
        if urgency == 'Normal':
            score += 20
        elif urgency == 'Urgent':
            score += 10
        
        # Budget "Moyen" = +15 points (plus de chances)
        budget_range = opp.get('budget_range', '')
        if budget_range == 'Moyen':
            score += 15
        
        return min(100, score)
    
    def calculate_match_score(self, profile: Dict, opp: Dict) -> int:
        """Calcule le score de match entre profil et opportunité"""
        score = 0
        
        # Secteurs match = +40 points
        opp_sectors = (opp.get('sectors') or '').lower()
        for sector in profile.get('secteurs', []):
            if sector.lower() in opp_sectors:
                score += 40
                break
        
        # Quality score = +30 points
        quality = opp.get('quality_score', 0)
        score += min(30, quality // 3)
        
        # Domaine expertise (entrepreneur) = +20 points
        if profile['role'] == 'ENTREPRENEUR':
            expertise = (profile.get('objectifs') or '').lower()
            title = (opp.get('title') or '').lower()
            if any(skill in title for skill in profile.get('competences', [])):
                score += 20
        
        return min(100, score)
    
    def analyze_skill_gaps(self, profile: Dict, opportunities: List[Dict]) -> Dict:
        """Analyse les gaps de compétences par rapport aux opportunités"""
        missing_skills = {}
        required_skills = set()
        
        # Collecter les compétences requises par les opportunités
        for opp in opportunities:
            title = (opp.get('title') or '').lower()
            description = (opp.get('description') or '').lower()
            keywords = (opp.get('nlp_keywords') or '[]')
            
            try:
                keywords = json.loads(keywords)
            except:
                keywords = []
            
            # Extraire les compétences
            all_text = f"{title} {description} {' '.join(keywords)}"
            
            for skill in profile.get('competences', []):
                if skill in all_text and skill not in profile.get('competences', []):
                    required_skills.add(skill)
        
        # Comparer avec les compétences du profil
        profile_skills = set(profile.get('competences', []))
        
        missing = required_skills - profile_skills
        
        # Donner des suggestions
        suggestions = []
        for skill in missing:
            suggestions.append({
                'skill': skill,
                'reason': f"Requis par {len(opportunities)} opportunités",
                'importance': 'medium'
            })
        
        return {
            'total_missing': len(missing),
            'missing_skills': list(missing)[:10],  # Top 10
            'suggestions': suggestions[:5],  # Top 5 suggestions
            'profile_skills': list(profile_skills)
        }
    
    def prioritize_opportunities(self, profile: Dict, opportunities: List[Dict]) -> List[Dict]:
        """Priorise les opportunités pour un profil"""
        scored = []
        
        for opp in opportunities:
            # Score de match profil ↔ opportunité
            match_score = self.calculate_match_score(profile, opp)
            
            # Score d'urgence
            deadline = self._extract_deadline(opp)
            urgency_score = self.calculate_urgency_score(deadline)
            
            # Score d'attractivité
            attractiveness_score = self.calculate_attractiveness_score(opp)
            
            # Score global pondéré
            # 50% match profil, 25% urgence, 25% attractivité
            global_score = (
                match_score * 0.50 +
                urgency_score * 0.25 +
                attractiveness_score * 0.25
            )
            
            scored.append({
                'opportunite': opp,
                'match_score': match_score,
                'urgency_score': urgency_score,
                'attractiveness_score': attractiveness_score,
                'global_score': global_score,
                'deadline': deadline,
                'budget': self._extract_budget(opp)
            })
        
        # Trier par score global
        scored.sort(key=lambda x: x['global_score'], reverse=True)
        
        return scored
    
    def generate_strategy_report(self, profile: Dict, opportunities: List[Dict]) -> Dict:
        """Génère un rapport stratégique complet"""
        
        # 1. Prioriser les opportunités
        prioritized = self.prioritize_opportunities(profile, opportunities)
        
        # 2. Analyser les gaps de compétences
        skill_gaps = self.analyze_skill_gaps(profile, opportunities)
        
        # 3. Créer le rapport
        report = {
            'profile': {
                'id': profile['id'],
                'nom': profile['nom'],
                'email': profile['email'],
                'role': profile['role'],
                'secteurs': profile['secteurs'],
                'competences': profile['competences']
            },
            'opportunities_analyzed': len(opportunities),
            'strategic_recommendations': {
                'prioritized_opportunities': prioritized[:5],  # Top 5
                'skill_improvements': skill_gaps['suggestions'],
                'optimization_tips': self._generate_tips(profile, prioritized)
            },
            'summary': {
                'top_1_urgency': prioritized[0]['urgency_score'] if prioritized else 0,
                'top_1_match': prioritized[0]['match_score'] if prioritized else 0,
                'avg_match_score': sum(s['match_score'] for s in prioritized[:10]) / min(10, len(prioritized)) if prioritized else 0,
                'skill_gaps_count': skill_gaps['total_missing']
            },
            'generated_at': datetime.now().isoformat()
        }
        
        return report
    
    def _generate_tips(self, profile: Dict, prioritized: List[Dict]) -> List[str]:
        """Génère des conseils d'optimisation"""
        tips = []
        
        # Conseil 1 : Urgence
        urgent_count = sum(1 for p in prioritized if p['urgency_score'] >= 75)
        if urgent_count >= 3:
            tips.append({
                'title': '⏳ Urgence',
                'text': f"{urgent_count} opportunités ont une deadline proche (≤30 jours). Priorisez-les !",
                'action': 'Postuler rapidement'
            })
        
        # Conseil 2 : Budget
        high_budget = [p for p in prioritized if p['budget'] and p['budget'] > 50000000]
        if high_budget:
            tips.append({
                'title': '💰 Budget',
                'text': f"{len(high_budget)} opportunités ont un budget élevé (>50M FCFA)",
                'action': 'Cibler ces opportunités'
            })
        
        # Conseil 3 : Match
        good_matches = [p for p in prioritized if p['match_score'] >= 80]
        if good_matches:
            tips.append({
                'title': '🎯 Match',
                'text': f"{len(good_matches)} opportunités correspondent très bien à votre profil",
                'action': 'Focus sur ces candidatures'
            })
        
        # Conseil 4 : Diversité
        unique_sectors = set()
        for p in prioritized:
            opp = p['opportunite']
            sectors = (opp.get('sectors') or '').split(',')
            unique_sectors.update([s.strip().lower() for s in sectors])
        
        if len(unique_sectors) <= 2 and len(prioritized) > 5:
            tips.append({
                'title': '🔄 Diversification',
                'text': "Les recommandations sont concentrées sur peu de secteurs. Élargissez votre recherche.",
                'action': 'Explorer d\'autres secteurs'
            })
        
        return tips[:5]  # Top 5 conseils


def run_strategy_advisor(user_id: Optional[str] = None, use_recommendations: bool = False):
    """Fonction principale
    
    Args:
        user_id: ID utilisateur (optionnel)
        use_recommendations: Si True, utilise les recommandations du Module 1 (plus rapide)
                            Si False, recalcul tout à partir des opportunités brutes
    """
    print("=" * 70)
    print("🎯 GAYNAAKO — CONSEILLER STRATÉGIQUE DE CANDIDATURE")
    print("=" * 70)
    print()
    
    # Connexions
    conn_prof = mysql.connector.connect(**DB_PROFILS)
    conn_opp = mysql.connector.connect(**DB_OPPORTUNITIES)
    
    try:
        # Charger les opportunités
        print("📦 Chargement des opportunités...")
        if use_recommendations:
            # Utiliser les recommandations du Module 1 (plus rapide)
            cursor_prof = conn_prof.cursor(dictionary=True)
            cursor_opp = conn_opp.cursor(dictionary=True)
            if user_id:
                cursor_prof.execute("""
                    SELECT r.opportunite_id
                    FROM recommandations r
                    WHERE r.utilisateur_id = %s
                    ORDER BY r.score_pertinence DESC
                    LIMIT 20
                """, (user_id,))
                recs = cursor_prof.fetchall()
                opport_ids = [r['opportunite_id'] for r in recs]
                
                # Charger les détails des opportunités
                if opport_ids:
                    placeholders = ','.join(['%s'] * len(opport_ids))
                    cursor_opp.execute(f"""
                        SELECT id, title, description, sectors, country, quality_score,
                               nlp_deadlines, nlp_amounts, urgency, budget_range
                        FROM opportunities_processed
                        WHERE id IN ({placeholders})
                    """, opport_ids)
                    opportunities = cursor_opp.fetchall()
                else:
                    opportunities = []
                print(f"   {len(opportunities)} opportunités valides chargées")
                print("   (Utilise recommandations du Module 1)")
                cursor_prof.close()
                cursor_opp.close()
            else:
                # Pour tous les utilisateurs, charger les opportunités normalement
                opportunities = StrategyAdvisor().load_opportunities(conn_opp)
        else:
            # Recalculer tout à partir des opportunités brutes
            opportunities = StrategyAdvisor().load_opportunities(conn_opp)
        
        print()
        
        # Charger les profils
        advisor = StrategyAdvisor()
        
        if user_id:
            users = [advisor.load_user_profile(conn_prof, user_id)]
            # Si on utilise les recommandations, charger les opportunités pour cet utilisateur
            if use_recommendations:
                cursor_prof = conn_prof.cursor(dictionary=True)
                cursor_opp = conn_opp.cursor(dictionary=True)
                cursor_prof.execute("""
                    SELECT r.opportunite_id
                    FROM recommandations r
                    WHERE r.utilisateur_id = %s
                    ORDER BY r.score_pertinence DESC
                    LIMIT 20
                """, (user_id,))
                recs = cursor_prof.fetchall()
                opport_ids = [r['opportunite_id'] for r in recs]
                
                if opport_ids:
                    placeholders = ','.join(['%s'] * len(opport_ids))
                    cursor_opp.execute(f"""
                        SELECT id, title, description, sectors, country, quality_score,
                               nlp_deadlines, nlp_amounts, urgency, budget_range
                        FROM opportunities_processed
                        WHERE id IN ({placeholders})
                    """, opport_ids)
                    opportunities = cursor_opp.fetchall()
                else:
                    opportunities = []
                cursor_prof.close()
                cursor_opp.close()
        else:
            # Charger tous les profils
            cursor = conn_prof.cursor(dictionary=True)
            cursor.execute("SELECT id FROM utilisateurs")
            users = [advisor.load_user_profile(conn_prof, row['id']) for row in cursor.fetchall()]
            cursor.close()
        
        print(f"👤 {len(users)} profil(s) à analyser")
        print(f"📊 Mode: {'Recommandations (Rapide)' if use_recommendations else 'Opportunités complètes (Complet)'}")
        print()
        
        # Pour chaque profil
        for profile in users:
            if not profile:
                continue
            
            role_icon = '👤' if profile['role'] == 'ENTREPRENEUR' else ('🏢' if profile['role'] == 'PME' else '🌍')
            print("=" * 70)
            print(f"{role_icon} {profile['nom']} ({profile['email']})")
            print(f"   Secteurs : {', '.join(profile['secteurs'])}")
            print(f"   Compétences : {', '.join(profile['competences'][:5])}...")
            print("=" * 70)
            
            # Générer le rapport
            report = advisor.generate_strategy_report(profile, opportunities)
            
            print()
            print("📊 RAPPORT STRATÉGIQUE")
            print("-" * 70)
            
            # Résumé
            summary = report['summary']
            print(f"\n📈 Résumé :")
            print(f"   - {report['opportunities_analyzed']} opportunités analysées")
            print(f"   - Match moyen : {summary['avg_match_score']:.0f}%")
            print(f"   - Gaps de compétences : {summary['skill_gaps_count']}")
            
            # Top 5 priorisé
            print(f"\n🏆 TOP 5 RECOMMANDATIONS (stratégiques) :")
            for i, item in enumerate(report['strategic_recommendations']['prioritized_opportunities'][:5], 1):
                opp = item['opportunite']
                print(f"\n   {i}. [{item['global_score']:.0f}%] {opp['title']}")
                print(f"      - Match profil : {item['match_score']:.0f}%")
                print(f"      - Urgence : {item['urgency_score']}/100")
                print(f"      - Attractivité : {item['attractiveness_score']}/100")
                if item['deadline']:
                    print(f"      - Deadline : {item['deadline']}")
                if item['budget']:
                    print(f"      - Budget : {item['budget']:,} FCFA")
            
            # Gaps de compétences
            if report['strategic_recommendations']['skill_improvements']:
                print(f"\n📚 AMÉLIORATIONS RECOMMANDÉES :")
                for skill in report['strategic_recommendations']['skill_improvements'][:3]:
                    print(f"   - {skill['skill'].upper()}: {skill['reason']}")
            
            # Conseils
            if report['strategic_recommendations']['optimization_tips']:
                print(f"\n💡 CONSEILS D'OPTIMISATION :")
                for tip in report['strategic_recommendations']['optimization_tips']:
                    print(f"   🎯 {tip['title']}: {tip['text']}")
                    print(f"      Action : {tip['action']}")
            
            print()
        
        print("=" * 70)
        print("✅ STRATÉGIE GENERÉE AVEC SUCCÈS")
        print("=" * 70)
        
    finally:
        conn_prof.close()
        conn_opp.close()


if __name__ == "__main__":
    # Configuration UTF-8 pour Windows
    import io
    import sys
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    # Parse arguments
    user_id = sys.argv[1] if len(sys.argv) > 1 else None
    use_recommendations = '--use-recs' in sys.argv or '-r' in sys.argv
    
    run_strategy_advisor(user_id, use_recommendations=use_recommendations)
