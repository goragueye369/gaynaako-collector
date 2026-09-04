# 📡 Guide d'Intégration Backend - Gaynaako Collector

> **Documentation pour les développeurs du backend principal**  
> Comment intégrer et consommer l'API du module Collector

---

## 🎯 Vue d'ensemble

Le module **gaynaako-collector** expose une API REST complète que le backend principal peut consommer pour :
- Récupérer les opportunités collectées et enrichies
- Obtenir les recommandations IA pour les utilisateurs
- Rechercher des opportunités
- Accéder aux statistiques et analytics

---

## ⚙️ Configuration Backend

### Variables d'environnement recommandées

Ajouter dans le fichier `.env` du backend principal :

```env
# Gaynaako Collector API
COLLECTOR_API_URL=http://localhost:3001
COLLECTOR_API_KEY=your_api_key_here  # (optionnel si auth ajoutée)
COLLECTOR_TIMEOUT=30000  # 30 secondes
```

### Configuration TypeScript/NestJS

```typescript
// config/collector.config.ts
export default {
  apiUrl: process.env.COLLECTOR_API_URL || 'http://localhost:3001',
  apiKey: process.env.COLLECTOR_API_KEY,
  timeout: parseInt(process.env.COLLECTOR_TIMEOUT, 10) || 30000,
};
```

---

## 📡 Endpoints Disponibles

### 1. Récupérer les opportunités

```typescript
// GET /api/opportunities
async getOpportunities(filters: {
  sector?: string;
  country?: string;
  min_quality?: number;
  limit?: number;
  offset?: number;
}) {
  const response = await axios.get(`${COLLECTOR_API_URL}/api/opportunities`, {
    params: filters,
  });
  
  return {
    opportunities: response.data.data,
    pagination: response.data.pagination,
  };
}

// Exemple d'utilisation
const data = await getOpportunities({
  sector: 'technologie',
  min_quality: 60,
  limit: 10
});
```

**Réponse** :
```json
{
  "success": true,
  "data": [
    {
      "id": "opp_123",
      "title": "Développeur Full Stack",
      "description": "Mission de 6 mois...",
      "sectors": "technologie, IT",
      "country": "Sénégal",
      "quality_score": 75,
      "url": "https://...",
      "nlp_amounts": ["2000€", "3000€"],
      "nlp_deadlines": ["2026-12-15"],
      "collected_at": "2026-09-01T13:00:00Z"
    }
  ],
  "pagination": {
    "total": 57,
    "limit": 10,
    "offset": 0,
    "pages": 6
  }
}
```

---

### 2. Obtenir les recommandations IA pour un utilisateur

```typescript
// GET /api/recommendations/:userId
async getUserRecommendations(userId: string, limit: number = 5) {
  const response = await axios.get(
    `${COLLECTOR_API_URL}/api/recommendations/${userId}`,
    { params: { limit } }
  );
  
  return response.data;
}

// Exemple
const recommendations = await getUserRecommendations('usr-ent-001');
```

**Réponse** :
```json
{
  "success": true,
  "userId": "usr-ent-001",
  "count": 5,
  "recommendations": [
    {
      "id": "rec_123",
      "score_pertinence": 0.89,
      "score_pourcentage": 89,
      "methode_matching": "IA_EMBEDDINGS",
      "date_generation": "2026-09-03T10:00:00Z",
      "opportunite": {
        "id": "opp_456",
        "title": "Mission Python IA",
        "description": "...",
        "url": "https://...",
        "quality_score": 82
      }
    }
  ]
}
```

---

### 3. Rechercher des opportunités

```typescript
// GET /api/search
async searchOpportunities(query: string, limit: number = 20) {
  const response = await axios.get(`${COLLECTOR_API_URL}/api/search`, {
    params: { q: query, limit }
  });
  
  return response.data;
}

// Exemple
const results = await searchOpportunities('python django', 10);
```

---

### 4. Opportunités similaires (IA sémantique)

```typescript
// GET /api/opportunities/:id/similar
async getSimilarOpportunities(opportunityId: string, limit: number = 5) {
  const response = await axios.get(
    `${COLLECTOR_API_URL}/api/opportunities/${opportunityId}/similar`,
    { params: { limit } }
  );
  
  return response.data.data;
}
```

---

### 5. Déclencher un matching à la demande

```typescript
// POST /api/matching/run
async triggerMatching(userId?: string) {
  const response = await axios.post(
    `${COLLECTOR_API_URL}/api/matching/run`,
    { userId }
  );
  
  return response.data;
}

// Recalculer pour tous les utilisateurs
await triggerMatching();

// Recalculer pour un utilisateur spécifique
await triggerMatching('usr-pme-001');
```

---

### 6. Statistiques globales

```typescript
// GET /api/statistics
async getStatistics() {
  const response = await axios.get(`${COLLECTOR_API_URL}/api/statistics`);
  return response.data.data;
}
```

---

## 🔄 Service d'intégration complet (NestJS)

