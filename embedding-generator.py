#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Embedding Generator - Génération de vecteurs sémantiques
Utilise SentenceTransformer pour créer des embeddings multilingues
"""

import json
import os
import numpy as np
import mysql.connector
from sentence_transformers import SentenceTransformer
from datetime import datetime
from dotenv import load_dotenv
import sys

# Charger les variables d'environnement depuis .env
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Configuration MySQL
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'gaynaako_opportunities')
}

class EmbeddingGenerator:
    def __init__(self, model_name='paraphrase-multilingual-MiniLM-L12-v2'):
        """
        Initialise le générateur d'embeddings
        Modèle multilingue (FR, EN, etc.) - 384 dimensions
        """
        print(f"Chargement du modele : {model_name}")
        print("   (Premiere fois: telechargement ~500MB)")
        self.model = SentenceTransformer(model_name)
        print("Modele charge\n")
        self.embedding_dim = 384  # Dimension du modèle
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Génère un embedding pour un texte"""
        if not text or len(text.strip()) == 0:
            return np.zeros(self.embedding_dim)
        
        # Limiter la longueur (modèle max 128 tokens)
        text = text[:1000]
        
        # Générer l'embedding
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding
    
    def calculate_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """Calcule la similarité cosinus entre deux embeddings"""
        dot_product = np.dot(emb1, emb2)
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))

def create_embedding_table():
    """Crée la table pour stocker les embeddings"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS opportunity_embeddings (
            opportunity_id VARCHAR(12) PRIMARY KEY,
            embedding JSON NOT NULL,
            embedding_dim INT NOT NULL,
            model_name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (opportunity_id) REFERENCES opportunities_processed(id) ON DELETE CASCADE,
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    print("Table opportunity_embeddings creee")

def generate_all_embeddings():
    """Génère les embeddings pour toutes les opportunités"""
    print("=" * 60)
    print("EMBEDDING GENERATOR - Demarrage")
    print("=" * 60)
    print("")
    
    # Connexion MySQL
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    # Récupérer toutes les opportunités de qualité
    cursor.execute("""
        SELECT id, title, description 
        FROM opportunities_processed
        WHERE quality_score > 50
        ORDER BY collected_at DESC
    """)
    opportunities = cursor.fetchall()
    
    print(f"Opportunites a traiter : {len(opportunities)}\n")
    
    # Créer le générateur
    generator = EmbeddingGenerator()
    
    # Générer les embeddings
    print("Generation des embeddings...\n")
    embeddings_data = []
    
    for i, opp in enumerate(opportunities, 1):
        # Combiner titre et description
        text = f"{opp['title']} {opp['description'] or ''}"
        
        # Générer l'embedding
        embedding = generator.generate_embedding(text)
        
        # Convertir en liste pour JSON
        embedding_list = embedding.tolist()
        
        embeddings_data.append({
            'opportunity_id': opp['id'],
            'embedding': json.dumps(embedding_list),
            'embedding_dim': len(embedding_list),
            'model_name': 'paraphrase-multilingual-MiniLM-L12-v2'
        })
        
        if i % 10 == 0:
            print(f"   Généré : {i}/{len(opportunities)}")
    
    print(f"\nGeneration terminee : {len(embeddings_data)} embeddings\n")
    
    # Sauvegarder dans MySQL
    print("Sauvegarde dans MySQL...")
    
    cursor.execute("DELETE FROM opportunity_embeddings")  # Nettoyer avant
    
    insert_query = """
        INSERT INTO opportunity_embeddings 
        (opportunity_id, embedding, embedding_dim, model_name)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            embedding = VALUES(embedding),
            embedding_dim = VALUES(embedding_dim),
            model_name = VALUES(model_name),
            created_at = CURRENT_TIMESTAMP
    """
    
    for data in embeddings_data:
        cursor.execute(insert_query, (
            data['opportunity_id'],
            data['embedding'],
            data['embedding_dim'],
            data['model_name']
        ))
    
    conn.commit()
    print(f"{len(embeddings_data)} embeddings sauvegardes\n")
    
    # Test de similarité
    print("Test de similarite...\n")
    
    if len(embeddings_data) >= 2:
        emb1 = np.array(json.loads(embeddings_data[0]['embedding']))
        emb2 = np.array(json.loads(embeddings_data[1]['embedding']))
        similarity = generator.calculate_similarity(emb1, emb2)
        
        print(f"   Similarité entre 2 premières opportunités : {similarity:.3f}")
        print(f"   (0 = différent, 1 = identique)\n")
    
    cursor.close()
    conn.close()
    
    print("")
    print("=" * 60)
    print("EMBEDDINGS GENERES")
    print("=" * 60)
    print("")
    print(f"Résumé :")
    print(f"   - {len(embeddings_data)} opportunités")
    print(f"   - Dimension des vecteurs : 384")
    print(f"   - Modèle : multilingue (FR/EN)")
    print(f"   - Utilisation : recherche sémantique, similarité, recommandations\n")

def find_similar_opportunities(opportunity_id: str, limit: int = 5):
    """Trouve les opportunités similaires à une opportunité donnée"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    # Récupérer l'embedding de l'opportunité
    cursor.execute("""
        SELECT embedding FROM opportunity_embeddings
        WHERE opportunity_id = %s
    """, (opportunity_id,))
    
    result = cursor.fetchone()
    if not result:
        print(f"Opportunite {opportunity_id} non trouvee")
        return
    
    target_embedding = np.array(json.loads(result['embedding']))
    
    # Récupérer tous les autres embeddings
    cursor.execute("""
        SELECT oe.opportunity_id, oe.embedding, op.title, op.quality_score
        FROM opportunity_embeddings oe
        JOIN opportunities_processed op ON oe.opportunity_id = op.id
        WHERE oe.opportunity_id != %s
    """, (opportunity_id,))
    
    all_embeddings = cursor.fetchall()
    
    # Calculer les similarités
    generator = EmbeddingGenerator()
    similarities = []
    
    for emb_data in all_embeddings:
        embedding = np.array(json.loads(emb_data['embedding']))
        similarity = generator.calculate_similarity(target_embedding, embedding)
        
        similarities.append({
            'opportunity_id': emb_data['opportunity_id'],
            'title': emb_data['title'],
            'quality_score': emb_data['quality_score'],
            'similarity': similarity
        })
    
    # Trier par similarité
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    
    # Afficher les résultats
    print(f"\n🔍 Opportunités similaires à {opportunity_id}:\n")
    for i, sim in enumerate(similarities[:limit], 1):
        print(f"{i}. Similarité: {sim['similarity']:.3f}")
        print(f"   ID: {sim['opportunity_id']}")
        print(f"   Titre: {sim['title'][:80]}...")
        print(f"   Qualité: {sim['quality_score']}/100\n")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    try:
        create_embedding_table()
        generate_all_embeddings()
        
        # Test de recherche de similarité si demandé
        if len(sys.argv) > 1 and sys.argv[1] == "--test-similarity":
            # Prendre la première opportunité comme test
            conn = mysql.connector.connect(**DB_CONFIG)
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM opportunities_processed LIMIT 1")
            result = cursor.fetchone()
            if result:
                find_similar_opportunities(result[0])
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"\nErreur : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
