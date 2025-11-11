/**
 * Health Check Endpoint
 *
 * Provides a simple health check endpoint for monitoring and load balancers.
 * Returns a 200 OK status with basic system information.
 *
 * @module health
 */

import type { Request, Response } from 'express';

/**
 * Health check endpoint handler.
 * Returns a JSON response indicating the service is operational.
 *
 * @param _ - Express request object (unused)
 * @param res - Express response object
 */
export const health = (_: Request, res: Response): void => {
  res.status(200).json({
    ok: true,
    ts: Date.now(),
    service: 'dreammaker-crypto-signal-trader'
  });
};
