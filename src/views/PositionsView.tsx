import React, { useState, useEffect } from 'react';
import WebSocket from 'isomorphic-ws';
import { Logger } from '../core/Logger';
import { API_BASE, buildWebSocketUrl } from '../config/env';

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  sl: number;
  tp: number[];
  leverage: number;
  pnl: number;
  pnlPercent: number;
}

interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  qty: number;
  price?: number;
  status: string;
  timestamp: number;
}

export const PositionsView: React.FC = () => {
  const logger = Logger.getInstance();
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [loading, setLoading] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    loadData();

    // Connect to WebSocket for real-time updates
    // Use unified buildWebSocketUrl function to prevent /ws/ws duplication
    const wsUrl = buildWebSocketUrl('/ws');
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        if (data.type === 'positions_update') {
          setPositions(data.data || []);
        }
      } catch (error) {
        logger.error('WebSocket message error', {}, error as Error);
      }
    };

    websocket.onerror = (error) => {
      logger.error('WebSocket error', {}, error as Error);
    };

    setWs(websocket);

    // Refresh data every 5 seconds
    const interval = setInterval(loadData, 5000);

    return () => {
      clearInterval(interval);
      if (websocket) {
        websocket.close();
      }
    };
  }, []);

  const loadData = async () => {
    try {
      const [posRes, ordRes] = await Promise.all([
        fetch(`${API_BASE}/api/positions`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/orders?status=PENDING`, { credentials: 'include' })
      ]);

      if (posRes.ok) {
        const posData = await posRes.json();
        if (posData.success) {
          setPositions(posData.positions || []);
        }
      }

      if (ordRes.ok) {
        const ordData = await ordRes.json();
        if (ordData.success) {
          setOrders(ordData.orders || []);
        }
      }
    } catch (error) {
      logger.error('Failed to load data', {}, error as Error);
    }
  };

  const handleClosePosition = async (id: string) => {
    if (!confirm(`Close this position?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/positions/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id })
      });

      const data = await response.json();
      if (data.success) {
        await loadData();
        alert(data.message || 'Position closed successfully');
      } else {
        alert(`Failed to close position: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Failed to close position: ${error.message}`);
    }
    setLoading(false);
  };

  const handleReducePosition = async (id: string) => {
    const position = positions.find(p => p.id === id);
    if (!position) { console.warn("Missing data"); }

    const reduceBy = position.size / 2;
    if (!confirm(`Reduce position by ${reduceBy}?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/positions/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, qty: reduceBy })
      });

      const data = await response.json();
      if (data.success) {
        await loadData();
        alert(data.message || 'Position reduced successfully');
      } else {
        alert(`Failed to reduce position: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Failed to reduce position: ${error.message}`);
    }
    setLoading(false);
  };

  const handleReversePosition = async (id: string) => {
    const position = positions.find(p => p.id === id);
    if (!position) { console.warn("Missing data"); }

    if (!confirm(`Reverse position for ${position.symbol}?`)) return;

    setLoading(true);
    try {
      // Close current position
      await fetch(`${API_BASE}/api/positions/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id })
      });

      // Open opposite position
      const oppositeSide = position.side === 'LONG' ? 'SELL' : 'BUY';
      await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol: position.symbol,
          side: oppositeSide,
          type: 'MARKET',
          qty: position.size,
          leverage: position.leverage
        })
      });

      await loadData();
      alert('Position reversed successfully');
    } catch (error: any) {
      alert(`Failed to reverse position: ${error.message}`);
    }
    setLoading(false);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Cancel this order?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        await loadData();
        alert(data.message || 'Order cancelled successfully');
      } else {
        alert(`Failed to cancel order: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Failed to cancel order: ${error.message}`);
    }
    setLoading(false);
  };

  const getPnlColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getSideColor = (side: string) => {
    return side === 'LONG' || side === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Positions & Orders</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'positions'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Open Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200" style={{ borderRadius: '14px' }}>
          {activeTab === 'positions' && (
            <div className="overflow-x-auto">
              {positions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No open positions</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Symbol</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Side</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Size</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Entry</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Mark</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">SL</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">TP</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Leverage</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">PnL</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(positions || []).map((pos, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-all">
                        <td className="py-3 px-4 font-semibold text-gray-800">{pos.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getSideColor(pos.side)}`}>
                            {pos.side}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{pos.size.toFixed(4)}</td>
                        <td className="py-3 px-4 text-gray-700">${pos.entryPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-gray-700 font-semibold">${pos.markPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-red-600">${pos.sl.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(pos.tp || []).map((tp, i) => (
                              <span key={i} className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                ${tp.toFixed(0)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-purple-600 font-semibold">{pos.leverage}x</td>
                        <td className="py-3 px-4">
                          <div className={`font-semibold ${getPnlColor(pos.pnl)}`}>
                            ${pos.pnl.toFixed(2)}
                            <div className="text-xs">({pos.pnlPercent.toFixed(2)}%)</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              disabled={loading}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                              style={{ borderRadius: '8px' }}
                            >
                              Close
                            </button>
                            <button
                              onClick={() => handleReducePosition(pos.id)}
                              disabled={loading}
                              className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-all disabled:opacity-50"
                              style={{ borderRadius: '8px' }}
                            >
                              Reduce
                            </button>
                            <button
                              onClick={() => handleReversePosition(pos.id)}
                              disabled={loading}
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-all disabled:opacity-50"
                              style={{ borderRadius: '8px' }}
                            >
                              Reverse
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No pending orders</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Order ID</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Symbol</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Side</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Size</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Price</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orders || []).map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-all">
                        <td className="py-3 px-4 text-gray-600 font-mono text-xs">{order.id}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{order.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getSideColor(order.side)}`}>
                            {order.side}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{order.type}</td>
                        <td className="py-3 px-4 text-gray-700">{order.qty}</td>
                        <td className="py-3 px-4 text-gray-700">${order.price?.toFixed(2) || 'Market'}</td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                            style={{ borderRadius: '8px' }}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Trading history will appear here</p>
              <p className="text-sm mt-2">Closed positions and executed orders</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
