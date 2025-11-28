/**
 * Resource Monitor Routes
 * Real-time server resource monitoring
 */
import express from 'express';
import os from 'os';
import { Logger } from '../core/Logger.js';
import { ResourceMonitorService } from '../services/ResourceMonitorService.js';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/resources
 * Get current resource usage snapshot
 */
router.get('/', async (req, res) => {
  try {
    const resourceMonitor = ResourceMonitorService.getInstance();
    const resources = await resourceMonitor.getResourceSnapshot();
    
    res.json({
      success: true,
      data: resources,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('Failed to get resource snapshot', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get resources',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/resources/cpu
 * Get detailed CPU usage
 */
router.get('/cpu', async (req, res) => {
  try {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    const cpuUsage = cpus.map(cpu => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return {
        usage: ((total - idle) / total * 100).toFixed(2),
        times: cpu.times
      };
    });
    
    const avgUsage = cpuUsage.reduce((sum, cpu) => sum + parseFloat(cpu.usage), 0) / cpuUsage.length;
    
    res.json({
      success: true,
      data: {
        cores: cpus.length,
        model: cpus[0].model,
        speed: cpus[0].speed,
        averageUsage: avgUsage.toFixed(2) + '%',
        loadAverage: {
          '1min': loadAvg[0].toFixed(2),
          '5min': loadAvg[1].toFixed(2),
          '15min': loadAvg[2].toFixed(2)
        },
        perCore: cpuUsage,
        process: process.cpuUsage(),
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get CPU usage', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get CPU usage',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/resources/memory
 * Get detailed memory usage
 */
router.get('/memory', async (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const processMem = process.memoryUsage();
    
    res.json({
      success: true,
      data: {
        system: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          usagePercent: ((usedMem / totalMem) * 100).toFixed(2)
        },
        process: {
          rss: processMem.rss,
          heapTotal: processMem.heapTotal,
          heapUsed: processMem.heapUsed,
          external: processMem.external,
          arrayBuffers: processMem.arrayBuffers
        },
        formatted: {
          systemTotal: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          systemFree: (freeMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          systemUsed: (usedMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          processRss: (processMem.rss / 1024 / 1024).toFixed(2) + ' MB',
          processHeap: (processMem.heapUsed / 1024 / 1024).toFixed(2) + ' MB'
        },
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get memory usage', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get memory usage',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/resources/disk
 * Get disk usage information (requires additional dependencies in production)
 */
router.get('/disk', async (req, res) => {
  try {
    // Basic disk info - in production use 'diskusage' or similar package
    const diskInfo = {
      cwd: process.cwd(),
      warning: 'Detailed disk metrics require additional dependencies',
      message: 'Install diskusage package for comprehensive disk statistics'
    };
    
    res.json({
      success: true,
      data: diskInfo,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('Failed to get disk usage', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get disk usage',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/resources/network
 * Get network interface information
 */
router.get('/network', async (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    
    const networkInfo = Object.entries(interfaces).map(([name, ifaces]) => ({
      name,
      addresses: ifaces?.map(iface => ({
        address: iface.address,
        netmask: iface.netmask,
        family: iface.family,
        mac: iface.mac,
        internal: iface.internal,
        cidr: iface.cidr
      })) || []
    }));
    
    res.json({
      success: true,
      data: {
        interfaces: networkInfo,
        hostname: os.hostname(),
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get network info', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get network info',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/resources/summary
 * Get a quick summary of all resources
 */
router.get('/summary', async (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    const cpuUsage = cpus.map(cpu => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return (total - idle) / total * 100;
    });
    
    const avgCpuUsage = cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length;
    
    const summary = {
      cpu: {
        usage: avgCpuUsage.toFixed(2) + '%',
        cores: cpus.length,
        load: loadAvg[0].toFixed(2)
      },
      memory: {
        usage: ((usedMem / totalMem) * 100).toFixed(2) + '%',
        used: (usedMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        total: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB'
      },
      process: {
        uptime: process.uptime().toFixed(0) + 's',
        memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB'
      },
      system: {
        platform: os.platform(),
        uptime: os.uptime().toFixed(0) + 's',
        hostname: os.hostname()
      },
      health: determineResourceHealth(avgCpuUsage, (usedMem / totalMem) * 100),
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    logger.error('Failed to get resource summary', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get summary',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/resources/alerts
 * Get resource usage alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const resourceMonitor = ResourceMonitorService.getInstance();
    const alerts = await resourceMonitor.getResourceAlerts();
    
    res.json({
      success: true,
      data: alerts,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('Failed to get resource alerts', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get alerts',
      message: (error as Error).message
    });
  }
});

// Helper function to determine resource health
function determineResourceHealth(cpuUsage: number, memUsage: number): string {
  const issues = [];
  
  if (cpuUsage > 90) issues.push('critical_cpu');
  else if (cpuUsage > 70) issues.push('high_cpu');
  
  if (memUsage > 90) issues.push('critical_memory');
  else if (memUsage > 70) issues.push('high_memory');
  
  if (issues.some(i => i.startsWith('critical'))) return 'critical';
  if (issues.length > 0) return 'warning';
  return 'healthy';
}

export default router;
