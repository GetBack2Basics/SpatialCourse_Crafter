import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import net from 'net';

// Find a free TCP port starting from `start`
function findFreePort(start = 3000) {
  return new Promise((resolve, reject) => {
    let port = start;
    const tryPort = () => {
      const srv = net.createServer();
      srv.once('error', () => { port++; tryPort(); });
      srv.once('listening', () => { srv.close(() => resolve(port)); });
      srv.listen(port, '127.0.0.1');
    };
    tryPort();
  });
}

const port = await findFreePort(3000);

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const dynamicBuildTimestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;

export default defineConfig({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(dynamicBuildTimestamp)
  },
  plugins: [react()],
  server: {
    port,
    host: true,
    proxy: {
      // REST API → Node backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // WebSocket → Node backend
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

