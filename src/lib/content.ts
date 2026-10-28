import { supabase } from './supabase';

const isDemo = () => {
  try { return localStorage.getItem('demo_mode_active') === 'true'; } catch { return false; }
};
const blockDemo = (action: string) => {
  if (isDemo()) {
    window.dispatchEvent(new CustomEvent('demo-blocked-action', { detail: { action } }));
    return true;
  }
  return false;
};

let serviceMetaCache: Record<string, any> = {};
try {
  const cached = localStorage.getItem('service_meta_cache');
  if (cached) serviceMetaCache = JSON.parse(cached);
} catch {}

/**
 * Service to manage Website Content via Supabase
 * Tables: content_vehicle_types, content_faqs, content_testimonials, content_about, content_contact, content_services_meta
 */

export interface SupaVehicleType {
    id: string; // slug
    name: string;
    description?: string;
    multiplier: number;
    has_pricing: boolean;
    is_active: boolean;
}

export interface SupaFaq {
    id?: string;
    question: string;
    answer: string;
    sort_order?: number;
}

export interface SupaTestimonial {
    id?: string;
    name: string;
    quote: string;
    role?: string;
    sort_order?: number;
    is_hidden?: boolean;
}

export interface SupaAboutSection {
    id?: string;
    section_title: string;
    content: string;
    sort_order?: number;
}

export interface SupaContact {
    hours?: string;
    phone?: string;
    address?: string;
    email?: string;
}

export interface SupaServiceMeta {
    key: string;
    title?: string;
    description?: string;
    meta?: any;
}

