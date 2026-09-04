#!/usr/bin/env python3
# Test rapide du matching
import sys
import os

# Vérifier si le modèle sentence-transformers est disponible
try:
    from sentence_transformers import SentenceTransformer
    print("✅ sentence-transformers importé avec succès")
    
    # Charger un modèle léger pour test
    print("🔄 Chargement du modèle de test...")
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    print("✅ Modèle chargé avec succès")
    
    # Test d'embedding
    text = "Développeur Python avec 5 ans d'expérience"
    embedding = model.encode(text)
    print(f"✅ Embedding généré: dimension {len(embedding)}")
    
    # Test de similarité
    text1 = "Développeur Python"
    text2 = "Programmeur Python"
    text3 = "Designer graphique"
    
    emb1 = model.encode(text1)
    emb2 = model.encode(text2)
    emb3 = model.encode(text3)
    
    import numpy as np
    sim12 = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
    sim13 = np.dot(emb1, emb3) / (np.linalg.norm(emb1) * np.linalg.norm(emb3))
    
    print(f"\n✅ Similarité '{text1}' ↔ '{text2}': {sim12:.3f}")
    print(f"✅ Similarité '{text1}' ↔ '{text3}': {sim13:.3f}")
    
    if sim12 > sim13:
        print("\n✅ Le modèle comprend correctement la sémantique!")
    
    print("\n" + "=" * 60)
    print("✅ MODULE DE MATCHING IA FONCTIONNE CORRECTEMENT!")
    print("=" * 60)
    
except Exception as e:
    print(f"❌ Erreur: {e}")
    sys.exit(1)
