
import React, { useEffect, useMemo, useState } from 'react';
import { GameState, BattleAction } from './types';
import { OverworldMap } from './components/OverworldMap';
import { BattleScene } from './components/BattleScene';
import { TitleScreen } from './components/CharacterCreation';
import { UIOverlay } from './components/UIOverlay';
import { BattleResultModal } from './components/BattleResultModal';
import { BattleInitModal } from './components/BattleInitModal';
import { EndingScreen } from './components/EndingScreen';
import { useGameStore } from './store/gameStore';
import { useContentStore } from './store/contentStore'; 
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TownServicesManager } from './components/TownServices';
import { InspectionPanel } from './components/InspectionPanel';
import { LevelUpScreen } from './components/LevelUpScreen';
import { SummoningScreen } from './components/SummoningScreen';
import { TempleScreen } from './components/TempleScreen';
import { PartyManager } from './components/PartyManager';
import { NarrativeEventModal } from './components/NarrativeEventModal';
import { getReachableTiles } from './services/pathfinding';
import { getAttackRange } from './services/dndRules';
import { getSupabase } from './services/supabaseClient';

const App = () => {
  const [isAdmin, setIsAdmin] = useState(() => window.location.pathname === '/admin');
  const [activeTownService, setActiveTownService] = useState<'NONE' | 'SHOP' | 'INN'>('NONE');
  
  const gameState = useGameStore(s => s.gameState);
  const playerPos = useGameStore(s => s.playerPos);
  const battleEntities = useGameStore(s => s.battleEntities || []);
  const turnOrder = useGameStore(s => s.turnOrder || []);
  const currentTurnIndex = useGameStore(s => s.currentTurnIndex || 0);
  const battleTerrain = useGameStore(s => s.battleTerrain);
  const battleWeather = useGameStore(s => s.battleWeather);
  const battleRewards = useGameStore(s => s.battleRewards);
  const selectedAction = useGameStore(s => s.selectedAction);
  const hasMoved = useGameStore(s => s.hasMoved);
  const hasActed = useGameStore(s => s.hasActed);
  const dimension = useGameStore(s => s.dimension);
  const townMapData = useGameStore(s => s.townMapData);
  const mapDimensions = useGameStore(s => s.mapDimensions || {width: 40, height: 30});
  const battleMap = useGameStore(s => s.battleMap);
  const isSleeping = useGameStore(s => s.isSleeping);
  const isScreenShaking = useGameStore(s => s.isScreenShaking);
  const isScreenFlashing = useGameStore(s => s.isScreenFlashing);

  const initializeWorld = useGameStore(s => s.initializeWorld);
  const createCharacter = useGameStore(s => s.createCharacter);
  const movePlayerOverworld = useGameStore(s => s.movePlayerOverworld);
  const handleTileInteraction = useGameStore(s => s.handleTileInteraction);
  const continueAfterVictory = useGameStore(s => s.continueAfterVictory);
  const restartBattle = useGameStore(s => s.restartBattle);
  const quitToMenu = useGameStore(s => s.quitToMenu);
  const setUserSession = useGameStore(s => s.setUserSession);

  const fetchContentFromCloud = useContentStore(s => s.fetchContentFromCloud);

  useEffect(() => {
    initializeWorld(); 
    fetchContentFromCloud().catch(() => {});
    
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => setUserSession(session));
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUserSession(session));
      return () => subscription.unsubscribe();
    }
  }, []);

  const activeEntityId = turnOrder?.[currentTurnIndex];
  const activeEntity = useMemo(() => 
    battleEntities?.find(e => e.id === activeEntityId) || null, 
    [battleEntities, activeEntityId]
  );

  const validMoves = useMemo(() => {
    if (gameState !== GameState.BATTLE_TACTICAL || selectedAction !== BattleAction.MOVE || hasMoved || !activeEntity || activeEntity.type !== 'PLAYER' || !activeEntity.position || !battleMap) return [];
    const speedInTiles = Math.floor((activeEntity.stats?.speed || 30) / 5);
    const occupied = new Set<string>();
    battleEntities.forEach(e => { if (e.id !== activeEntity.id && e.stats?.hp > 0 && e.position) occupied.add(`${e.position.x},${e.position.y}`); });
    return getReachableTiles({ x: activeEntity.position.x, y: activeEntity.position.y }, speedInTiles, battleMap, occupied, activeEntity.stats.class);
  }, [gameState, selectedAction, hasMoved, battleEntities, activeEntity, battleMap]);

  const validTargets = useMemo(() => {
    if (gameState !== GameState.BATTLE_TACTICAL || !activeEntity || activeEntity.type !== 'PLAYER' || hasActed || !activeEntity.position) return [];
    const targets: any[] = [];
    const range = getAttackRange(activeEntity);
    if (selectedAction === BattleAction.ATTACK) {
      battleEntities.forEach(e => {
        if (e.id === activeEntity.id || e.type === 'PLAYER' || (e.stats?.hp || 0) <= 0 || !e.position) return;
        const dist = Math.max(Math.abs(activeEntity.position!.x - e.position.x), Math.abs(activeEntity.position!.y - e.position.y));
        if (dist <= range) targets.push({ x: e.position.x, y: e.position.y });
      });
    }
    return targets;
  }, [gameState, selectedAction, hasActed, battleEntities, activeEntity]);

  return (
    <main className={`relative w-screen h-screen overflow-hidden bg-black text-white transition-transform duration-75 ${isScreenShaking ? 'animate-shake' : ''}`}>
      {/* Flash Effect Layer */}
      <div className={`fixed inset-0 z-[999] bg-white pointer-events-none transition-opacity duration-150 ${isScreenFlashing ? 'opacity-40' : 'opacity-0'}`} />

      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <div className="w-full h-full">
          <div className={`fixed inset-0 z-[998] bg-black transition-opacity duration-1000 pointer-events-none ${isSleeping ? 'opacity-100' : 'opacity-0'}`} />
          {gameState === GameState.TITLE && <TitleScreen onComplete={createCharacter} />}
          {gameState === GameState.GAME_WON && <EndingScreen />}
          {(gameState === GameState.OVERWORLD || gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON || gameState === GameState.DIALOGUE) && (
            <OverworldMap mapData={townMapData} playerPos={playerPos} onMove={movePlayerOverworld} dimension={dimension} width={mapDimensions.width} height={mapDimensions.height} />
          )}
          {(gameState === GameState.BATTLE_TACTICAL || gameState === GameState.BATTLE_INIT) && (
            <BattleScene entities={battleEntities} weather={battleWeather} terrainType={battleTerrain} currentTurnEntityId={activeEntityId} onTileClick={handleTileInteraction} validMoves={validMoves} validTargets={validTargets} />
          )}
          <UIOverlay onOpenTownService={setActiveTownService} />
          {gameState === GameState.BATTLE_INIT && <BattleInitModal />}
          {(gameState === GameState.BATTLE_VICTORY || gameState === GameState.BATTLE_DEFEAT) && (
            <BattleResultModal type={gameState === GameState.BATTLE_VICTORY ? 'victory' : 'defeat'} rewards={battleRewards} onContinue={continueAfterVictory} onRestart={restartBattle} onQuit={quitToMenu} />
          )}
          {gameState === GameState.TOWN_EXPLORATION && activeTownService !== 'NONE' && (
            <TownServicesManager activeService={activeTownService} onClose={() => setActiveTownService('NONE')} />
          )}
          {gameState === GameState.LEVEL_UP && <LevelUpScreen />}
          {gameState === GameState.SUMMONING && <SummoningScreen />}
          {gameState === GameState.TEMPLE_HUB && <TempleScreen />}
          {gameState === GameState.PARTY_MANAGEMENT && <PartyManager />}
          {gameState === GameState.DIALOGUE && <NarrativeEventModal />}
          <InspectionPanel />
        </div>
      )}
    </main>
  );
};

export default App;
