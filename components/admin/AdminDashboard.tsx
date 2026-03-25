
// @ts-nocheck
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { useContentStore, CustomMap } from '../../store/contentStore';
import { useGameStore } from '../../store/gameStore';
import { 
    TerrainType, HexCell, WeatherType, Item, CharacterClass, Difficulty, BattleCell, POIType
} from '../../types';
import { TERRAIN_COLORS, ASSETS, CLASS_CONFIG, ITEMS as CORE_ITEMS, HEX_SIZE } from '../../constants';
import { AssetManager } from '../../services/AssetManager';
import { GeminiService } from '../../services/GeminiService';

// --- SHARED UI COMPONENTS ---

const TabButton = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest ${active ? 'bg-amber-600/10 text-amber-400 border border-amber-600/20 shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'}`}
    >
        <span className="text-xl">{icon}</span>
        {label}
    </button>
);

const AIArchitectPanel = ({ type, onGenerate, isGenerating }) => {
    const [prompt, setPrompt] = useState('');
    const [biome, setBiome] = useState('GRASS');
    const [complexity, setComplexity] = useState(5);
    const [logs, setLogs] = useState(['Awaiting directives...']);

    useEffect(() => {
        if (isGenerating) {
            const phases = [
                "Scanning dimensional coordinates...",
                "Calculating tactical ley-lines...",
                "Synthesizing material voxels...",
                "Finalizing architectural coherence..."
            ];
            let i = 0;
            const timer = setInterval(() => {
                if (i < phases.length) {
                    setLogs(prev => [`> ${phases[i]}`, ...prev.slice(0, 4)]);
                    i++;
                }
            }, 1500);
            return () => clearInterval(timer);
        }
    }, [isGenerating]);

    return (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-6xl">✨</span>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI ARCHITECT CORE</h4>
                </div>
                <span className="text-[8px] font-mono text-slate-500 uppercase">Model: Gemini 3.0</span>
            </div>
            
            <div className="space-y-1.5">
                <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Master Blueprint</label>
                <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe the atmosphere and purpose..."
                    className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500/50 h-24 resize-none transition-all placeholder:text-slate-700"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Primary Biome</label>
                    <select value={biome} onChange={e => setBiome(e.target.value)} className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-[10px] text-slate-300 font-bold outline-none focus:border-indigo-500/50">
                        {Object.values(TerrainType).slice(0, 20).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between">
                         <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Complexity</label>
                         <span className="text-[8px] font-mono text-indigo-400 font-bold">{complexity}/10</span>
                    </div>
                    <input type="range" min="1" max="10" value={complexity} onChange={e => setComplexity(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 mt-3" />
                </div>
            </div>

            {/* Diagnostic Terminal */}
            <div className="bg-black/60 rounded-xl p-3 border border-white/5 font-mono text-[7px] space-y-1 h-20 overflow-hidden">
                {logs.map((log, i) => (
                    <div key={i} className={`${i === 0 ? 'text-indigo-400' : 'text-slate-600'} truncate`}>{log}</div>
                ))}
            </div>

            <button 
                onClick={() => onGenerate({ prompt, biome, complexity })}
                disabled={isGenerating || !prompt}
                className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98]"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Channeling Reality...</span>
                    </div>
                ) : 'Manifest Forge'}
            </button>
        </div>
    );
};

// --- 2D WORLD FORGE ---

const WorldEditor2D = ({ map, onUpdate }) => {
    const canvasRef = useRef(null);
    const [selectedQ, setSelectedQ] = useState(0);
    const [selectedR, setSelectedR] = useState(0);
    const [activeTerrain, setActiveTerrain] = useState(TerrainType.GRASS);
    const [activePoi, setActivePoi] = useState('NONE');
    const [isGenerating, setIsGenerating] = useState(false);

    const drawMap = () => {
        const canvas = canvasRef.current;
        if (!canvas || !map.cells) return;
        const ctx = canvas.getContext('2d');
        const s = 25; ctx.clearRect(0, 0, canvas.width, canvas.height);
        map.cells.forEach(cell => {
            const { x, y } = { x: canvas.width / 2 + cell.q * s * 1.5, y: canvas.height / 2 + (cell.r + cell.q / 2) * s * Math.sqrt(3) };
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = 2 * Math.PI / 6 * i;
                ctx.lineTo(x + s * Math.cos(angle), y + s * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fillStyle = TERRAIN_COLORS[cell.terrain] || '#333';
            ctx.fill();
            ctx.strokeStyle = cell.q === selectedQ && cell.r === selectedR ? '#fbbf24' : 'rgba(255,255,255,0.05)';
            ctx.lineWidth = cell.q === selectedQ && cell.r === selectedR ? 3 : 1; ctx.stroke();
            if (cell.poiType && cell.poiType !== 'NONE') {
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 12, y - 6, 24, 12);
                ctx.fillStyle = 'white'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(cell.poiType.substring(0,4), x, y + 3);
            }
        });
    };

    useEffect(() => { drawMap(); }, [map, selectedQ, selectedR]);

    const handleAIGenerate = async (params) => {
        setIsGenerating(true);
        const result = await GeminiService.generateMapStructure('2D', params);
        if (result && result.cells) {
            onUpdate({ 
                ...map, 
                name: result.mapName || map.name,
                cells: result.cells.map(c => ({ 
                    ...c, 
                    isExplored: true, isVisible: true, weather: WeatherType.NONE,
                    terrain: TerrainType[c.terrain] || TerrainType.GRASS 
                })) 
            });
        }
        setIsGenerating(false);
    };

    const handleCanvasClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - canvasRef.current.width / 2;
        const y = e.clientY - rect.top - canvasRef.current.height / 2;
        const q = Math.round(2/3 * x / 25);
        const r = Math.round((-1/3 * x + Math.sqrt(3)/3 * y) / 25);
        setSelectedQ(q); setSelectedR(r);
        const newCells = [...(map.cells || [])];
        const cellIdx = newCells.findIndex(c => c.q === q && c.r === r);
        if (cellIdx !== -1) {
            newCells[cellIdx] = { ...newCells[cellIdx], terrain: activeTerrain, poiType: activePoi === 'NONE' ? undefined : activePoi };
        } else {
            newCells.push({ q, r, terrain: activeTerrain, poiType: activePoi === 'NONE' ? undefined : activePoi, isExplored: true, isVisible: true, weather: WeatherType.NONE });
        }
        onUpdate({ ...map, cells: newCells });
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row bg-[#0a0d14]">
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                <canvas ref={canvasRef} width={1200} height={800} onClick={handleCanvasClick} className="bg-black/60 rounded-[3rem] border border-white/5 cursor-crosshair w-full h-full object-contain" />
                <div className="absolute top-10 left-10 pointer-events-none">
                    <h2 className="text-4xl font-serif font-black text-white/20 uppercase tracking-tighter">{map.name}</h2>
                </div>
            </div>
            <aside className="w-full lg:w-96 bg-slate-900 border-l border-white/5 p-8 space-y-8 flex flex-col shadow-2xl">
                <AIArchitectPanel type="2D" isGenerating={isGenerating} onGenerate={handleAIGenerate} />
                <div className="bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
                    <span className="text-[9px] font-black text-blue-500 uppercase block mb-4 tracking-widest">Hex Inspector</span>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[7px] text-slate-600 uppercase font-black">Axial Q</label>
                            <div className="text-xl font-mono text-white font-black">{selectedQ}</div>
                        </div>
                        <div>
                            <label className="text-[7px] text-slate-600 uppercase font-black">Axial R</label>
                            <div className="text-xl font-mono text-white font-black">{selectedR}</div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
};

// --- 3D BATTLE FORGE ---

const BattleEditor3D = ({ map, onUpdate }) => {
    const [brushHeight, setBrushHeight] = useState(1);
    const [activeVoxel, setActiveVoxel] = useState(TerrainType.STONE_FLOOR);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAIGenerate = async (params) => {
        setIsGenerating(true);
        const result = await GeminiService.generateMapStructure('3D', params);
        if (result && result.cells) {
            onUpdate({ 
                ...map, 
                name: result.mapName || map.name,
                battleCells: result.cells.map(c => ({ 
                    ...c, 
                    offsetY: 0, 
                    color: TERRAIN_COLORS[c.terrain] || '#555', 
                    isObstacle: false, blocksSight: false, movementCost: 1, 
                    textureUrl: ASSETS.TERRAIN[c.terrain] || '' 
                })) 
            });
        }
        setIsGenerating(false);
    };

    const handleBlockAction = (x, z) => {
        const newBattleCells = map.battleCells ? [...map.battleCells] : [];
        const idx = newBattleCells.findIndex(c => c.x === x && c.z === z);
        if (idx !== -1) {
            newBattleCells[idx] = { ...newBattleCells[idx], height: brushHeight, terrain: activeVoxel, color: TERRAIN_COLORS[activeVoxel] };
        } else {
            newBattleCells.push({ x, z, height: brushHeight, offsetY: 0, terrain: activeVoxel, color: TERRAIN_COLORS[activeVoxel], isObstacle: false, blocksSight: false, movementCost: 1, textureUrl: ASSETS.TERRAIN[activeVoxel] || '' });
        }
        onUpdate({ ...map, battleCells: newBattleCells });
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row bg-[#020617]">
            <div className="flex-1 relative overflow-hidden">
                <Canvas shadows camera={{ position: [12, 12, 12], fov: 35 }}>
                    <color attach="background" args={["#020617"]} />
                    <ambientLight intensity={1.2} />
                    <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
                    <OrbitControls makeDefault />
                    {map.battleCells?.map(cell => (
                        <group key={`${cell.x},${cell.z}`} position={[cell.x, (cell.height || 1)/2, cell.z]} onClick={() => handleBlockAction(cell.x, cell.z)}>
                            <mesh castShadow receiveShadow>
                                <boxGeometry args={[0.96, cell.height || 1, 0.96]} />
                                <meshStandardMaterial color={TERRAIN_COLORS[cell.terrain] || '#555'} roughness={1} />
                            </mesh>
                        </group>
                    ))}
                    <ContactShadows opacity={0.4} scale={20} blur={2} />
                    <gridHelper args={[20, 20, 0x1e293b, 0x0f172a]} />
                </Canvas>
                <div className="absolute top-10 left-10 pointer-events-none">
                    <h2 className="text-4xl font-serif font-black text-white/10 uppercase tracking-tighter">{map.name}</h2>
                </div>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 p-6 rounded-3xl flex items-center gap-6 border border-white/10 backdrop-blur-xl shadow-2xl z-30">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center"><span className="text-[8px] text-slate-500 font-black uppercase">Sculpt height</span><span className="text-[10px] text-amber-500 font-mono font-bold">{brushHeight.toFixed(1)}</span></div>
                        <input type="range" min="0.2" max="6" step="0.2" value={brushHeight} onChange={e => setBrushHeight(parseFloat(e.target.value))} className="w-40 h-1 appearance-none bg-slate-800 rounded-lg cursor-pointer accent-amber-500" />
                    </div>
                </div>
            </div>
            <aside className="w-full lg:w-96 bg-slate-900 border-l border-white/5 p-8 flex flex-col shadow-2xl space-y-8">
                <AIArchitectPanel type="3D" isGenerating={isGenerating} onGenerate={handleAIGenerate} />
                <div className="space-y-4">
                    <button onClick={() => {
                        const cells = []; for(let x=0; x<12; x++) for(let z=0; z<12; z++) cells.push({ x, z, height: 1, terrain: TerrainType.STONE_FLOOR, color: TERRAIN_COLORS[TerrainType.STONE_FLOOR] });
                        onUpdate({ ...map, battleCells: cells });
                    }} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">Generate Grid (12x12)</button>
                    <button onClick={() => onUpdate({ ...map, battleCells: [] })} className="w-full bg-red-950/20 text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-900/30 transition-all border border-red-900/10">Clear Arena</button>
                </div>
            </aside>
        </div>
    );
};

// --- CATALOG VIEW ---

const CatalogView = () => {
    const { items: customItems, enemies: customEnemies } = useContentStore();
    const [viewTab, setViewTab] = useState<'ITEMS' | 'CLASSES' | 'ENEMIES'>('ITEMS');
    return (
        <div className="p-8 lg:p-12 space-y-10 animate-in fade-in duration-500 overflow-y-auto max-h-full custom-scrollbar">
            <div className="flex gap-4 border-b border-white/5 pb-4">
                {['ITEMS', 'CLASSES', 'ENEMIES'].map(t => (
                    <button key={t} onClick={() => setViewTab(t)} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewTab === t ? 'bg-white text-black shadow-xl scale-105' : 'text-slate-500 hover:text-white'}`}>{t}</button>
                ))}
            </div>
            {viewTab === 'CLASSES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {Object.entries(CLASS_CONFIG).map(([id, cfg]) => (
                        <div key={id} className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5 flex gap-6 items-center group hover:bg-slate-800 transition-all">
                            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center p-2 border border-white/10 shrink-0 shadow-2xl relative overflow-hidden">
                                <img src={AssetManager.getSafeSprite(cfg.icon)} className="pixelated w-full h-full object-contain relative z-10" />
                                <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-xl font-black text-white uppercase tracking-tighter truncate">{id}</h4>
                                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest opacity-80">{cfg.archetype}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {viewTab === 'ITEMS' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {Object.values(CORE_ITEMS).map(item => (
                        <div key={item.id} className="bg-black/40 p-5 rounded-3xl border border-amber-500/20 text-center relative overflow-hidden group hover:border-amber-400 transition-all">
                             <div className="absolute top-0 right-0 bg-amber-500 text-black text-[6px] px-2 py-0.5 font-black uppercase tracking-tighter rounded-bl-lg">Core</div>
                             <div className="w-12 h-12 bg-slate-900/50 rounded-xl mx-auto mb-4 flex items-center justify-center p-2 border border-white/5">
                                <img src={AssetManager.getSafeSprite(item.icon)} className="w-full h-full object-contain invert opacity-60 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <div className="text-[10px] font-black text-slate-200 truncate uppercase tracking-tighter">{item.name}</div>
                        </div>
                    ))}
                    {Object.values(customItems).map(item => (
                        <div key={item.id} className="bg-black/40 p-5 rounded-3xl border border-blue-500/20 text-center group hover:border-blue-400 transition-all">
                             <div className="w-12 h-12 bg-slate-900/50 rounded-xl mx-auto mb-4 flex items-center justify-center p-2 border border-white/5">
                                <img src={AssetManager.getSafeSprite(item.icon)} className="w-full h-full object-contain invert opacity-60 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <div className="text-[10px] font-black text-slate-200 truncate uppercase tracking-tighter">{item.name}</div>
                        </div>
                    ))}
                </div>
            )}
            {viewTab === 'ENEMIES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {Object.values(customEnemies).map(mob => (
                        <div key={mob.id} className="bg-slate-900/60 p-5 rounded-3xl border border-red-500/20 flex gap-4 items-center group hover:border-red-500 transition-all">
                            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center border border-white/10 shrink-0 overflow-hidden shadow-xl">
                                <img src={AssetManager.getSafeSprite(mob.sprite)} className="w-12 h-12 object-contain pixelated group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-sm font-black text-white uppercase tracking-tighter truncate">{mob.name}</h4>
                                <div className="flex gap-3 mt-1">
                                    <span className="text-[8px] text-red-400 font-black uppercase">HP {mob.hp}</span>
                                    <span className="text-[8px] text-blue-400 font-black uppercase">AC {mob.ac}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN WRAPPER ---

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('WORLD_FORGE');
    const { maps, updateMap, createMap, fetchContentFromCloud, publishContentToCloud, isLoading } = useContentStore();
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const setAdminMode = useGameStore(s => s.setAdminMode);

    useEffect(() => { fetchContentFromCloud(); }, []);

    const handleNewMap = (type: 'TOWN' | 'DUNGEON' | 'BATTLE_ARENA') => {
        const id = `asset_${Date.now()}`;
        const name = `New ${type.replace('_', ' ')} ${Object.keys(maps).length + 1}`;
        if (type === 'BATTLE_ARENA') createMap({ id, name, type, battleCells: [], width: 12, height: 12 });
        else createMap({ id, name, type, cells: [], width: 20, height: 20 });
        setSelectedMapId(id);
    };

    return (
        <div className="fixed inset-0 bg-[#020617] text-slate-200 flex flex-col lg:flex-row overflow-hidden font-sans select-none z-[1000]">
            <aside className="hidden lg:flex w-72 bg-black/60 border-r border-white/5 flex-col shrink-0 backdrop-blur-3xl shadow-2xl relative z-50">
                <div className="p-10 border-b border-white/5 flex flex-col gap-1">
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Eternum</h1>
                    <p className="text-[9px] text-amber-500 font-black uppercase tracking-[0.4em] opacity-60">Engine v2.1</p>
                </div>
                <nav className="flex-1 p-6 space-y-1">
                    <TabButton active={activeTab === 'WORLD_FORGE'} onClick={() => { setActiveTab('WORLD_FORGE'); setSelectedMapId(null); }} icon="🗺️" label="World Forge 2D" />
                    <TabButton active={activeTab === 'BATTLE_FORGE'} onClick={() => { setActiveTab('BATTLE_FORGE'); setSelectedMapId(null); }} icon="⚔️" label="Battle Forge 3D" />
                    <TabButton active={activeTab === 'CATALOG'} onClick={() => setActiveTab('CATALOG')} icon="📜" label="The Catalog" />
                </nav>
                <div className="p-8 space-y-4">
                    <button onClick={publishContentToCloud} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all disabled:opacity-30 border-b-4 border-blue-800">
                         {isLoading ? 'SYNCING...' : 'Commit Changes'}
                    </button>
                    <button onClick={() => setAdminMode(false)} className="w-full bg-slate-900 text-slate-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-red-400 border border-white/5 transition-all">Exit Engine</button>
                </div>
            </aside>
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <header className="h-20 lg:h-24 bg-black/40 border-b border-white/5 flex items-center justify-between px-10 backdrop-blur-md shrink-0 z-40 shadow-lg">
                    <div className="flex items-center gap-10">
                         <div className="flex flex-col">
                            <h2 className="text-sm lg:text-xl font-black text-white uppercase tracking-tighter">{activeTab.replace('_', ' ')}</h2>
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Master Instance</p>
                         </div>
                         {activeTab !== 'CATALOG' && (
                             <select value={selectedMapId || ''} onChange={e => setSelectedMapId(e.target.value)} className="bg-black/60 border border-white/10 rounded-xl px-6 py-3 text-[10px] font-black text-slate-200 outline-none w-64 focus:border-amber-500 appearance-none transition-all">
                                <option value="">-- Select Asset --</option>
                                {Object.values(maps).filter(m => (activeTab === 'WORLD_FORGE' && (m.type === 'TOWN' || m.type === 'DUNGEON')) || (activeTab === 'BATTLE_FORGE' && m.type === 'BATTLE_ARENA')).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                             </select>
                         )}
                    </div>
                </header>
                <div className="flex-1 overflow-hidden flex flex-col relative">
                    {activeTab === 'WORLD_FORGE' && selectedMapId && maps[selectedMapId] && <WorldEditor2D map={maps[selectedMapId]} onUpdate={(m) => updateMap(m.id, m)} />}
                    {activeTab === 'BATTLE_FORGE' && selectedMapId && maps[selectedMapId] && <BattleEditor3D map={maps[selectedMapId]} onUpdate={(m) => updateMap(m.id, m)} />}
                    {activeTab === 'CATALOG' && <CatalogView />}
                </div>
            </main>
        </div>
    );
};