export const contentService = {
    // VEHICLE TYPES
    getVehicleTypes: async (): Promise<SupaVehicleType[]> => {
        const { data, error } = await supabase.from('content_vehicle_types').select('*').order('created_at', { ascending: true });
        if (error) { console.error('contentService.getVehicleTypes', error); return []; }
        return data || [];
    },
    upsertVehicleType: async (vt: SupaVehicleType) => {
        if (blockDemo('vehicle type update')) return null;
        const { data, error } = await supabase.from('content_vehicle_types').upsert(vt).select().single();
        if (error) throw error;
        return data;
    },
    deleteVehicleType: async (id: string) => {
        if (blockDemo('vehicle type deletion')) return;
        const { error } = await supabase.from('content_vehicle_types').delete().eq('id', id);
        if (error) throw error;
    },

    // FAQS
    getFaqs: async (): Promise<SupaFaq[]> => {
        const { data, error } = await supabase.from('content_faqs').select('*').order('sort_order', { ascending: true });
        if (error) { console.error('contentService.getFaqs', error); return []; }
        return data || [];
    },
    upsertFaq: async (faq: SupaFaq) => {
        if (blockDemo('FAQ update')) return null;
        // If no ID, insert; if ID, update
        if (!faq.id) {
            const { id, ...rest } = faq; // remove undefined id
            const { data, error } = await supabase.from('content_faqs').insert(rest).select().single();
            if (error) throw error;
            return data;
        }
        const { data, error } = await supabase.from('content_faqs').upsert(faq).select().single();
        if (error) throw error;
        return data;
    },
    deleteFaq: async (id: string) => {
        if (blockDemo('FAQ deletion')) return;
        const { error } = await supabase.from('content_faqs').delete().eq('id', id);
        if (error) throw error;
    },

    // TESTIMONIALS
    // Public: returns only visible (non-hidden) testimonials
    getTestimonials: async (): Promise<SupaTestimonial[]> => {
        const all = await contentService.getAllTestimonials();
        return all.filter((t: SupaTestimonial) => !t.is_hidden);
    },
    // Admin: returns ALL testimonials including hidden ones, hydrating is_hidden from DB or fallback meta
    getAllTestimonials: async (): Promise<SupaTestimonial[]> => {
        const { data, error } = await supabase.from('content_testimonials').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
        if (error) { console.error('contentService.getAllTestimonials', error); return []; }
        const list = data || [];
        const hasColumnInDb = list.some((t: any) => t.is_hidden !== undefined);
        if (hasColumnInDb) {
            return list.map((t: any) => ({ ...t, is_hidden: Boolean(t.is_hidden) }));
        }
        try {
            const meta = await contentService.getServiceMeta('testimonials_hidden_state');
            const hiddenMap: Record<string, boolean> = meta?.meta?.hiddenMap || {};
            return list.map((t: any) => ({
                ...t,
                is_hidden: Boolean(hiddenMap[t.id])
            }));
        } catch {
            return list.map((t: any) => ({ ...t, is_hidden: false }));
        }
    },
    upsertTestimonial: async (t: SupaTestimonial) => {
        if (blockDemo('testimonial update')) return null;
        if (!t.id) {
            const { id, ...rest } = t;
            const { data, error } = await supabase.from('content_testimonials').insert(t).select().single();
            if (error) {
                const { is_hidden, ...cleanRest } = rest as any;
                const { data: retryData, error: retryErr } = await supabase.from('content_testimonials').insert(cleanRest).select().single();
                if (retryErr) throw retryErr;
                if (is_hidden && retryData?.id) {
                    await contentService.toggleTestimonialHidden(retryData.id, true);
                }
                return retryData;
            }
            return data;
        }
        const { data, error } = await supabase.from('content_testimonials').upsert(t).select().single();
        if (error) {
            const { is_hidden, ...cleanT } = t as any;
            const { data: retryData, error: retryErr } = await supabase.from('content_testimonials').upsert(cleanT).select().single();
            if (retryErr) throw retryErr;
            if (is_hidden !== undefined && t.id) {
                await contentService.toggleTestimonialHidden(t.id, is_hidden);
            }
            return retryData;
        }
        return data;
    },
    toggleTestimonialHidden: async (id: string, isHidden: boolean): Promise<void> => {
        if (blockDemo('testimonial visibility toggle')) return;
        const { error } = await supabase.from('content_testimonials').update({ is_hidden: isHidden }).eq('id', id);
        if (!error) {
            try {
                const meta = await contentService.getServiceMeta('testimonials_hidden_state');
                if (meta?.meta?.hiddenMap && meta.meta.hiddenMap[id] !== undefined) {
                    delete meta.meta.hiddenMap[id];
                    await contentService.upsertServiceMeta({ key: 'testimonials_hidden_state', title: 'Testimonials Hidden State', meta: meta.meta });
                }
            } catch {}
            return;
        }
        const meta = await contentService.getServiceMeta('testimonials_hidden_state');
        const hiddenMap: Record<string, boolean> = { ...(meta?.meta?.hiddenMap || {}) };
        if (isHidden) {
            hiddenMap[id] = true;
        } else {
            delete hiddenMap[id];
        }
        await contentService.upsertServiceMeta({
            key: 'testimonials_hidden_state',
            title: 'Testimonials Hidden State',
            meta: { hiddenMap }
        });
    },
    deleteTestimonial: async (id: string) => {
        if (blockDemo('testimonial deletion')) return;
        const { error } = await supabase.from('content_testimonials').delete().eq('id', id);
        if (error) throw error;
        try {
            const meta = await contentService.getServiceMeta('testimonials_hidden_state');
            if (meta?.meta?.hiddenMap && meta.meta.hiddenMap[id]) {
                delete meta.meta.hiddenMap[id];
                await contentService.upsertServiceMeta({
                    key: 'testimonials_hidden_state',
                    title: 'Testimonials Hidden State',
                    meta: meta.meta
                });
            }
        } catch {}
    },

    // ABOUT SECTIONS
    getAboutSections: async (): Promise<SupaAboutSection[]> => {
        const { data, error } = await supabase.from('content_about').select('*').order('created_at', { ascending: true });
        if (error) { console.error('contentService.getAboutSections', error); return []; }
        return data || [];
    },
    upsertAboutSection: async (s: SupaAboutSection) => {
        if (blockDemo('about section update')) return null;
        if (!s.id) {
            const { id, ...rest } = s;
            const { data, error } = await supabase.from('content_about').insert(rest).select().single();
            if (error) throw error;
            return data;
        }
        const { data, error } = await supabase.from('content_about').upsert(s).select().single();
        if (error) throw error;
        return data;
    },
    deleteAboutSection: async (id: string) => {
        const { error } = await supabase.from('content_about').delete().eq('id', id);
        if (error) throw error;
    },

    // CONTACT INFO
    getContact: async (): Promise<SupaContact | null> => {
        const { data, error } = await supabase.from('content_contact').select('*').eq('id', 1).single();
        if (error) return null; // Expected if empty
        return data;
    },
    upsertContact: async (c: SupaContact) => {
        if (blockDemo('contact info update')) return null;
        const payload = { ...c, id: 1 };
        const { data, error } = await supabase.from('content_contact').upsert(payload).select().single();
        if (error) throw error;
        return data;
    },

    // SERVICES META (Disclaimer, etc)
    getServiceMeta: async (key: string): Promise<SupaServiceMeta | null> => {
        const { data } = await supabase.from('content_services_meta').select('*').eq('key', key).single();
        if (data) {
            serviceMetaCache[key] = data;
            localStorage.setItem('service_meta_cache', JSON.stringify(serviceMetaCache));
        }
        return data || serviceMetaCache[key] || null;
    },
    getServiceMetaSync: (key: string): SupaServiceMeta | null => {
        return serviceMetaCache[key] || null;
    },
    upsertServiceMeta: async (m: SupaServiceMeta) => {
        if (blockDemo('service settings update')) return null;
        const { data, error } = await supabase.from('content_services_meta').upsert(m).select().single();
        if (error) throw error;
        if (data) {
            serviceMetaCache[m.key] = data;
            localStorage.setItem('service_meta_cache', JSON.stringify(serviceMetaCache));
        }
        return data;
    },
    getAllServiceMeta: async (): Promise<SupaServiceMeta[]> => {
        const { data, error } = await supabase.from('content_services_meta').select('*');
        if (error) return [];
        if (data) {
            data.forEach(m => { serviceMetaCache[m.key] = m; });
            localStorage.setItem('service_meta_cache', JSON.stringify(serviceMetaCache));
        }
        return data || [];
    }
};
