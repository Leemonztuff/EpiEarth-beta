
import React, { useState, useRef } from 'react';
import { useContentStore } from '../../store/contentStore';
import { Item, ItemRarity, EquipmentSlot, CharacterClass, Ability, TerrainType, CreatureType, EnemyDefinition, Spell, Skill, SpellType, DamageType, MagicSchool, NPCEntity, Quest, DialogueNode, DialogueOption } from '../../types';
import { RARITY_COLORS } from '../../constants';
import { uploadAsset } from '../../services/supabaseClient';

const TABS = ['DASHBOARD', 'ITEMS', 'UNITS & SPAWNS', 'SPELLS', 'SKILLS', 'NPCs', 'QUESTS', 'CLASSES', 'MAP CONFIG', 'EXPORT / SYNC'];

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('DASHBOARD');

    const exitAdmin = () => {
        window.location.pathname = '/';
    };

    return (
        <div className="flex h-screen w-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
            <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="font-serif text-2xl text-amber-500 font-bold">Epic Admin</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Tactical RPG Editor</p>
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
                    <button onClick={exitAdmin} className="w-full border border-slate-700 text-slate-400 px-4 py-2 rounded hover:bg-slate-800 hover:text-white transition-colors text-xs uppercase font-bold">
                        ← Back to Game
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-8 justify-between shrink-0">
                    <h2 className="text-xl font-bold text-slate-100">{activeTab}</h2>
                    <div className="flex items-center gap-4">
                        <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs text-green-400 font-mono uppercase tracking-widest">Master Mode</span>
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto bg-slate-900 p-8 custom-scrollbar">
                    {activeTab === 'DASHBOARD' && <DashboardHome changeTab={setActiveTab} />}
                    {activeTab === 'ITEMS' && <ItemEditor />}
                    {activeTab === 'UNITS & SPAWNS' && <UnitAndEncounterEditor />}
                    {activeTab === 'SPELLS' && <SpellEditor />}
                    {activeTab === 'SKILLS' && <SkillEditor />}
                    {activeTab === 'NPCs' && <NPCEditor />}
                    {activeTab === 'QUESTS' && <QuestEditor />}
                    {activeTab === 'CLASSES' && <ClassEditor />}
                    {activeTab === 'MAP CONFIG' && <MapConfigurator />}
                    {activeTab === 'EXPORT / SYNC' && <ExportView />}
                </main>
            </div>
        </div>
    );
};

const DashboardHome = ({ changeTab }: { changeTab: (t: string) => void }) => {
    const { items, enemies, spells, skills, npcs, quests } = useContentStore();
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
            <StatCard title="NPCs" count={Object.keys(npcs).length} color="green" tab="NPCs" />
            <StatCard title="Quests" count={Object.keys(quests).length} color="blue" tab="QUESTS" />
        </div>
    );
};

