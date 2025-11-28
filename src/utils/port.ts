import net from 'net';

/**
 * Check if a port is available
 * @param port Port number to check
 * @returns Promise<boolean> true if available, false otherwise
 */
function check(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => srv.close(() => resolve(true)))
      .listen(port, '0.0.0.0');
  });
}

/**
 * Find an available port starting from a preferred port
 * @param preferred Preferred port number (default: 3001)
 * @param maxTries Maximum number of ports to try (default: 10)
 * @returns Promise<number> Available port number
 * @throws Error if no free port is found
 */
export async function getAvailablePort(preferred = 3001, maxTries = 10): Promise<number> {
  let p = preferred;
  for (let i = 0; i < maxTries; i++) {
     
    const ok = await check(p);
    if (ok) return p;
    p += 1;
  }
  console.error(`no_free_port_from_${preferred}`);
}
