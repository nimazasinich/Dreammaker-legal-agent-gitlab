/**
 * System Metrics Routes
 * Detailed system metrics and performance monitoring
 */
import express from 'express';
import os from 'os';
import { Logger } from '../core/Logger.js';

const router = express.Router();
const logger = Logger.getInstance();

// Store metrics history
const metricsHistory: any[] = [];
const MAX_HISTORY = 100;

/**
 * GET /api/system/metrics
 * Get current system metrics
 */
router.get('/', async (req, res) => {
  try {
    const metrics = collectMetrics();
    
    // Store in history
    metricsHistory.push(metrics);
    if (metricsHistory.length > MAX_HISTORY) {
      metricsHistory.shift();
    }
    
    res.json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    logger.error('Failed to get system metrics', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/system/metrics/history
 * Get historical metrics
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const history = metricsHistory
      .slice(-Number(limit))
      .map(m => ({
        timestamp: m.timestamp,
        cpu: m.cpu.usage,
        memory: m.memory.usagePercent,
        loadAverage: m.cpu.loadAverage[0]
      }));
    
    res.json({
      success: true,
      data: {
        metrics: history,
        count: history.length
      }
    });
    
  } catch (error) {
    logger.error('Failed to get metrics history', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get history',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/system/metrics/cpu
 * Get detailed CPU metrics
 */
router.get('/cpu', async (req, res) => {
  try {
    const cpus = os.cpus();
    
    const cpuMetrics = {
      cores: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed,
      loadAverage: os.loadavg(),
      perCore: cpus.map((cpu, i) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return {
          core: i,
          usage: ((total - idle) / total * 100).toFixed(2) + '%',
          times: cpu.times
        };
      }),
      process: process.cpuUsage(),
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: cpuMetrics
    });
    
  } catch (error) {
    logger.error('Failed to get CPU metrics', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get CPU metrics',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/system/metrics/memory
 * Get detailed memory metrics
 */
router.get('/memory', async (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const memoryMetrics = {
      system: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: (usedMem / totalMem * 100).toFixed(2)
      },
      process: {
        ...process.memoryUsage(),
        percentOfTotal: (process.memoryUsage().rss / totalMem * 100).toFixed(2)
      },
      formatted: {
        total: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        free: (freeMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        used: (usedMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        processRss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB'
      },
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: memoryMetrics
    });
    
  } catch (error) {
    logger.error('Failed to get memory metrics', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get memory metrics',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/system/metrics/network
 * Get network interface metrics
 */
router.get('/network', async (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    
    const networkMetrics = {
      interfaces: Object.entries(interfaces).map(([name, ifaces]) => ({
        name,
        addresses: ifaces?.map(iface => ({
          address: iface.address,
          netmask: iface.netmask,
          family: iface.family,
          mac: iface.mac,
          internal: iface.internal,
          cidr: iface.cidr
        })) || []
      })),
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: networkMetrics
    });
    
  } catch (error) {
    logger.error('Failed to get network metrics', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get network metrics',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/system/metrics/uptime
 * Get system and process uptime
 */
router.get('/uptime', async (req, res) => {
  try {
    const systemUptime = os.uptime();
    const processUptime = process.uptime();
    
    const uptimeMetrics = {
      system: {
        seconds: systemUptime,
        formatted: formatUptime(systemUptime)
      },
      process: {
        seconds: processUptime,
        formatted: formatUptime(processUptime)
      },
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: uptimeMetrics
    });
    
  } catch (error) {
    logger.error('Failed to get uptime metrics', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get uptime metrics',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/system/metrics/summary
 * Get a summary of all key metrics
 */
router.get('/summary', async (req, res) => {
  try {
    const metrics = collectMetrics();
    
    const summary = {
      cpu: {
        usage: metrics.cpu.usage,
        loadAverage: metrics.cpu.loadAverage[0]
      },
      memory: {
        usagePercent: metrics.memory.usagePercent,
        available: metrics.memory.free
      },
      uptime: {
        system: formatUptime(os.uptime()),
        process: formatUptime(process.uptime())
      },
      health: determineHealth(metrics),
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    logger.error('Failed to get metrics summary', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get summary',
      message: (error as Error).message
    });
  }
});

// Helper function to collect metrics
function collectMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  const cpuUsage = cpus.map(cpu => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return ((total - idle) / total * 100);
  });
  
  const avgCpuUsage = cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length;
  
  return {
    timestamp: Date.now(),
    cpu: {
      cores: cpus.length,
      usage: parseFloat(avgCpuUsage.toFixed(2)),
      loadAverage: os.loadavg(),
      perCore: cpuUsage
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercent: parseFloat((usedMem / totalMem * 100).toFixed(2))
    },
    process: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime()
    }
  };
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Helper function to determine health
function determineHealth(metrics: any): string {
  const issues = [];
  
  if (metrics.memory.usagePercent > 90) issues.push('high_memory');
  if (metrics.cpu.usage > 90) issues.push('high_cpu');
  if (metrics.cpu.loadAverage[0] > metrics.cpu.cores * 2) issues.push('high_load');
  
  if (issues.length === 0) return 'healthy';
  if (issues.length <= 2) return 'degraded';
  return 'critical';
}

export default router;
