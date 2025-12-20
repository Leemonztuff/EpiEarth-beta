import React, { useState, useRef } from 'react';
import { useContentStore } from '../../store/contentStore';
import { Item, ItemRarity, EquipmentSlot, CharacterClass, Ability, TerrainType, CreatureType, EnemyDefinition, Spell, Skill, SpellType, DamageType, MagicSchool } from '../../types';
import { RARITY_COLORS } from '../../constants';
import { uploadAsset } from '../../services/supabaseClient';

const TABS = ['DASHBOARD', 'ITEMS', 'UNITS & SPAWNS', 'SPELLS', 'SKILLS', 'CLASSES', 'MAP CONFIG', 'EXPORT / SYNC'];
const WESNOTH_GITHUB_BASE = "https://raw.githubusercontent.com/wesnoth/wesnoth/master/";

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('DASHBOARD');

    return (
        <div className="flex h-screen w-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
            <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="font-serif text-2xl text-amber-500 font-bold">Epic Admin</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">RPG Maker Toolset</p>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === tab ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={() => window.location.pathname = '/'} className="w-full border border-slate-700 text-slate-400 px-4 py-2 rounded hover:bg-slate-800 hover:text-white transition-colors text-xs uppercase font-bold">
                        ← Back to Game
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-8 justify-between shrink-0">
                    <h2 className="text-xl font-bold text-slate-100">{activeTab}</h2>
                    <div className="flex items-center gap-4">
                        <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs text-green-400 font-mono">SYSTEM ONLINE</span>
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto bg-slate-900 p-8 custom-scrollbar">
                    {activeTab === 'DASHBOARD' && <DashboardHome changeTab={setActiveTab} />}
                    {activeTab === 'ITEMS' && <ItemEditor />}
                    {activeTab === 'UNITS & SPAWNS' && <UnitAndEncounterEditor />}
                    {activeTab === 'SPELLS' && <SpellEditor />}
                    {activeTab === 'SKILLS' && <SkillEditor />}
                    {activeTab === 'CLASSES' && <ClassEditor />}
                    {activeTab === 'MAP CONFIG' && <MapConfigurator />}
                    {activeTab === 'EXPORT / SYNC' && <ExportView />}
                </main>
            </div>
        </div>
    );
};

const DashboardHome = ({ changeTab }: { changeTab: (t: string) => void }) => {
    const { items, enemies, spells, skills, isLoading } = useContentStore();
    const StatCard = ({ title, count, color, tab }: any) => (
        <div onClick={() => changeTab(tab)} className={`bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-${color}-500 cursor-pointer transition-all group`}>
            <h3 className={`text-lg font-bold text-${color}-100 group-hover:text-${color}-400`}>{title}</h3>
            <div className="mt-4 text-3xl font-bold text-slate-200">{count}</div>
        </div>
    );
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Items" count={Object.keys(items).length} color="amber" tab="ITEMS" />
            <StatCard title="Enemies" count={Object.keys(enemies).length} color="red" tab="UNITS & SPAWNS" />
            <StatCard title="Spells" count={Object.keys(spells).length} color="purple" tab="SPELLS" />
            <StatCard title="Skills" count={Object.keys(skills).length} color="blue" tab="SKILLS" />
        </div>
    );
};

