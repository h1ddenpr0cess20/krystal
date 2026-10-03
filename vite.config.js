import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, loadEnv } from 'vite';

import { createApiMiddleware } from './src/server/api.js';
import { loadConfig } from './src/server/config.js';
import { REALTIME_PATH } from './src/server/app.js';
import { refuseUpgrade, sameOrigin } from './src/server/origin.js';
import { createRealtimeProxy } from './src/server/realtime.js';
import { CERT_DIR } from './src/server/tls.js';

function krystalApi(env) {
  const config = loadConfig({ ...process.env, ...env });
  return {
    name: 'krystal-api',
    configureServer(server) {
      server.middlewares.use(createApiMiddleware(config));

      const realtime = createRealtimeProxy(config);
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (req.url.split('?')[0] !== REALTIME_PATH) return;
        /** Same reason as in createApp: a WebSocket is not same-origin by
         *  default, and this one dials on our key. */
        if (!sameOrigin(req)) return refuseUpgrade(socket);
        realtime.handleUpgrade(req, socket, head);
      });

      if (!config.apiKey) {
        server.config.logger.warn('XAI_API_KEY is not set — the mic will fail until it is.');
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const lan = mode === 'lan';

  return {
    plugins: [krystalApi(env), ...(lan ? [basicSsl({ certDir: CERT_DIR })] : [])],
    server: {
      port: Number(env.PORT) || 5173,
      /** This machine only, for the same reason `npm start` is: nothing here
       *  asks who you are, and the call runs on your key. `dev:lan` passes
       *  --host, which is that decision made on purpose. */
      host: env.HOST || false,
    },
    build: {
      target: 'es2022',
      sourcemap: true,
      chunkSizeWarningLimit: 800,
    },
  };
});
