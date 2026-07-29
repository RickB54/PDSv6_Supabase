import { defineConfig, loadEnv, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import fs from "node:fs";
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
      host: "0.0.0.0", // Allow access from network (for phone testing)
      port: 6066,
      strictPort: true,
      // Trigger restart
    },
    preview: {
      host: "localhost",
      port: 6066,
      strictPort: true,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      // Persistence for mock API state to survive restarts
      {
        name: "mock-live-api",
        configureServer(server: ViteDevServer) {
          const dataPath = path.resolve(process.cwd(), 'packagesLive.json');
          
          let state = {
            packagesLive: { savedPrices: {}, packageMeta: {}, addOnMeta: {}, customPackages: [], customAddOns: [], version: 0 },
            vehicleTypesLive: [
              { id: 'compact', name: 'Compact/Sedan', description: 'Small cars and sedans', hasPricing: true },
              { id: 'midsize', name: 'Mid-Size/SUV', description: 'Mid-size cars and SUVs', hasPricing: true },
              { id: 'truck', name: 'Truck/Van/Large SUV', description: 'Trucks, vans, large SUVs', hasPricing: true },
              { id: 'luxury', name: 'Luxury/High-End', description: 'Luxury and premium vehicles', hasPricing: true },
            ],
            contactLive: {
              hours: 'Appointments daily 8 AM–6 PM',
              phone: '(555) 123-4567',
              address: 'Methuen, MA',
              email: 'Rick.PrimeAutoDetail@gmail.com',
            }
          };

          // Load from disk if exists
          try {
            if (fs.existsSync(dataPath)) {
              const saved = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
              state = { ...state, ...saved };
              console.log('✅ Mock API state restored from packagesLive.json');
            }
          } catch (e) { console.error('Failed to load mock API state', e); }

          function saveState() {
            try {
              fs.writeFileSync(dataPath, JSON.stringify(state, null, 2));
            } catch (e) { console.error('Failed to save mock API state', e); }
          }

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
                  const newPrices = payload.savedPrices || {};
                  const newMetaPkg = payload.packageMeta || {};
                  const newMetaAddon = payload.addOnMeta || {};
                  const newCustomPkgs = Array.isArray(payload.customPackages) ? payload.customPackages : [];
                  const newCustomAddons = Array.isArray(payload.customAddOns) ? payload.customAddOns : [];

                  const pricesMatch = JSON.stringify(state.packagesLive.savedPrices || {}) === JSON.stringify(newPrices);
                  const metaPkgMatch = JSON.stringify(state.packagesLive.packageMeta || {}) === JSON.stringify(newMetaPkg);
                  const metaAddonMatch = JSON.stringify(state.packagesLive.addOnMeta || {}) === JSON.stringify(newMetaAddon);
                  const customPkgsMatch = JSON.stringify(state.packagesLive.customPackages || []) === JSON.stringify(newCustomPkgs);
                  const customAddonsMatch = JSON.stringify(state.packagesLive.customAddOns || []) === JSON.stringify(newCustomAddons);

                  if (pricesMatch && metaPkgMatch && metaAddonMatch && customPkgsMatch && customAddonsMatch && state.packagesLive.version > 0) {
                    return sendJson(res, { ok: true, version: state.packagesLive.version });
                  }

                  state.packagesLive = {
                    savedPrices: newPrices,
                    packageMeta: newMetaPkg,
                    addOnMeta: newMetaAddon,
                    customPackages: newCustomPkgs,
                    customAddOns: newCustomAddons,
                    version: Date.now(),
                  };
                  saveState();
                  return sendJson(res, { ok: true, version: state.packagesLive.version });
                } catch (e) {
                  res.statusCode = 400; return sendJson(res, { ok: false, error: 'invalid_payload' });
                }
              });
              return;
            }
            if (url.startsWith('/api/packages/live') && method === 'GET') {
              return sendJson(res, state.packagesLive);
            }
            // Vehicle types live endpoints
            if (url === '/api/vehicle-types/live' && method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => { body += chunk; });
              req.on('end', () => {
                try {
                  const payload = JSON.parse(body || '[]');
                  state.vehicleTypesLive = Array.isArray(payload) ? payload : state.vehicleTypesLive;
                  saveState();
                  return sendJson(res, { ok: true, count: state.vehicleTypesLive.length });
                } catch (e) {
                  res.statusCode = 400; return sendJson(res, { ok: false, error: 'invalid_payload' });
                }
              });
              return;
            }
            if (url.startsWith('/api/vehicle-types/live') && method === 'GET') {
              return sendJson(res, state.vehicleTypesLive);
            }
            // Contact live endpoints
            if (url === '/api/contact/live' && method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => { body += chunk; });
              req.on('end', () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  state.contactLive = {
                    hours: String(payload.hours ?? state.contactLive.hours),
                    phone: String(payload.phone ?? state.contactLive.phone),
                    address: String(payload.address ?? state.contactLive.address),
                    email: String(payload.email ?? state.contactLive.email),
                  };
                  saveState();
                  return sendJson(res, { ok: true });
                } catch (e) {
                  res.statusCode = 400; return sendJson(res, { ok: false, error: 'invalid_payload' });
                }
              });
              return;
            }
            if (url.startsWith('/api/contact/live') && method === 'GET') {
              return sendJson(res, state.contactLive);
            }
            if (url === '/test-result' && method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => { body += chunk; });
              req.on('end', () => {
                try {
                  fs.writeFileSync('test-result.json', body);
                  return sendJson(res, { ok: true });
                } catch (e) {
                  res.statusCode = 500; return sendJson(res, { error: e.message });
                }
              });
              return;
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
 