const SpellEditor = () => {
    const { spells, updateSpell, createSpell } = useContentStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Spell>>({});
    const handleSelect = (id: string) => { setSelectedId(id); setEditForm({ ...spells[id] }); };
    const handleSave = () => { if (selectedId && editForm.name) { updateSpell(selectedId, editForm as Spell); alert('Spell Saved'); } };
    const handleCreate = () => { const newId = `spell_${Date.now()}`; createSpell({ id: newId, name: 'New Spell', level: 1, range: 5, school: MagicSchool.EVOCATION, type: SpellType.DAMAGE, effects: [], description: '', animation: 'MAGIC', icon: '' }); handleSelect(newId); };
    return (
        <div className="flex gap-6 h-full">
            <div className="w-1/3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center"><span className="font-bold text-purple-400 text-sm">GRIMOIRE</span><button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded text-sm font-bold">+</button></div>
                {/* FIX: Added explicit type casting for map function parameter to resolve "property does not exist on type unknown" errors */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">{Object.values(spells).map((spell: any) => (<div key={spell.id} onClick={() => handleSelect(spell.id)} className={`p-3 rounded cursor-pointer flex items-center gap-3 border ${selectedId === spell.id ? 'bg-slate-800 border-purple-500' : 'bg-transparent border-transparent hover:bg-slate-900'}`}><div className="text-sm font-bold text-slate-200">{spell.name}</div></div>))}</div>
            </div>
            {selectedId && <div className="flex-1 bg-slate-800 p-6 rounded-lg border border-slate-700 overflow-y-auto"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 font-bold uppercase">Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div></div><button onClick={handleSave} className="mt-6 w-full bg-purple-600 py-3 rounded font-bold">SAVE SPELL</button></div>}
        </div>
    );
};

const SkillEditor = () => {
    const { skills, updateSkill, createSkill } = useContentStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Skill>>({});
    const handleSelect = (id: string) => { setSelectedId(id); setEditForm({ ...skills[id] }); };
    const handleSave = () => { if (selectedId && editForm.name) { updateSkill(selectedId, editForm as Skill); alert('Skill Saved'); } };
    const handleCreate = () => { const newId = `skill_${Date.now()}`; createSkill({ id: newId, name: 'New Skill', description: '', staminaCost: 5, cooldown: 3, range: 1, effects: [], icon: '' }); handleSelect(newId); };
    return (
        <div className="flex gap-6 h-full">
            <div className="w-1/3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center"><span className="font-bold text-blue-400 text-sm">TECHNIQUES</span><button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-sm font-bold">+</button></div>
                {/* FIX: Added explicit type casting for map function parameter to resolve "property does not exist on type unknown" errors */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">{Object.values(skills).map((skill: any) => (<div key={skill.id} onClick={() => handleSelect(skill.id)} className={`p-3 rounded cursor-pointer flex items-center gap-3 border ${selectedId === skill.id ? 'bg-slate-800 border-blue-500' : 'bg-transparent border-transparent hover:bg-slate-900'}`}><div className="text-sm font-bold text-slate-200">{skill.name}</div></div>))}</div>
            </div>
            {selectedId && <div className="flex-1 bg-slate-800 p-6 rounded-lg border border-slate-700 overflow-y-auto"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 font-bold uppercase">Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div></div><button onClick={handleSave} className="mt-6 w-full bg-blue-600 py-3 rounded font-bold">SAVE SKILL</button></div>}
        </div>
    );
};

const ItemEditor = () => {
    const { items, updateItem, createItem, deleteItem } = useContentStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Item>>({});
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSelect = (id: string) => { setSelectedId(id); setEditForm({ ...items[id] }); };
    const handleSave = () => { if (selectedId && editForm.name) { updateItem(selectedId, editForm as Item); alert('Item Saved'); } };
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const url = await uploadAsset(file, 'items');
        if (url) setEditForm({ ...editForm, icon: url });
        setUploading(false);
    };

    return (
        <div className="flex gap-6 h-full">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            <div className="w-1/3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center"><span className="text-xs font-bold text-amber-500 uppercase">Items</span></div>
                {/* FIX: Added explicit type casting for map function parameter to resolve "property does not exist on type unknown" errors */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">{Object.values(items).map((item: any) => (<div key={item.id} onClick={() => handleSelect(item.id)} className={`p-3 rounded cursor-pointer flex items-center gap-3 border ${selectedId === item.id ? 'bg-slate-800 border-amber-500' : 'bg-transparent border-transparent hover:bg-slate-900'}`}><img src={item.icon} className="w-6 h-6 object-contain invert" /><div><div className="text-sm font-bold text-slate-200">{item.name}</div></div></div>))}</div>
            </div>
            <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-6 overflow-y-auto custom-scrollbar">
                {selectedId ? (
                    <div className="space-y-6 max-w-xl mx-auto">
                         <div className="bg-slate-900/50 p-4 rounded border border-slate-700 flex flex-col items-center gap-4">
                            <div className="w-24 h-24 bg-black/50 border border-slate-600 rounded flex items-center justify-center relative overflow-hidden">
                                <img src={editForm.icon} className="w-16 h-16 object-contain invert" />
                                {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-4 py-1 rounded font-bold uppercase">Upload Icon</button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Description</label><textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white h-20" /></div>
                        </div>
                        <button onClick={handleSave} className="w-full bg-amber-600 py-3 rounded font-bold hover:bg-amber-500 shadow-lg">SAVE ITEM</button>
                    </div>
                ) : <div className="flex h-full items-center justify-center text-slate-500">Select an item</div>}
            </div>
        </div>
    );
};

const UnitAndEncounterEditor = () => {
    const { enemies, updateEnemy, encounters, updateEncounterTable } = useContentStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<EnemyDefinition>>({});
    const [activeTerrain, setActiveTerrain] = useState<TerrainType>(TerrainType.GRASS);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSelect = (id: string) => { setSelectedId(id); setEditForm({ ...enemies[id] }); };
    const handleSave = () => { if (selectedId && editForm.name) { updateEnemy(selectedId, editForm as EnemyDefinition); alert('Unit Saved'); } };
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const url = await uploadAsset(file, 'enemies');
        if (url) setEditForm({ ...editForm, sprite: url });
        setUploading(false);
    };

    return (
        <div className="flex gap-6 h-full">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            <div className="w-64 bg-slate-950 rounded-lg border border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800"><span className="font-bold text-red-500 text-sm uppercase">Bestiary</span></div>
                {/* FIX: Added explicit type casting for map function parameter to resolve "property does not exist on type unknown" errors */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">{Object.values(enemies).map((enemy: any) => (<div key={enemy.id} onClick={() => handleSelect(enemy.id)} className={`p-2 rounded cursor-pointer flex items-center gap-3 border ${selectedId === enemy.id ? 'bg-slate-800 border-red-500' : 'bg-transparent border-transparent hover:bg-slate-900'}`}><img src={enemy.sprite} className="w-8 h-8 object-contain pixelated" /><div className="text-sm font-bold text-slate-200 truncate">{enemy.name}</div></div>))}</div>
            </div>
            <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-6 overflow-y-auto custom-scrollbar">
                {selectedId ? (
                    <div className="space-y-6 max-w-xl mx-auto">
                        <div className="bg-slate-900/50 p-6 rounded border border-slate-700 flex flex-col items-center gap-4">
                            <div className="w-32 h-32 bg-black/50 border border-slate-600 rounded flex items-center justify-center relative overflow-hidden">
                                <img src={editForm.sprite} className="w-24 h-24 object-contain pixelated" />
                                {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-red-600 hover:bg-red-500 px-6 py-2 rounded font-bold uppercase shadow-lg">Upload Sprite</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="text-xs text-slate-500 font-bold uppercase">Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div>
                            <div><label className="text-xs text-slate-500 font-bold uppercase">HP</label><input type="number" value={editForm.hp} onChange={e => setEditForm({...editForm, hp: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div>
                            <div><label className="text-xs text-slate-500 font-bold uppercase">AC</label><input type="number" value={editForm.ac} onChange={e => setEditForm({...editForm, ac: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div>
                        </div>
                        <button onClick={handleSave} className="w-full bg-green-600 py-3 rounded font-bold hover:bg-green-500 shadow-lg">SAVE UNIT</button>
                    </div>
                ) : <div className="h-full flex items-center justify-center text-slate-500">Select a unit to edit</div>}
            </div>
        </div>
    );
};

const ClassEditor = () => {
    const { classStats, updateClassStats } = useContentStore();
    return (<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{Object.keys(classStats).map(key => { const cls = key as CharacterClass; const stats = classStats[cls]; return (<div key={cls} className="bg-slate-800 border border-slate-700 rounded-lg p-6"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-amber-100">{cls}</h3></div><div className="grid grid-cols-6 gap-2">{Object.values(Ability).map(ability => (<div key={ability} className="flex flex-col items-center"><label className="text-[10px] font-bold text-slate-500 mb-1">{ability}</label><input type="number" value={stats[ability]} onChange={(e) => updateClassStats(cls, { ...stats, [ability]: parseInt(e.target.value) })} className="w-full bg-slate-900 border border-slate-600 rounded text-center py-1 font-mono text-amber-400 focus:border-amber-500 outline-none" /></div>))}</div></div>) })}</div>);
};

const MapConfigurator = () => {
    const { gameConfig, updateConfig } = useContentStore();
    return (<div className="max-w-2xl mx-auto bg-slate-800 border border-slate-700 rounded-lg p-8"><h3 className="text-2xl font-bold text-white mb-6">World Generation</h3><div className="space-y-8"><div><label className="font-bold text-slate-300">Noise Scale (Zoom)</label><input type="range" min="0.05" max="0.3" step="0.01" value={gameConfig.mapScale} onChange={e => updateConfig({ mapScale: parseFloat(e.target.value) })} className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer" /></div></div></div>);
};

const ExportView = () => {
    const { fetchContentFromCloud, publishContentToCloud, isLoading } = useContentStore();
    return (
        <div className="h-full flex flex-col gap-6">
            <div className="bg-blue-900/20 border border-blue-600/30 p-8 rounded-xl flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-blue-200 mb-1">☁️ Cloud Synchronization</h3>
                    <p className="text-sm text-blue-300">Publish your changes to Supabase so players can experience them.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={fetchContentFromCloud} disabled={isLoading} className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded font-bold uppercase transition-all disabled:opacity-50">Pull Data</button>
                    <button onClick={publishContentToCloud} disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold uppercase shadow-xl transition-all disabled:opacity-50">{isLoading ? 'Publishing...' : 'Publish to DB'}</button>
                </div>
            </div>
        </div>
    );
};