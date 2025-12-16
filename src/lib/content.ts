
import { supabase } from './supabase';

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
        const { data, error } = await supabase.from('content_vehicle_types').upsert(vt).select().single();
        if (error) throw error;
        return data;
    },
    deleteVehicleType: async (id: string) => {
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
        const { error } = await supabase.from('content_faqs').delete().eq('id', id);
        if (error) throw error;
    },

    // TESTIMONIALS
    getTestimonials: async (): Promise<SupaTestimonial[]> => {
        const { data, error } = await supabase.from('content_testimonials').select('*').order('created_at', { ascending: false });
        if (error) { console.error('contentService.getTestimonials', error); return []; }
        return data || [];
    },
    upsertTestimonial: async (t: SupaTestimonial) => {
        if (!t.id) {
            const { id, ...rest } = t;
            const { data, error } = await supabase.from('content_testimonials').insert(rest).select().single();
            if (error) throw error;
            return data;
        }
        const { data, error } = await supabase.from('content_testimonials').upsert(t).select().single();
        if (error) throw error;
        return data;
    },
    deleteTestimonial: async (id: string) => {
        const { error } = await supabase.from('content_testimonials').delete().eq('id', id);
        if (error) throw error;
    },

    // ABOUT SECTIONS
    getAboutSections: async (): Promise<SupaAboutSection[]> => {
        const { data, error } = await supabase.from('content_about').select('*').order('created_at', { ascending: true });
        if (error) { console.error('contentService.getAboutSections', error); return []; }
        return data || [];
    },
    upsertAboutSection: async (s: SupaAboutSection) => {
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
        const payload = { ...c, id: 1 };
        const { data, error } = await supabase.from('content_contact').upsert(payload).select().single();
        if (error) throw error;
        return data;
    },

    // SERVICES META (Disclaimer, etc)
    getServiceMeta: async (key: string): Promise<SupaServiceMeta | null> => {
        const { data } = await supabase.from('content_services_meta').select('*').eq('key', key).single();
        return data;
    },
    upsertServiceMeta: async (m: SupaServiceMeta) => {
        const { data, error } = await supabase.from('content_services_meta').upsert(m).select().single();
        if (error) throw error;
        return data;
    },
    getAllServiceMeta: async (): Promise<SupaServiceMeta[]> => {
        const { data, error } = await supabase.from('content_services_meta').select('*');
        if (error) return [];
        return data || [];
    }
};
