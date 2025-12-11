import { defineConfig, loadEnv, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      'import.meta.env.VITE_AUTH_MODE': JSON.stringify(env.VITE_AUTH_MODE || ''),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    server: {
      host: "localhost",
      port: 6061,
      strictPort: true,
    },
    preview: {
      host: "localhost",
      port: 6061,
      strictPort: true,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      // Lightweight mock API for dev server to satisfy live endpoints on port 6061
      {
        name: "mock-live-api",
        configureServer(server: ViteDevServer) {
          let packagesLive: any = { savedPrices: {}, packageMeta: {}, addOnMeta: {}, customPackages: [], customAddOns: [], version: 0 };
          let vehicleTypesLive: any[] = [
            { id: 'compact', name: 'Compact/Sedan', description: 'Small cars and sedans', hasPricing: true },
            { id: 'midsize', name: 'Mid-Size/SUV', description: 'Mid-size cars and SUVs', hasPricing: true },
            { id: 'truck', name: 'Truck/Van/Large SUV', description: 'Trucks, vans, large SUVs', hasPricing: true },
            { id: 'luxury', name: 'Luxury/High-End', description: 'Luxury and premium vehicles', hasPricing: true },
          ];
          let contactLive: any = {
            hours: 'Appointments daily 8 AM–6 PM',
            phone: '(555) 123-4567',
            address: 'Methuen, MA',
            email: 'primedetailsolutions.ma.nh@gmail.com',
          };

          function sendJson(res: any, obj: any) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(obj));
          }
          function notFound(res: any) { res.statusCode = 404; res.end('Not Found'); }

          server.middlewares.use((req: any, res: any, next: any) => {
            const url = req.url || '';
            const method = (req.method || 'GET').toUpperCase();
            if (!url.startsWith('/api/')) return next();
            // Packages live endpoints
            if (url === '/api/packages/full-sync' && method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => { body += chunk; });
              req.on('end', () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  packagesLive = {
                    savedPrices: payload.savedPrices || {},
                    packageMeta: payload.packageMeta || {},
                    addOnMeta: payload.addOnMeta || {},
                    customPackages: Array.isArray(payload.customPackages) ? payload.customPackages : [],
                    customAddOns: Array.isArray(payload.customAddOns) ? payload.customAddOns : [],
                    version: Date.now(),
                  };
                  return sendJson(res, { ok: true, version: packagesLive.version });
                } catch (e) {
                  res.statusCode = 400; return sendJson(res, { ok: false, error: 'invalid_payload' });
                }
              });
              return;
            }
            if (url.startsWith('/api/packages/live') && method === 'GET') {
              return sendJson(res, packagesLive);
            }
            // Vehicle types live endpoints
            if (url === '/api/vehicle-types/live' && method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => { body += chunk; });
              req.on('end', () => {
                try {
                  const payload = JSON.parse(body || '[]');
                  vehicleTypesLive = Array.isArray(payload) ? payload : vehicleTypesLive;
                  return sendJson(res, { ok: true, count: vehicleTypesLive.length });
                } catch (e) {
                  res.statusCode = 400; return sendJson(res, { ok: false, error: 'invalid_payload' });
                }
              });
              return;
            }
            if (url.startsWith('/api/vehicle-types/live') && method === 'GET') {
              return sendJson(res, vehicleTypesLive);
            }
            // Contact live endpoints
            if (url === '/api/contact/live' && method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => { body += chunk; });
              req.on('end', () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  contactLive = {
                    hours: String(payload.hours ?? contactLive.hours),
                    phone: String(payload.phone ?? contactLive.phone),
                    address: String(payload.address ?? contactLive.address),
                    email: String(payload.email ?? contactLive.email),
                  };
                  return sendJson(res, { ok: true });
                } catch (e) {
                  res.statusCode = 400; return sendJson(res, { ok: false, error: 'invalid_payload' });
                }
              });
              return;
            }
            if (url.startsWith('/api/contact/live') && method === 'GET') {
              return sendJson(res, contactLive);
            }
            return notFound(res);
          });
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
