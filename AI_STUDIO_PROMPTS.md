# Google AI Studio - Ready-to-Use Prompts for Dreammaker Project

Copy these prompts directly into Google AI Studio to get started.

---

## MASTER SYSTEM PROMPT (Use This First!)

Copy this entire block as your System Instructions in AI Studio:

```
You are an expert TypeScript/React developer working on the Dreammaker Crypto Signal Trader.

## PROJECT CONTEXT

**Stack:**
- Frontend: React 18 + TypeScript 5.3 + Vite 7.2 + Tailwind CSS
- Backend: Node.js + Express 4.18 + SQLite (better-sqlite3)
- Real-time: WebSocket + Redis (optional)
- AI/ML: Custom neural networks with reinforcement learning

**Architecture Pattern:**
- Services use Singleton pattern: `Class.getInstance()`
- React uses Context API for state management
- Multi-provider fallback for data resilience
- Configuration hot-reload every 30 seconds
- Strict TypeScript with interfaces

**Key Directories:**
```
/src/services/     - 80+ service modules
/src/views/        - React page components
/src/components/   - Reusable UI components
/src/controllers/  - API request handlers
/src/ai/           - Machine learning modules
/src/engine/       - Scoring pipeline
/src/types/        - TypeScript interfaces
/config/           - JSON configurations
```

**Core Interfaces:**

```typescript
interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AISignal {
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  probability: { bull: number; bear: number; neutral: number };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetPrice: number;
  stopLoss: number;
  timestamp: number;
  reasoning: string[];
}

interface DetectorResult {
  detectorName: string;
  score: number;
  confidence: number;
  signals: Array<{
    type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    strength: number;
    description: string;
  }>;
  metadata?: Record<string, any>;
}
```

**Coding Standards:**
1. Always use strict TypeScript types
2. Implement Singleton pattern for services
3. Add try-catch error handling everywhere
4. Use Logger.info/error for debugging
5. Return graceful fallbacks on errors
6. Validate input data before processing
7. Follow existing naming conventions

**When generating code:**
- Match existing patterns exactly
- Include proper imports
- Add comprehensive error handling
- Use existing utility functions
- Follow React hooks best practices
- Implement loading/error states in UI
```

---

## PROMPT TEMPLATES

### 1. ADD NEW DETECTOR SERVICE

```
Create a Volume Profile Detector service for analyzing volume distribution across price levels.

Requirements:
- File: /src/services/VolumeProfileDetector.ts
- Use Singleton pattern with getInstance()
- Implement async analyze(ohlcv: OHLCV[]): Promise<DetectorResult>
- Calculate Point of Control (POC), Value Area High/Low (VAH/VAL)
- Return score 0-100 based on price position relative to volume profile
- Include proper error handling and logging

Pattern to follow (from SMCAnalyzer.ts):

```typescript
export class VolumeProfileDetector {
  private static instance: VolumeProfileDetector;

  static getInstance(): VolumeProfileDetector {
    if (!VolumeProfileDetector.instance) {
      VolumeProfileDetector.instance = new VolumeProfileDetector();
    }
    return VolumeProfileDetector.instance;
  }

  async analyze(ohlcv: OHLCV[]): Promise<DetectorResult> {
    try {
      // Validate input
      // Calculate volume profile
      // Identify POC, VAH, VAL
      // Score based on price position
      // Return result
    } catch (error) {
      Logger.error('VolumeProfileDetector failed:', error);
      return this.getDefaultResult();
    }
  }
}
```

Include:
- Volume distribution calculation across price bins
- Point of Control identification (highest volume price)
- Value Area calculation (70% of total volume)
- Scoring logic: high score if price near POC, lower if outside value area
```

### 2. CREATE REACT COMPONENT

```
Create a SignalCard component for displaying AI trading signals.

Requirements:
- File: /src/components/signal/SignalCard.tsx
- Display signal type (BUY/SELL/HOLD) with color coding
- Show confidence percentage with progress bar
- Display probability distribution (bull/bear/neutral)
- Show target price and stop loss
- Include risk level indicator
- Use Tailwind CSS for styling
- Use Lucide React for icons

Props:

```typescript
interface SignalCardProps {
  signal: AISignal;
  onTrade?: (signal: AISignal) => void;
  compact?: boolean;
}
```

Features:
- Color scheme: BUY=green, SELL=red, HOLD=yellow
- Confidence bar: 0-100% with gradient
- Risk badge: LOW=green, MEDIUM=yellow, HIGH=orange, CRITICAL=red
- Responsive design for mobile/desktop
- Optional trade button that calls onTrade
- Timestamp formatting (relative time)
- Reasoning tooltip or expandable section
```

### 3. ADD API ENDPOINT

```
Add an API endpoint for retrieving historical signal performance metrics.

Requirements:
- Endpoint: GET /api/signals/performance
- Query parameters: symbol, startDate, endDate, timeframe
- Returns performance metrics

Controller file: /src/controllers/SignalPerformanceController.ts

```typescript
interface PerformanceMetrics {
  totalSignals: number;
  accuracy: number;        // % of profitable signals
  profitFactor: number;    // gross profit / gross loss
  winRate: number;         // % winning trades
  avgGain: number;         // average gain per winning trade
  avgLoss: number;         // average loss per losing trade
  sharpeRatio: number;     // risk-adjusted return
  maxDrawdown: number;     // largest peak-to-trough decline
}
```

Implementation:
1. Create SignalPerformanceController with Singleton pattern
2. Query historical signals from Database.ts
3. Calculate each metric
4. Add route in server.ts: app.get('/api/signals/performance', ...)
5. Include input validation and error handling
6. Cache results for 5 minutes
```

### 4. IMPLEMENT WEBSOCKET FEATURE

