# 🔀 ROUTE MAPPING (Old → New)


This file contains the route redirects needed for backward compatibility.


## TypeScript/React Router Routes

```typescript

<Route path="/tradingview-dashboard" element={<Navigate to="/trading?tab=charts" replace />} />
<Route path="/enhanced-trading" element={<Navigate to="/trading?tab=spot" replace />} />
<Route path="/futures" element={<Navigate to="/trading?tab=futures" replace />} />
<Route path="/trading-hub" element={<Navigate to="/trading" replace />} />
<Route path="/positions" element={<Navigate to="/trading?tab=positions" replace />} />
<Route path="/portfolio" element={<Navigate to="/trading?tab=portfolio" replace />} />
<Route path="/training" element={<Navigate to="/ai-lab?tab=training" replace />} />
<Route path="/strategylab" element={<Navigate to="/ai-lab" replace />} />
<Route path="/scanner" element={<Navigate to="/ai-lab?tab=scanner" replace />} />
<Route path="/market" element={<Navigate to="/market-analysis?tab=market" replace />} />
<Route path="/health" element={<Navigate to="/admin?tab=health" replace />} />
<Route path="/monitoring" element={<Navigate to="/admin?tab=monitoring" replace />} />
```


## Summary

- Total redirects: 12
- All old routes will redirect to new unified hubs
- Deep linking supported via query parameters
