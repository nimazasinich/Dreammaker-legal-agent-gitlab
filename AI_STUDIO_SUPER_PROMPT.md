# Super Prompt for AI Studio Google Coder - Dreammaker Crypto Signal Trader

## PROJECT IDENTITY

You are working on **Dreammaker Crypto Signal Trader**, an advanced cryptocurrency signal analysis and trading platform with AI-powered insights, real-time market data, and automated trading capabilities. The codebase contains **78,241 lines of TypeScript/React code** across **448 files**.

---

## CORE TECHNOLOGY STACK

### Frontend
- **React 18** with hooks and Context API
- **TypeScript 5.3** for full type safety
- **Vite 7.2** as build tool
- **Tailwind CSS 3.4** for styling
- **Lucide React** for icons
- Lazy loading and code splitting for performance

### Backend
- **Node.js >= 18.0.0** runtime
- **Express 4.18** web framework
- **TypeScript** backend
- **WebSocket (ws 8.14)** for real-time communication
- **Better-SQLite3 / In-Memory Database** for storage
- **IORedis 5.3** for distributed caching (optional)

### Testing & Quality
- **Vitest 4.0** for unit/integration tests
- **Playwright 1.56** for E2E tests
- **ESLint 9.0** for code quality

---

## CRITICAL ARCHITECTURAL PATTERNS

### 1. Service Layer Architecture
All business logic lives in `/src/services/`. There are **50+ specialized services**:

```
src/services/
├── Market Data Services (MultiProviderMarketDataService, HFOHLCVService, etc.)
├── Analysis Services (SMCAnalyzer, ElliottWaveAnalyzer, HarmonicPatternDetector)
├── Sentiment Services (HFSentimentService, SentimentAnalysisService)
├── Exchange Services (BinanceService, KuCoinService)
├── Signal Services (SignalGeneratorService, DynamicWeightingService)
├── Infrastructure (RedisService, ServiceOrchestrator, CentralizedAPIManager)
└── HuggingFace Integration (src/services/hf/)
```

### 2. Controller Pattern
Controllers in `/src/controllers/` (13 total) handle HTTP requests:
- `AIController.ts` - AI signal endpoints
- `AnalysisController.ts` - Technical analysis
- `TradingController.ts` - Trading operations
- `MarketDataController.ts` - Market data
- `SystemController.ts` - System health/diagnostics

### 3. Repository Pattern
Data access through repositories in `/src/data/repositories/`:
- `BaseRepository.ts` - CRUD operations
- `MarketDataRepository.ts` - Market data access
- `FuturesPositionRepository.ts` - Futures positions
- `TrainingMetricsRepository.ts` - ML metrics

### 4. React Context Provider Pattern
State management via Context in `/src/contexts/`:
- `DataContext.ts` - Data state
- `TradingContext.ts` - Trading state
- `ModeContext.ts` - App mode
- `BacktestContext.ts` - Backtest state

---

## KEY DATA TYPES (MUST KNOW)

```typescript
// Core Market Data - src/types/index.ts
interface MarketData {
  symbol: string;
  timestamp: Date | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval?: string;
  trades?: number;
  change24h?: number;
}

// AI Generated Signal
interface AISignal {
  id: string;
  symbol: string;
  timestamp: number;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  probability: { bull: number; bear: number; neutral: number };
  technicalScore: number;
  sentimentScore: number;
  whaleScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  targetPrice?: number;
  stopLoss?: number;
}

// Sentiment Data
interface SentimentData {
  symbol: string;
  timestamp: number;
  overallScore: number; // -100 to +100
  sources: {
    twitter: number;
    reddit: number;
    news: number;
    fearGreedIndex: number;
    googleTrends: number;
  };
  velocity: number;
  momentum: number;
}

// Whale Activity Tracking
interface WhaleActivity {
  symbol: string;
  largeTransactions: Array<{
    hash: string;
    amount: number;
    timestamp: number;
    from: string;
    to: string;
  }>;
  exchangeFlows: {
    netFlow: number;
    reserves: number;
    reserveChange: number;
  };
}
```

---

## CRITICAL FILE LOCATIONS

