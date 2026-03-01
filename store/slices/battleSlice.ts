
// @ts-nocheck
import { StateCreator } from 'zustand';
import { 
    GameState, TerrainType, WeatherType, BattleCell, BattleAction, Entity, 
    DamagePopup, SpellEffectData, SpellType, AIBehavior, LootDrop, ItemRarity, 
    Dimension, DamageType, EffectType, StatusEffectType, MovementType, PositionComponent
} from '../../types';
import { findBattlePath, getReachableTiles } from '../../services/pathfinding';
// Fixed: Removed non-existent calculateHitChance and unused calculateDamage, calculateFinalDamage from import
import { rollDice, calculateEnemyStats, calculateAttackRoll, getAttackRange } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { ActionResolver } from '../../services/ActionResolver';
import { WorldGenerator } from '../../services/WorldGenerator';
import { GeminiService } from '../../services/GeminiService';
import { SummoningService } from '../../services/SummoningService';
import { useContentStore } from '../contentStore';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface BattleSlice {
    battleEntities: Entity[];
    battleMap: BattleCell[];
    turnOrder: string[];
    currentTurnIndex: number;
    selectedTile: PositionComponent | null;
    validMoves: PositionComponent[];
    validTargets: PositionComponent[];
    selectedAction: BattleAction | null;
    damagePopups: DamagePopup[];
    activeSpellEffect: SpellEffectData | null;
    isActionAnimating: boolean;
    isUnitMenuOpen: boolean;
    isItemMenuOpen: boolean;
    hasMoved: boolean;
    hasActed: boolean;
    battleIntroText: string;
    battleTerrain: TerrainType;
    battleWeather: WeatherType;
    battleRewards: { xp: number, gold: number, items: any[], shards?: number, lootDrops?: any[] } | null;
    turnAnnouncement: string | null;

    startBattle: (biome: TerrainType, weather: WeatherType) => Promise<void>;
    confirmBattle: () => void;
    advanceTurn: () => void;
    handleTileInteraction: (x: number, z: number) => void;
    handleTileHover: (x: number, z: number) => void;
    executeMove: (x: number, z: number) => Promise<void>;
    executeAction: (actor: Entity, targets: Entity[]) => Promise<void>;
    executeSpell: (actor: Entity, targets: Entity[]) => Promise<void>;
    executeItem: (item: any, targetId?: string) => Promise<void>;
    useItemInBattle: (item: any) => Promise<void>;
    executeWait: () => void;
    endTurn: () => void;
    selectAction: (action: BattleAction) => void;
    damageVoxel: (x: number, z: number, amount: number) => void;
    triggerScreenShake: (duration: number) => void;
    removeDamagePopup: (id: string) => void;
    setUnitMenuOpen: (open: boolean) => void;
    setItemMenuOpen: (open: boolean) => void;
    continueAfterVictory: () => void;
    restartBattle: () => void;
    closeInspection: () => void;
}

