/**
 * System Diagnostics Routes
 * Deep system diagnostics and health monitoring
 */
import express from 'express';
import os from 'os';
import { Logger } from '../core/Logger.js';
import { Database } from '../data/Database.js';
import { RedisService } from '../services/RedisService.js';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/system/diagnostics
 * Comprehensive system diagnostics
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // System information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      nodeVersion: process.version,
      processUptime: process.uptime()
    };
    
    // CPU information
    const cpus = os.cpus();
    const cpuInfo = {
      model: cpus[0].model,
      cores: cpus.length,
      speed: cpus[0].speed,
      loadAverage: os.loadavg(),
      usage: cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return ((total - idle) / total * 100).toFixed(2);
      })
    };
    
    // Memory information
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    const memoryInfo = {
      total: (totalMemory / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      free: (freeMemory / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      used: (usedMemory / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      usagePercent: ((usedMemory / totalMemory) * 100).toFixed(2) + '%',
      processMemory: {
        rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        external: (process.memoryUsage().external / 1024 / 1024).toFixed(2) + ' MB'
      }
    };
    
    // Network interfaces
    const networkInterfaces = os.networkInterfaces();
    const activeInterfaces = Object.entries(networkInterfaces)
      .filter(([name, ifaces]) => ifaces && ifaces.length > 0)
      .map(([name, ifaces]) => ({
        name,
        addresses: ifaces!.map(iface => ({
          address: iface.address,
          family: iface.family,
          internal: iface.internal
        }))
      }));
    
    // Process information
    const processInfo = {
      pid: process.pid,
      ppid: process.ppid,
      title: process.title,
      argv: process.argv,
      execPath: process.execPath,
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT
      }
    };
    
    // Database status
    let databaseStatus = 'unknown';
    try {
      const db = Database.getInstance();
      databaseStatus = 'connected';
    } catch (error) {
      databaseStatus = 'error';
    }
    
    // Redis status
    let redisStatus = 'unknown';
    try {
      const redis = RedisService.getInstance();
      await (redis as any).ping?.();
      redisStatus = 'connected';
    } catch (error) {
      redisStatus = 'disconnected';
    }
    
    const diagnosticTime = Date.now() - startTime;
    
    const diagnostics = {
      timestamp: Date.now(),
      diagnosticTime: `${diagnosticTime}ms`,
      system: systemInfo,
      cpu: cpuInfo,
      memory: memoryInfo,
      network: activeInterfaces,
      process: processInfo,
      services: {
        database: databaseStatus,
        redis: redisStatus
      },
      health: {
        status: 'operational',
        issues: []
      }
    };
    
    // Add health warnings
    if (parseFloat(memoryInfo.usagePercent) > 90) {
      diagnostics.health.issues.push('High memory usage');
    }
    
    if (cpuInfo.loadAverage[0] > cpus.length * 2) {
      diagnostics.health.issues.push('High CPU load');
    }
    
    if (databaseStatus !== 'connected') {
      diagnostics.health.issues.push('Database connection issue');
    }
    
    if (diagnostics.health.issues.length > 0) {
      diagnostics.health.status = 'degraded';
    }
    
    res.json({
      success: true,
      data: diagnostics
    });
    
  } catch (error) {
    logger.error('Failed to get system diagnostics', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get diagnostics',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/system/diagnostics/processes
 * Get process information and resource usage
 */
router.get('/processes', async (req, res) => {
  try {
    const processInfo = {
      main: {
        pid: process.pid,
        ppid: process.ppid,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      },
      // In production, would enumerate child processes
      children: []
    };
    
    res.json({
      success: true,
      data: processInfo
    });
    
  } catch (error) {
    logger.error('Failed to get process info', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get process info',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/system/diagnostics/disk
 * Get disk usage information
 */
router.get('/disk', async (req, res) => {
  try {
    // Note: In production, would use a library like 'diskusage' for accurate disk stats
    const diskInfo = {
      warning: 'Disk usage monitoring requires additional dependencies',
      cwd: process.cwd(),
      message: 'Install diskusage or similar package for detailed disk statistics'
    };
    
    res.json({
      success: true,
      data: diskInfo
    });
    
  } catch (error) {
    logger.error('Failed to get disk info', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get disk info',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/system/diagnostics/environment
 * Get environment and configuration information
 */
router.get('/environment', async (req, res) => {
  try {
    const env = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: process.env.NODE_ENV || 'development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      // Only include safe environment variables
      config: {
        PORT: process.env.PORT,
        NODE_ENV: process.env.NODE_ENV,
        LOG_LEVEL: process.env.LOG_LEVEL,
        FEATURE_FUTURES: process.env.FEATURE_FUTURES
      }
    };
    
    res.json({
      success: true,
      data: env
    });
    
  } catch (error) {
    logger.error('Failed to get environment info', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get environment info',
      message: (error as Error).message
    });
  }
});

export default router;
