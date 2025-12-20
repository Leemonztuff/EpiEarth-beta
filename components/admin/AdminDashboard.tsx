
import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useContentStore, CustomMap } from '../../store/contentStore';
import { useGameStore } from '../../store/gameStore';
import { 
    Item, TerrainType, HexCell, WeatherType, HexDecoration, DialogueNode
} from '../../types';
import { TERRAIN_COLORS, ASSETS } from '../../constants';
import { AssetManager } from '../../services/AssetManager';

// --- MOBILE OPTIMIZED UI COMPONENTS ---

const MobileDock = ({ activeTab, onTabChange, tabs }: any) => (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/90 backdrop-blur-xl border-t border-white/10 px-2 pb-safe pt-2 flex justify-around lg:hidden">
        {tabs.map((tab: any) => (
            <button 
                key={tab.id} 
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === tab.id ? 'text-amber-400' : 'text-slate-500'}`}
            >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest">{tab.label.split(' ')[0]}</span>
            </button>
        ))}
    </div>
);

const FloatingToolGroup = ({ children, title, position = "top-4 left-4" }: any) => (
    <div className={`absolute ${position} z-20 flex flex-col gap-2`}>
        {title && <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">{title}</div>}
        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 flex flex-col gap-1 shadow-2xl">
            {children}
        </div>
    </div>
);

const IconButton = ({ active, onClick, icon, label, color = "amber" }: any) => (
    <button 
        onClick={onClick}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all relative group active:scale-90 ${active ? `bg-${color}-600 text-white shadow-lg` : 'bg-black/40 text-slate-400 hover:text-white'}`}
    >
        <span className="text-xl">{icon}</span>
        {label && <div className="absolute left-14 bg-black/90 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10">{label}</div>}
    </button>
);

// --- 3D VOXEL ENGINE (OPTIMIZED) ---

const VoxelBlock = ({ cell, onAction, brushType }: any) => {
    const texture = useMemo(() => AssetManager.getTexture(ASSETS.TERRAIN[cell.terrain]), [cell.terrain]);
    const height = cell.height || 1;
    
    return (
        <group position={[cell.q * 1.5, height / 2, (cell.r + cell.q / 2) * Math.sqrt(3)]}>
            <mesh 
                onClick={(e) => { e.stopPropagation(); onAction(cell); }}
                onPointerDown={(e) => { e.stopPropagation(); }}
                castShadow receiveShadow
            >
                <boxGeometry args={[0.98, height, 0.98]} />
                <meshStandardMaterial map={texture} roughness={1} />
            </mesh>
            {cell.decorations?.map((deco: HexDecoration, i: number) => (
                <Billboard key={i} position={[0, height/2 + deco.offsetY, 0]}>
                    <mesh>
                        <planeGeometry args={[1 * deco.scale, 1 * deco.scale]} />
                        <meshBasicMaterial map={AssetManager.getTexture(deco.assetPath)} transparent alphaTest={0.5} />
                    </mesh>
                </Billboard>
            ))}
        </group>
    );
};

const SceneEditor3D = ({ map, onUpdate }: { map: CustomMap, onUpdate: (m: CustomMap) => void }) => {
    const [brushMode, setBrushMode] = useState<'TERRAIN' | 'HEIGHT' | 'DECO'>('HEIGHT');
    const [polarity, setPolarity] = useState<1 | -1>(1); // 1 = Add/Raise, -1 = Remove/Lower
    const [isOrbitEnabled, setIsOrbitEnabled] = useState(true);
    const [activeTerrain, setActiveTerrain] = useState<TerrainType>(TerrainType.COBBLESTONE);
    const [activeDeco, setActiveDeco] = useState<string>('scenery/monolith.png');
    const [showPalette, setShowPalette] = useState(false);

    const handleCellAction = (cell: HexCell) => {
        // En móviles, si la órbita está encendida, ignoramos la edición para evitar toques accidentales al rotar
        if (isOrbitEnabled && window.innerWidth < 1024) return;

        const newCells = [...map.cells];
        const idx = newCells.findIndex(c => c.q === cell.q && c.r === cell.r);
        if (idx === -1) return;

        const updated = { ...newCells[idx] };

        if (brushMode === 'HEIGHT') {
            const currentHeight = updated.height || 1;
            updated.height = Math.max(0.2, currentHeight + (0.5 * polarity));
        } else if (brushMode === 'TERRAIN') {
            updated.terrain = activeTerrain;
        } else if (brushMode === 'DECO') {
            if (polarity === -1) {
                updated.decorations = [];
            } else {
                updated.decorations = [{ assetPath: activeDeco, scale: 1, rotation: 0, offsetY: 0.5 }];
            }
        }

        newCells[idx] = updated;
        onUpdate({ ...map, cells: newCells });
    };

    return (
        <div className="flex-1 relative bg-slate-950 overflow-hidden">
            {/* Viewport Control overlays */}
            <FloatingToolGroup title="Tools">
                <IconButton active={brushMode === 'HEIGHT'} onClick={() => setBrushMode('HEIGHT')} icon="⛰️" label="Sculpt Terrain" />
                <IconButton active={brushMode === 'TERRAIN'} onClick={() => setBrushMode('TERRAIN')} icon="🎨" label="Paint Biome" />
                <IconButton active={brushMode === 'DECO'} onClick={() => setBrushMode('DECO')} icon="🌲" label="Stamp Props" />
            </FloatingToolGroup>

            <FloatingToolGroup position="top-4 right-4" title="State">
                <IconButton 
                    active={polarity === 1} 
                    onClick={() => setPolarity(p => p === 1 ? -1 : 1)} 
                    icon={polarity === 1 ? "➕" : "➖"} 
                    label={polarity === 1 ? "Add / Raise" : "Subtract / Lower"}
                    color={polarity === 1 ? "green" : "red"}
                />
                <IconButton 
                    active={!isOrbitEnabled} 
                    onClick={() => setIsOrbitEnabled(!isOrbitEnabled)} 
                    icon={isOrbitEnabled ? "🎥" : "✍️"} 
                    label={isOrbitEnabled ? "Camera Mode" : "Sculpt Mode"}
                    color="blue"
                />
            </FloatingToolGroup>

            {/* Bottom Palette Drawer (Mobile Only) */}
            {(brushMode === 'TERRAIN' || brushMode === 'DECO') && (
                <div className="absolute bottom-20 left-4 right-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-72 z-30">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{brushMode} Palette</span>
                        </div>
                        <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                            {brushMode === 'TERRAIN' ? (
                                Object.values(TerrainType).slice(0, 15).map(t => (
                                    <button 
                                        key={t} 
                                        onClick={() => setActiveTerrain(t)} 
                                        className={`aspect-square rounded-lg border-2 transition-all ${activeTerrain === t ? 'border-white scale-110' : 'border-transparent opacity-50'}`}
                                        style={{ backgroundColor: TERRAIN_COLORS[t] }}
                                    />
                                ))
                            ) : (
                                ['scenery/monolith.png', 'terrain/forest/pine-tile.png', 'terrain/village/human-cottage.png', 'items/gem-large-blue.png', 'terrain/castle/ruin.png'].map(path => (
                                    <button 
                                        key={path} 
                                        onClick={() => setActiveDeco(path)} 
                                        className={`aspect-square bg-black/40 rounded-lg border-2 flex items-center justify-center p-1 ${activeDeco === path ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 opacity-50'}`}
                                    >
                                        <img src={AssetManager.getSafeSprite(path)} className="w-full h-full object-contain invert" />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Canvas shadows camera={{ position: [15, 15, 15], fov: 40 }}>
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 20, 10]} intensity={1.5} castShadow />
                <OrbitControls enabled={isOrbitEnabled} makeDefault />
                <Suspense fallback={null}>
                    {map.cells.map(cell => (
                        <VoxelBlock 
                            key={`${cell.q},${cell.r}`} 
                            cell={cell} 
                            onAction={handleCellAction}
                            brushType={brushMode}
                        />
                    ))}
                </Suspense>
                <gridHelper args={[30, 30, 0x444444, 0x222222]} />
            </Canvas>
        </div>
    );
};

// --- MAIN DASHBOARD LAYOUT ---

const ADMIN_TABS = [
    { id: 'DASHBOARD', label: 'Overview', icon: '📊' },
    { id: 'SCENES', label: '3D Builder', icon: '🏗️' },
    { id: 'ITEMS', label: 'Artifacts', icon: '⚔️' },
    { id: 'SYNC', label: 'Cloud Flux', icon: '☁️' }
];

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('DASHBOARD');
    const { maps, updateMap, createMap } = useContentStore();
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const setAdminMode = useGameStore(s => s.setAdminMode);

    const handleNewMap = () => {
        const id = `scene_${Date.now()}`;
        const cells: HexCell[] = [];
        const r = 5;
        for(let q=-r; q<=r; q++) {
            for(let r2=-r; r2<=r; r2++) {
                if (Math.abs(q) + Math.abs(r2) + Math.abs(-q-r2) <= r*2) {
                    cells.push({ q, r: r2, terrain: TerrainType.STONE_FLOOR, height: 1, weather: WeatherType.NONE, isExplored: true, isVisible: true, decorations: [] });
                }
            }
        }
        createMap({ id, name: 'New Tactical Arena', type: 'DUNGEON', width: 10, height: 10, cells });
        setSelectedMapId(id);
    };

    return (
        <div className="fixed inset-0 bg-[#020617] text-slate-200 flex flex-col lg:flex-row overflow-hidden font-sans">
            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex w-72 bg-slate-950 border-r border-white/5 flex-col shrink-0">
                <div className="p-8 border-b border-white/5">
                    <h1 className="text-xl font-black uppercase tracking-tighter text-white">Earth Master</h1>
                    <p className="text-[9px] text-amber-500 font-bold uppercase tracking-[0.3em]">Game Engine Pro</p>
                </div>
                <nav className="flex-1 p-6 space-y-2">
                    {ADMIN_TABS.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-4 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-amber-600/10 text-amber-400 border border-amber-600/20' : 'text-slate-400 hover:bg-white/5'}`}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            <span className="uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="p-6">
                    <button onClick={() => setAdminMode(false)} className="w-full bg-slate-900 text-slate-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-white/5">Exit Engine</button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Responsive Header */}
                <header className="h-16 lg:h-20 bg-slate-950/50 border-b border-white/5 flex items-center justify-between px-6 shrink-0 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="lg:hidden w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-sm shadow-lg shadow-amber-900/40">⚒️</div>
                        <h2 className="text-sm lg:text-xl font-black text-white uppercase tracking-tighter">{ADMIN_TABS.find(t => t.id === activeTab)?.label}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">LIVE_DB_READY</span>
                    </div>
                </header>

                {/* Dynamic Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'DASHBOARD' && <DashboardOverview changeTab={setActiveTab} />}
                    {activeTab === 'SCENES' && (
                        <div className="h-full flex flex-col">
                            <div className="p-4 lg:p-6 bg-slate-900/30 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 border-b border-white/5">
                                <div className="flex gap-4 items-center w-full sm:w-auto">
                                    <select 
                                        value={selectedMapId || ''} 
                                        onChange={e => setSelectedMapId(e.target.value)}
                                        className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none w-full sm:w-64 focus:border-amber-500/50"
                                    >
                                        <option value="">Load Project...</option>
                                        {/* Added explicit typing to m to fix property 'id' error on type 'unknown' */}
                                        {Object.values(maps).map((m: CustomMap) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <button onClick={handleNewMap} className="bg-amber-600 hover:bg-amber-500 w-12 h-12 sm:w-auto sm:px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all shrink-0">
                                        <span className="hidden sm:inline">+ Create Arena</span>
                                        <span className="sm:hidden text-xl">+</span>
                                    </button>
                                </div>
                            </div>
                            {selectedMapId && maps[selectedMapId] ? (
                                <SceneEditor3D map={maps[selectedMapId]} onUpdate={(m) => updateMap(m.id, m)} />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-700 bg-black/20 p-12 text-center">
                                    <span className="text-8xl mb-6 opacity-10">🏟️</span>
                                    <h3 className="text-xs font-black uppercase tracking-[0.4em] opacity-40 max-w-xs">Select or Initialize a Tactical Dimension to Begin</h3>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'ITEMS' && <ItemCatalogView />}
                    {activeTab === 'SYNC' && <CloudSyncView />}
                </div>
            </main>

            {/* Mobile Navigation */}
            <MobileDock activeTab={activeTab} onTabChange={setActiveTab} tabs={ADMIN_TABS} />
        </div>
    );
};

// --- SUBVIEWS ---

const DashboardOverview = ({ changeTab }: any) => {
    const { items, enemies, maps } = useContentStore();
    const stats = [
        { label: 'Blueprints', count: Object.keys(maps).length, icon: '🏗️', tab: 'SCENES', color: 'amber' },
        { label: 'Artifacts', count: Object.keys(items).length, icon: '⚔️', tab: 'ITEMS', color: 'blue' },
        { label: 'Threats', count: Object.keys(enemies).length, icon: '👾', tab: 'UNITS', color: 'red' }
    ];
    
    return (
        <div className="p-6 lg:p-12 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8">
            {stats.map(s => (
                <button 
                    key={s.label} 
                    onClick={() => changeTab(s.tab)}
                    className="group bg-slate-900/40 p-8 lg:p-10 rounded-[2.5rem] border border-white/5 text-left hover:bg-slate-800/60 transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-black"
                >
                    <div className="text-5xl mb-6 grayscale group-hover:grayscale-0 transition-all duration-500">{s.icon}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{s.label}</div>
                    <div className="text-5xl font-black text-white">{s.count}</div>
                </button>
            ))}
        </div>
    );
};

const ItemCatalogView = () => {
    const items = useContentStore(s => s.items);
    return (
        <div className="p-6 lg:p-12 space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Added explicit typing to item to fix property errors on type 'unknown' */}
                {Object.values(items).map((item: Item) => (
                    <div key={item.id} className="bg-slate-900/60 p-4 rounded-3xl border border-white/5 flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center p-2 border border-white/10">
                            <img src={AssetManager.getSafeSprite(item.icon)} className="w-full h-full object-contain invert" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tighter truncate w-full">{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CloudSyncView = () => {
    const { fetchContentFromCloud, publishContentToCloud, isLoading } = useContentStore();
    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-slate-900/50 p-10 lg:p-20 rounded-[3rem] border border-white/5 max-w-2xl w-full text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                <div className="relative z-10">
                    <div className="text-7xl mb-8">☁️</div>
                    <h3 className="text-3xl font-serif font-black text-white mb-4 uppercase tracking-widest">Dimension Flux</h3>
                    <p className="text-slate-500 text-sm mb-12 max-w-md mx-auto uppercase tracking-tighter font-bold leading-relaxed">Synchronize local blueprints and item definitions with the global database shard.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={fetchContentFromCloud} disabled={isLoading} className="px-10 py-5 bg-slate-800 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all border border-white/5">Pull Reality</button>
                        <button onClick={publishContentToCloud} disabled={isLoading} className="px-10 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-900/40 hover:bg-blue-500 transition-all">{isLoading ? 'Syncing...' : 'Push Existence'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
