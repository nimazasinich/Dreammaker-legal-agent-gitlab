# Data Flow Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React/TypeScript)                         │
│                                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐     │
│  │   Trading   │  │  Dashboard   │  │  Analytics  │  │   Signals    │     │
│  │ Components  │  │  Components  │  │ Components  │  │  Components  │     │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘     │
│         │                │                 │                │               │
│         └────────────────┴─────────────────┴────────────────┘               │
│                                    │                                         │
│                         ┌──────────▼──────────┐                             │
│                         │   DataManager       │                             │
│                         │   (Unified Client)  │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                    HTTP/REST + WebSocket
                                     │
┌────────────────────────────────────▼─────────────────────────────────────────┐
│                          BACKEND (Node.js/TypeScript)                         │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        ROUTING LAYER                                 │    │
│  │  /api/market/*     /api/analysis/*     /api/ai/*     /api/config/*  │    │
│  └────────────┬─────────────┬──────────────┬─────────────┬─────────────┘    │
│               │             │              │             │                   │
│    ┌──────────▼───┐  ┌──────▼─────┐  ┌────▼─────┐  ┌───▼────────┐         │
│    │   Market     │  │ Analysis   │  │    AI    │  │DataSource  │         │
│    │ Controller   │  │Controller  │  │Controller│  │ Controller │         │
│    └──────┬───────┘  └──────┬─────┘  └────┬─────┘  └──────┬─────┘         │
│           │                 │              │               │                │
│  ┌────────▼─────────────────▼──────────────▼───────────────▼─────────┐     │
│  │                    SERVICE ORCHESTRATION LAYER                     │     │
│  │                                                                     │     │
│  │  ┌──────────────────────────────────────────────────────────┐     │     │
│  │  │      MultiProviderMarketDataService (Primary)            │     │     │
│  │  │  ┌────────────────────────────────────────────────────┐  │     │     │
│  │  │  │  Rate Limiters  │  Caches  │  Circuit Breakers    │  │     │     │
│  │  │  └────────────────────────────────────────────────────┘  │     │     │
│  │  └──────────────────────────────────────────────────────────┘     │     │
│  │                                                                     │     │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐          │     │
│  │  │ HuggingFace │  │  Sentiment   │  │  Whale Tracker │          │     │
│  │  │   Services  │  │   Services   │  │    Services    │          │     │
│  │  └─────────────┘  └──────────────┘  └────────────────┘          │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                        CACHING LAYER                                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ TTL Cache│  │ Advanced │  │  Redis   │  │  Memory  │           │  │
│  │  │  (15s)   │  │  Cache   │  │  Cache   │  │  Cache   │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   Provider Selection      │
                    │   & Fallback Logic        │
                    └─────────────┬─────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
┌───────────▼─────────┐ ┌─────────▼─────────┐ ┌───────▼──────────┐
│   PRIMARY TIER      │ │  SECONDARY TIER   │ │  PREMIUM TIER    │
│                     │ │                   │ │                  │
│ ┌─────────────────┐ │ │ ┌───────────────┐ │ │ ┌──────────────┐ │
│ │   CoinGecko     │ │ │ │   CoinCap     │ │ │ │ HuggingFace  │ │
│ │   (50/min)      │ │ │ │   (200/min)   │ │ │ │  AI Engine   │ │
│ └─────────────────┘ │ │ └───────────────┘ │ │ └──────────────┘ │
│                     │ │                   │ │                  │
│ ┌─────────────────┐ │ │ ┌───────────────┐ │ │ ┌──────────────┐ │
│ │ CryptoCompare   │ │ │ │ CoinPaprika   │ │ │ │CoinMarketCap │ │
│ │   (100/min)     │ │ │ │  (Unlimited)  │ │ │ │  (Paid API)  │ │
│ └─────────────────┘ │ │ └───────────────┘ │ │ └──────────────┘ │
│                     │ │                   │ │                  │
│ ┌─────────────────┐ │ │ ┌───────────────┐ │ │                  │
│ │   Binance       │ │ │ │   Messari     │ │ │                  │
│ │   (1200/min)    │ │ │ │   (60/min)    │ │ │                  │
│ │   +CORS Proxy   │ │ │ └───────────────┘ │ │                  │
│ └─────────────────┘ │ │                   │ │                  │
└─────────────────────┘ └───────────────────┘ └──────────────────┘
```

## Data Retrieval Flow (Sequence)

```
User Request → Frontend Component
                    │
                    ▼
            DataManager.fetchData()
                    │
                    ▼
        ┌───────────────────────┐
        │ Check L1 Cache (TTL)  │
        └───────────┬───────────┘
                    │
              ┌─────▼─────┐
              │ Cache Hit?│
              └─────┬─────┘
                Yes │ No
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    Return     API Request  Check Rate
    Cached     Controller   Limiter
    Data           │            │
        │          ▼            ▼
        │    Service Layer  Has Token?
        │          │            │
        │          ▼         Yes│ No
        │    Try Primary ───────┤
        │    Provider           │
        │          │            ▼
        │      ┌───▼───┐    Queue or
        │      │Success│    Try Alternate
        │      └───┬───┘    Provider
        │      Yes │ No         │
        │          │   │        │
        │          │   ▼        │
        │          │ Circuit    │
        │          │ Breaker    │
        │          │ Check      │
        │          │   │        │
        │          │   ▼        │
        │          │ Try        │
        │          │ Fallback   │
        │          │ Chain      │
        │          │   │        │
        │          ▼   ▼        │
        │      Aggregate        │
        │      Results          │
        │          │            │
        │          ▼            │
        │      Normalize        │
        │      Data             │
        │          │            │
        │          ▼            │
        │      Validate         │
        │      Data             │
        │          │            │
        │          ▼            │
        │      Store in         │
        │      Cache            │
        │          │            │
        └──────────┴────────────┘
                    │
                    ▼
            Return to Frontend
```

## Provider Fallback Chain

```
Request for Market Data (e.g., BTC Price)
            │
            ▼
┌───────────────────────────────┐
│   Cache Check (L1)            │
│   TTL: 15s                    │
└───────────┬───────────────────┘
            │ Miss
            ▼
┌───────────────────────────────┐
│   Primary Provider            │
│   CoinGecko                   │
│   Timeout: 10s                │
└───────────┬───────────────────┘
            │ Fail/Timeout
            ▼
┌───────────────────────────────┐
│   Secondary Provider #1       │
│   CryptoCompare               │
│   Timeout: 10s                │
└───────────┬───────────────────┘
            │ Fail/Rate Limited
            ▼
┌───────────────────────────────┐
│   Secondary Provider #2       │
│   CoinCap                     │
│   Timeout: 10s                │
└───────────┬───────────────────┘
            │ Fail
            ▼
┌───────────────────────────────┐
│   Tertiary Provider           │
│   CoinPaprika                 │
│   Timeout: 10s                │
└───────────┬───────────────────┘
            │ Fail
            ▼
┌───────────────────────────────┐
│   Binance (via CORS Proxy)    │
│   Timeout: 15s                │
└───────────┬───────────────────┘
            │ Fail/Geo-blocked
            ▼
┌───────────────────────────────┐
│   HuggingFace Datasets        │
│   (Historical Data Only)      │
└───────────┬───────────────────┘
            │ Fail/No Data
            ▼
┌───────────────────────────────┐
│   Emergency Fallback          │
│   Return Cached Stale Data    │
│   or Mock Data                │
└───────────────────────────────┘
```

## Rate Limiting Flow

```
API Request
     │
     ▼
┌─────────────────────┐
│ Token Bucket Check  │
│ (Per Provider)      │
└──────────┬──────────┘
           │
      ┌────▼────┐
      │ Tokens  │
      │Available│
      └────┬────┘
        Yes│ No
     ┌─────┴─────┐
     │           │
     ▼           ▼
Acquire    ┌──────────────┐
Token      │ Queue Request│
     │     │ or Overflow  │
     │     └──────┬───────┘
     │            │
     │       ┌────▼────┐
     │       │ Priority│
     │       │ Check   │
     │       └────┬────┘
     │         High│Low
     │       ┌─────┴─────┐
     │       │           │
     │       ▼           ▼
     │   Try Other    Queue &
     │   Provider     Wait
     │       │           │
     └───────┴───────────┘
             │
             ▼
     Execute Request
```

## Circuit Breaker State Machine

```
                    ┌──────────────┐
        ┌──────────▶│    CLOSED    │◀──────────┐
        │           │  (Healthy)   │           │
        │           └──────┬───────┘           │
        │                  │                   │
        │        3 Failures│                   │ Success
        │                  │                   │ After 30s
        │                  ▼                   │
        │           ┌──────────────┐           │
        │           │     OPEN     │           │
        │           │   (Blocked)  │           │
        │           └──────┬───────┘           │
        │                  │                   │
        │        60s Timer │                   │
        │                  │                   │
        │                  ▼                   │
        │           ┌──────────────┐           │
        └───────────│  HALF-OPEN   │───────────┘
          Failure   │  (Testing)   │  Success
                    └──────────────┘
```

## Data Aggregation Process

```
Request: Get BTC Price
            │
            ▼
┌────────────────────────────────────┐
│  Parallel Fetch (Top 3 Providers)  │
│                                    │
│  ┌───────────┐  ┌───────────┐     │
│  │ CoinGecko │  │CryptoComp │     │
│  │  Request  │  │  Request  │     │
│  └─────┬─────┘  └─────┬─────┘     │
│        │              │            │
│        └──────┬───────┘            │
│               │                    │
│  ┌────────────▼──────────────┐    │
│  │    CoinCap Request        │    │
│  └────────────┬──────────────┘    │
│               │                    │
└───────────────┼────────────────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Wait for First Result │
    │ or All Results (2s)   │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Results Collection:   │
    │ - CoinGecko: $43,250  │
    │ - CryptoComp: $43,248 │
    │ - CoinCap: $43,251    │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Apply Dynamic Weights:│
    │ - CoinGecko: 0.5      │
    │ - CryptoComp: 0.3     │
    │ - CoinCap: 0.2        │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Weighted Average:     │
    │ (43250*0.5 +          │
    │  43248*0.3 +          │
    │  43251*0.2)           │
    │ = $43,249.6           │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Validate Result:      │
    │ - Bounds check        │
    │ - Outlier detection   │
    │ - Timestamp check     │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Store in Cache        │
    │ TTL: 15s              │
    └───────────┬───────────┘
                │
                ▼
        Return to Client
```

## WebSocket Data Flow

```
Frontend Component
        │
        ▼
DataManager.subscribe('market_data', ['BTC', 'ETH'])
        │
        ▼
┌───────────────────────┐
│ WebSocket Connection  │
│ ws://backend/ws       │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Backend WS Handler    │
│ - Authenticate        │
│ - Register sub        │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────────────────┐
│ Real-time Data Streams            │
│                                   │
│ ┌──────────┐  ┌──────────┐       │
│ │ Binance  │  │ Provider │       │
│ │ WebSocket│  │ Polling  │       │
│ └────┬─────┘  └────┬─────┘       │
│      │             │              │
└──────┼─────────────┼──────────────┘
       │             │
       └──────┬──────┘
              │
              ▼
┌──────────────────────────┐
│ Data Aggregation         │
│ & Normalization          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Broadcast to             │
│ Subscribed Clients       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Frontend Receives Update │
│ - Update UI              │
│ - Trigger Callbacks      │
└──────────────────────────┘
```

## Provider Health Monitoring

```
┌─────────────────────────────────────────────────────────────┐
│                   Monitoring Dashboard                       │
│                                                              │
│  Provider: CoinGecko                                         │
│  Status: ●●●●● Healthy (99.2% uptime)                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Requests: ████████████████████░░░░ 82%             │    │
│  │ Latency:  ████░░░░░░░░░░░░░░░░░░░░ 180ms avg      │    │
│  │ Errors:   █░░░░░░░░░░░░░░░░░░░░░░░ 0.8%           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Provider: CoinMarketCap                                     │
│  Status: ●●●○○ Degraded (Rate Limited)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Requests: ██████████████████████░░░ 95% (Limited)  │    │
│  │ Latency:  ██████░░░░░░░░░░░░░░░░░░ 320ms avg      │    │
│  │ Errors:   ████░░░░░░░░░░░░░░░░░░░░ 15% (429s)     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Provider: Binance                                           │
│  Status: ●●○○○ Down (Geo-blocked)                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Requests: ████░░░░░░░░░░░░░░░░░░░░ 20%            │    │
│  │ Latency:  ████████████████████████ 1200ms avg     │    │
│  │ Errors:   ████████████████████████ 80% (451s)     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Circuit Breakers Active: 1                          │    │
│  │ Fallback Activations (24h): 47                      │    │
│  │ Cache Hit Rate: 76%                                 │    │
│  │ Avg Response Time: 245ms                            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Priority Chain

```
API Configuration Resolution
            │
            ▼
┌─────────────────────────┐
│ Environment Variables   │ ← Highest Priority
│ (COINMARKETCAP_API_KEY) │
└───────────┬─────────────┘
            │ Not Found
            ▼
┌─────────────────────────┐
│ providers_config.json   │
│ { "coinmarketcap": {    │
│   "key": "xxx"          │
│ }}                      │
└───────────┬─────────────┘
            │ Not Found
            ▼
┌─────────────────────────┐
│ api - Copy.txt          │
│ coinmarketcap_key=xxx   │
└───────────┬─────────────┘
            │ Not Found
            ▼
┌─────────────────────────┐
│ Hardcoded Defaults      │ ← Lowest Priority
│ (In source code)        │
└─────────────────────────┘
```

---

## Legend

```
┌────┐
│Box │  = Process/Component
└────┘

  │
  ▼     = Data Flow Direction

●●●●●   = Status Indicator (Green = Good)
●●●○○   = Status Indicator (Yellow = Warning)
●○○○○   = Status Indicator (Red = Error)

████    = Progress/Usage Bar

─────   = Connection/Relationship
```

---

**Document:** Data Flow Architecture Diagrams  
**Version:** 1.0  
**Created:** November 26, 2025  
**Related:** DATA_RETRIEVAL_ANALYSIS_REPORT.md
