
import { StateCreator } from 'zustand';
import { GameLogEntry, SaveMetadata, GameState } from '../../types';
import { getSupabase } from '../../services/supabaseClient';
import { sfx } from '../../services/SoundSystem';

export interface CommonSlice {
  logs: GameLogEntry[];
  isSleeping: boolean;
  isMapOpen: boolean;
  isScreenShaking: boolean;
  isScreenFlashing: boolean;
  isAssetsLoaded: boolean;
  isAdmin: boolean;
  assetLoadingProgress: number;
  addLog: (message: string, type?: GameLogEntry['type']) => void;
  setGameState: (state: GameState) => void;
  setAdminMode: (admin: boolean) => void;
  quitToMenu: () => void;
  toggleMap: () => void;
  setAssetsLoaded: (loaded: boolean) => void;
  setAssetLoadingProgress: (progress: number) => void;
  
  // Persistencia
  saveGame: (slotIndex?: number) => Promise<void>;
  loadGame: (slotIndex: number) => Promise<void>;
  getSaveSlots: () => Promise<SaveMetadata[]>;
}

export const createCommonSlice: StateCreator<any, [], [], CommonSlice> = (set, get) => ({
  logs: [],
  isSleeping: false,
  isMapOpen: false,
  isScreenShaking: false,
  isScreenFlashing: false,
  isAssetsLoaded: false,
  isAdmin: typeof window !== 'undefined' ? window.location.pathname.startsWith('/admin') : false,
  assetLoadingProgress: 0,
  
  addLog: (message, type = 'info') => {
    set((state) => ({ 
        logs: [...state.logs, { id: Math.random().toString(36).substr(2, 9), message, type, timestamp: Date.now() }] 
    }));
  },
  
  setGameState: (gs) => set({ gameState: gs }),
  setAdminMode: (admin) => {
      set({ isAdmin: admin });
      if (typeof window !== 'undefined') {
          const newPath = admin ? '/admin' : '/';
          if (window.location.pathname !== newPath) {
              window.history.pushState({}, '', newPath);
          }
      }
  },
  setAssetsLoaded: (loaded) => set({ isAssetsLoaded: loaded }),
  setAssetLoadingProgress: (progress) => set({ assetLoadingProgress: progress }),
  
  quitToMenu: () => {
    set({ 
        gameState: GameState.TITLE, 
        party: [], 
        inventory: [], 
        gold: 250, 
        isInventoryOpen: false, 
        isMapOpen: false,
        activeNarrativeEvent: null
    });
    sfx.playUiClick();
  },

  toggleMap: () => {
    sfx.playUiClick();
    set(s => ({ isMapOpen: !s.isMapOpen, isInventoryOpen: false }));
  },

  getSaveSlots: async () => {
      const supabase = getSupabase();
      if (!supabase) {
          const local = localStorage.getItem('epic_earth_slots');
          return local ? JSON.parse(local) : [];
      }
      const { data } = await supabase.from('save_slots').select('slot_index, updated_at, summary');
      return (data || []).map(d => ({ slotIndex: d.slot_index, timestamp: new Date(d.updated_at).getTime(), summary: d.summary }));
  },

  saveGame: async (slotIndex = 0) => {
    const state = get();
    const leader = state.party[0];
    if (!leader) return;

    try {
        const saveData = {
            version: '1.0.0',
            timestamp: Date.now(),
            party: state.party,
            inventory: state.inventory,
            gold: state.gold,
            playerPos: state.playerPos,
            exploredTiles: Object.fromEntries(Object.entries(state.exploredTiles || {}).map(([k, v]) => [k, Array.from(v as Set<string>)])),
            visitedTowns: Array.from(state.visitedTowns || []),
            dimension: state.dimension,
            worldTime: state.worldTime,
            supplies: state.supplies,
            fatigue: state.fatigue,
            quests: state.quests,
            difficulty: state.difficulty,
            currentRegionName: state.currentRegionName,
            activeTownService: state.activeTownService,
            battleEntities: [],
            battleMap: []
        };

        const summary = {
            charName: leader.name,
            level: leader.stats.level,
            class: leader.stats.class,
            location: state.currentRegionName || "Wilds"
        };

        const supabase = getSupabase();
        if (supabase && state.userSession) {
            await supabase.from('save_slots').upsert({
                user_id: state.userSession.user.id,
                slot_index: slotIndex,
                data: saveData,
                summary: summary,
                updated_at: new Date().toString()
            });
        } else {
            localStorage.setItem(`epic_earth_save_${slotIndex}`, JSON.stringify(saveData));
            const slots = await get().getSaveSlots();
            const newSlots = [...slots.filter(s => s.slotIndex !== slotIndex), { slotIndex, timestamp: Date.now(), summary }];
            localStorage.setItem('epic_earth_slots', JSON.stringify(newSlots));
        }
        
        get().addLog("Progress recorded in the Shards of Time.", "info");
        sfx.playMagic();
    } catch (error) {
        console.error('Save failed:', error);
        get().addLog("Save failed! Progress may be lost.", "info");
    }
  },

  loadGame: async (slotIndex) => {
      let data: any = null;
      const supabase = getSupabase();
      
      try {
          if (supabase && get().userSession) {
              const { data: res } = await supabase.from('save_slots').select('data').eq('slot_index', slotIndex).single();
              if (res) data = res.data;
          } else {
              const local = localStorage.getItem(`epic_earth_save_${slotIndex}`);
              if (local) data = JSON.parse(local);
          }

          if (data) {
              const restoredState: any = {
                  party: data.party || [],
                  inventory: data.inventory || [],
                  gold: data.gold || 250,
                  playerPos: data.playerPos || { x: 0, y: 0 },
                  exploredTiles: Object.fromEntries(Object.entries(data.exploredTiles || {}).map(([k, v]) => [k, new Set(v as string[])])),
                  visitedTowns: new Set(data.visitedTowns || []),
                  dimension: data.dimension || 'MORTAL',
                  worldTime: data.worldTime || 480,
                  supplies: data.supplies || 10,
                  fatigue: data.fatigue || 0,
                  quests: data.quests || [],
                  difficulty: data.difficulty || 'NORMAL',
                  currentRegionName: data.currentRegionName || 'Unknown Region',
                  activeTownService: 'NONE',
                  gameState: GameState.OVERWORLD,
                  battleEntities: [],
                  battleMap: [],
                  turnOrder: [],
                  currentTurnIndex: 0,
                  selectedAction: null,
                  validMoves: [],
                  validTargets: [],
                  hasMoved: false,
                  hasActed: false,
                  isActionAnimating: false,
                  isUnitMenuOpen: false,
                  isItemMenuOpen: false
              };
              
              set(restoredState);
              sfx.playVictory();
              get().addLog("Dimension stabilized. Welcome back.", "narrative");
          }
      } catch (error) {
          console.error('Load failed:', error);
          get().addLog("Save file corrupted. Starting new game.", "info");
          sfx.playUiError();
      }
  }
});
