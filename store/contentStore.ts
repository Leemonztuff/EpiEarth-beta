
import { create } from 'zustand';
import { Item, TerrainType, Spell, Skill, EnemyDefinition, Attributes, CharacterClass, NPCEntity } from '../types';
import { getSupabase } from '../services/supabaseClient';

export interface ContentState {
    items: Record<string, Item>;
    spells: Record<string, Spell>;
    skills: Record<string, Skill>;
    enemies: Record<string, EnemyDefinition>;
    npcs: Record<string, NPCEntity>; // Added NPCs
    encounters: Partial<Record<TerrainType, string[]>>;
    classStats: Record<CharacterClass, Attributes>;
    gameConfig: { mapScale: number };
    isLoading: boolean;
    
    // Acciones de Sistema
    fetchContentFromCloud: () => Promise<void>;
    publishContentToCloud: () => Promise<void>;
    
    // CRUD para Admin
    updateItem: (id: string, data: Item) => void;
    createItem: (data: Item) => void;
    deleteItem: (id: string) => void;
    
    updateEnemy: (id: string, data: EnemyDefinition) => void;
    createEnemy: (data: EnemyDefinition) => void;
    deleteEnemy: (id: string) => void;

    updateSpell: (id: string, data: Spell) => void;
    createSpell: (data: Spell) => void;
    deleteSpell: (id: string) => void;

    updateSkill: (id: string, data: Skill) => void;
    createSkill: (data: Skill) => void;
    deleteSkill: (id: string) => void;

    updateNPC: (id: string, data: NPCEntity) => void; // Added NPC actions
    createNPC: (data: NPCEntity) => void;
    deleteNPC: (id: string) => void;
    
    updateEncounterTable: (terrain: TerrainType, enemyIds: string[]) => void;
    updateClassStats: (cls: CharacterClass, stats: Attributes) => void;
    updateConfig: (config: any) => void;
    
    // Utils
    exportData: () => string;
    resetToDefaults: () => void;
}

export const useContentStore = create<ContentState>((set, get) => ({
    items: {},
    spells: {},
    skills: {},
    enemies: {},
    npcs: {}, // Initialize empty npcs
    encounters: {},
    classStats: {} as any,
    gameConfig: { mapScale: 0.08 },
    isLoading: false,

    fetchContentFromCloud: async () => {
        const supabase = getSupabase();
        if (!supabase) return;
        
        set({ isLoading: true });
        try {
            const { data, error } = await supabase.from('game_definitions').select('*');
            if (error) throw error;

            const newItems: any = {};
            const newEnemies: any = {};
            const newSpells: any = {};
            const newSkills: any = {};
            const newNpcs: any = {}; // New NPCs
            const newEncounters: any = {};
            let newClassStats: any = {};
            let newConfig = { mapScale: 0.08 };

            data.forEach((row: any) => {
                switch(row.category) {
                    case 'ITEM': newItems[row.id] = row.data; break;
                    case 'ENEMY': newEnemies[row.id] = row.data; break;
                    case 'SPELL': newSpells[row.id] = row.data; break;
                    case 'SKILL': newSkills[row.id] = row.data; break;
                    case 'NPC': newNpcs[row.id] = row.data; break; // Map NPC category
                    case 'ENCOUNTER_TABLE': newEncounters[row.id] = row.data; break;
                    case 'CLASS_STATS': newClassStats = row.data; break;
                    case 'SYSTEM_CONFIG': newConfig = row.data; break;
                }
            });

            set({ 
                items: newItems, 
                enemies: newEnemies, 
                spells: newSpells, 
                skills: newSkills, 
                npcs: newNpcs, // Set NPCs
                encounters: newEncounters,
                classStats: newClassStats,
                gameConfig: newConfig,
                isLoading: false 
            });
        } catch (e) {
            console.error("Content Sync Failed:", e);
            set({ isLoading: false });
        }
    },

    publishContentToCloud: async () => {
        const supabase = getSupabase();
        if (!supabase) return;

        set({ isLoading: true });
        const state = get();
        
        const rows = [
            ...Object.values(state.items).map((v: any) => ({ id: v.id, category: 'ITEM', data: v })),
            ...Object.values(state.enemies).map((v: any) => ({ id: v.id, category: 'ENEMY', data: v })),
            ...Object.values(state.spells).map((v: any) => ({ id: v.id, category: 'SPELL', data: v })),
            ...Object.values(state.skills).map((v: any) => ({ id: v.id, category: 'SKILL', data: v })),
            ...Object.values(state.npcs).map((v: any) => ({ id: v.id, category: 'NPC', data: v })), // Publish NPCs
            ...Object.entries(state.encounters).map(([k, v]) => ({ id: k, category: 'ENCOUNTER_TABLE', data: v })),
            { id: 'all_classes', category: 'CLASS_STATS', data: state.classStats },
            { id: 'main_config', category: 'SYSTEM_CONFIG', data: state.gameConfig }
        ];

        try {
            const { error } = await supabase.from('game_definitions').upsert(rows);
            if (error) throw error;
            alert("¡Publicación exitosa! Todos los jugadores verán los cambios al recargar.");
        } catch (e: any) {
            alert("Error al publicar: " + e.message);
        } finally {
            set({ isLoading: false });
        }
    },

    updateItem: (id, data) => set(s => ({ items: { ...s.items, [id]: data } })),
    createItem: (data) => set(s => ({ items: { ...s.items, [data.id]: data } })),
    deleteItem: (id) => set(s => { const n = { ...s.items }; delete n[id]; return { items: n }; }),
    
    updateEnemy: (id, data) => set(s => ({ enemies: { ...s.enemies, [id]: data } })),
    createEnemy: (data) => set(s => ({ enemies: { ...s.enemies, [data.id]: data } })),
    deleteEnemy: (id) => set(s => { const n = { ...s.enemies }; delete n[id]; return { enemies: n }; }),

    updateSpell: (id, data) => set(s => ({ spells: { ...s.spells, [id]: data } })),
    createSpell: (data) => set(s => ({ spells: { ...s.spells, [data.id]: data } })),
    deleteSpell: (id) => set(s => { const n = { ...s.spells }; delete n[id]; return { spells: n }; }),

    updateSkill: (id, data) => set(s => ({ skills: { ...s.skills, [id]: data } })),
    createSkill: (data) => set(s => ({ skills: { ...s.skills, [data.id]: data } })),
    deleteSkill: (id) => set(s => { const n = { ...s.skills }; delete n[id]; return { skills: n }; }),

    updateNPC: (id, data) => set(s => ({ npcs: { ...s.npcs, [id]: data } })),
    createNPC: (data) => set(s => ({ npcs: { ...s.npcs, [data.id]: data } })),
    deleteNPC: (id) => set(s => { const n = { ...s.npcs }; delete n[id]; return { npcs: n }; }),

    updateEncounterTable: (terrain, ids) => set(s => ({ encounters: { ...s.encounters, [terrain]: ids } })),
    updateClassStats: (cls, stats) => set(s => ({ classStats: { ...s.classStats, [cls]: stats } })),
    updateConfig: (config) => set(s => ({ gameConfig: { ...s.gameConfig, ...config } })),

    exportData: () => JSON.stringify(get(), null, 2),
    resetToDefaults: () => set({ items: {}, enemies: {}, encounters: {}, spells: {}, skills: {}, npcs: {} })
}));
