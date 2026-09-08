# 🚀 Architecture des Serveurs Gaynaako

## Vue d'ensemble

Le système Gaynaako est composé de **3 serveurs Node.js** qui travaillent ensemble :

```
┌─────────────────────────────────────────────────────────────┐
│                    GAYNAAKO ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🌐 SERVER-UI (Port 3000)                                   │
│     └─ Interface de test unifiée                            │
│     └─ Matching + Stratégie + Candidature                   │
│     └─ Fichiers: matching/server-ui.js                      │
│     └─ Interface: matching/public/index.html                │
│                                                              │
│  📡 API-SERVER (Port 3001)                                  │
│     └─ API REST principale                                  │
│     └─ Endpoints opportunités, stats, recommandations       │
│     └─ Fichiers: api-server.js                              │
│                                                              │
│  💬 CHATBOT-SERVER (Port 3002)                              │
│     └─ Chatbot IA avec Groq                                 │
│     └─ RAG + LLM Llama 3.3 70B                              │
│     └─ Fichiers: matching/chatbot-server.js                 │
│     └─ Interface: matching/public/chat-interface.html       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Serveur 1 : SERVER-UI (Port 3000)

**Interface principale de test unifiée**

### Démarrage
```bash
node matching/server-ui.js
```

### URL d'accès
```
http://localhost:3000
```

### Fonctionnalités
- ✅ **Module 1** : Matching sémantique (BGE-M3)
- ✅ **Module 2** : Stratégie & Plan d'action IA
- ✅ **Module 3** : Candidature préremplie (sans hallucination)
- 🔗 Lien vers le Chatbot (port 3002)

### Endpoints exposés
- `GET /` - Interface HTML unifiée
- `GET /api/profiles` - Liste des profils depuis `gaynaako_profils`
- `POST /api/match` - Calcul du matching pour un profil
- `GET /api/strategy/:userId` - Diagnostic stratégique IA
- `/api/candidature/*` - Routes du module candidature

### Base de données
- **Lecture** : `gaynaako_profils` (profils utilisateurs)
- **Lecture** : `gaynaako_opportunities` (opportunités)

---

## 📡 Serveur 2 : API-SERVER (Port 3001)

**API REST principale pour l'écosystème Gaynaako**

### Démarrage
```bash
node api-server.js
```

### URL d'accès
```
http://localhost:3001
```

### Endpoints principaux
- `GET /api/opportunities` - Liste des opportunités enrichies
- `GET /api/opportunities/:id` - Détails d'une opportunité
- `GET /api/search?q=keyword` - Recherche textuelle
- `GET /api/statistics` - Statistiques globales
- `GET /api/recommendations/:userId` - Recommandations IA
- `GET /api/strategy/:userId` - Rapport stratégique
- `POST /api/matching/run` - Déclencher le matching BGE-M3

### Base de données
- **Lecture/Écriture** : `gaynaako_profils`
- **Lecture/Écriture** : `gaynaako_opportunities`

---

## 💬 Serveur 3 : CHATBOT-SERVER (Port 3002)

**Assistant IA conversationnel avec RAG**

### Démarrage
```bash
node matching/chatbot-server.js
```

### URL d'accès
```
http://localhost:3002
```

### Configuration requise
- ✅ `GROQ_API_KEY` dans `.env`
- ✅ Modèle : `llama-3.3-70b-versatile` (Groq)

### Fonctionnalités
- 🤖 RAG (Retrieval-Augmented Generation)
- 💡 Recherche d'opportunités par conversation
- 📊 Analyse d'éligibilité
- ✍️ Aide à la rédaction
- 🎯 Conseils stratégiques
- 🗣️ Transcription audio (Groq Whisper)

### Endpoints exposés
- `POST /api/chat` - Envoyer un message au chatbot
- `POST /api/chat/transcribe` - Transcrire un audio
- `POST /api/chat/session` - Créer une session
- `GET /api/chat/session/:id/history` - Historique
- `GET /api/chat/health` - Santé du service
- `POST /api/chat/login` - Connexion/création compte

### Base de données
- **Lecture** : `gaynaako_profils` (profils utilisateurs)
- **Lecture** : `gaynaako_opportunities` (opportunités)
- **Écriture** : `conversation_history`, `chat_sessions`

---

## 🔧 Démarrage Complet du Système

### 1. Avec PM2 (Recommandé)
```bash
pm2 start ecosystem.config.js
pm2 status
pm2 logs
```

### 2. Manuellement (3 terminaux)
```bash
# Terminal 1 : Interface de test
node matching/server-ui.js

# Terminal 2 : API principale
node api-server.js

# Terminal 3 : Chatbot IA
node matching/chatbot-server.js
```

---

## 🔑 Variables d'Environnement

Fichier `.env` à la racine :

```env
# API Groq pour le Chatbot
GROQ_API_KEY=votre_clé_api_groq_ici
GROQ_MODEL=llama-3.2-90b-text-preview

# Base de données MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=

# Base profils
DB_PROFILS_NAME=gaynaako_profils
DB_PROFILS_USER=root
DB_PROFILS_PASSWORD=

# Base opportunités
DB_NAME=gaynaako_opportunities

# Ports des serveurs
PORT=3001                # API Server
CHATBOT_PORT=3002        # Chatbot Server
# SERVER_UI est en dur sur 3000 dans matching/server-ui.js
```

---

## 📊 Bases de Données

### gaynaako_profils
- `utilisateurs`
- `entrepreneur_profiles`
- `pme_profiles`
- `ong_profiles`
- `recommandations` (Module 1)
- `candidatures` (Module 3)
- `chat_sessions`, `conversation_history` (Module 4)

### gaynaako_opportunities
- `opportunities_processed`
- `opportunity_embeddings`

---

## ✅ Tests de Fonctionnement

### 1. Tester l'interface principale
```
http://localhost:3000
→ Doit afficher l'interface avec 3 onglets (Stratégie, Matching, Candidature)
```

### 2. Tester le chatbot
```
http://localhost:3002
→ Doit afficher l'interface de chat
```

### 3. Vérifier la santé des services
```bash
# API principale
curl http://localhost:3001/api/health

# Chatbot
curl http://localhost:3002/api/chat/health
```

---

## 🐛 Résolution des Problèmes

### Erreur : "404 model not found"
✅ **CORRIGÉ** : Le modèle a été changé en `llama-3.3-70b-versatile`

### Erreur : "Table gaynaako_opportunities.utilisateurs doesn't exist"
✅ **CORRIGÉ** : Les routes utilisent maintenant `gaynaako_profils.utilisateurs`

### Port déjà utilisé
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Ou simplement changer le port dans le fichier
```

### Base de données inaccessible
- Vérifier que MySQL est démarré
- Vérifier les credentials dans `.env`
- Tester la connexion : `mysql -u root -p`

---

## 📁 Structure des Fichiers

```
gaynaako-collector/
├── matching/
│   ├── server-ui.js              # Serveur interface (port 3000)
│   ├── chatbot-server.js         # Serveur chatbot (port 3002)
│   ├── chatbot.js                # Moteur RAG + LLM
│   ├── matching-backend-engine.js
│   ├── strategy-engine.js
│   └── public/
│       ├── index.html            # Interface unifiée
│       ├── app.js                # Logique frontend
│       ├── styles.css            # Styles
│       └── chat-interface.html   # Interface chatbot
├── candidature/
│   ├── candidature-engine.js     # Moteur Module 3
│   ├── candidature-routes.js     # Routes Express
│   └── schema-candidature-db.sql
├── api-server.js                 # API REST (port 3001)
├── strategy-advisor.py           # Module stratégie Python
├── .env                          # Variables d'environnement
└── ecosystem.config.js           # Configuration PM2
```

---

## 🎯 Points d'Entrée Recommandés

### Pour tester rapidement
```
http://localhost:3000
```

### Pour l'API REST
```
http://localhost:3001/api/opportunities
```

### Pour le chatbot
```
http://localhost:3002
```

---

## 📝 Notes Importantes

1. **Les 3 serveurs sont INDÉPENDANTS** et doivent tourner simultanément
2. Le **SERVER-UI (3000)** est l'interface principale de test
3. Le **CHATBOT (3002)** est accessible via iframe ou lien direct
4. L'**API-SERVER (3001)** peut être utilisée par d'autres clients
5. Les **modules candidature** sont intégrés dans SERVER-UI via Express Router
