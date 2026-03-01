
import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { GameState, BattleAction } from './types';
import { UIOverlay } from './components/UIOverlay';
import { AssetLoaderOverlay } from './components/AssetLoaderOverlay';
import { OverworldUI } from './components/OverworldUI';
import { getSupabase } from './services/supabaseClient';
import { useGameStore } from './store/gameStore';
import { useContentStore } from './store/contentStore';

// Code Splitting - Lazy Loading de componentes pesados
const OverworldMap = lazy(() => import('./components/OverworldMap').then(m => ({ default: m.OverworldMap })));
const BattleScene = lazy(() => import('./components/BattleScene').then(m => ({ default: m.BattleScene })));
const TitleScreen = lazy(() => import('./components/CharacterCreation').then(m => ({ default: m.TitleScreen })));
const BattleResultModal = lazy(() => import('./components/BattleResultModal').then(m => ({ default: m.BattleResultModal })));
const BattleInitModal = lazy(() => import('./components/BattleInitModal').then(m => ({ default: m.BattleInitModal })));
const EndingScreen = lazy(() => import('./components/EndingScreen').then(m => ({ default: m.EndingScreen })));
const TownServicesManager = lazy(() => import('./components/TownServices').then(m => ({ default: m.TownServicesManager })));
const LevelUpScreen = lazy(() => import('./components/LevelUpScreen').then(m => ({ default: m.LevelUpScreen })));
const SummoningScreen = lazy(() => import('./components/SummoningScreen').then(m => ({ default: m.SummoningScreen })));
const TempleScreen = lazy(() => import('./components/TempleScreen').then(m => ({ default: m.TempleScreen })));
const PartyManager = lazy(() => import('./components/PartyManager').then(m => ({ default: m.PartyManager })));
const DialogueOverlay = lazy(() => import('./components/DialogueOverlay').then(m => ({ default: m.DialogueOverlay })));
const InspectionPanel = lazy(() => import('./components/InspectionPanel').then(m => ({ default: m.InspectionPanel })));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-950 z-[9999]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-amber-500 font-black uppercase tracking-widest text-sm">Cargando...</span>
    </div>
  </div>
);

const App = () => {
  const isAdmin = useGameStore(s => s.isAdmin);
  const setAdminMode = useGameStore(s => s.setAdminMode);
  const [activeTownService, setActiveTownService] = useState<'NONE' | 'SHOP' | 'INN'>('NONE');
  
  const gameState = useGameStore(s => s.gameState);
  const playerPos = useGameStore(s => s.playerPos);
  const battleEntities = useGameStore(s => s.battleEntities || []);
  const turnOrder = useGameStore(s => s.turnOrder || []);
  const currentTurnIndex = useGameStore(s => s.currentTurnIndex || 0);
  const battleTerrain = useGameStore(s => s.battleTerrain);
  const battleWeather = useGameStore(s => s.battleWeather);
  const battleRewards = useGameStore(s => s.battleRewards);
  const dimension = useGameStore(s => s.dimension);
  const isSleeping = useGameStore(s => s.isSleeping);
  const isScreenShaking = useGameStore(s => s.isScreenShaking);
  const isScreenFlashing = useGameStore(s => s.isScreenFlashing);
  const isAssetsLoaded = useGameStore(s => s.isAssetsLoaded);

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
      supabase.auth.onAuthStateChange((_e, session) => setUserSession(session));
    }
    const handleLocationChange = () => {
        setAdminMode(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return (
    <main className={`relative w-screen h-screen overflow-hidden bg-black text-white transition-transform duration-75 ${isScreenShaking ? 'animate-shake' : ''}`}>
      <div className={`fixed inset-0 z-[999] bg-white pointer-events-none transition-opacity duration-150 ${isScreenFlashing ? 'opacity-40' : 'opacity-0'}`} />

      {!isAssetsLoaded && !isAdmin && <AssetLoaderOverlay />}

      {isAdmin ? (
        <Suspense fallback={<LoadingFallback />}>
          <AdminDashboard />
        </Suspense>
      ) : (
        <div className="w-full h-full">
          <div className={`fixed inset-0 z-[998] bg-black transition-opacity duration-1000 pointer-events-none ${isSleeping ? 'opacity-100' : 'opacity-0'}`} />
          
          <Suspense fallback={<LoadingFallback />}>
            {gameState === GameState.TITLE && <TitleScreen onComplete={createCharacter} />}
            {gameState === GameState.GAME_WON && <EndingScreen />}
            
            {/* OVERWORLD MAP */}
            {(gameState === GameState.OVERWORLD || 
              gameState === GameState.TOWN_EXPLORATION || 
              gameState === GameState.DUNGEON || 
              gameState === GameState.DIALOGUE) && (
              <>
                <OverworldMap playerPos={playerPos} onMove={movePlayerOverworld} dimension={dimension} />
                <OverworldUI />
              </>
            )}

            {/* BATALLA */}
            {(gameState === GameState.BATTLE_TACTICAL || gameState === GameState.BATTLE_INIT) && (
              <BattleScene 
                  entities={battleEntities} 
                  weather={battleWeather} 
                  terrainType={battleTerrain} 
                  currentTurnEntityId={turnOrder[currentTurnIndex]} 
                  onTileClick={handleTileInteraction} 
              />
            )}

            {/* MODALS */}
            {gameState === GameState.BATTLE_INIT && <BattleInitModal />}
            {(gameState === GameState.BATTLE_VICTORY || gameState === GameState.BATTLE_DEFEAT) && (
              <BattleResultModal type={gameState === GameState.BATTLE_VICTORY ? 'victory' : 'defeat'} rewards={battleRewards} onContinue={continueAfterVictory} onRestart={restartBattle} onQuit={quitToMenu} />
            )}
            {(gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON) && activeTownService !== 'NONE' && (
              <TownServicesManager activeService={activeTownService} onClose={() => setActiveTownService('NONE')} />
            )}
            {gameState === GameState.LEVEL_UP && <LevelUpScreen />}
            {gameState === GameState.SUMMONING && <SummoningScreen />}
            {gameState === GameState.TEMPLE_HUB && <TempleScreen />}
            {gameState === GameState.PARTY_MANAGEMENT && <PartyManager />}
            {gameState === GameState.DIALOGUE && <DialogueOverlay />}
            <InspectionPanel />
          </Suspense>
          
          <UIOverlay activeService={activeTownService} onOpenTownService={setActiveTownService} />
        </div>
      )}
    </main>
  );
};

export default App;
