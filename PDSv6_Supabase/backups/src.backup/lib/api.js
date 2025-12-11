import localforage from 'localforage';
const API_BASE = 'http://localhost:6061';

// Basic retry wrapper and clearer error messaging when backend is unavailable.
async function fetchWithRetry(url, options = {}, retries = 1) {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      ...options,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    // Allow endpoints that respond with text
    return res.text();
  } catch (err) {
    if (retries > 0) {
      // small backoff
      await new Promise(r => setTimeout(r, 200));
      return fetchWithRetry(url, options, retries - 1);
    }
    // Gracefully degrade: return null instead of throwing to avoid noisy overlay errors.
    return null;
  }
}

const api = async (endpoint, options = {}) => {
  // =====================
  // Users administration
  // =====================
  if (endpoint === '/api/users' && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const users = (await localforage.getItem('users')) || [];
      const companyEmps = (await localforage.getItem('company-employees')) || [];
      const normalizedCompany = (Array.isArray(companyEmps) ? companyEmps : []).map((e) => ({
        id: `emp_${String(e.email || e.name || Math.random()).toLowerCase()}`,
        name: e.name || '',
        email: e.email || '',
        role: String(e.role || '').toLowerCase() === 'admin' ? 'admin' : 'employee',
        createdAt: e.createdAt || null,
        updatedAt: e.updatedAt || null,
        lastLogin: e.lastLogin || null,
      }));
      const byEmail = new Map();
      const push = (item) => {
        const key = String(item.email || '').toLowerCase();
        const prev = byEmail.get(key);
        if (!prev) byEmail.set(key, item);
        else {
          const pTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
          const cTs = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
          byEmail.set(key, cTs >= pTs ? { ...prev, ...item } : prev);
        }
      };
      (Array.isArray(users) ? users : []).forEach(push);
      normalizedCompany.forEach(push);
      return Array.from(byEmail.values());
    } catch {
      return [];
    }
  }

  // Services: site-wide disclaimers and related content (expandable)
  if (endpoint.startsWith('/api/services')) {
    const method = (options.method || 'GET').toUpperCase();
    const key = 'servicesContent';
  const defaults = { disclaimer: '⚠️ Service & Pricing Disclaimer \n • Paint Protection & Ceramic Coating NOT included. Available only in Premium packages or add-ons. \n \n • We do NOT offer: → Biological Cleanup → Emergency Services \n \n • We focus on premium cosmetic and protective detailing. \n \n Important: Final price may vary based on vehicle condition, size, or additional work required. All quotes are estimates until vehicle is inspected.' };
    const getCurrent = async () => {
      const curr = (await localforage.getItem(key)) || {};
      return {
        disclaimer: String(curr.disclaimer || defaults.disclaimer),
      };
    };
    if (method === 'GET' && endpoint === '/api/services') {
      try { return await getCurrent(); } catch { return defaults; }
    }
    if (method === 'POST' && endpoint === '/api/services') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const next = { disclaimer: String(payload.disclaimer || defaults.disclaimer) };
        await localforage.setItem(key, next);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'services' } })); } catch {}
        return { ok: true, record: next };
      } catch { return { ok: false, error: 'failed_to_update_services_local' }; }
    }
  }

  // Employees-only list
  if (endpoint === '/api/users/employees' && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const users = (await localforage.getItem('users')) || [];
      const companyEmps = (await localforage.getItem('company-employees')) || [];
      // Normalize company employees into the users shape
      const normalizedCompany = (Array.isArray(companyEmps) ? companyEmps : []).map((e) => ({
        id: `emp_${String(e.email || e.name || Math.random()).toLowerCase()}`,
        name: e.name || '',
        email: e.email || '',
        role: String(e.role || '').toLowerCase() === 'admin' ? 'admin' : 'employee',
        createdAt: e.createdAt || null,
        updatedAt: e.updatedAt || null,
        lastLogin: e.lastLogin || null,
      }));

      // Merge and de-duplicate by stable key (email -> name fallback),
      // preferring the most recently updated record when conflicts occur.
      const byKey = new Map();
      const push = (item) => {
        // Only consider employees here
        const role = String(item.role || '').toLowerCase();
        if (role !== 'employee') return;
        const key = (String(item.email || '').toLowerCase() || String(item.name || '').toLowerCase());
        if (!key) return; // skip items without any key
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, item);
        } else {
          const pTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
          const cTs = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
          byKey.set(key, cTs >= pTs ? { ...prev, ...item } : prev);
        }
      };

      (Array.isArray(users) ? users : []).forEach(push);
      normalizedCompany.forEach(push);

      return Array.from(byKey.values());
    } catch {
      return [];
    }
  }

  // =====================
  // Website Admin content
  // =====================
  // Vehicle Types: manage display labels and descriptions; seed four base keys
  if (endpoint.startsWith('/api/vehicle-types')) {
    const method = (options.method || 'GET').toUpperCase();
    const key = 'vehicleTypes';
    const seed = [
      { id: 'compact', name: 'Compact/Sedan', description: 'Small cars and sedans', hasPricing: true },
      { id: 'midsize', name: 'Mid-Size/SUV', description: 'Mid-size cars and SUVs', hasPricing: true },
      { id: 'truck', name: 'Truck/Van/Large SUV', description: 'Trucks, vans, large SUVs', hasPricing: true },
      { id: 'luxury', name: 'Luxury/High-End', description: 'Luxury and premium vehicles', hasPricing: true },
    ];
    const ensureSeed = async () => {
      const list = (await localforage.getItem(key)) || [];
      if (!Array.isArray(list) || list.length === 0) {
        await localforage.setItem(key, seed);
        return seed;
      }
      // Merge to ensure base keys exist
      const ids = new Set(list.map((v) => v.id));
      const merged = [...list];
      seed.forEach((v) => { if (!ids.has(v.id)) merged.push(v); });
      await localforage.setItem(key, merged);
      return merged;
    };

    // Public live endpoint for vehicle types (visible list with pricing)
    if (method === 'GET' && endpoint === '/api/vehicle-types/live') {
      try {
        const list = await ensureSeed();
        return (Array.isArray(list) ? list : []).filter((v) => v && v.name);
      } catch {
        return seed;
      }
    }

    if (method === 'GET' && endpoint === '/api/vehicle-types') {
      try {
        const list = await ensureSeed();
        return list;
      } catch {
        return seed;
      }
    }
    if (method === 'POST' && endpoint === '/api/vehicle-types') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const list = (await ensureSeed()) || [];
        const id = String(payload.id || `vt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`);
        const record = {
          id,
          name: String(payload.name || 'New Type'),
          description: String(payload.description || ''),
          hasPricing: Boolean(payload.hasPricing),
        };
        // prevent accidental duplicate of base keys
        if (list.some((v) => v.id === id)) {
          return { ok: false, error: 'duplicate_id' };
        }
        list.push(record);
        await localforage.setItem(key, list);
        // Broadcast for immediate UI refresh
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'vehicle-types' } })); } catch {}
        return { ok: true, record };
      } catch (e) {
        return { ok: false, error: 'failed_to_create_local' };
      }
    }
    if (method === 'PUT' && endpoint.startsWith('/api/vehicle-types/')) {
      try {
        const id = endpoint.split('/')[3];
        const payload = JSON.parse(options.body || '{}');
        const list = (await ensureSeed()) || [];
        const idx = list.findIndex((v) => v.id === id);
        if (idx < 0) return { ok: false, error: 'not_found' };
        // Do not allow deleting base keys via update; allow name/description changes
        const prev = list[idx];
        list[idx] = {
          ...prev,
          name: payload.name != null ? String(payload.name) : prev.name,
          description: payload.description != null ? String(payload.description) : prev.description,
          hasPricing: payload.hasPricing != null ? Boolean(payload.hasPricing) : prev.hasPricing,
        };
        await localforage.setItem(key, list);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'vehicle-types' } })); } catch {}
        return { ok: true, record: list[idx] };
      } catch (e) {
        return { ok: false, error: 'failed_to_update_local' };
      }
    }
    if (method === 'DELETE' && endpoint.startsWith('/api/vehicle-types/')) {
      try {
        const id = endpoint.split('/')[3];
        const list = (await ensureSeed()) || [];
        // Protect base pricing keys from deletion to avoid breaking pricing
        if (['compact','midsize','truck','luxury'].includes(id)) {
          return { ok: false, error: 'protected_base_type' };
        }
        const next = list.filter((v) => v.id !== id);
        await localforage.setItem(key, next);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'vehicle-types' } })); } catch {}
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'failed_to_delete_local' };
      }
    }
  }

  // Pricing utility: apply multiplier to create/update pricing for a new vehicle type
  if (endpoint === '/api/pricing/apply-vehicle-multiplier') {
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'POST') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const newTypeId = String(payload.newTypeId || payload.newType || payload.id || '').trim();
        const baseType = String(payload.baseType || 'midsize').trim();
        const multiplier = Number(payload.multiplier || 1);
        if (!newTypeId) {
          return { ok: false, error: 'missing_new_type' };
        }
        if (!['compact','midsize','truck','luxury'].includes(baseType)) {
          return { ok: false, error: 'invalid_base_type' };
        }
        const saved = (await localforage.getItem('savedPrices')) || {};
        let created = 0;
        try {
          const { servicePackages, addOns } = await import('@/lib/services');
          const { getCustomPackages, getCustomAddOns } = await import('@/lib/servicesMeta');
          const allPkgs = [...servicePackages, ...getCustomPackages()];
          const allAddOns = [...addOns, ...getCustomAddOns()];

          // Packages
          for (const p of allPkgs) {
            const baseKey = `package:${p.id}:${baseType}`;
            const newKey = `package:${p.id}:${newTypeId}`;
            const baseVal = saved[baseKey] != null
              ? Number(saved[baseKey])
              : Number((p.pricing && p.pricing[baseType]) || 0);
            const nextVal = Math.round(baseVal * multiplier);
            if (!Number.isNaN(nextVal)) {
              saved[newKey] = String(nextVal);
              created++;
            }
          }
          // Add-ons
          for (const a of allAddOns) {
            const baseKey = `addon:${a.id}:${baseType}`;
            const newKey = `addon:${a.id}:${newTypeId}`;
            const baseVal = saved[baseKey] != null
              ? Number(saved[baseKey])
              : Number((a.pricing && a.pricing[baseType]) || 0);
            const nextVal = Math.round(baseVal * multiplier);
            if (!Number.isNaN(nextVal)) {
              saved[newKey] = String(nextVal);
              created++;
            }
          }
        } catch {}
        await localforage.setItem('savedPrices', saved);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'savedPrices' } })); } catch {}
        return { ok: true, count: created, newTypeId, baseType, multiplier };
      } catch (e) {
        return { ok: false, error: 'failed_to_apply_multiplier_local' };
      }
    }
  }

  // Packages pricing: apply vehicle multiplier using $ Amount semantics
  if (endpoint === '/api/packages/apply-vehicle-multiplier') {
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'POST') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const vehicleTypeId = String(payload.vehicleTypeId || payload.newTypeId || '').trim();
        const amount = Number(payload.multiplier || payload.amount || 100);
        if (!vehicleTypeId) return { ok: false, error: 'missing_vehicle_type' };
        // Amount semantics: 100 => 1.00, 175 => 1.75
        const factor = Math.max(0, amount) / 100;
        const saved = (await localforage.getItem('savedPrices')) || {};
        let created = 0;
        try {
          const { servicePackages, addOns } = await import('@/lib/services');
          const { getCustomPackages, getCustomAddOns } = await import('@/lib/servicesMeta');
          const allPkgs = [...servicePackages, ...getCustomPackages()];
          const allAddOns = [...addOns, ...getCustomAddOns()];

          // Base reference: compact pricing values
          const baseType = 'compact';

          for (const p of allPkgs) {
            const baseKey = `package:${p.id}:${baseType}`;
            const newKey = `package:${p.id}:${vehicleTypeId}`;
            if (saved[newKey] == null) {
              const baseVal = saved[baseKey] != null ? Number(saved[baseKey]) : Number(p.pricing?.[baseType] || 0);
              const nextVal = Math.round(baseVal * factor);
              if (!Number.isNaN(nextVal) && nextVal > 0) { saved[newKey] = String(nextVal); created++; }
            }
          }
          for (const a of allAddOns) {
            const baseKey = `addon:${a.id}:${baseType}`;
            const newKey = `addon:${a.id}:${vehicleTypeId}`;
            if (saved[newKey] == null) {
              const baseVal = saved[baseKey] != null ? Number(saved[baseKey]) : Number(a.pricing?.[baseType] || 0);
              const nextVal = Math.round(baseVal * factor);
              if (!Number.isNaN(nextVal) && nextVal >= 0) { saved[newKey] = String(nextVal); created++; }
            }
          }
        } catch {}
        await localforage.setItem('savedPrices', saved);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'savedPrices' } })); } catch {}
        return { ok: true, count: created, vehicleTypeId, amount };
      } catch {
        return { ok: false, error: 'failed_to_apply_amount_local' };
      }
    }
  }

  // Live packages snapshot: accept full-sync payload and serve live data
  if (endpoint.startsWith('/api/packages/')) {
    const method = (options.method || 'GET').toUpperCase();
    // POST /api/packages/full-sync — store live snapshot
    if (method === 'POST' && endpoint === '/api/packages/full-sync') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const snapshot = {
          savedPrices: payload.savedPrices || {},
          packageMeta: payload.packageMeta || {},
          addOnMeta: payload.addOnMeta || {},
          customPackages: Array.isArray(payload.customPackages) ? payload.customPackages : [],
          customAddOns: Array.isArray(payload.customAddOns) ? payload.customAddOns : [],
          version: Date.now(),
        };
        await localforage.setItem('packagesLive', snapshot);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'packages' } })); } catch {}
        return { ok: true, version: snapshot.version };
      } catch {
        return { ok: false, error: 'failed_to_store_packages_live' };
      }
    }
    // GET /api/packages/live — return live snapshot or build fallback
    if (method === 'GET' && endpoint === '/api/packages/live') {
      try {
        const live = await localforage.getItem('packagesLive');
        if (live) return live;
      } catch {}
      try {
        const { buildFullSyncPayload } = await import('@/lib/servicesMeta');
        const payload = await buildFullSyncPayload();
        const snapshot = { ...payload, version: Date.now() };
        await localforage.setItem('packagesLive', snapshot);
        return snapshot;
      } catch {
        return { savedPrices: {}, packageMeta: {}, addOnMeta: {}, customPackages: [], customAddOns: [], version: Date.now() };
      }
    }
  }

  // FAQs: question/answer list
  if (endpoint.startsWith('/api/faqs')) {
    const method = (options.method || 'GET').toUpperCase();
    const key = 'faqs';
    const nowBase = Date.now();
    const defaultFaqs = [
      { id: `faq_${nowBase}_01`, question: 'How often should I get my car detailed?', answer: 'Most customers detail 2–4 times per year. Frequency depends on how you drive, store, and wash your vehicle. Regular detailing protects finishes and keeps interiors fresh.' },
      { id: `faq_${nowBase}_02`, question: 'What should I do to prepare my car for detailing?', answer: 'Please remove personal items and child seats if possible. A quick trash clean-out helps us focus on deep cleaning. We take care of the rest.' },
      { id: `faq_${nowBase}_03`, question: 'How long does a full detail take?', answer: 'Typically 2.5–3.5 hours depending on vehicle size and condition. Add-ons or heavy soil may extend the time slightly.' },
      { id: `faq_${nowBase}_04`, question: 'Do I need to be present during the service?', answer: 'No, you do not need to be present as long as we have access to the vehicle and keys if needed. We will message you when we are finished.' },
      { id: `faq_${nowBase}_05`, question: 'What are your business hours?', answer: 'Appointments are available daily between 8:00 AM and 6:00 PM. For special requests or after-hours slots, please contact us.' },
      { id: `faq_${nowBase}_06`, question: 'Can I book if it\'s raining?', answer: 'Yes—our mobile service can operate under covered areas or garages. For heavy rain with no cover, we\'ll reschedule at your convenience.' },
      { id: `faq_${nowBase}_07`, question: 'Do you provide water/electricity at my location?', answer: 'We provide our own supplies. If you have preferred access to water or power, that helps, but it\'s not required for most services.' },
      { id: `faq_${nowBase}_08`, question: 'What payment methods do you accept?', answer: 'We accept major credit/debit cards, cash, and digital payments. Payment is due upon completion unless pre-arranged.' },
      { id: `faq_${nowBase}_09`, question: 'Do you offer warranties on services like ceramic coating?', answer: 'Yes—ceramic coatings include a service warranty with care instructions. We provide maintenance tips and recommended follow-up intervals.' },
      { id: `faq_${nowBase}_10`, question: 'Do you have pricing for fleets or multiple vehicles?', answer: 'We offer discounted rates for fleets and multi-vehicle bookings. Contact us to set up a plan that fits your needs.' },
    ];
    const ensureSeed = async () => {
      const list = (await localforage.getItem(key)) || [];
      if (!Array.isArray(list) || list.length === 0) {
        await localforage.setItem(key, defaultFaqs);
        return defaultFaqs;
      }
      return list;
    };
    if (method === 'GET' && endpoint === '/api/faqs') {
      try { return await ensureSeed(); } catch { return []; }
    }
    if (method === 'POST' && endpoint === '/api/faqs') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const list = (await ensureSeed()) || [];
        const record = { id: `faq_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, question: String(payload.question || ''), answer: String(payload.answer || '') };
        list.push(record);
        await localforage.setItem(key, list);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'faqs' } })); } catch {}
        return { ok: true, record };
      } catch { return { ok: false, error: 'failed_to_create_local' }; }
    }
    if (method === 'PUT' && endpoint.startsWith('/api/faqs/')) {
      try {
        const id = endpoint.split('/')[3];
        const payload = JSON.parse(options.body || '{}');
        const list = (await ensureSeed()) || [];
        const idx = list.findIndex((f) => f.id === id);
        if (idx < 0) return { ok: false, error: 'not_found' };
        list[idx] = { ...list[idx], question: String(payload.question ?? list[idx].question), answer: String(payload.answer ?? list[idx].answer) };
        await localforage.setItem(key, list);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'faqs' } })); } catch {}
        return { ok: true, record: list[idx] };
      } catch { return { ok: false, error: 'failed_to_update_local' }; }
    }
    if (method === 'DELETE' && endpoint.startsWith('/api/faqs/')) {
      try {
        const id = endpoint.split('/')[3];
        const list = (await ensureSeed()) || [];
        const next = list.filter((f) => f.id !== id);
        await localforage.setItem(key, next);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'faqs' } })); } catch {}
        return { ok: true };
      } catch { return { ok: false, error: 'failed_to_delete_local' }; }
    }
  }

  // Contact info: hours, phone, address, email
  if (endpoint.startsWith('/api/contact')) {
    const method = (options.method || 'GET').toUpperCase();
    const key = 'contactInfo';
    const defaults = { hours: 'Appointments daily 8 AM–6 PM', phone: '(555) 123-4567', address: 'Methuen, MA', email: 'primedetailsolutions.ma.nh@gmail.com' };
    const ensureSeed = async () => {
      const curr = (await localforage.getItem(key)) || null;
      if (!curr) { await localforage.setItem(key, defaults); return defaults; }
      return curr;
    };
    if (method === 'GET' && endpoint === '/api/contact') {
      try { return await ensureSeed(); } catch { return defaults; }
    }
    // Live endpoint for Contact page (no cache)
    if (method === 'GET' && endpoint === '/api/contact/live') {
      try { return await ensureSeed(); } catch { return defaults; }
    }
    // Update via POST to align with admin Save button
    if (method === 'POST' && endpoint === '/api/contact/update') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const curr = await ensureSeed();
        const next = {
          hours: String(payload.hours ?? curr.hours),
          phone: String(payload.phone ?? curr.phone),
          address: String(payload.address ?? curr.address),
          email: String(payload.email ?? curr.email),
        };
        await localforage.setItem(key, next);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'contact' } })); } catch {}
        return { ok: true, record: next };
      } catch { return { ok: false, error: 'failed_to_update_local' }; }
    }
    if (method === 'PUT' && endpoint === '/api/contact') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const curr = await ensureSeed();
        const next = {
          hours: String(payload.hours ?? curr.hours),
          phone: String(payload.phone ?? curr.phone),
          address: String(payload.address ?? curr.address),
          email: String(payload.email ?? curr.email),
        };
        await localforage.setItem(key, next);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'contact' } })); } catch {}
        return { ok: true, record: next };
      } catch { return { ok: false, error: 'failed_to_update_local' }; }
    }
  }

  // About page sections
  if (endpoint.startsWith('/api/about')) {
    const method = (options.method || 'GET').toUpperCase();
    const key = 'aboutSections';
    const seed = [
      { id: `about_${Date.now()}_story`, section: 'Our Story', content: 'Your trusted partner in premium auto care in Methuen, MA.' },
      { id: `about_${Date.now()}_services`, section: 'Services', content: 'Interior and exterior detailing, paint correction, ceramic coatings, mobile services.' },
      { id: `about_${Date.now()}_team`, section: 'Team', content: 'Highly trained professionals with years of experience.' },
    ];
    const ensureSeed = async () => {
      const list = (await localforage.getItem(key)) || [];
      if (!Array.isArray(list) || list.length === 0) { await localforage.setItem(key, seed); return seed; }
      return list;
    };
    if (method === 'GET' && endpoint === '/api/about') {
      try { return await ensureSeed(); } catch { return []; }
    }
    if (method === 'POST' && endpoint === '/api/about') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const list = (await ensureSeed()) || [];
        const record = { id: `about_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, section: String(payload.section || 'Section'), content: String(payload.content || '') };
        list.push(record);
        await localforage.setItem(key, list);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'about' } })); } catch {}
        return { ok: true, record };
      } catch { return { ok: false, error: 'failed_to_create_local' }; }
    }
    if (method === 'PUT' && endpoint.startsWith('/api/about/')) {
      try {
        const id = endpoint.split('/')[3];
        const payload = JSON.parse(options.body || '{}');
        const list = (await ensureSeed()) || [];
        const idx = list.findIndex((a) => a.id === id);
        if (idx < 0) return { ok: false, error: 'not_found' };
        list[idx] = { ...list[idx], section: String(payload.section ?? list[idx].section), content: String(payload.content ?? list[idx].content) };
        await localforage.setItem(key, list);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'about' } })); } catch {}
        return { ok: true, record: list[idx] };
      } catch { return { ok: false, error: 'failed_to_update_local' }; }
    }
    if (method === 'DELETE' && endpoint.startsWith('/api/about/')) {
      try {
        const id = endpoint.split('/')[3];
        const list = (await ensureSeed()) || [];
        const next = list.filter((a) => a.id !== id);
        await localforage.setItem(key, next);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'about' } })); } catch {}
        return { ok: true };
      } catch { return { ok: false, error: 'failed_to_delete_local' }; }
    }
  }

  // About page: features blurb (three key highlights)
  if (endpoint.startsWith('/api/about/features')) {
    const method = (options.method || 'GET').toUpperCase();
    const key = 'aboutFeatures';
    const defaults = {
      expertTeam: 'Highly trained professionals with years of experience in premium auto detailing',
      ecoFriendly: 'We use only premium, environmentally safe products that protect your vehicle and our planet',
      satisfactionGuarantee: 'Your satisfaction is our priority. We stand behind every service we provide',
    };
    const getCurrent = async () => {
      const curr = (await localforage.getItem(key)) || {};
      return {
        expertTeam: String(curr.expertTeam || defaults.expertTeam),
        ecoFriendly: String(curr.ecoFriendly || defaults.ecoFriendly),
        satisfactionGuarantee: String(curr.satisfactionGuarantee || defaults.satisfactionGuarantee),
      };
    };
    if (method === 'GET' && endpoint === '/api/about/features') {
      try { return await getCurrent(); } catch { return defaults; }
    }
    if (method === 'POST' && endpoint === '/api/about/features') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const next = {
          expertTeam: String(payload.expertTeam || defaults.expertTeam),
          ecoFriendly: String(payload.ecoFriendly || defaults.ecoFriendly),
          satisfactionGuarantee: String(payload.satisfactionGuarantee || defaults.satisfactionGuarantee),
        };
        await localforage.setItem(key, next);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'aboutFeatures' } })); } catch {}
        return { ok: true, record: next };
      } catch { return { ok: false, error: 'failed_to_update_local' }; }
    }
  }

  // Testimonials: simple name + quote list
  if (endpoint.startsWith('/api/testimonials')) {
    const method = (options.method || 'GET').toUpperCase();
    const key = 'testimonials';
    const ensureList = async () => {
      const existing = (await localforage.getItem(key)) || [];
      const list = Array.isArray(existing) ? existing : [];
      const seed = [
        { id: 't_default_michael', name: 'Michael R.', quote: 'Prime Detail Solutions transformed my car! The attention to detail is incredible. My Tesla looks brand new again. Highly recommend!' },
        { id: 't_default_sarah', name: 'Sarah K.', quote: 'Professional, friendly, and affordable. The ceramic coating has kept my BMW looking pristine for months. Best detailing service in Methuen!' },
        { id: 't_default_james', name: 'James D.', quote: 'I love their mobile service! They came to my office and detailed my truck while I worked. Convenient and exceptional results.' },
        { id: 't_default_lisa', name: 'Lisa M.', quote: 'The interior cleaning was amazing. They removed pet hair and odors I thought were permanent. My SUV smells and looks fantastic!' },
      ];
      const ids = new Set(list.map((t) => t.id));
      const merged = [...list, ...seed.filter((t) => !ids.has(t.id))];
      await localforage.setItem(key, merged);
      return merged;
    };
    if (method === 'GET' && endpoint === '/api/testimonials') {
      try { return await ensureList(); } catch { return []; }
    }
    if (method === 'POST' && endpoint === '/api/testimonials') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const list = (await ensureList()) || [];
        const record = { id: `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name: String(payload.name || 'Customer'), quote: String(payload.quote || '') };
        list.push(record);
        await localforage.setItem(key, list);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'testimonials' } })); } catch {}
        return { ok: true, record };
      } catch { return { ok: false, error: 'failed_to_create_local' }; }
    }
    if (method === 'PUT' && endpoint.startsWith('/api/testimonials/')) {
      try {
        const id = endpoint.split('/')[3];
        const payload = JSON.parse(options.body || '{}');
        const list = (await ensureList()) || [];
        const idx = list.findIndex((t) => t.id === id);
        if (idx < 0) return { ok: false, error: 'not_found' };
        list[idx] = { ...list[idx], name: String(payload.name ?? list[idx].name), quote: String(payload.quote ?? list[idx].quote) };
        await localforage.setItem(key, list);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'testimonials' } })); } catch {}
        return { ok: true, record: list[idx] };
      } catch { return { ok: false, error: 'failed_to_update_local' }; }
    }
    if (method === 'DELETE' && endpoint.startsWith('/api/testimonials/')) {
      try {
        const id = endpoint.split('/')[3];
        const list = (await ensureList()) || [];
        const next = list.filter((t) => t.id !== id);
        await localforage.setItem(key, next);
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { type: 'testimonials' } })); } catch {}
        return { ok: true };
      } catch { return { ok: false, error: 'failed_to_delete_local' }; }
    }
  }

  if (endpoint === '/api/users/create' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const { name = '', email = '', password = '', role = 'employee' } = payload || {};
      const now = new Date().toISOString();
      const users = (await localforage.getItem('users')) || [];
      const exists = users.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
      if (exists) {
        return { ok: false, error: 'user_exists' };
      }
      const id = `u_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      const passwordHash = await (async () => {
        try {
          if (crypto?.subtle?.digest) {
            const enc = new TextEncoder();
            const buf = await crypto.subtle.digest('SHA-256', enc.encode(password || `${Math.random()}`));
            const bytes = Array.from(new Uint8Array(buf));
            return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
          }
        } catch {}
        // Fallback naive hash
        const s = password || `${Math.random()}`;
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return h.toString(16);
      })();
      const record = { id, name, email, role: (role === 'admin' ? 'admin' : 'employee'), createdAt: now, updatedAt: now, lastLogin: null, passwordHash };
      users.push(record);
      await localforage.setItem('users', users);
      try {
        const { pushAdminAlert } = await import('@/lib/adminAlerts');
        pushAdminAlert('user_created', `New user: ${name} (${role})`, 'system', { id, recordType: 'User' });
      } catch {}
      return { ok: true, user: record };
    } catch (e) {
      return { ok: false, error: 'failed_to_create_user_local' };
    }
  }

  // Create employee convenience endpoint
  if (endpoint === '/api/users/create-employee' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const res = await api('/api/users/create', { method: 'POST', body: JSON.stringify({ ...payload, role: 'employee' }) });
      return res;
    } catch (e) {
      return { ok: false, error: 'failed_to_create_employee_local' };
    }
  }

  if (endpoint.startsWith('/api/users/') && endpoint.endsWith('/role') && (options.method || 'GET').toUpperCase() === 'PUT') {
    try {
      const id = endpoint.split('/')[3];
      const payload = JSON.parse(options.body || '{}');
      const { role } = payload || {};
      const users = (await localforage.getItem('users')) || [];
      const idx = users.findIndex((u) => String(u.id) === String(id));
      if (idx < 0) return { ok: false, error: 'not_found' };
      users[idx] = { ...users[idx], role: (role === 'admin' ? 'admin' : 'employee'), updatedAt: new Date().toISOString() };
      await localforage.setItem('users', users);
      // If currently impersonated or logged in matches, update session role
      try {
        const curr = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (curr && String(curr.email).toLowerCase() === String(users[idx].email).toLowerCase()) {
          localStorage.setItem('currentUser', JSON.stringify({ ...curr, role: users[idx].role }));
          window.dispatchEvent(new CustomEvent('auth-changed', { detail: { ...curr, role: users[idx].role } }));
        }
      } catch {}
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_update_role_local' };
    }
  }

  if (endpoint.startsWith('/api/users/impersonate/') && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const id = endpoint.split('/')[3];
      const users = (await localforage.getItem('users')) || [];
      let target = users.find((u) => String(u.id) === String(id));
      if (!target) {
        const companyEmps = (await localforage.getItem('company-employees')) || [];
        const emp = (Array.isArray(companyEmps) ? companyEmps : []).find((e) => `emp_${String(e.email || e.name || '').toLowerCase()}` === String(id));
        if (emp) target = { id, name: emp.name, email: emp.email, role: String(emp.role || '').toLowerCase() === 'admin' ? 'admin' : 'employee' };
      }
      if (!target) return { ok: false, error: 'not_found' };
      // Save admin user for return after logout
      try {
        const prev = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (prev && prev.role === 'admin') {
          localStorage.setItem('impersonator', JSON.stringify(prev));
        }
      } catch {}
      const user = { email: target.email, role: target.role, name: target.name };
      localStorage.setItem('currentUser', JSON.stringify(user));
      // update last login
      try {
        target.lastLogin = new Date().toISOString();
        if ((Array.isArray(users) ? users : []).find((u) => String(u.id) === String(id))) {
          await localforage.setItem('users', users);
        } else {
          const companyEmps = (await localforage.getItem('company-employees')) || [];
          const empIdx = (Array.isArray(companyEmps) ? companyEmps : []).findIndex((e) => `emp_${String(e.email || e.name || '').toLowerCase()}` === String(id));
          if (empIdx >= 0) {
            companyEmps[empIdx] = { ...companyEmps[empIdx], lastLogin: target.lastLogin };
            await localforage.setItem('company-employees', companyEmps);
            try { localStorage.setItem('company-employees', JSON.stringify(companyEmps)); } catch {}
          }
        }
      } catch {}
      try { window.dispatchEvent(new CustomEvent('auth-changed', { detail: user })); } catch {}
      return { ok: true, user };
    } catch (e) {
      return { ok: false, error: 'failed_to_impersonate_local' };
    }
  }

  if (endpoint.startsWith('/api/users/') && (options.method || 'GET').toUpperCase() === 'DELETE') {
    try {
      const id = endpoint.split('/')[3];
      const users = (await localforage.getItem('users')) || [];
      let changed = false;
      if ((Array.isArray(users) ? users : []).some((u) => String(u.id) === String(id))) {
        const next = users.filter((u) => String(u.id) !== String(id));
        await localforage.setItem('users', next);
        changed = true;
      }
      const companyEmps = (await localforage.getItem('company-employees')) || [];
      const filtered = (Array.isArray(companyEmps) ? companyEmps : []).filter((e) => `emp_${String(e.email || e.name || '').toLowerCase()}` !== String(id));
      if (filtered.length !== (Array.isArray(companyEmps) ? companyEmps.length : 0)) {
        await localforage.setItem('company-employees', filtered);
        try { localStorage.setItem('company-employees', JSON.stringify(filtered)); } catch {}
        changed = true;
      }
      return changed ? { ok: true } : { ok: false, error: 'not_found' };
    } catch (e) {
      return { ok: false, error: 'failed_to_delete_user_local' };
    }
  }

  // Update basic employee details (name/email)
  if (endpoint === '/api/users/update' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const { id, name, email } = payload || {};
      if (!id) return { ok: false, error: 'missing_id' };
      const users = (await localforage.getItem('users')) || [];
      const idx = users.findIndex((u) => String(u.id) === String(id));
      if (idx >= 0) {
        const next = { ...users[idx], name: name ?? users[idx].name, email: email ?? users[idx].email, updatedAt: new Date().toISOString() };
        users[idx] = next;
        await localforage.setItem('users', users);
        return { ok: true, user: next };
      }
      // Fallback to company-employees by synthetic id or email
      const companyEmps = (await localforage.getItem('company-employees')) || [];
      const findIdx = (Array.isArray(companyEmps) ? companyEmps : []).findIndex((e) => `emp_${String(e.email || e.name || '').toLowerCase()}` === String(id));
      const empIdx = findIdx >= 0 ? findIdx : (Array.isArray(companyEmps) ? companyEmps : []).findIndex((e) => String(e.email).toLowerCase() === String(email || '').toLowerCase());
      if (empIdx < 0) return { ok: false, error: 'not_found' };
      const existing = companyEmps[empIdx] || {};
      const updated = { ...existing, name: name ?? existing.name, email: email ?? existing.email, updatedAt: new Date().toISOString() };
      companyEmps[empIdx] = updated;
      await localforage.setItem('company-employees', companyEmps);
      try { localStorage.setItem('company-employees', JSON.stringify(companyEmps)); } catch {}
      const normalized = { id: `emp_${String(updated.email || updated.name || '').toLowerCase()}`, name: updated.name, email: updated.email, role: 'employee', updatedAt: updated.updatedAt };
      return { ok: true, user: normalized };
    } catch (e) {
      return { ok: false, error: 'failed_to_update_user_local' };
    }
  }

