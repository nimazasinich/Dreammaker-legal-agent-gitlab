class HomePage {
  async init() {
    try {
      await this.loadStatus();
      await this.loadTopCoins();
    } catch (e) {
      console.warn('[Home] Init warnings:', e);
    }
  }

  async loadStatus() {
    const healthEl = document.getElementById('health-badges');
    const statsEl = document.getElementById('stats-badges');
    try {
      const [healthRes, statusRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/status')
      ]);
      const health = healthRes.ok ? await healthRes.json() : { status: 'unknown' };
      const status = statusRes.ok ? await statusRes.json() : {};
      if (healthEl) {
        healthEl.innerHTML = `
          <span class="badge success">Server: ${health.status || 'unknown'}</span>
          <span class="badge info">Time: ${new Date(health.timestamp || Date.now()).toLocaleTimeString()}</span>
        `;
      }
      if (statsEl) {
        const apis = status.total_routes || status.routes_registered || 0;
        const models = status.models_loaded || 0;
        statsEl.innerHTML = `
          <span class="badge info">APIs: ${apis}</span>
          <span class="badge warning">Models: ${models}</span>
        `;
      }
    } catch (e) {
      if (healthEl) healthEl.innerHTML = '<span class="badge warning">Health: unavailable</span>';
      if (statsEl) statsEl.innerHTML = '<span class="badge warning">Stats: unavailable</span>';
    }
  }

  async loadTopCoins() {
    const grid = document.getElementById('top-coins');
    if (!grid) return;
    try {
      const res = await fetch('/api/market/top?limit=8');
      const json = res.ok ? await res.json() : null;
      const items = Array.isArray(json?.markets) ? json.markets : (Array.isArray(json?.top_market) ? json.top_market : []);
      const cards = items.slice(0, 8).map(c => {
        const name = c.name || c.symbol || '—';
        const price = c.current_price ?? c.price ?? 0;
        const change = c.price_change_percentage_24h ?? 0;
        const changeClass = change >= 0 ? 'pos' : 'neg';
        return `
          <div class="card">
            <div class="name">${name}</div>
            <div class="price">$${Number(price).toLocaleString()}</div>
            <div class="change ${changeClass}">${(Number(change)).toFixed(2)}%</div>
          </div>
        `;
      }).join('');
      grid.innerHTML = cards || '<div class="card">No market data available</div>';
    } catch (e) {
      grid.innerHTML = '<div class="card">Failed to load market data</div>';
    }
  }
}

export default HomePage;
