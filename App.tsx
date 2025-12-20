
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
import { DialogueOverlay } from './components/DialogueOverlay';
import { AssetLoaderOverlay } from './components/AssetLoaderOverlay';
import { getSupabase } from './services/supabaseClient';

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

      {isAdmin ? <AdminDashboard /> : (
        <div className="w-full h-full">
          <div className={`fixed inset-0 z-[998] bg-black transition-opacity duration-1000 pointer-events-none ${isSleeping ? 'opacity-100' : 'opacity-0'}`} />
          {gameState === GameState.TITLE && <TitleScreen onComplete={createCharacter} />}
          {gameState === GameState.GAME_WON && <EndingScreen />}
          {(gameState === GameState.OVERWORLD || gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON || gameState === GameState.DIALOGUE) && (
            <OverworldMap playerPos={playerPos} onMove={movePlayerOverworld} dimension={dimension} />
          )}
          {(gameState === GameState.BATTLE_TACTICAL || gameState === GameState.BATTLE_INIT) && (
            <BattleScene entities={battleEntities} weather={battleWeather} terrainType={battleTerrain} currentTurnEntityId={turnOrder[currentTurnIndex]} onTileClick={handleTileInteraction} />
          )}
          <UIOverlay activeService={activeTownService} onOpenTownService={setActiveTownService} />
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
        </div>
      )}
    </main>
  );
};

export default App;
