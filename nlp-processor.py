#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NLP Processor - Extraction d'informations avancée
Extrait: montants, dates limites, organisations, emails, mots-clés
"""

import re
import json
import pandas as pd
import mysql.connector
from datetime import datetime
from typing import Dict, List, Optional
import sys

# Configuration MySQL
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',  # Pas de mot de passe (XAMPP par défaut)
    'database': 'gaynaako_opportunities'
}

# Note: Ce script met à jour la table opportunities_processed
# Il ajoute les colonnes NLP à la table existante (pas de table séparée)

class NLPProcessor:
    def __init__(self):
        self.months_fr = {
            'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03',
            'avril': '04', 'mai': '05', 'juin': '06', 'juillet': '07',
            'août': '08', 'aout': '08', 'septembre': '09', 'octobre': '10',
            'novembre': '11', 'décembre': '12', 'decembre': '12'
        }
        
        self.months_en = {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12'
        }
    
    def extract_amounts(self, text: str) -> List[Dict]:
        """Extrait les montants du texte"""
        if not text:
            return []
        
        text_lower = text.lower()
        amounts = []
        
        # Patterns pour les montants
        patterns = [
            # 100 millions FCFA, 50M USD, 2.5 milliards
            r'(\d+(?:[.,]\d+)?)\s*(?:millions?|m)\s*(?:de\s+)?(?:fcfa|cfa|usd|eur|euro|dollars?)?',
            r'(\d+(?:[.,]\d+)?)\s*(?:milliards?|mds?|b)\s*(?:de\s+)?(?:fcfa|cfa|usd|eur|euro|dollars?)?',
            # 1,000,000 FCFA
            r'(\d{1,3}(?:[,\s]\d{3})+)\s*(?:fcfa|cfa|usd|eur|euro|dollars?)',
            # Budget: 50000000
            r'(?:budget|montant|financement)[\s:]+(\d{6,})',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                amount_str = match.group(1).replace(',', '').replace(' ', '')
                try:
                    amount = float(amount_str)
                    
                    # Convertir en valeur réelle
                    if 'milliard' in match.group(0) or 'mds' in match.group(0):
                        amount *= 1_000_000_000
                    elif 'million' in match.group(0) or match.group(0).endswith('m'):
                        amount *= 1_000_000
                    
                    # Détecter la devise
                    currency = 'FCFA'  # Par défaut
                    if 'usd' in match.group(0) or 'dollar' in match.group(0):
                        currency = 'USD'
                    elif 'eur' in match.group(0) or 'euro' in match.group(0):
                        currency = 'EUR'
                    
                    amounts.append({
                        'amount': int(amount),
                        'currency': currency,
                        'text': match.group(0)
                    })
                except (ValueError, AttributeError):
                    continue
        
        # Retourner le plus grand montant trouvé
        return sorted(amounts, key=lambda x: x['amount'], reverse=True)
    
    def extract_deadlines(self, text: str) -> List[str]:
        """Extrait les dates limites"""
        if not text:
            return []
        
        text_lower = text.lower()
        deadlines = []
        
        # Pattern 1: 15 septembre 2026, September 15 2026
        pattern1 = r'(\d{1,2})\s+(' + '|'.join(list(self.months_fr.keys()) + list(self.months_en.keys())) + r')\s+(\d{4})'
        matches1 = re.finditer(pattern1, text_lower, re.IGNORECASE)
        for match in matches1:
            day = match.group(1).zfill(2)
            month_name = match.group(2).lower()
            year = match.group(3)
            
            month = self.months_fr.get(month_name) or self.months_en.get(month_name)
            if month:
                deadlines.append(f"{year}-{month}-{day}")
        
        # Pattern 2: 15/09/2026, 15-09-2026
        pattern2 = r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})'
        matches2 = re.finditer(pattern2, text_lower)
        for match in matches2:
            day = match.group(1).zfill(2)
            month = match.group(2).zfill(2)
            year = match.group(3)
            
            # Convertir année sur 2 chiffres
            if len(year) == 2:
                year = f"20{year}"
            
            try:
                # Valider la date
                datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
                deadlines.append(f"{year}-{month}-{day}")
            except ValueError:
                continue
        
        # Pattern 3: 2026-09-15 (ISO)
        pattern3 = r'(\d{4})-(\d{2})-(\d{2})'
        matches3 = re.finditer(pattern3, text)
        for match in matches3:
            deadlines.append(match.group(0))
        
        return list(set(deadlines))  # Dédupliquer
    
    def extract_emails(self, text: str) -> List[str]:
        """Extrait les emails"""
        if not text:
            return []
        
        pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        return list(set(re.findall(pattern, text)))
    
    def extract_phones(self, text: str) -> List[str]:
        """Extrait les numéros de téléphone"""
        if not text:
            return []
        
        # Patterns pour téléphones sénégalais et internationaux
        patterns = [
            r'\+221\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}',  # +221 77 123 45 67
            r'\d{2}\s*\d{3}\s*\d{2}\s*\d{2}',  # 77 123 45 67
            r'\+\d{1,3}\s*\d{2,3}\s*\d{3}\s*\d{4}',  # Format international
        ]
        
        phones = []
        for pattern in patterns:
            phones.extend(re.findall(pattern, text))
        
        return list(set(phones))
    
    def extract_organizations(self, text: str) -> List[str]:
        """Extrait les noms d'organisations"""
        if not text:
            return []
        
        # Liste d'organisations connues
        known_orgs = [
            'Banque Mondiale', 'World Bank', 'BAD', 'Banque Africaine de Développement',
            'African Development Bank', 'PNUD', 'UNDP', 'Union Européenne',
            'European Union', 'USAID', 'GIZ', 'AFD', 'BID', 'FMI', 'IMF',
            'DER', 'ADEPME', 'ARCOP', 'ARMP', 'UNESCO', 'UNICEF', 'FAO',
            'OMS', 'WHO', 'Sonatel', 'Orange'
        ]
        
        found_orgs = []
        text_lower = text.lower()
        
        for org in known_orgs:
            if org.lower() in text_lower:
                found_orgs.append(org)
        
        return list(set(found_orgs))
    
    def extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """Extrait les mots-clés importants"""
        if not text:
            return []
        
        # Mots vides français et anglais
        stopwords = {
            'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
            'pour', 'dans', 'sur', 'avec', 'sans', 'est', 'sont', 'a', 'the', 'a',
            'an', 'and', 'or', 'but', 'for', 'in', 'on', 'with', 'is', 'are', 'was',
            'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'ce',
            'cette', 'ces', 'plus', 'très', 'tout', 'tous', 'toute', 'toutes'
        }
        
        # Extraire les mots (lettres uniquement, minimum 4 caractères)
        words = re.findall(r'\b[a-zàâäéèêëïîôùûüÿæœç]{4,}\b', text.lower())
        
        # Filtrer les stopwords
        keywords = [w for w in words if w not in stopwords]
        
        # Compter les occurrences
        word_freq = {}
        for word in keywords:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Trier par fréquence
        sorted_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        return [word for word, _ in sorted_keywords[:max_keywords]]
    
    def process_opportunity(self, opp: Dict) -> Dict:
        """Traite une opportunité et extrait toutes les informations"""
        text = f"{opp.get('title', '')} {opp.get('description', '')}"
        
        # Extraire toutes les informations
        amounts = self.extract_amounts(text)
        deadlines = self.extract_deadlines(text)
        emails = self.extract_emails(text)
        phones = self.extract_phones(text)
        organizations = self.extract_organizations(text)
        keywords = self.extract_keywords(text)
        
        # Calcul du score NLP (0-10)
        nlp_score = 0
        if amounts: nlp_score += 2
        if deadlines: nlp_score += 2
        if emails: nlp_score += 1
        if phones: nlp_score += 1
        if organizations: nlp_score += 2
        if keywords: nlp_score += 2
        
        return {
            'opportunity_id': opp.get('id'),
            'amounts': amounts,  # Liste complète
            'deadlines': deadlines,  # Liste complète
            'emails': emails,  # Liste complète
            'phones': phones,  # Liste complète
            'organizations': organizations,  # Liste complète
            'keywords': keywords,  # Liste complète
            'nlp_quality_score': min(nlp_score, 10),
            'processed_at': datetime.now().isoformat()
        }