```typescript
// services/collector.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class CollectorService {
  private api: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.api = axios.create({
      baseURL: this.configService.get('COLLECTOR_API_URL'),
      timeout: this.configService.get('COLLECTOR_TIMEOUT'),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Récupérer les opportunités
  async getOpportunities(filters: any) {
    try {
      const response = await this.api.get('/api/opportunities', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Erreur lors de la récupération des opportunités',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Récupérer les recommandations
  async getRecommendations(userId: string, limit: number = 5) {
    try {
      const response = await this.api.get(
        `/api/recommendations/${userId}`,
        { params: { limit } }
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Erreur lors de la récupération des recommandations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Rechercher
  async search(query: string, limit: number = 20) {
    try {
      const response = await this.api.get('/api/search', {
        params: { q: query, limit },
      });
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Erreur lors de la recherche',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Déclencher le matching
  async triggerMatching(userId?: string) {
    try {
      const response = await this.api.post('/api/matching/run', { userId });
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Erreur lors du déclenchement du matching',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.api.get('/api/health');
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}
```

---

## 🔌 Utilisation dans les Controllers

```typescript
// controllers/opportunities.controller.ts
import { Controller, Get, Query, Param } from '@nestjs/common';
import { CollectorService } from '../services/collector.service';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private collectorService: CollectorService) {}

  @Get()
  async list(@Query() filters: any) {
    return this.collectorService.getOpportunities(filters);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.collectorService.getOpportunities({ id });
  }
}

// controllers/users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private collectorService: CollectorService) {}

  @Get(':id/recommendations')
  async getRecommendations(
    @Param('id') userId: string,
    @Query('limit') limit: number = 5
  ) {
    return this.collectorService.getRecommendations(userId, limit);
  }
}
```

---

## ⚠️ Gestion des Erreurs

### Codes d'erreur possibles

| Code | Signification | Action recommandée |
|------|---------------|--------------------|
| 200 | Succès | Traiter les données |
| 404 | Ressource non trouvée | Afficher message utilisateur |
| 500 | Erreur serveur | Retry avec backoff |
| 503 | Service indisponible | Vérifier health check |

### Exemple de gestion

```typescript
try {
  const data = await collectorService.getRecommendations(userId);
  return data;
} catch (error) {
  if (error.response?.status === 404) {
    return { recommendations: [], message: 'Aucune recommandation trouvée' };
  }
  
  if (error.response?.status === 500) {
    // Retry avec exponential backoff
    await this.retryWithBackoff(() => 
      collectorService.getRecommendations(userId)
    );
  }
  
  throw new HttpException(
    'Service de recommandation temporairement indisponible',
    HttpStatus.SERVICE_UNAVAILABLE
  );
}
```

---

## 🔄 Synchronisation des Données

### Webhooks (À implémenter)

Le collector pourrait notifier le backend principal lors d'événements :

```typescript
// Événements potentiels
interface CollectorWebhook {
  event: 'opportunities.collected' | 'matching.completed' | 'opportunities.updated';
  timestamp: string;
  data: any;
}

// Endpoint à créer dans le backend principal
@Post('webhooks/collector')
async handleCollectorWebhook(@Body() webhook: CollectorWebhook) {
  switch (webhook.event) {
    case 'opportunities.collected':
      // Mettre à jour le cache, notifier les admins, etc.
      break;
    case 'matching.completed':
      // Envoyer notifications aux utilisateurs
      break;
  }
}
```

---

## 🧪 Tests

### Test unitaire du service

```typescript
describe('CollectorService', () => {
  let service: CollectorService;
  
  beforeEach(() => {
    // Mock axios
  });

  it('should fetch opportunities', async () => {
    const result = await service.getOpportunities({ limit: 10 });
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
  });

  it('should fetch recommendations', async () => {
    const result = await service.getRecommendations('usr-ent-001');
    expect(result.count).toBeGreaterThan(0);
  });
});
```

---

## 📊 Monitoring & Performance

### Health Check périodique

```typescript
// Vérifier toutes les 5 minutes
setInterval(async () => {
  const health = await collectorService.healthCheck();
  if (health.status !== 'healthy') {
    logger.error('Collector API is down', health);
    // Alerter l'équipe DevOps
  }
}, 5 * 60 * 1000);
```

### Cache pour améliorer les performances

```typescript
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';

// Mettre en cache les opportunités pendant 5 minutes
@UseInterceptors(CacheInterceptor)
@Get('opportunities')
async getOpportunities() {
  return this.collectorService.getOpportunities();
}
```

---

## 🚀 Déploiement

### Variables d'environnement en production

```bash
# Production
COLLECTOR_API_URL=http://collector.gaynaako.internal:3001
COLLECTOR_TIMEOUT=60000

# Staging
COLLECTOR_API_URL=http://collector-staging.gaynaako.internal:3001
```

### Load Balancing

Si le collector est déployé sur plusieurs instances :

```typescript
const apis = [
  'http://collector-1.gaynaako.internal:3001',
  'http://collector-2.gaynaako.internal:3001',
];

// Round-robin
let currentIndex = 0;
function getCollectorUrl() {
  const url = apis[currentIndex];
  currentIndex = (currentIndex + 1) % apis.length;
  return url;
}
```

---

## 📞 Support

**Questions ou problèmes d'intégration ?**

- 📧 Email : equipe-data@gaynaako.sn
- 📚 Documentation complète : `docs/API_DOCUMENTATION.md`
- 🐛 Signaler un bug : Créer une issue dans le repo

---

**Dernière mise à jour** : Septembre 2026  
**Version API** : 2.0
