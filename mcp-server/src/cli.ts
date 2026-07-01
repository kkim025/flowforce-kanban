#!/usr/bin/env node
/**
 * CLI entrypoint for flowforce-kanban-mcp.
 *
 * Usage:
 *   flowforce-kanban-mcp \
 *     --api-url http://localhost:5000 \
 *     --port 3001 \
 *     --email user@example.com \
 *     --password ***
 *
 * All flags are also accepted via env vars (FLOWFORCE_API_URL,
 * FLOWFORCE_PORT, FLOWFORCE_EMAIL, FLOWFORCE_PASSWORD).
 */

import 'dotenv/config';
import { parseArgs } from 'node:util';
import { startServer } from './index.js';
import { createStaticLoginAuth } from './auth-static-login.js';

function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 65535) {
    throw new Error(`Invalid port: ${raw}`);
  }
  return n;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'api-url': { type: 'string' },
      port: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'V' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }
  if (values.version) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = await import('../package.json', { with: { type: 'json' } });
    console.log(`${pkg.default.name} ${pkg.default.version}`);
    process.exit(0);
  }

  const apiUrl = values['api-url'] ?? process.env.FLOWFORCE_API_URL;
  const email = values.email ?? process.env.FLOWFORCE_EMAIL;
  const password = values.password ?? process.env.FLOWFORCE_PASSWORD;
  const port = parsePort(values.port ?? process.env.FLOWFORCE_PORT, 3001);

  if (!apiUrl) {
    console.error('Missing --api-url (or FLOWFORCE_API_URL env var).');
    process.exit(1);
  }
  if (!email || !password) {
    console.error(
      'Missing --email / --password (or FLOWFORCE_EMAIL / FLOWFORCE_PASSWORD env vars). ' +
        'Phase 1 requires a static user login; Phase 6 replaces this with bearer-token middleware.',
    );
    process.exit(1);
  }

  // Don't log the raw email on startup — it's PII, and the user just typed it.
  // The login response carries the user id, which is what we surface below.
  console.log(`[flowforce-kanban-mcp] Logging in to ${apiUrl}...`);
  const auth = await createStaticLoginAuth({ apiUrl, email, password });
  console.log('[flowforce-kanban-mcp] Login OK.');

  const server = await startServer({
    apiUrl,
    port,
    getToken: auth.getToken,
  });

  console.log(`[flowforce-kanban-mcp] Listening on http://${server.host}:${server.port}/mcp`);
  console.log('[flowforce-kanban-mcp] Press Ctrl+C to stop.');

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[flowforce-kanban-mcp] ${signal} received, shutting down...`);
    try {
      await server.close();
    } catch (err) {
      console.error('[flowforce-kanban-mcp] Error during shutdown:', err);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

function printHelp(): void {
  console.log(`flowforce-kanban-mcp — Model Context Protocol server for FlowForce Kanban

Usage:
  flowforce-kanban-mcp [flags]

Flags:
  --api-url URL     FlowForce API base URL (env: FLOWFORCE_API_URL)
  --port PORT       Port to listen on (default 3001, env: FLOWFORCE_PORT)
  --email EMAIL     FlowForce user email for login (env: FLOWFORCE_EMAIL)
  --password PASS   FlowForce user password for login (env: FLOWFORCE_PASSWORD)
  -h, --help        Show this help
  -V, --version     Show version

Phase 1 only supports static email/password login for the smoke test.
Phase 6 (issue #42) will replace this with bearer-token middleware that
accepts JWT, API key, or OAuth2 access tokens.

For more info: see mcp-server/README.md
`);
}

main().catch((err) => {
  console.error('[flowforce-kanban-mcp] Fatal:', err);
  process.exit(1);
});