def create_nlp_table():
    """OBSOLÈTE - Les colonnes NLP sont maintenant dans opportunities_processed"""
    pass

def process_all_opportunities():
    """Traite toutes les opportunités et met à jour les colonnes NLP"""
    print("=" * 60)
    print("NLP PROCESSOR - Demarrage")
    print("=" * 60)
    print("")
    
    # Connexion MySQL
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    # Récupérer toutes les opportunités
    cursor.execute("""
        SELECT id, title, description 
        FROM opportunities_processed
        WHERE quality_score > 50
    """)
    opportunities = cursor.fetchall()
    
    print(f"Opportunites a traiter : {len(opportunities)}\n")
    
    # Créer le processor
    processor = NLPProcessor()
    
    # Traiter chaque opportunité
    results = []
    for i, opp in enumerate(opportunities, 1):
        result = processor.process_opportunity(opp)
        results.append(result)
        
        if i % 10 == 0:
            print(f"   Traite : {i}/{len(opportunities)}")
    
    print(f"\nTraitement termine : {len(results)} opportunites\n")
    
    # Statistiques
    with_amount = sum(1 for r in results if r['amounts'])
    with_deadline = sum(1 for r in results if r['deadlines'])
    with_email = sum(1 for r in results if r['emails'])
    with_org = sum(1 for r in results if r['organizations'])
    
    print("Extractions reussies :")
    print(f"   Montants : {with_amount}/{len(results)} ({with_amount/len(results)*100:.1f}%)")
    print(f"   Dates limites : {with_deadline}/{len(results)} ({with_deadline/len(results)*100:.1f}%)")
    print(f"   Emails : {with_email}/{len(results)} ({with_email/len(results)*100:.1f}%)")
    print(f"   Organisations : {with_org}/{len(results)} ({with_org/len(results)*100:.1f}%)")
    
    # Mettre à jour MySQL avec les colonnes NLP
    print("\nMise a jour des colonnes NLP dans MySQL...")
    
    update_query = """
        UPDATE opportunities_processed 
        SET 
            nlp_amounts = %s,
            nlp_deadlines = %s,
            nlp_organizations = %s,
            nlp_emails = %s,
            nlp_phones = %s,
            nlp_keywords = %s,
            nlp_quality_score = %s,
            nlp_processed_at = %s
        WHERE id = %s
    """
    
    updated = 0
    for result in results:
        cursor.execute(update_query, (
            json.dumps(result['amounts'], ensure_ascii=False) if result['amounts'] else None,
            json.dumps(result['deadlines'], ensure_ascii=False) if result['deadlines'] else None,
            json.dumps(result['organizations'], ensure_ascii=False) if result['organizations'] else None,
            json.dumps(result['emails'], ensure_ascii=False) if result['emails'] else None,
            json.dumps(result['phones'], ensure_ascii=False) if result['phones'] else None,
            json.dumps(result['keywords'], ensure_ascii=False) if result['keywords'] else None,
            result['nlp_quality_score'],
            result['processed_at'],
            result['opportunity_id']
        ))
        updated += cursor.rowcount
    
    conn.commit()
    print(f"{updated} opportunites mises a jour avec les donnees NLP\n")
    
    # Statistiques finales
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(nlp_processed_at) as with_nlp,
            AVG(nlp_quality_score) as avg_nlp_score,
            AVG(quality_score) as avg_quality_score
        FROM opportunities_processed
    """)
    stats = cursor.fetchone()
    
    print("=" * 60)
    print("STATISTIQUES FINALES")
    print("=" * 60)
    print(f"Total opportunites       : {stats['total']}")
    print(f"Avec analyse NLP         : {stats['with_nlp']}")
    print(f"Score qualite moyen      : {stats['avg_quality_score']:.1f}/100")
    print(f"Score NLP moyen          : {stats['avg_nlp_score']:.1f}/10\n")
    
    cursor.close()
    conn.close()
    
    print("")
    print("=" * 60)
    print("NLP PROCESSING TERMINE")
    print("=" * 60)
    print("")

if __name__ == "__main__":
    try:
        # Plus besoin de create_nlp_table() car on utilise les colonnes dans opportunities_processed
        process_all_opportunities()
    except Exception as e:
        print(f"\nErreur : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
