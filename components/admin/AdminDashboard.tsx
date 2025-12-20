
import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useContentStore, CustomMap } from '../../store/contentStore';
import { useGameStore } from '../../store/gameStore';
import { 
    Item, ItemRarity, TerrainType, EnemyDefinition, HexCell, WeatherType, NPCEntity, HexDecoration, DialogueNode, DialogueOption
} from '../../types';
import { RARITY_COLORS, TERRAIN_COLORS, ASSETS } from '../../constants';
import { uploadAsset } from '../../services/supabaseClient';
import { AssetManager } from '../../services/AssetManager';

// --- UI COMPONENTS ---

const AdminCard = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <div className={`bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-xl ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, subtitle, icon }: { title: string, subtitle?: string, icon?: string }) => (
    <div className="mb-6 flex items-center gap-4">
        {icon && <span className="text-3xl">{icon}</span>}
        <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{subtitle}</p>}
        </div>
    </div>
);

const FormInput = ({ label, ...props }: any) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">{label}</label>
        <input {...props} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-amber-500/50 transition-all" />
    </div>
);

// --- 3D EDITOR ENGINE ---

const VoxelBlock = ({ cell, onAction, brushType }: any) => {
    const texture = useMemo(() => AssetManager.getTexture(ASSETS.TERRAIN[cell.terrain]), [cell.terrain]);
    const height = cell.height || 1;
    const yPos = height / 2;

    // Axial to pixel coords
    const px = cell.q * 1.5;
    const pz = (cell.r + cell.q / 2) * Math.sqrt(3);

    return (
        <group position={[px, yPos, pz]}>
            <mesh 
                onClick={(e) => { e.stopPropagation(); onAction(cell, false); }}
                onContextMenu={(e) => { e.stopPropagation(); e.nativeEvent.preventDefault(); onAction(cell, true); }}
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
    const [activeTerrain, setActiveTerrain] = useState<TerrainType>(TerrainType.COBBLESTONE);
    const [activeDeco, setActiveDeco] = useState<string>('scenery/monolith.png');

    const handleCellAction = (cell: HexCell, secondary = false) => {
        const newCells = [...map.cells];
        const idx = newCells.findIndex(c => c.q === cell.q && c.r === cell.r);
        if (idx === -1) return;

        const updated = { ...newCells[idx] };

        if (brushMode === 'HEIGHT') {
            const currentHeight = updated.height || 1;
            updated.height = Math.max(0.2, currentHeight + (secondary ? -0.5 : 0.5));
        } else if (brushMode === 'TERRAIN') {
            updated.terrain = activeTerrain;
        } else if (brushMode === 'DECO') {
            if (secondary) {
                updated.decorations = [];
            } else {
                updated.decorations = [{ assetPath: activeDeco, scale: 1, rotation: 0, offsetY: 0.5 }];
            }
        }

        newCells[idx] = updated;
        onUpdate({ ...map, cells: newCells });
    };

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* 3D Viewport */}
                <AdminCard className="lg:col-span-9 relative bg-black/80 h-[500px] lg:h-auto border-amber-500/20">
                    <Canvas shadows camera={{ position: [12, 12, 12], fov: 40 }}>
                        <ambientLight intensity={0.7} />
                        <pointLight position={[10, 20, 10]} intensity={1.5} castShadow />
                        <OrbitControls makeDefault />
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
                        <gridHelper args={[30, 30, 0x444444, 0x222222]} position={[0, -0.01, 0]} />
                    </Canvas>
                    
                    {/* Control Legend */}
                    <div className="absolute bottom-4 left-4 flex gap-4">
                         <div className="bg-black/80 px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-black uppercase text-slate-400">
                             <span className="text-amber-500">LMB:</span> Apply Action
                         </div>
                         <div className="bg-black/80 px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-black uppercase text-slate-400">
                             <span className="text-amber-500">RMB:</span> Negative / Erase
                         </div>
                    </div>

                    <div className="absolute top-4 left-4 bg-black/80 px-4 py-2 rounded-xl border border-amber-500/30">
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Active Reality: {map.name}</span>
                    </div>
                </AdminCard>

                {/* Toolbox */}
                <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    <AdminCard className="p-6 space-y-6">
                        <SectionHeader title="Construct" subtitle="Scene Tools" />
                        
                        <div className="flex bg-black/40 p-1 rounded-xl">
                            {(['HEIGHT', 'TERRAIN', 'DECO'] as const).map(m => (
                                <button key={m} onClick={() => setBrushMode(m)} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${brushMode === m ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{m}</button>
                            ))}
                        </div>

                        {brushMode === 'TERRAIN' && (
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Biome Palette</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.values(TerrainType).slice(0, 16).map(t => (
                                        <button key={t} onClick={() => setActiveTerrain(t)} className={`aspect-square rounded-lg border-2 transition-all ${activeTerrain === t ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-70'}`} style={{ backgroundColor: TERRAIN_COLORS[t] }} title={t} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {brushMode === 'DECO' && (
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Stamp</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['scenery/monolith.png', 'terrain/forest/pine-tile.png', 'terrain/village/human-cottage.png', 'items/gem-large-blue.png', 'scenery/summoning-center.png', 'terrain/castle/ruin.png'].map(path => (
                                        <button key={path} onClick={() => setActiveDeco(path)} className={`aspect-square bg-black/40 rounded-xl border-2 flex items-center justify-center p-2 transition-all group ${activeDeco === path ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 opacity-50 hover:opacity-100'}`}>
                                            <img src={AssetManager.getSafeSprite(path)} className="w-full h-full object-contain invert group-hover:scale-110 transition-transform" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {brushMode === 'HEIGHT' && (
                            <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 text-[10px] text-amber-200/60 leading-relaxed font-bold uppercase italic tracking-tighter">
                                "Click to EXTRUDE heights. Create vantage points for archers or pits for the unwary."
                            </div>
                        )}
                    </AdminCard>

                    <AdminCard className="p-4">
                        <button onClick={() => {}} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] py-3 rounded-xl tracking-widest shadow-xl transition-all">Export Blueprint</button>
                    </AdminCard>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD TABS ---

const TABS = [
    { id: 'DASHBOARD', label: 'Overview', icon: '📊' },
    { id: 'SCENES', label: 'Builder 3D', icon: '🏗️' },
    { id: 'ITEMS', label: 'Artifacts', icon: '⚔️' },
    { id: 'UNITS', label: 'Bestiary', icon: '💀' },
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
        const radius = 6;
        for(let q = -radius; q <= radius; q++) {
            for(let r = -radius; r <= radius; r++) {
                if (Math.abs(q) + Math.abs(r) + Math.abs(-q - r) <= radius * 2) {
                    cells.push({ q, r, terrain: TerrainType.STONE_FLOOR, height: 1, weather: WeatherType.NONE, isExplored: true, isVisible: true, decorations: [] });
                }
            }
        }
        createMap({ id, name: 'Arena Táctica', type: 'DUNGEON', width: radius * 2, height: radius * 2, cells });
        setSelectedMapId(id);
    };

    return (
        <div className="flex h-screen w-screen bg-[#020617] text-slate-200 font-sans overflow-hidden">
             <aside className="w-72 bg-slate-950/80 backdrop-blur-2xl border-r border-white/5 flex flex-col">
                <div className="p-8 border-b border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">⚒️</div>
                    <div>
                        <h1 className="font-serif text-lg text-white font-black leading-none uppercase">Architect</h1>
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black mt-1">Epic Earth Core</p>
                    </div>
                </div>
                <nav className="flex-1 p-6 space-y-1">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-xs font-bold transition-all relative ${activeTab === tab.id ? 'bg-amber-500/10 text-amber-400' : 'text-slate-400 hover:bg-white/5'}`}>
                            <span className="text-lg">{tab.icon}</span>
                            <span className="tracking-wide uppercase font-black">{tab.label}</span>
                            {activeTab === tab.id && <div className="absolute left-0 w-1.5 h-6 bg-amber-500 rounded-r-full" />}
                        </button>
                    ))}
                </nav>
                <div className="p-6 border-t border-white/5">
                    <button onClick={() => setAdminMode(false)} className="w-full bg-slate-900 border border-white/10 text-slate-400 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">← Return to Reality</button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-20 bg-slate-950/20 border-b border-white/5 flex items-center px-8 justify-between shrink-0 backdrop-blur-md">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{TABS.find(t => t.id === activeTab)?.label}</h2>
                    <div className="flex items-center gap-4">
                         <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[8px] text-green-400 font-black uppercase tracking-widest">Logic Engine Online</span>
                         </div>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'DASHBOARD' && <DashboardHome changeTab={setActiveTab} />}
                    {activeTab === 'SCENES' && (
                        <div className="h-full flex flex-col gap-6">
                            <div className="flex gap-4 items-center bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                                <select 
                                    value={selectedMapId || ''} 
                                    onChange={e => setSelectedMapId(e.target.value)}
                                    className="bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-amber-500/50"
                                >
                                    <option value="">Select Tactical Blueprint...</option>
                                    {(Object.values(maps) as CustomMap[]).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <button onClick={handleNewMap} className="bg-amber-600 hover:bg-amber-500 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all">+ New Arena</button>
                            </div>
                            {selectedMapId && maps[selectedMapId] ? (
                                <SceneEditor3D map={maps[selectedMapId]} onUpdate={(m) => updateMap(m.id, m)} />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-slate-700 bg-white/2">
                                    <span className="text-6xl mb-4 opacity-10">🏛️</span>
                                    <p className="font-black uppercase text-xs tracking-[0.4em] opacity-40">Initialize Scene to Begin</p>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'ITEMS' && <ItemEditorPro />}
                    {activeTab === 'UNITS' && <UnitEditorPro />}
                    {activeTab === 'SYNC' && <SyncCenterPro />}
                </div>
            </main>
        </div>
    );
};

// --- SIMPLIFIED TABS FOR INTEGRATION ---

const DashboardHome = ({ changeTab }: any) => {
    const { items, enemies, maps } = useContentStore();
    const stats = [
        { label: 'Artifacts', count: Object.keys(items).length, icon: '⚔️', tab: 'ITEMS' },
        { label: 'Threats', count: Object.keys(enemies).length, icon: '👾', tab: 'UNITS' },
        { label: 'Blueprints', count: Object.keys(maps).length, icon: '🏗️', tab: 'SCENES' }
    ];
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map(s => (
                <button key={s.label} onClick={() => changeTab(s.tab)} className="bg-slate-900/40 p-10 rounded-3xl border border-white/5 text-left hover:bg-slate-800/60 transition-all hover:-translate-y-1">
                    <div className="text-5xl mb-4">{s.icon}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</div>
                    <div className="text-4xl font-black text-white">{s.count}</div>
                </button>
            ))}
        </div>
    );
};

const ItemEditorPro = () => {
    const items = useContentStore(s => s.items);
    return (
        <AdminCard className="p-8">
            <SectionHeader title="Artifact Registry" subtitle="Item Catalog" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.values(items) as Item[]).map(item => (
                    <div key={item.id} className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center shrink-0">
                            <img src={AssetManager.getSafeSprite(item.icon)} className="w-8 h-8 object-contain invert" />
                        </div>
                        <span className="text-xs font-bold text-white truncate">{item.name}</span>
                    </div>
                ))}
            </div>
        </AdminCard>
    );
};

const UnitEditorPro = () => {
    const enemies = useContentStore(s => s.enemies);
    return (
        <AdminCard className="p-8">
             <SectionHeader title="Threat Analysis" subtitle="Bestiary Database" />
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.values(enemies) as EnemyDefinition[]).map(e => (
                    <div key={e.id} className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                         <div className="w-10 h-10 bg-red-900/20 rounded flex items-center justify-center shrink-0">
                            <img src={AssetManager.getSafeSprite(e.sprite)} className="w-8 h-8 object-contain pixelated" />
                        </div>
                        <span className="text-xs font-bold text-white truncate">{e.name}</span>
                    </div>
                ))}
            </div>
        </AdminCard>
    );
};

const SyncCenterPro = () => {
    const { fetchContentFromCloud, publishContentToCloud, isLoading } = useContentStore();
    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <AdminCard className="p-12 text-center bg-gradient-to-br from-blue-900/20 to-black relative">
                <div className="text-6xl mb-8">☁️</div>
                <h3 className="text-3xl font-serif font-black text-white mb-8 uppercase tracking-widest">Eternum Cloud Sync</h3>
                <div className="flex gap-4 justify-center">
                    <button onClick={fetchContentFromCloud} disabled={isLoading} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Pull Dimensions</button>
                    <button onClick={publishContentToCloud} disabled={isLoading} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-900/40 transition-all">{isLoading ? 'Synchronizing...' : 'Push Reality'}</button>
                </div>
            </AdminCard>
        </div>
    );
};
