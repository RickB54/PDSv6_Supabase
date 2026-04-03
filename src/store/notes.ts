import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export interface Notebook {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
}

export interface Section {
    id: string;
    notebook_id: string;
    user_id: string;
    name: string;
    created_at: string;
}

export interface Note {
    id: string;
    section_id: string | null; // null for Quick Notes
    user_id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    is_locked: boolean;
    tags: string[];
    versions: NoteVersion[];
    created_at: string;
    updated_at: string;
}

export interface NoteVersion {
    ts: string;
    title: string;
    content: string;
}

interface NotesState {
    notebooks: Notebook[];
    sections: Section[];
    notes: Note[];

    // UI State
    activeNotebookId: string | null;
    activeSectionId: string | null;
    activeNoteId: string | null;
    searchQuery: string;
    viewMode: 'list' | 'grid';
    isLoading: boolean;

    // Actions
    refresh: () => Promise<void>;

    // Hierarchy
    createNotebook: (name: string) => Promise<void>;
    updateNotebook: (id: string, name: string) => Promise<void>;
    deleteNotebook: (id: string) => Promise<void>;
    createSection: (notebookId: string, name: string) => Promise<void>;
    updateSection: (id: string, name: string) => Promise<void>;
    deleteSection: (id: string) => Promise<void>;

    // Notes
    createNote: (sectionId: string | null, title?: string, content?: string) => Promise<string>;
    updateNote: (id: string, patch: Partial<Note>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    moveNote: (noteId: string, newSectionId: string | null) => Promise<void>;

    // UI Actions
    setActiveNotebook: (id: string | null) => void;
    setActiveSection: (id: string | null) => void;
    setActiveNote: (id: string | null) => void;
    setSearch: (q: string) => void;
}

const isDemo = () => localStorage.getItem('demo_mode_active') === 'true';
const DEMO_STORAGE_KEY = 'demo_personal_notes_v1';

async function loadDemoData() {
    try {
        const raw = localStorage.getItem(DEMO_STORAGE_KEY);
        return raw ? JSON.parse(raw) : { notebooks: [], sections: [], notes: [] };
    } catch { return { notebooks: [], sections: [], notes: [] }; }
}

async function saveDemoData(data: any) {
    try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data)); } catch { }
}