// handlers continue under the same api() scope
  // Live add-ons list with pricing and visibility
  if (endpoint === '/api/addons/live' && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const { addOns } = await import('@/lib/services');
      const { getCustomAddOns, getAddOnMeta } = await import('@/lib/servicesMeta');
      const built = addOns.map(a => ({ id: a.id, name: a.name, pricing: a.pricing, description: a.description || '' }));
      const customs = getCustomAddOns().map((a) => ({ id: a.id, name: a.name, pricing: a.pricing || { compact: 0, midsize: 0, truck: 0, luxury: 0 } }));
      const merged = [...built, ...customs].filter(a => (getAddOnMeta(a.id)?.deleted !== true) && (getAddOnMeta(a.id)?.visible !== false));
      return merged;
    } catch (e) {
      return [];
    }
  }
  // Inventory combined list — read locally (authoritative in this app)
  if (endpoint === '/api/inventory/all' && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const chemicals = (await localforage.getItem('chemicals')) || [];
      const materials = (await localforage.getItem('materials')) || [];
      return { chemicals, materials };
    } catch (e) {
      return { chemicals: [], materials: [] };
    }
  }
  // Inventory lists (split) — read locally
  if (endpoint === '/api/inventory/chemicals' && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const chemicals = (await localforage.getItem('chemicals')) || [];
      return Array.isArray(chemicals) ? chemicals : [];
    } catch (e) {
      return [];
    }
  }
  if (endpoint === '/api/inventory/materials' && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const materials = (await localforage.getItem('materials')) || [];
      return Array.isArray(materials) ? materials : [];
    } catch (e) {
      return [];
    }
  }
  // Inventory estimate update (temporary hold before job completion)
  if (endpoint === '/api/inventory/estimate-update' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const list = (await localforage.getItem('inventory-estimates')) || [];
      list.push({ ...payload, id: `ie_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, savedAt: new Date().toISOString() });
      await localforage.setItem('inventory-estimates', list);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_save_estimate_local' };
    }
  }

  // =====================
  // Employee Training APIs
  // =====================
  // Handbook completion — persist record and best-effort forward
  if (endpoint === '/api/training/handbook-complete' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const { employeeId = '', date = new Date().toISOString(), items = 133, name = '' } = payload || {};
      const list = (await localforage.getItem('training-handbook')) || [];
      const record = { id: `th_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, employeeId, name, date, items };
      list.push(record);
      await localforage.setItem('training-handbook', list);
      // Notify UI listeners
      try { window.dispatchEvent(new CustomEvent('training-handbook-complete', { detail: record })); } catch {}
      // Forward to live backend if available
      try {
        await fetchWithRetry(`${API_BASE}/api/training/handbook-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        }, 1);
      } catch {}
      return { ok: true, id: record.id };
    } catch (e) {
      return { ok: false, error: 'failed_to_save_handbook_local' };
    }
  }
  // Exam progress — save index + answers snapshot
  if (endpoint === '/api/training/exam-progress' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const { employeeId = '', index = 0, answers = [] } = payload || {};
      const key = `training-exam-progress:${String(employeeId || 'unknown')}`;
      const record = { employeeId, index: Number(index) || 0, answers: Array.isArray(answers) ? answers : [] , savedAt: new Date().toISOString() };
      await localforage.setItem(key, record);
      try { window.dispatchEvent(new CustomEvent('training-exam-progress', { detail: record })); } catch {}
      // Best-effort forward
      try {
        await fetchWithRetry(`${API_BASE}/api/training/exam-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        }, 1);
      } catch {}
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_save_progress_local' };
    }
  }
  // Exam submission — store results
  if (endpoint === '/api/training/exam-submit' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const { employeeId = '', answers = [], score = 0, percent = 0, pass = false } = payload || {};
      const list = (await localforage.getItem('training-exams')) || [];
      const record = { id: `tx_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, employeeId, answers: Array.isArray(answers) ? answers : [], score: Number(score)||0, percent: Number(percent)||0, pass: !!pass, date: new Date().toISOString() };
      list.push(record);
      await localforage.setItem('training-exams', list);
      try { window.dispatchEvent(new CustomEvent('training-exam-submitted', { detail: record })); } catch {}
      try {
        await fetchWithRetry(`${API_BASE}/api/training/exam-submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        }, 1);
      } catch {}
      return { ok: true, id: record.id };
    } catch (e) {
      return { ok: false, error: 'failed_to_save_exam_local' };
    }
  }
  // Generic checklist save (unlinked)
  if (endpoint === '/api/checklist/generic' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const list = (await localforage.getItem('generic-checklists')) || [];
      const id = `gc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      const record = { id, ...payload, createdAt: new Date().toISOString() };
      list.push(record);
      await localforage.setItem('generic-checklists', list);
      // Best-effort forward to live server on 6061 so other clients can reflect instantly
      try {
        await fetchWithRetry(`${API_BASE}/api/checklist/generic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        }, 0);
      } catch {}
      return { ok: true, id };
    } catch (e) {
      return { ok: false, error: 'failed_to_save_generic_local' };
    }
  }
  // Link generic checklist to a customer/job
  if (endpoint.startsWith('/api/checklist/') && endpoint.endsWith('/link-customer') && (options.method || 'GET').toUpperCase() === 'PUT') {
    try {
      const id = endpoint.split('/')[3];
      const payload = JSON.parse(options.body || '{}');
      const { customerId, jobId } = payload || {};
      const list = (await localforage.getItem('generic-checklists')) || [];
      const idx = list.findIndex((r) => r.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], customerId: customerId || list[idx].customerId, jobId: jobId || list[idx].jobId, linkedAt: new Date().toISOString() };
        await localforage.setItem('generic-checklists', list);
        // Forward link operation to live server on 6061
        try {
          await fetchWithRetry(`${API_BASE}/api/checklist/${id}/link-customer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId, jobId }),
          }, 0);
        } catch {}
        return { ok: true };
      }
      return { ok: false, error: 'not_found' };
    } catch (e) {
      return { ok: false, error: 'failed_to_link_local' };
    }
  }
  // Customer search (local)
  if (endpoint.startsWith('/api/customers/search') && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const qStr = String(endpoint.split('?')[1] || '');
      const params = new URLSearchParams(qStr);
      const q = (params.get('q') || '').toLowerCase();
      const list = (await localforage.getItem('customers')) || [];
      const filtered = list.filter((c) => {
        const combo = `${c.name || ''} ${c.phone || ''} ${c.email || ''}`.toLowerCase();
        return !q || combo.includes(q);
      });
      return filtered;
    } catch (e) {
      return [];
    }
  }
  // Local handler: GET all customers — always return an array fallback
  if (endpoint === '/api/customers' && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const list = (await localforage.getItem('customers')) || [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }
  // Local handler: upsert customers when backend is unavailable
  if (endpoint === '/api/customers' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const list = (await localforage.getItem('customers')) || [];
      const now = new Date().toISOString();
      let saved = null;
      if (payload.id) {
        const idx = list.findIndex((c) => c.id === payload.id);
        if (idx >= 0) {
          const existing = list[idx] || {};
          saved = { ...existing, ...payload, updatedAt: now, createdAt: existing.createdAt || now };
          list[idx] = saved;
        } else {
          saved = { id: String(payload.id), ...payload, createdAt: now, updatedAt: now };
          list.push(saved);
        }
      } else {
        const id = `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        saved = { id, ...payload, createdAt: now, updatedAt: now };
        list.push(saved);
      }
      await localforage.setItem('customers', list);
      try {
        const { pushAdminAlert } = await import('@/lib/adminAlerts');
        pushAdminAlert('customer_added', `New customer added: ${String((saved || {}).name || '').trim()}`, 'system', { id: saved.id, recordType: 'Customer' });
      } catch {}
      return saved;
    } catch (e) {
      return { ok: false, error: 'failed_to_save_customer_local' };
    }
  }
  // Forward checklist materials usage to live backend on port 6061
  if (endpoint === '/api/checklist/materials' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '[]');
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.rows) ? payload.rows : [payload];
      const jobId = payload.jobId || payload.id || payload.job_id || '';
      const body = { jobId, rows };
      const token = localStorage.getItem('token');
      const res = await fetchWithRetry(`${API_BASE}/api/checklist/materials?v=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }, 1);
      return res || { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_forward_materials' };
    }
  }
  // Local handler: materials usage by employee with date filters
  if (endpoint.startsWith('/api/employees/') && endpoint.endsWith('/materials') && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const usage = (await localforage.getItem('chemical-usage')) || [];
      const qStr = String(endpoint.split('?')[1] || '');
      const params = new URLSearchParams(qStr);
      const start = params.get('start') || '';
      const end = params.get('end') || '';
      const employeeId = params.get('employeeId') || '';
      const startTs = start ? new Date(start).getTime() : 0;
      const endTs = end ? new Date(end).getTime() : Infinity;
      const filtered = usage.filter((u) => {
        const t = new Date(u.date || '').getTime();
        const matchDate = t >= startTs && t <= endTs;
        const matchEmp = employeeId ? (String(u.employee || '') === String(employeeId)) : true;
        return matchDate && matchEmp;
      });
      return filtered;
    } catch (e) {
      return [];
    }
  }
  // Payroll due logic: count employees overdue (no payment in last 7 days)
  if (endpoint === '/api/payroll/due-count' && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const employees = (await localforage.getItem('company-employees')) || [];
      const history = (await localforage.getItem('payroll-history')) || [];
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const isDue = (emp) => {
        const lastPaidTs = emp.lastPaid ? new Date(emp.lastPaid).getTime() : 0;
        const recentPaid = history.some(h => String(h.status) === 'Paid' && (String(h.employee) === emp.name || String(h.employee) === emp.email) && (now - new Date(h.date).getTime()) <= sevenDays);
        return (!recentPaid) && ((now - lastPaidTs) > sevenDays);
      };
      const count = employees.filter(isDue).length;
      return { count };
    } catch (e) {
      return { count: 0 };
    }
  }
  // Payroll due total: unpaid jobs + pending history - adjustments for overdue employees
  if (endpoint === '/api/payroll/due-total' && (options.method || 'GET').toUpperCase() === 'GET') {
    try {
      const employees = (await localforage.getItem('company-employees')) || [];
      const history = (await localforage.getItem('payroll-history')) || [];
      const jobs = JSON.parse(localStorage.getItem('completedJobs') || '[]');
      const adj = JSON.parse(localStorage.getItem('payroll_owed_adjustments') || '{}');
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const isDue = (emp) => {
        const lastPaidTs = emp.lastPaid ? new Date(emp.lastPaid).getTime() : 0;
        const recentPaid = history.some(h => String(h.status) === 'Paid' && (String(h.employee) === emp.name || String(h.employee) === emp.email) && (now - new Date(h.date).getTime()) <= sevenDays);
        return (!recentPaid) && ((now - lastPaidTs) > sevenDays);
      };
      const overdue = employees.filter(isDue);
      const total = overdue.reduce((sum, emp) => {
        const unpaidJobs = jobs.filter(j => j.status === 'completed' && !j.paid && (String(j.employee) === emp.email || String(j.employee) === emp.name));
        const unpaidSum = unpaidJobs.reduce((s, j) => s + Number(j.totalRevenue || 0), 0);
        const pendingHist = history.filter(h => String(h.status) === 'Pending' && (String(h.employee) === emp.name || String(h.employee) === emp.email));
        const pendingSum = pendingHist.reduce((s, h) => s + Number(h.amount || 0), 0);
        const adjSum = Number(adj[emp.name] || 0) + Number(adj[emp.email] || 0);
        const owed = Math.max(0, unpaidSum + pendingSum - adjSum);
        return sum + owed;
      }, 0);
      return { total };
    } catch (e) {
      return { total: 0 };
    }
  }
  // Local handler: payroll history POST/GET
  if (endpoint.startsWith('/api/payroll/history')) {
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'POST') {
      try {
        const payload = JSON.parse(options.body || 'null');
        const list = (await localforage.getItem('payroll-history')) || [];
        const pushEntry = (e) => {
          const id = `ph_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
          list.push({ id, ...(e || {}), date: e?.date || new Date().toISOString().slice(0,10) });
        };
        if (Array.isArray(payload)) payload.forEach(pushEntry); else pushEntry(payload);
        await localforage.setItem('payroll-history', list);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'failed_to_save_local' };
      }
    }
    if (method === 'GET') {
      try {
        const list = (await localforage.getItem('payroll-history')) || [];
        // Parse query params
        const qStr = String(endpoint.split('?')[1] || '');
        const params = new URLSearchParams(qStr);
        const employeeId = params.get('employeeId') || '';
        const start = params.get('start') || '';
        const end = params.get('end') || '';
        const type = params.get('type') || '';
        const search = params.get('search') || '';
        const startTs = start ? new Date(start).getTime() : 0;
        const endTs = end ? new Date(end).getTime() : Infinity;
        const filtered = list.filter((e) => {
          const t = new Date(e.date || '').getTime();
          const matchEmp = employeeId ? (String(e.employee || '') === String(employeeId)) : true;
          const matchType = type ? (String(e.type || '') === String(type) || String(e.description || '').includes(type)) : true;
          const matchSearch = search ? (String(e.description || '').toLowerCase().includes(search.toLowerCase()) || String(e.type || '').toLowerCase().includes(search.toLowerCase())) : true;
          const matchDate = t >= startTs && t <= endTs;
          return matchEmp && matchType && matchSearch && matchDate;
        });
        // Sort by date desc
        filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return filtered;
      } catch (e) {
        return [];
      }
    }
  }
  // Update a single payroll history entry (localforage)
  if (endpoint === '/api/payroll/history/update' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const { id, patch } = payload || {};
      const list = (await localforage.getItem('payroll-history')) || [];
      const idx = list.findIndex((e) => e.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...(patch || {}) };
        await localforage.setItem('payroll-history', list);
        return { ok: true };
      }
      return { ok: false, error: 'not_found' };
    } catch (e) {
      return { ok: false, error: 'failed_to_update_local' };
    }
  }
  // Delete a single payroll history entry (localforage)
  if (endpoint === '/api/payroll/history/delete' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const { id } = payload || {};
      const list = (await localforage.getItem('payroll-history')) || [];
      const next = list.filter((e) => e.id !== id);
      await localforage.setItem('payroll-history', next);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_delete_local' };
    }
  }
  // Local handler: persist payroll rows without requiring a backend
  if (endpoint === '/api/payroll/save' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const history = (await localforage.getItem('payroll-saves')) || [];
      history.push({ ...payload, savedAt: new Date().toISOString() });
      await localforage.setItem('payroll-saves', history);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_save_local' };
    }
  }
  // Local handlers for inventory upserts when no backend exists
  if (endpoint === '/api/inventory/chemicals' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const list = (await localforage.getItem('chemicals')) || [];
      const idx = list.findIndex((c) => c.id === payload.id);
      if (idx >= 0) list[idx] = payload; else list.push(payload);
      await localforage.setItem('chemicals', list);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_save_local' };
    }
  }
  // Local handler: send admin email silently (no Gmail compose)
  if (endpoint === '/api/email/admin' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const { subject = '', body = '' } = payload || {};
      const list = (await localforage.getItem('admin-emails')) || [];
      const record = { id: `em_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, subject, body, sentAt: new Date().toISOString() };
      list.push(record);
      await localforage.setItem('admin-emails', list);
      try {
        const { pushAdminAlert } = await import('@/lib/adminAlerts');
        const safeSubject = String(subject || '').trim() || 'Admin email';
        pushAdminAlert('admin_email_sent', `Admin email: ${safeSubject}`,'system', { recordType: 'Admin Email', subject: safeSubject, id: record.id });
      } catch {}
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_send_admin_email_local' };
    }
  }
  // Local handler: send customer email (store locally and alert)
  if (endpoint === '/api/email/customer' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const { to = '', subject = '', body = '' } = payload || {};
      const list = (await localforage.getItem('customer-emails')) || [];
      const record = { id: `ce_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, to, subject, body, sentAt: new Date().toISOString() };
      list.push(record);
      await localforage.setItem('customer-emails', list);
      try {
        const { pushAdminAlert } = await import('@/lib/adminAlerts');
        const safeSubject = String(subject || '').trim() || 'Customer email';
        pushAdminAlert('admin_email_sent', `Customer email: ${safeSubject}`,'system', { recordType: 'Customer Email', subject: safeSubject, id: record.id });
      } catch {}
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_send_customer_email_local' };
    }
  }
  // Local handler: bookings create/get for local-only mode
  if (endpoint === '/api/bookings') {
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'POST') {
      try {
        const payload = JSON.parse(options.body || '{}');
        const list = (await localforage.getItem('bookings-api')) || [];
        const id = payload.id || `bk_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        const record = { id, ...payload, createdAt: new Date().toISOString() };
        list.push(record);
        await localforage.setItem('bookings-api', list);
        try {
          const { pushAdminAlert } = await import('@/lib/adminAlerts');
          const price = Number(payload.total || 0);
          const name = String(payload?.customer?.name || '').trim() || 'Customer';
          pushAdminAlert('booking_created', `New booking $${price} — ${name}`, 'system', { recordType: 'Booking', bookingId: id, price });
        } catch {}
        try { window.dispatchEvent(new CustomEvent('content-changed', { detail: { kind: 'bookings' } })); } catch {}
        return { ok: true, id };
      } catch (e) {
        return { ok: false, error: 'failed_to_create_booking_local' };
      }
    }
    if (method === 'GET') {
      try {
        const list = (await localforage.getItem('bookings-api')) || [];
        return list;
      } catch (e) {
        return [];
      }
    }
  }
  if (endpoint === '/api/inventory/materials' && (options.method || 'GET').toUpperCase() === 'POST') {
    try {
      const payload = JSON.parse(options.body || '{}');
      const list = (await localforage.getItem('materials')) || [];
      const idx = list.findIndex((m) => m.id === payload.id);
      if (idx >= 0) list[idx] = payload; else list.push(payload);
      await localforage.setItem('materials', list);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'failed_to_save_local' };
    }
  }
  const token = localStorage.getItem('token');
  const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}v=${Date.now()}`;
  return fetchWithRetry(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  }, 1);
}

export default api;