const QuestEditor = () => {
    const { quests, updateQuest, createQuest, deleteQuest, enemies, items } = useContentStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Quest>>({});

    const handleSelect = (id: string) => { setSelectedId(id); setEditForm({ ...quests[id] }); };
    const handleSave = () => { if (selectedId && editForm.title) { updateQuest(selectedId, editForm as Quest); alert('Quest Saved'); } };
    const handleCreate = () => {
        const newId = `quest_${Date.now()}`;
        const newQuest: Quest = {
            id: newId, title: 'New Quest', description: 'Help the village.', completed: false, type: 'SIDE',
            objective: { type: 'KILL', targetId: 'ANY', count: 5, current: 0 },
            reward: { xp: 500, gold: 100 }
        };
        createQuest(newQuest);
        handleSelect(newId);
    };

    return (
        <div className="flex gap-6 h-full">
            <div className="w-1/3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center"><span className="text-xs font-bold text-blue-500 uppercase">Mission Logs</span><button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs">+</button></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {Object.values(quests).map((q: any) => (
                        <div key={q.id} onClick={() => handleSelect(q.id)} className={`p-3 rounded cursor-pointer border ${selectedId === q.id ? 'bg-slate-800 border-blue-500' : 'bg-transparent border-transparent hover:bg-slate-900'}`}>
                            <div className="text-sm font-bold text-slate-200">{q.title}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">{q.type} • {q.objective.type}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-6 overflow-y-auto custom-scrollbar">
                {selectedId ? (
                    <div className="space-y-6 max-w-xl mx-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Title</label><input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div>
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Description</label><textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white h-20" /></div>
                        
                        <div className="p-4 bg-slate-950 rounded-lg border border-slate-700">
                             <h4 className="text-xs font-black text-blue-400 uppercase mb-4 tracking-widest border-b border-white/5 pb-2">Objective Settings</h4>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                                     <select value={editForm.objective?.type} onChange={e => setEditForm({...editForm, objective: {...editForm.objective!, type: e.target.value as any}})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs">
                                         <option value="KILL">Kill Enemy</option>
                                         <option value="VISIT">Visit Location</option>
                                         <option value="COLLECT">Collect Item</option>
                                     </select>
                                 </div>
                                 <div>
                                     <label className="text-[10px] font-bold text-slate-500 uppercase">Target Count</label>
                                     <input type="number" value={editForm.objective?.count} onChange={e => setEditForm({...editForm, objective: {...editForm.objective!, count: parseInt(e.target.value)}})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" />
                                 </div>
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase">Gold Reward</label><input type="number" value={editForm.reward?.gold} onChange={e => setEditForm({...editForm, reward: {...editForm.reward!, gold: parseInt(e.target.value)}})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" /></div>
                            <div><label className="text-[10px] font-bold text-slate-500 uppercase">XP Reward</label><input type="number" value={editForm.reward?.xp} onChange={e => setEditForm({...editForm, reward: {...editForm.reward!, xp: parseInt(e.target.value)}})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" /></div>
                        </div>

                        <button onClick={handleSave} className="w-full bg-blue-600 py-3 rounded font-bold hover:bg-blue-500 shadow-lg transition-all">SAVE MISSION</button>
                    </div>
                ) : <div className="flex h-full items-center justify-center text-slate-500 italic">Select a quest to begin the chronicles.</div>}
            </div>
        </div>
    );
};

const NPCEditor = () => {
    const { npcs, updateNPC, createNPC, deleteNPC, quests } = useContentStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<NPCEntity>>({});
    
    // Editor de nodos de diálogo
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

    const handleSelect = (id: string) => { 
        setSelectedId(id); 
        setEditForm({ ...npcs[id] }); 
        setActiveNodeId(npcs[id].startNodeId || null);
    };

    const handleSave = () => { if (selectedId && editForm.name) { updateNPC(selectedId, editForm as NPCEntity); alert('NPC Saved'); } };
    
    const handleCreate = () => { 
        const newId = `npc_${Date.now()}`; 
        createNPC({ 
            id: newId, 
            name: 'New NPC', 
            role: 'Villager', 
            sprite: 'units/human-magi/white-mage.png', 
            dialogue: [], 
            startNodeId: 'root',
            dialogueNodes: {
                'root': { id: 'root', text: "Hello there!", options: [{ label: "Goodbye", action: 'CLOSE' }] }
            }
        }); 
        handleSelect(newId); 
    };

    const updateNode = (nodeId: string, data: Partial<DialogueNode>) => {
        // Fix: Explicitly cast dialogueNodes to ensure type safety when updating a node
        const nodes = { ...editForm.dialogueNodes } as Record<string, DialogueNode>;
        nodes[nodeId] = { ...nodes[nodeId], ...data };
        setEditForm({ ...editForm, dialogueNodes: nodes });
    };

    const addNode = () => {
        const id = `node_${Date.now()}`;
        updateNode(id, { id, text: "New text...", options: [] });
        setActiveNodeId(id);
    };

    const addOption = (nodeId: string) => {
        // Fix: Explicitly cast dialogueNodes to ensure type safety when adding an option
        const nodes = { ...editForm.dialogueNodes } as Record<string, DialogueNode>;
        const node = nodes[nodeId];
        if (node) {
            node.options.push({ label: "New Option", action: 'CLOSE' });
            setEditForm({ ...editForm, dialogueNodes: nodes });
        }
    };

    return (
        <div className="flex gap-6 h-full">
            <div className="w-1/3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center"><span className="text-xs font-bold text-green-500 uppercase">Citizens</span><button onClick={handleCreate} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs">+</button></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {Object.values(npcs).map((npc: any) => (
                        <div key={npc.id} onClick={() => handleSelect(npc.id)} className={`p-3 rounded cursor-pointer flex items-center gap-3 border ${selectedId === npc.id ? 'bg-slate-800 border-green-500' : 'bg-transparent border-transparent hover:bg-slate-900'}`}>
                            <div className="w-8 h-8 flex items-center justify-center bg-black/40 rounded">
                                <img src={`https://cdn.jsdelivr.net/gh/wesnoth/wesnoth@master/data/core/images/${npc.sprite}`} className="w-6 h-6 object-contain pixelated" />
                            </div>
                            <div><div className="text-sm font-bold text-slate-200">{npc.name}</div><div className="text-[10px] text-slate-500 uppercase">{npc.role}</div></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-6 overflow-y-auto custom-scrollbar">
                {selectedId ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Role</label><input type="text" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div>
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Sprite Path (Wesnoth relative)</label><input type="text" value={editForm.sprite} onChange={e => setEditForm({...editForm, sprite: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono text-xs" /></div>

                        {/* Dialogue Graph Editor Lite */}
                        <div className="bg-slate-950 p-6 rounded-xl border border-slate-700 shadow-inner">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest">Dialogue Designer</h4>
                                <button onClick={addNode} className="bg-amber-600 px-3 py-1 rounded text-[10px] font-black uppercase text-white hover:bg-amber-500">Add Node</button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Lista de Nodos */}
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                    {/* Fix: Explicitly cast dialogueNodes to ensure type safety when mapping nodes */}
                                    {(Object.values(editForm.dialogueNodes || {}) as DialogueNode[]).map(node => (
                                        <div 
                                            key={node.id} 
                                            onClick={() => setActiveNodeId(node.id)}
                                            className={`p-3 rounded border cursor-pointer transition-all ${activeNodeId === node.id ? 'bg-amber-900/20 border-amber-500' : 'bg-slate-900 border-slate-800'}`}
                                        >
                                            <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 mb-1">
                                                <span>Node ID: {node.id}</span>
                                                {editForm.startNodeId === node.id && <span className="text-amber-500">★ START</span>}
                                            </div>
                                            <div className="text-xs text-slate-300 truncate italic">"{node.text}"</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Editor de Nodo Activo */}
                                {activeNodeId && editForm.dialogueNodes?.[activeNodeId] && (
                                    <div className="bg-slate-900 p-4 rounded border border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">NPC Text</label>
                                            <textarea 
                                                value={editForm.dialogueNodes[activeNodeId].text} 
                                                onChange={e => updateNode(activeNodeId, { text: e.target.value })}
                                                className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-amber-100 h-20"
                                            />
                                        </div>
                                        
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Options</label>
                                                <button onClick={() => addOption(activeNodeId)} className="text-[8px] font-bold text-amber-500 hover:text-white uppercase">+ Add Option</button>
                                            </div>
                                            <div className="space-y-3">
                                                {editForm.dialogueNodes[activeNodeId].options.map((opt, i) => (
                                                    <div key={i} className="p-2 bg-black/40 rounded border border-slate-800 space-y-2">
                                                        <input 
                                                            placeholder="Label" 
                                                            value={opt.label} 
                                                            onChange={e => {
                                                                // Fix: Explicitly cast dialogueNodes to ensure type safety when updating option label
                                                                const nodes = {...editForm.dialogueNodes} as Record<string, DialogueNode>;
                                                                nodes[activeNodeId].options[i].label = e.target.value;
                                                                setEditForm({...editForm, dialogueNodes: nodes});
                                                            }}
                                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px]"
                                                        />
                                                        <div className="flex gap-2">
                                                            <select 
                                                                value={opt.action || 'NEXT'}
                                                                onChange={e => {
                                                                    // Fix: Explicitly cast dialogueNodes to ensure type safety when updating option action
                                                                    const nodes = {...editForm.dialogueNodes} as Record<string, DialogueNode>;
                                                                    const val = e.target.value;
                                                                    nodes[activeNodeId].options[i].action = (val === 'NEXT' ? undefined : val as any);
                                                                    setEditForm({...editForm, dialogueNodes: nodes});
                                                                }}
                                                                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[8px] font-black"
                                                            >
                                                                <option value="NEXT">GO TO NODE</option>
                                                                <option value="CLOSE">CLOSE DIALOGUE</option>
                                                                <option value="SHOP">OPEN SHOP</option>
                                                                <option value="SAVE">SAVE GAME</option>
                                                                <option value="REWARD">GIVE REWARD</option>
                                                            </select>
                                                            {!opt.action && (
                                                                <select 
                                                                    value={opt.nextNodeId || ''}
                                                                    onChange={e => {
                                                                        // Fix: Explicitly cast dialogueNodes to ensure type safety when updating nextNodeId
                                                                        const nodes = {...editForm.dialogueNodes} as Record<string, DialogueNode>;
                                                                        nodes[activeNodeId].options[i].nextNodeId = e.target.value;
                                                                        setEditForm({...editForm, dialogueNodes: nodes});
                                                                    }}
                                                                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[8px]"
                                                                >
                                                                    <option value="">Select Destination...</option>
                                                                    {Object.keys(editForm.dialogueNodes).map(id => <option key={id} value={id}>{id}</option>)}
                                                                </select>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <label className="text-[8px] font-black text-slate-600 uppercase">Quest Trigger:</label>
                                                            <select 
                                                                value={opt.questTriggerId || ''}
                                                                onChange={e => {
                                                                    // Fix: Explicitly cast dialogueNodes to ensure type safety when updating questTriggerId
                                                                    const nodes = {...editForm.dialogueNodes} as Record<string, DialogueNode>;
                                                                    nodes[activeNodeId].options[i].questTriggerId = e.target.value;
                                                                    setEditForm({...editForm, dialogueNodes: nodes});
                                                                }}
                                                                className="flex-1 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[8px]"
                                                            >
                                                                <option value="">No Quest</option>
                                                                {Object.keys(quests).map(id => <option key={id} value={id}>{quests[id].title}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={handleSave} className="w-full bg-green-600 py-3 rounded font-bold hover:bg-green-500 shadow-lg transition-all uppercase tracking-widest">SAVE WORLD CITIZEN</button>
                    </div>
                ) : <div className="flex h-full items-center justify-center text-slate-500 italic">Select an NPC to start writing destiny.</div>}
            </div>
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

const SpellEditor = () => {
    const { spells, updateSpell, createSpell } = useContentStore();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Spell>>({});
    const handleSelect = (id: string) => { setSelectedId(id); setEditForm({ ...spells[id] }); };
    const handleSave = () => { if (selectedId && editForm.name) { updateSpell(selectedId, editForm as Spell); alert('Spell Saved'); } };
    const handleCreate = () => { const newId = `spell_${Date.now()}`; createSpell({ id: newId, name: 'New Spell', level: 1, range: 5, school: MagicSchool.EVOCATION, type: SpellType.DAMAGE, effects: [], description: '', animation: 'MAGIC', icon: '' }); handleSelect(newId); };
    return (
        <div className="flex gap-6 h-full">
            <div className="w-1/3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center"><span className="font-bold text-purple-400 text-sm">GRIMOIRE</span><button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded text-sm font-bold">+</button></div>
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
            <div className="w-1/3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center"><span className="font-bold text-blue-400 text-sm">TECHNIQUES</span><button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-sm font-bold">+</button></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">{Object.values(skills).map((skill: any) => (<div key={skill.id} onClick={() => handleSelect(skill.id)} className={`p-3 rounded cursor-pointer flex items-center gap-3 border ${selectedId === skill.id ? 'bg-slate-800 border-blue-500' : 'bg-transparent border-transparent hover:bg-slate-900'}`}><div className="text-sm font-bold text-slate-200">{skill.name}</div></div>))}</div>
            </div>
            {selectedId && <div className="flex-1 bg-slate-800 p-6 rounded-lg border border-slate-700 overflow-y-auto"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-slate-500 font-bold uppercase">Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" /></div></div><button onClick={handleSave} className="mt-6 w-full bg-blue-600 py-3 rounded font-bold">SAVE SKILL</button></div>}
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