```
Add real-time market depth streaming via WebSocket.

Requirements:
- Extend existing WebSocket server in /src/server.ts
- Add new message type: 'market_depth'
- Subscribe to exchange order book updates
- Broadcast depth changes to subscribed clients

Server-side:

```typescript
interface MarketDepthMessage {
  type: 'market_depth';
  symbol: string;
  bids: Array<[price: number, quantity: number]>;
  asks: Array<[price: number, quantity: number]>;
  timestamp: number;
}
```

Client hook: /src/hooks/useMarketDepth.ts

```typescript
export function useMarketDepth(symbol: string) {
  const [depth, setDepth] = useState<MarketDepthData | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8001/ws`);

    ws.onopen = () => {
      setStatus('connected');
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'market_depth',
        symbol
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'market_depth') {
        setDepth(message);
      }
    };

    return () => ws.close();
  }, [symbol]);

  return { depth, status };
}
```

Include:
- Subscription management per symbol
- Throttling to max 10 updates/second
- Connection cleanup on unsubscribe
- Error handling for exchange disconnections
```

### 5. DATABASE MIGRATION

```
Create a database migration to add a new table for storing strategy backtests.

Requirements:
- File: /src/data/DatabaseMigrations.ts
- Add migration for 'strategy_backtests' table

Schema:

```sql
CREATE TABLE IF NOT EXISTS strategy_backtests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  initial_capital REAL NOT NULL,
  final_capital REAL NOT NULL,
  total_trades INTEGER NOT NULL,
  winning_trades INTEGER NOT NULL,
  losing_trades INTEGER NOT NULL,
  profit_factor REAL,
  max_drawdown REAL,
  sharpe_ratio REAL,
  parameters TEXT,  -- JSON string of strategy params
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_backtests_strategy ON strategy_backtests(strategy_name);
CREATE INDEX idx_backtests_symbol ON strategy_backtests(symbol);
CREATE INDEX idx_backtests_date ON strategy_backtests(created_at);
```

Implementation:
1. Add migration to DatabaseMigrations.runMigrations()
2. Create BacktestRepository in /src/data/repositories/
3. Add CRUD operations (create, findByStrategy, findBySymbol, delete)
4. Use better-sqlite3 prepared statements
5. Include transaction support for batch operations
```

### 6. ERROR BOUNDARY COMPONENT

```
Create a React Error Boundary for graceful error handling.

Requirements:
- File: /src/components/ErrorBoundary.tsx
- Catch JavaScript errors in child components
- Display user-friendly error message
- Log error details for debugging
- Provide retry/reset functionality

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
```

Features:
- Class component (required for error boundaries)
- getDerivedStateFromError for state updates
- componentDidCatch for error logging
- Reset button to clear error state
- Optional custom fallback UI
- Error details in development mode only
- Report to monitoring service (optional)
```

### 7. UNIT TEST

```
Write unit tests for the SMCAnalyzer service.

Requirements:
- File: /src/services/__tests__/SMCAnalyzer.test.ts
- Use Vitest testing framework
- Test all major methods
- Include edge cases

Test cases:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SMCAnalyzer } from '../SMCAnalyzer';

describe('SMCAnalyzer', () => {
  let analyzer: SMCAnalyzer;

  beforeEach(() => {
    analyzer = SMCAnalyzer.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SMCAnalyzer.getInstance();
      const instance2 = SMCAnalyzer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('analyze', () => {
    it('should return valid DetectorResult', async () => {
      const mockOHLCV = generateMockOHLCV(100);
      const result = await analyzer.analyze(mockOHLCV);

      expect(result).toHaveProperty('detectorName', 'SMCAnalyzer');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle insufficient data', async () => {
      const smallData = generateMockOHLCV(5);
      const result = await analyzer.analyze(smallData);

      expect(result.confidence).toBe(0);
      expect(result.score).toBe(50); // neutral fallback
    });

    it('should detect bullish order blocks', async () => {
      const bullishData = generateBullishPattern();
      const result = await analyzer.analyze(bullishData);

      expect(result.signals).toContainEqual(
        expect.objectContaining({ type: 'BULLISH' })
      );
    });
  });
});
```

Include helper functions:
- generateMockOHLCV(count) - creates random OHLCV data
- generateBullishPattern() - creates specific bullish setup
- generateBearishPattern() - creates specific bearish setup
```

---

## QUICK REFERENCE COMMANDS

```bash
# Start development
npm run dev

# Type check (run before committing!)
npx tsc --noEmit

# Lint code
npm run lint

# Run tests
npm run test

# Build for production
npm run build
```

---

## TIPS FOR BETTER AI STUDIO RESULTS

1. **Be Specific** - Include exact file paths, interface names, and method signatures
2. **Show Patterns** - Provide code snippets from existing similar features
3. **Define Interfaces** - Always specify TypeScript types upfront
4. **Set Constraints** - Mention error handling, performance, and edge cases
5. **Request Complete Code** - Ask for imports, exports, and all dependencies
6. **Iterate** - Start with basic implementation, then add features incrementally

---

## SAMPLE CONVERSATION FLOW

**You:** "I want to add a Fibonacci retracement calculator"

**AI Studio:** *generates basic structure*

**You:** "Now add validation to ensure we have at least 50 data points and handle the case when trend is unclear"

**AI Studio:** *adds validation and edge case handling*

**You:** "Integrate this into AdaptiveScoringEngine and add the config entry"

**AI Studio:** *provides integration code*

**You:** "Write unit tests for all three scenarios"

**AI Studio:** *creates comprehensive tests*

---

This documentation enables AI Studio to generate code that:
- Follows your project conventions
- Uses correct TypeScript types
- Implements proper error handling
- Integrates smoothly with existing architecture