| Purpose | Location | Description |
|---------|----------|-------------|
| **Frontend Entry** | `/src/main.tsx` | React app bootstrap |
| **Backend Entry** | `/src/server.ts` | Express server setup |
| **Type Definitions** | `/src/types/index.ts` | Core TypeScript interfaces |
| **Logger** | `/src/core/Logger.ts` | Centralized logging |
| **Config Manager** | `/src/core/ConfigManager.ts` | Configuration handling |
| **Database** | `/src/data/Database.ts` | Database wrapper |
| **Rate Limiter** | `/src/utils/rateLimiter.ts` | Token bucket rate limiting |
| **Cache Utility** | `/src/utils/cache.ts` | TTL-based caching |
| **Service Orchestrator** | `/src/services/ServiceOrchestrator.ts` | Service coordination |
| **Multi-Provider Data** | `/src/services/MultiProviderMarketDataService.ts` | Data aggregation |

---

## CODING CONVENTIONS & STANDARDS

### TypeScript Requirements
1. **Strict mode enabled** - No `any` types unless absolutely necessary
2. **Full type coverage** - All functions must have parameter and return types
3. **Interface over type** for object shapes
4. **Enum for constants** with multiple related values
5. **Optional chaining** (`?.`) and nullish coalescing (`??`) preferred

### React Component Structure
```typescript
// Functional components with TypeScript
import React, { useState, useEffect, useCallback } from 'react';
import { SomeIcon } from 'lucide-react';

interface ComponentProps {
  data: SomeType;
  onAction?: (value: string) => void;
}

export const Component: React.FC<ComponentProps> = ({ data, onAction }) => {
  const [state, setState] = useState<StateType>(initialValue);

  useEffect(() => {
    // Side effects here
  }, [dependencies]);

  const handleAction = useCallback(() => {
    // Event handlers
  }, [dependencies]);

  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
};
```

### Service Implementation Pattern
```typescript
// Singleton service pattern
import { Logger } from '../core/Logger';

export class SomeService {
  private static instance: SomeService;
  private logger = Logger.getInstance();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SomeService {
    if (!SomeService.instance) {
      SomeService.instance = new SomeService();
    }
    return SomeService.instance;
  }

  async performAction(params: ParamType): Promise<ResultType> {
    try {
      this.logger.info('Performing action', { params });
      // Implementation
      return result;
    } catch (error) {
      this.logger.error('Action failed', error);
      throw error;
    }
  }
}
```

### Controller Implementation Pattern
```typescript
import { Request, Response } from 'express';
import { SomeService } from '../services/SomeService';

export class SomeController {
  private service = SomeService.getInstance();

  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.performAction(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
```

### Error Handling Standards
1. **Always use try-catch** in async functions
2. **Log errors with context** using Logger service
3. **Return meaningful error messages** to frontend
4. **Implement fallback mechanisms** for critical services
5. **Never swallow errors silently**

```typescript
try {
  const result = await riskyOperation();
} catch (error) {
  this.logger.error('Operation failed', {
    operation: 'riskyOperation',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  // Implement fallback or rethrow
}
```

---

## DATA FLOW & ARCHITECTURE

### Primary Data Sources (Priority Order)
1. **HuggingFace Data Engine** (PRIMARY - Recommended)
   - Base URL: Configured via `HF_ENGINE_BASE_URL`
   - Provides: OHLCV, sentiment, signals, health checks

2. **Binance API** (FALLBACK)
   - Rate limit: 1200 requests/min
   - Provides: Real-time prices, OHLCV, trading

3. **KuCoin API** (FALLBACK)
   - Futures trading support
   - Spot market data

4. **CoinGecko** (FALLBACK)
   - Rate limit: 50 requests/min
   - Market cap, historical data

### Data Processing Pipeline
```
[External APIs] → [MultiProviderMarketDataService] → [Validation] → [Cache] → [Analysis Services] → [Signal Generator] → [WebSocket Broadcast] → [Frontend]
```

### Caching Strategy (CRITICAL)
- **Price Cache**: 15 seconds TTL (prevent API spam)
- **OHLCV Cache**: 2 minutes TTL
- **Dataset Cache**: 3 minutes TTL
- **Sentiment Cache**: Variable TTL based on source
- **Implementation**: TTL-based with Map storage or Redis

### Rate Limiting (MUST RESPECT)
- CoinGecko: 50 calls/min
- CoinMarketCap: 5 calls/sec
- CryptoCompare: 100 calls/min
- Binance: 1200 calls/min
- Use `src/utils/rateLimiter.ts` Token Bucket implementation

---

## IMPORTANT ENVIRONMENT VARIABLES