export const useNotesStore = create<NotesState>((set, get) => ({
    notebooks: [],
    sections: [],
    notes: [],

    activeNotebookId: null,
    activeSectionId: null, // 'quick-notes' or uuid
    activeNoteId: null,
    searchQuery: "",
    viewMode: 'list',
    isLoading: false,

    refresh: async () => {
        if (isDemo()) {
            const data = await loadDemoData();
            set({
                notebooks: data.notebooks || [],
                sections: data.sections || [],
                notes: data.notes || [],
                isLoading: false
            });
            return;
        }

        set({ isLoading: true });
        try {
            const { data: n } = await supabase.from('personal_notebooks').select('*').order('created_at');
            const { data: s } = await supabase.from('personal_sections').select('*').order('created_at');
            const { data: notes } = await supabase.from('personal_notes').select('*').order('updated_at', { ascending: false });

            set({
                notebooks: n || [],
                sections: s || [],
                notes: notes || [],
                isLoading: false
            });
        } catch (e) {
            console.error("Failed to load notes hierarchy", e);
            set({ isLoading: false });
        }
    },

    createNotebook: async (name) => {
        if (isDemo()) {
            const data = await loadDemoData();
            const nb: Notebook = {
                id: `nb_${Date.now()}`,
                user_id: 'demo-visitor',
                name,
                created_at: new Date().toISOString()
            };
            data.notebooks.push(nb);
            await saveDemoData(data);
            get().refresh();
            return;
        }

        const user = getCurrentUser();
        if (!user) return;
        const { error } = await supabase.from('personal_notebooks').insert({ name, user_id: user.id });
        if (!error) get().refresh();
    },

    updateNotebook: async (id, name) => {
        if (isDemo()) {
            const data = await loadDemoData();
            data.notebooks = data.notebooks.map((nb: any) => nb.id === id ? { ...nb, name } : nb);
            await saveDemoData(data);
            get().refresh();
            return;
        }
        await supabase.from('personal_notebooks').update({ name }).eq('id', id);
        get().refresh();
    },

    deleteNotebook: async (id) => {
        if (isDemo()) {
            const data = await loadDemoData();
            data.notebooks = data.notebooks.filter((nb: any) => nb.id !== id);
            data.sections = data.sections.filter((s: any) => s.notebook_id !== id);
            // Also delete notes in those sections? Yes.
            const sIds = data.sections.filter((s: any) => s.notebook_id === id).map((s: any) => s.id);
            data.notes = data.notes.filter((n: any) => !sIds.includes(n.section_id));
            await saveDemoData(data);
            get().refresh();
            return;
        }
        await supabase.from('personal_notebooks').delete().eq('id', id);
        get().refresh();
    },

    createSection: async (notebookId, name) => {
        if (isDemo()) {
            const data = await loadDemoData();
            const s: Section = {
                id: `sec_${Date.now()}`,
                notebook_id: notebookId,
                user_id: 'demo-visitor',
                name,
                created_at: new Date().toISOString()
            };
            data.sections.push(s);
            await saveDemoData(data);
            get().refresh();
            return;
        }
        const user = getCurrentUser();
        if (!user) return;
        const { error } = await supabase.from('personal_sections').insert({
            notebook_id: notebookId,
            name,
            user_id: user.id
        });
        if (!error) get().refresh();
    },

    updateSection: async (id, name) => {
        if (isDemo()) {
            const data = await loadDemoData();
            data.sections = data.sections.map((s: any) => s.id === id ? { ...s, name } : s);
            await saveDemoData(data);
            get().refresh();
            return;
        }
        await supabase.from('personal_sections').update({ name }).eq('id', id);
        get().refresh();
    },

    deleteSection: async (id) => {
        if (isDemo()) {
            const data = await loadDemoData();
            data.sections = data.sections.filter((s: any) => s.id !== id);
            data.notes = data.notes.filter((n: any) => n.section_id !== id);
            await saveDemoData(data);
            get().refresh();
            return;
        }
        await supabase.from('personal_sections').delete().eq('id', id);
        get().refresh();
    },

    createNote: async (sectionId, title = '', content = '') => {
        if (isDemo()) {
            const data = await loadDemoData();
            const n: Note = {
                id: `note_${Date.now()}`,
                section_id: sectionId,
                user_id: 'demo-visitor',
                title: title || 'Untitled Note',
                content,
                is_pinned: false,
                is_locked: false,
                tags: [],
                versions: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            data.notes.unshift(n);
            await saveDemoData(data);
            set({ notes: data.notes, activeNoteId: n.id });
            return n.id;
        }

        const user = getCurrentUser();
        if (!user) return '';

        const { data, error } = await supabase.from('personal_notes').insert({
            section_id: sectionId, // null for Quick Note
            user_id: user.id,
            title,
            content,
            tags: []
        }).select().single();

        if (error) {
            console.error("Failed to create note:", error);
            return '';
        }

        if (data) {
            const { notes } = get();
            set({ notes: [data, ...notes], activeNoteId: data.id });
            return data.id;
        }
        return '';
    },

    updateNote: async (id, patch) => {
        const { notes } = get();
        const note = notes.find(n => n.id === id);
        if (!note) return;

        let versions = note.versions || [];
        if (patch.content && patch.content !== note.content) {
            versions = [
                { ts: new Date().toISOString(), title: note.title, content: note.content },
                ...versions
            ].slice(0, 20);
        }

        const nextNote = { ...note, ...patch, versions, updated_at: new Date().toISOString() };
        const nextNotes = notes.map(n => n.id === id ? nextNote : n);
        set({ notes: nextNotes });

        if (isDemo()) {
            const data = await loadDemoData();
            data.notes = data.notes.map((n: any) => n.id === id ? nextNote : n);
            await saveDemoData(data);
            return;
        }

        await supabase.from('personal_notes').update({
            ...patch,
            versions,
            updated_at: new Date().toISOString()
        }).eq('id', id);
    },

    deleteNote: async (id) => {
        const { notes } = get();
        const nextNotes = notes.filter(n => n.id !== id);
        if (get().activeNoteId === id) set({ activeNoteId: null });
        set({ notes: nextNotes });

        if (isDemo()) {
            const data = await loadDemoData();
            data.notes = data.notes.filter((n: any) => n.id !== id);
            await saveDemoData(data);
            return;
        }

        await supabase.from('personal_notes').delete().eq('id', id);
    },

    moveNote: async (noteId, newSectionId) => {
        const { notes } = get();
        const nextNotes = notes.map(n => n.id === noteId ? { ...n, section_id: newSectionId } : n);
        set({ notes: nextNotes });

        if (isDemo()) {
            const data = await loadDemoData();
            data.notes = data.notes.map((n: any) => n.id === noteId ? { ...n, section_id: newSectionId } : n);
            await saveDemoData(data);
            return;
        }
        await supabase.from('personal_notes').update({ section_id: newSectionId }).eq('id', noteId);
    },

    setActiveNotebook: (id) => set({ activeNotebookId: id }),
    setActiveSection: (id) => set({ activeSectionId: id }),
    setActiveNote: (id) => set({ activeNoteId: id }),
    setSearch: (q) => set({ searchQuery: q }),
}));