export const createBattleSlice: StateCreator<any, [], [], BattleSlice> = (set, get) => ({
    battleEntities: [],
    battleMap: [],
    turnOrder: [],
    currentTurnIndex: 0,
    selectedTile: null,
    validMoves: [],
    validTargets: [],
    selectedAction: null,
    damagePopups: [],
    activeSpellEffect: null,
    isActionAnimating: false,
    isUnitMenuOpen: false,
    isItemMenuOpen: false,
    hasMoved: false,
    hasActed: false,
    battleIntroText: "Te has encontrado con una amenaza...",
    battleTerrain: TerrainType.GRASS,
    battleWeather: WeatherType.NONE,
    battleRewards: null,
    turnAnnouncement: null,

    startBattle: async (biome, weather) => {
        const { party, dimension, difficulty } = get();
        const content = useContentStore.getState();
        const map = WorldGenerator.generateBattleArena(biome, dimension === Dimension.UPSIDE_DOWN);
        
        const enemies: Entity[] = [];
        const possibleEnemies = Object.values(content.enemies).length > 0 
            ? Object.values(content.enemies) 
            : [{ id: 'goblin', name: 'Goblin', hp: 15, ac: 12, sprite: 'units/goblins/spearman.png', xpReward: 50 }];
        
        const count = 2 + Math.floor(Math.random() * 3);
        for(let i=0; i<count; i++) {
            const def = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)];
            enemies.push({
                id: `enemy_${generateId()}`,
                name: def.name,
                type: 'ENEMY',
                equipment: {},
                stats: calculateEnemyStats(def, party[0].stats.level, difficulty),
                visual: { color: '#ef4444', modelType: 'billboard', spriteUrl: def.sprite },
                position: { x: 10 + Math.floor(Math.random() * 4), y: 4 + Math.floor(Math.random() * 8) }
            });
        }

        const battleParty = party.map((p, i) => ({
            ...p,
            position: { x: 2 + Math.floor(i/2), y: 6 + (i % 2) * 2 }
        }));

        const allEntities = [...battleParty, ...enemies];
        const turnOrder = allEntities
            .map(e => ({ id: e.id, roll: rollDice(20, 1) + (e.stats.initiativeBonus || 0) }))
            .sort((a, b) => b.roll - a.roll)
            .map(e => e.id);

        const intro = await GeminiService.generateBattleFlavor(biome, enemies.map(e => e.name), dimension, false);

        set({
            battleMap: map,
            battleEntities: allEntities,
            turnOrder,
            currentTurnIndex: -1,
            battleTerrain: biome,
            battleWeather: weather,
            battleIntroText: intro,
            hasMoved: false,
            hasActed: false,
            selectedAction: null,
            validMoves: [],
            validTargets: [],
            gameState: GameState.BATTLE_INIT
        });
    },

    confirmBattle: () => {
        set({ gameState: GameState.BATTLE_TACTICAL });
        get().advanceTurn();
    },

    advanceTurn: () => {
        const { turnOrder, currentTurnIndex, battleEntities, battleMap } = get();
        if (!turnOrder || turnOrder.length === 0) return;

        const nextIdx = (currentTurnIndex + 1) % turnOrder.length;
        
        // BUG FIX: Verificar que el siguiente turno tenga entidades vivas
        let aliveCount = 0;
        for (let i = 0; i < turnOrder.length; i++) {
            const checkIdx = (currentTurnIndex + 1 + i) % turnOrder.length;
            const checkActor = battleEntities.find(e => e.id === turnOrder[checkIdx]);
            if (checkActor && checkActor.stats.hp > 0) {
                aliveCount++;
            }
        }
        
        // Si no hay entidades vivas, no avanzar
        if (aliveCount === 0) return;
        const actorId = turnOrder[nextIdx];
        const actor = battleEntities.find(e => e.id === actorId);

        if (!actor || actor.stats.hp <= 0) {
            set({ currentTurnIndex: nextIdx });
            get().advanceTurn();
            return;
        }

        // --- PROCESAR ESTADOS AL INICIO DEL TURNO ---
        const { hpChange, popups, updatedEffects } = ActionResolver.processStatusTick(actor);
        if (hpChange !== 0 || popups.length > 0) {
            const newEntities = battleEntities.map(e => e.id === actorId ? { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp + hpChange), activeStatusEffects: updatedEffects } } : e);
            set({ 
                battleEntities: newEntities, 
                damagePopups: [...get().damagePopups, ...popups.map(p => ({ ...p, id: generateId(), position: [actor.position.x, 2, actor.position.y], timestamp: Date.now() }))] 
            });
            if (actor.stats.hp + hpChange <= 0) {
                set({ currentTurnIndex: nextIdx });
                get().advanceTurn();
                return;
            }
        }

        const isPlayer = actor.type === 'PLAYER';
        set({ 
            currentTurnIndex: nextIdx, 
            hasMoved: false, 
            hasActed: false, 
            selectedAction: null,
            turnAnnouncement: isPlayer ? "TU TURNO" : "TURNO ENEMIGO"
        });

        setTimeout(() => set({ turnAnnouncement: null }), 1200);

        if (!isPlayer) {
            setTimeout(() => get().performEnemyTurn(actor), 1500);
        }
    },

    performEnemyTurn: async (enemy: Entity) => {
        const { battleEntities, battleMap } = get();
        const players = battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
        if (players.length === 0) return;

        // IA: Buscar al jugador más cercano
        let target = players[0];
        let minDist = 999;
        players.forEach(p => {
            const d = Math.abs(p.position.x - enemy.position.x) + Math.abs(p.position.y - enemy.position.y);
            if (d < minDist) { minDist = d; target = p; }
        });

        // TÁCTICA: Si no está en rango, moverse
        const range = getAttackRange(enemy);
        const dist = Math.sqrt(Math.pow(target.position.x - enemy.position.x, 2) + Math.pow(target.position.y - enemy.position.y, 2));

        if (dist > range) {
            const path = findBattlePath(enemy.position, target.position, battleMap);
            if (path && path.length > 1) {
                // El enemigo intenta buscar el bloque más alto en su rango de movimiento si es posible
                const moveDist = Math.min(path.length - 2, Math.floor(enemy.stats.speed / 5));
                const moveTile = path[moveDist];
                
                set({ battleEntities: get().battleEntities.map(e => e.id === enemy.id ? { ...e, position: { x: moveTile.x, y: moveTile.z } } : e) });
                sfx.playStep();
                await new Promise(r => setTimeout(r, 600));
            }
        }

        // Atacar tras mover (o si ya estaba en rango)
        const finalDist = Math.sqrt(Math.pow(target.position.x - enemy.position.x, 2) + Math.pow(target.position.y - enemy.position.y, 2));
        if (finalDist <= range) {
            await get().executeAction(enemy, [target]);
        } else {
            get().advanceTurn();
        }
    },

    selectAction: (action) => {
        const { turnOrder, currentTurnIndex, battleEntities, battleMap } = get();
        const actor = battleEntities.find(e => e.id === turnOrder[currentTurnIndex]);
        if (!actor) return;

        sfx.playUiClick();
        if (action === BattleAction.MOVE) {
            const occupied = new Set(battleEntities.filter(e => e.stats.hp > 0).map(e => `${e.position.x},${e.position.y}`));
            const moves = getReachableTiles(actor.position, actor.stats.speed / 5, battleMap, occupied, actor.stats.class);
            set({ selectedAction: action, validMoves: moves, validTargets: [] });
        } else if (action === BattleAction.ATTACK) {
            const range = getAttackRange(actor);
            const targets = battleEntities
                .filter(e => e.type !== actor.type && e.stats.hp > 0)
                .filter(e => {
                    const d = Math.sqrt(Math.pow(e.position.x - actor.position.x, 2) + Math.pow(e.position.y - actor.position.y, 2));
                    return d <= range;
                })
                .map(e => e.position);
            set({ selectedAction: action, validTargets: targets, validMoves: [] });
        } else if (action === BattleAction.SPELL) {
            const range = 6;
            const targets = battleEntities
                .filter(e => e.type !== actor.type && e.stats.hp > 0)
                .filter(e => {
                    const d = Math.sqrt(Math.pow(e.position.x - actor.position.x, 2) + Math.pow(e.position.y - actor.position.y, 2));
                    return d <= range;
                })
                .map(e => e.position);
            set({ selectedAction: action, validTargets: targets, validMoves: [] });
        } else if (action === BattleAction.ITEM) {
            set({ selectedAction: action, validTargets: [], validMoves: [], isItemMenuOpen: true });
        }
    },

    handleTileInteraction: (x, z) => {
        const { selectedAction, validMoves, validTargets, turnOrder, currentTurnIndex, battleEntities } = get();
        const actor = battleEntities.find(e => e.id === turnOrder[currentTurnIndex]);
        if (!actor || actor.type !== 'PLAYER') return;

        if (selectedAction === BattleAction.MOVE) {
            if (validMoves.some(m => m.x === x && m.y === z)) get().executeMove(x, z);
        } else if (selectedAction === BattleAction.ATTACK) {
            const target = battleEntities.find(e => e.position.x === x && e.position.y === z && e.stats.hp > 0);
            if (target && validTargets.some(t => t.x === x && t.y === z)) get().executeAction(actor, [target]);
        } else if (selectedAction === BattleAction.SPELL) {
            const target = battleEntities.find(e => e.position.x === x && e.position.y === z && e.stats.hp > 0);
            if (target && validTargets.some(t => t.x === x && t.y === z)) get().executeSpell(actor, [target]);
        }
    },

    executeMove: async (x, z) => {
        const { turnOrder, currentTurnIndex, battleEntities } = get();
        const actorId = turnOrder[currentTurnIndex];
        set({ 
            battleEntities: battleEntities.map(e => e.id === actorId ? { ...e, position: { x, y: z } } : e),
            hasMoved: true,
            selectedAction: null,
            validMoves: []
        });
        sfx.playStep();
    },

    executeAction: async (actor, targets) => {
        const state = get();
        set({ isActionAnimating: true, isUnitMenuOpen: false, validTargets: [] });
        const target = targets[0];

        set({ activeSpellEffect: { 
            id: generateId(), type: 'BURST', 
            startPos: [actor.position.x, 1, actor.position.y], 
            endPos: [target.position.x, 1, target.position.y], 
            color: actor.type === 'PLAYER' ? '#3b82f6' : '#ef4444', duration: 300, timestamp: Date.now() 
        }});

        await new Promise(r => setTimeout(r, 350));

        // Resolución con lógica de altura incluida
        const res = ActionResolver.resolve(actor, target, [{ type: EffectType.DAMAGE, diceCount: 1, diceSides: 8 }], state.dimension, state.battleEntities, state.battleMap);
        get().damageVoxel(target.position.x, target.position.y, rollDice(8, 1) + 2);

        if (res.didHit) {
            get().triggerScreenShake(res.popups[0]?.isCrit ? 600 : 300);
            if (res.popups[0]?.isCrit) sfx.playCrit(); else sfx.playAttack();
        }

        const newEntities = state.battleEntities.map(e => {
            if (e.id === target.id) return { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp + res.hpChange) } };
            return e;
        });

        set({ 
            battleEntities: newEntities, 
            damagePopups: [...state.damagePopups, ...res.popups.map(p => ({ ...p, id: generateId(), position: [target.position.x, 2, target.position.y], timestamp: Date.now() }))],
            isActionAnimating: false, activeSpellEffect: null, hasActed: true 
        });

        const aliveEnemies = newEntities.filter(e => e.type === 'ENEMY' && e.stats.hp > 0);
        const alivePlayers = newEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);

        if (aliveEnemies.length === 0) {
            const enemies = state.battleEntities.filter(e => e.type === 'ENEMY');
            const lootDrops = enemies.map(() => SummoningService.generateRandomItem(1));
            const xpReward = enemies.reduce((sum, e) => sum + (e.stats.xpReward || 50), 0);
            const goldReward = enemies.reduce((sum, e) => sum + Math.floor((e.stats.xpReward || 50) / 2), 0);
            set({ 
                gameState: GameState.BATTLE_VICTORY, 
                battleRewards: { 
                    xp: xpReward, 
                    gold: goldReward, 
                    items: lootDrops,
                    lootDrops: lootDrops
                } 
            });
        } else if (alivePlayers.length === 0) {
            set({ gameState: GameState.BATTLE_DEFEAT });
        } else {
            setTimeout(() => get().advanceTurn(), 800);
        }
    },

    executeSpell: async (actor, targets) => {
        const state = get();
        set({ isActionAnimating: true, isUnitMenuOpen: false, validTargets: [] });
        const target = targets[0];

        set({ activeSpellEffect: { 
            id: generateId(), type: 'MAGIC', 
            startPos: [actor.position.x, 1, actor.position.y], 
            endPos: [target.position.x, 1, target.position.y], 
            color: '#a855f7', duration: 500, timestamp: Date.now() 
        }});

        await new Promise(r => setTimeout(r, 500));

        const spellDamage = rollDice(6, 2) + 3;
        get().damageVoxel(target.position.x, target.position.y, spellDamage);

        get().triggerScreenShake(400);
        sfx.playAttack();

        const newEntities = state.battleEntities.map(e => {
            if (e.id === target.id) {
                const hpChange = -spellDamage;
                return { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp + hpChange) } };
            }
            return e;
        });

        const popups = [{ id: generateId(), amount: spellDamage, isCrit: false, isHeal: false, position: [target.position.x, 2, target.position.y], timestamp: Date.now() }];

        set({ 
            battleEntities: newEntities, 
            damagePopups: [...state.damagePopups, ...popups],
            isActionAnimating: false, activeSpellEffect: null, hasActed: true 
        });

        const aliveEnemies = newEntities.filter(e => e.type === 'ENEMY' && e.stats.hp > 0);
        const alivePlayers = newEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);

        if (aliveEnemies.length === 0) {
            const enemies = state.battleEntities.filter(e => e.type === 'ENEMY');
            const lootDrops = enemies.map(() => SummoningService.generateRandomItem(1));
            const xpReward = enemies.reduce((sum, e) => sum + (e.stats.xpReward || 50), 0);
            const goldReward = enemies.reduce((sum, e) => sum + Math.floor((e.stats.xpReward || 50) / 2), 0);
            set({ 
                gameState: GameState.BATTLE_VICTORY, 
                battleRewards: { 
                    xp: xpReward, 
                    gold: goldReward, 
                    items: lootDrops,
                    lootDrops: lootDrops
                } 
            });
        } else if (alivePlayers.length === 0) {
            set({ gameState: GameState.BATTLE_DEFEAT });
        } else {
            setTimeout(() => get().advanceTurn(), 800);
        }
    },

    executeWait: () => {
        set({ hasActed: true, isUnitMenuOpen: false });
        get().advanceTurn();
    },

    endTurn: () => {
        set({ hasMoved: true, hasActed: true, isUnitMenuOpen: false, selectedAction: null, validMoves: [], validTargets: [] });
        get().advanceTurn();
    },

    damageVoxel: (x, z, amount) => {
        const { battleMap, triggerScreenShake } = get();
        const cellIdx = battleMap.findIndex(c => c.x === x && c.z === z);
        if (cellIdx === -1) return;
        const cell = { ...battleMap[cellIdx] };
        if (cell.hp > 900) return;
        cell.hp -= amount;
        if (cell.hp <= 0) {
            cell.height = Math.max(0, cell.height - 1);
            cell.hp = cell.maxHp;
            triggerScreenShake(200);
            sfx.playHit();
        }
        const newMap = [...battleMap];
        newMap[cellIdx] = cell;
        set({ battleMap: newMap });
    },

    triggerScreenShake: (dur) => {
        set({ isScreenShaking: true });
        setTimeout(() => set({ isScreenShaking: false }), dur);
    },

    removeDamagePopup: (id) => set(s => ({ damagePopups: s.damagePopups.filter(p => p.id !== id) })),
    setUnitMenuOpen: (open) => set({ isUnitMenuOpen: open }),
    setItemMenuOpen: (open) => set({ isItemMenuOpen: open, selectedAction: open ? BattleAction.ITEM : null }),
    
    executeItem: async (item, targetId) => {
        const state = get();
        const actorId = state.turnOrder[state.currentTurnIndex];
        const actor = state.battleEntities.find(e => e.id === actorId);
        if (!actor || !item) return;
        
        set({ isActionAnimating: true, isItemMenuOpen: false, selectedAction: null });
        
        const effect = item.effect;
        if (!effect) {
            set({ isActionAnimating: false });
            return;
        }
        
        if (effect.type === 'HEAL') {
            const healAmount = effect.fixedValue || rollDice(6, 1) + 2;
            const newEntities = state.battleEntities.map(e => {
                if (e.id === actorId) {
                    const newHp = Math.min(e.stats.maxHp, e.stats.hp + healAmount);
                    return { ...e, stats: { ...e.stats, hp: newHp } };
                }
                return e;
            });
            
            set({ 
                battleEntities: newEntities,
                activeSpellEffect: {
                    id: generateId(), type: 'HEAL',
                    startPos: [actor.position.x, 1, actor.position.y],
                    endPos: [actor.position.x, 1, actor.position.y],
                    color: '#22c55e', duration: 400, timestamp: Date.now()
                }
            });
            
            await new Promise(r => setTimeout(r, 400));
            
            const popups = [{ id: generateId(), amount: healAmount, isCrit: false, isHeal: true, position: [actor.position.x, 2, actor.position.y], timestamp: Date.now() }];
            set({ 
                battleEntities: newEntities,
                damagePopups: [...state.damagePopups, ...popups],
                isActionAnimating: false, activeSpellEffect: null, hasActed: true
            });
        }
        
        setTimeout(() => get().advanceTurn(), 800);
    },
    
    useItemInBattle: async (item) => {
        await get().executeItem(item);
    },
    
    handleTileHover: (x, z) => set({ selectedTile: { x, y: z } }),
    closeInspection: () => set({ inspectedEntityId: null }),

    continueAfterVictory: () => {
        const { battleRewards, addPartyXp, addGold, playerPos, dimension } = get();
        if (battleRewards) { addPartyXp(battleRewards.xp); addGold(battleRewards.gold); }
        const tile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
        if (tile) tile.hasEncounter = false;
        set({ gameState: GameState.OVERWORLD, battleEntities: [], battleMap: [] });
        sfx.playVictory();
    },

    restartBattle: () => { get().loadGame(0); },
    quitToMenu: () => set({ gameState: GameState.TITLE })
});