```bash
# Server
PORT=8001
NODE_ENV=development|production

# Primary Data Source
PRIMARY_DATA_SOURCE=huggingface|binance|kucoin|mixed
HF_ENGINE_BASE_URL=<url>
HF_ENGINE_ENABLED=true
HF_ENGINE_TIMEOUT=30000

# Feature Flags
FEATURE_FUTURES=false
DISABLE_REDIS=true

# Logging
LOG_LEVEL=error|warn|info|debug

# Optional API Keys
CMC_API_KEY=
CRYPTOCOMPARE_KEY=
NEWSAPI_KEY=
ETHERSCAN_API_KEY=
HUGGINGFACE_API_KEY=

# Trading (Optional)
KUCOIN_FUTURES_KEY=
KUCOIN_FUTURES_SECRET=
KUCOIN_FUTURES_PASSPHRASE=
```

---

## COMMON DEVELOPMENT TASKS

### Adding a New Service
1. Create file in `/src/services/YourService.ts`
2. Implement singleton pattern
3. Add types to `/src/types/index.ts` if needed
4. Register in `ServiceOrchestrator` if required
5. Create controller in `/src/controllers/` if HTTP endpoint needed
6. Add route in `server.ts`

### Adding a New React Component
1. Create in appropriate `/src/components/` subdirectory
2. Use TypeScript interfaces for props
3. Implement with functional component and hooks
4. Use Tailwind CSS for styling
5. Add to appropriate view in `/src/views/`
6. Consider lazy loading for performance

### Adding a New API Endpoint
1. Create/update controller in `/src/controllers/`
2. Add route in `/src/server.ts`:
```typescript
app.get('/api/your-endpoint', (req, res) => controller.handleRequest(req, res));
```
3. Document expected request/response types
4. Implement error handling
5. Add rate limiting if external service

### Implementing AI/ML Features
1. Use existing patterns in `/src/ai/`
2. Follow training stability practices (gradient clipping, learning rate scheduling)
3. Store metrics in `TrainingMetricsRepository`
4. Implement early stopping
5. Use Xavier initialization for weights

---

## CRITICAL DO's AND DON'Ts

### DO's
- **DO** use TypeScript strict mode and avoid `any`
- **DO** implement error boundaries in React components
- **DO** use the Logger service for all logging
- **DO** cache expensive API calls with TTL
- **DO** respect rate limits for external APIs
- **DO** use the singleton pattern for services
- **DO** implement fallback mechanisms for data providers
- **DO** validate all external data before processing
- **DO** use lazy loading for non-critical components
- **DO** write unit tests for business logic (Vitest)
- **DO** use Tailwind CSS utility classes for styling
- **DO** follow the existing service/controller/repository patterns

### DON'Ts
- **DON'T** hardcode API keys or secrets
- **DON'T** ignore rate limiting (will cause API bans)
- **DON'T** skip error handling in async operations
- **DON'T** mutate state directly in React (use setState/reducers)
- **DON'T** create circular dependencies between services
- **DON'T** bypass the caching layer for frequent requests
- **DON'T** use inline styles (use Tailwind CSS)
- **DON'T** ignore TypeScript compilation errors
- **DON'T** commit .env files or secrets
- **DON'T** block the event loop with synchronous operations
- **DON'T** ignore WebSocket connection cleanup

---

## TESTING REQUIREMENTS

### Unit Tests (Vitest)
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### E2E Tests (Playwright)
```bash
npm run e2e:smoke       # Smoke tests
```

### API Testing
```bash
npm run test:api        # API tests
npm run test:api:load   # Load testing
npm run test:api:security # Security tests
```

### Test File Conventions
- Place tests adjacent to source: `Component.tsx` → `Component.test.tsx`
- Or in `__tests__` directory
- Use descriptive test names
- Mock external services

---

## SECURITY CONSIDERATIONS

1. **Secret Management**: Use `src/utils/secretStore.ts`
2. **Input Validation**: Always validate user input
3. **SQL Injection**: Use parameterized queries (handled by repositories)
4. **XSS Prevention**: React auto-escapes, but be careful with `dangerouslySetInnerHTML`
5. **CORS**: Configured in Express middleware
6. **Rate Limiting**: Implemented per-client to prevent abuse
7. **API Keys**: Stored in environment variables, never in code
8. **HTTPS**: Required in production

---

## PERFORMANCE OPTIMIZATION PATTERNS

### Frontend
- **Lazy loading**: `React.lazy()` for views
- **Memoization**: `useMemo()` and `useCallback()`
- **Code splitting**: Dynamic imports
- **Virtual scrolling**: For long lists
- **Debouncing**: For search inputs
- **Skeleton loaders**: During data fetch

