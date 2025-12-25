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
        const user = getCurrentUser();
        if (!user) return;
        const { error } = await supabase.from('personal_notebooks').insert({ name, user_id: user.id });
        if (!error) get().refresh();
    },

    updateNotebook: async (id, name) => {
        await supabase.from('personal_notebooks').update({ name }).eq('id', id);
        get().refresh();
    },

    deleteNotebook: async (id) => {
        await supabase.from('personal_notebooks').delete().eq('id', id);
        get().refresh();
    },

    createSection: async (notebookId, name) => {
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
        await supabase.from('personal_sections').update({ name }).eq('id', id);
        get().refresh();
    },

    deleteSection: async (id) => {
        await supabase.from('personal_sections').delete().eq('id', id);
        get().refresh();
    },

    createNote: async (sectionId, title = '', content = '') => {
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
            // We can't use toast hook inside zustand directly easily without passing it or using a global toaster instance.
            // But we can log it. 
            // Or we can return null to signal failure.
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
        // Optimistic update
        const note = notes.find(n => n.id === id);
        if (!note) return;

        // Handle Versioning if content changed
        let versions = note.versions || [];
        if (patch.content && patch.content !== note.content) {
            // Add OLD content to version history
            // Limit to last 10 versions for sanity? Let's keep it simple for now.
            versions = [
                { ts: new Date().toISOString(), title: note.title, content: note.content },
                ...versions
            ].slice(0, 20);
        }

        const nextNote = { ...note, ...patch, versions, updated_at: new Date().toISOString() };
        const nextNotes = notes.map(n => n.id === id ? nextNote : n);
        set({ notes: nextNotes });

        // DB Update
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

        await supabase.from('personal_notes').delete().eq('id', id);
    },

    moveNote: async (noteId, newSectionId) => {
        const { notes } = get();
        const nextNotes = notes.map(n => n.id === noteId ? { ...n, section_id: newSectionId } : n);
        set({ notes: nextNotes });
        await supabase.from('personal_notes').update({ section_id: newSectionId }).eq('id', noteId);
    },

    setActiveNotebook: (id) => set({ activeNotebookId: id }),
    setActiveSection: (id) => set({ activeSectionId: id }),
    setActiveNote: (id) => set({ activeNoteId: id }),
    setSearch: (q) => set({ searchQuery: q }),
}));