### Backend
- **Connection pooling**: For database connections
- **Request coalescing**: Prevent duplicate API calls
- **TTL caching**: Reduce redundant fetches
- **Streaming responses**: For large datasets
- **Worker threads**: For CPU-intensive ML tasks (optional)
- **Graceful shutdown**: Clean resource cleanup

---

## WEBSOCKET IMPLEMENTATION

### Server Setup (server.ts)
```typescript
const wss = new WebSocketServer({ port: 8001 });

wss.on('connection', (ws) => {
  // 30-second heartbeat
  const interval = setInterval(() => ws.ping(), 30000);

  ws.on('pong', () => { /* Client alive */ });
  ws.on('close', () => clearInterval(interval));

  // Broadcast messages
  ws.send(JSON.stringify({ type: 'signal', data: signalData }));
});
```

### Message Types
- `signal` - Trading signals
- `price_update` - Real-time prices
- `alert` - System alerts
- `error` - Error notifications
- `heartbeat` - Connection health

---

## COMMON DEBUGGING SCENARIOS

### 1. API Data Not Loading
- Check rate limits (are we being blocked?)
- Verify API keys in environment
- Check network connectivity
- Look at fallback providers
- Inspect cache TTL (data might be stale)

### 2. WebSocket Disconnects
- Check heartbeat interval (30s ping/pong)
- Verify client reconnection logic
- Monitor server logs for errors
- Check for memory leaks

### 3. TypeScript Compilation Errors
- Run `npx tsc --noEmit` to check
- Fix all type errors before deployment
- Check `tsconfig.json` settings
- Ensure all dependencies are typed

### 4. React Rendering Issues
- Check error boundaries
- Verify state updates are immutable
- Check for infinite render loops
- Monitor useEffect dependencies

---

## BUILD & DEPLOYMENT

### Development
```bash
npm run dev           # Full stack development
npm run dev:client   # Frontend only
npm run dev:server   # Backend only
```

### Production Build
```bash
npm run build        # Build both
npm start           # Run production
```

### Docker
```bash
docker build -t dreammaker-crypto .
docker-compose up -d
```

### Deployment Target
- Frontend: Nginx static files (Port 80)
- Backend: Node.js (Port 8001)
- Optional: Redis for distributed caching
- Optional: PostgreSQL for persistence (future)

---

## PROJECT ROADMAP & EXTENSIBILITY

### Current State
- Full signal generation pipeline
- Multi-provider market data
- AI/ML training capabilities
- Real-time WebSocket updates
- Comprehensive monitoring

### Potential Extensions
1. **Additional Exchanges**: Add support for Bybit, OKX, etc.
2. **Advanced ML Models**: Transformer architectures, reinforcement learning
3. **Social Trading**: Copy trading features
4. **Mobile App**: React Native companion app
5. **Automated Trading**: Full bot automation
6. **Multi-Asset Support**: Beyond crypto (stocks, forex)
7. **Advanced Charting**: More technical indicators
8. **Portfolio Rebalancing**: Automated rebalancing strategies

---

## SUMMARY FOR AI CODER

When working on this codebase:

1. **Respect the architecture** - Services handle logic, Controllers handle HTTP, Repositories handle data
2. **Follow TypeScript strictly** - No `any` types, full type coverage
3. **Use existing patterns** - Singleton services, React hooks, error boundaries
4. **Cache and rate limit** - External APIs have limits, respect them
5. **Log everything important** - Use Logger service for debugging
6. **Test your changes** - Use Vitest for unit tests, Playwright for E2E
7. **Handle errors gracefully** - Try-catch everywhere, fallback mechanisms
8. **Optimize for performance** - Lazy loading, memoization, caching
9. **Secure by default** - No hardcoded secrets, validate input
10. **Document as you go** - Types serve as documentation

This is a **production-grade**, **enterprise-level** application with sophisticated architecture. Treat every change as production-critical code.

---

## QUICK REFERENCE COMMANDS

```bash
# Development
npm run dev              # Start full stack
npm run lint            # Check code quality
npm test                # Run tests

# Build
npm run build           # Production build
npm start              # Run production server

# Debugging
npm run test:coverage   # Test coverage
npx tsc --noEmit       # Type check only

# Database
# In-memory by default, no setup needed

# Environment
cp .env.example .env   # Setup environment
```

---

**END OF SUPER PROMPT**

This comprehensive prompt provides all the context needed to understand, maintain, and extend the Dreammaker Crypto Signal Trader platform. Use this as your primary reference when working on any aspect of the codebase.
