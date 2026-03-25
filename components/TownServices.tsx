
import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useContentStore } from '../store/contentStore';
import { RARITY_COLORS, ITEMS as CORE_ITEMS } from '../constants';
import { Item, ItemRarity } from '../types';
import { sfx } from '../services/SoundSystem';

// Helper for random shop items - always include rations
const generateShopItems = (level: number, itemDB: Record<string, Item>) => {
    const allItems = Object.values(itemDB).filter(i => i.type !== 'key' && i.id !== 'ration');
    const shuffled = allItems.sort(() => 0.5 - Math.random());
    const selection = shuffled.slice(0, 5).map(item => ({
        item,
        price: Math.max(10, (item.rarity === ItemRarity.COMMON ? 20 : item.rarity === ItemRarity.UNCOMMON ? 100 : 500) + Math.floor(Math.random() * 20))
    }));
    
    // Always add ration to stock
    selection.unshift({
        item: CORE_ITEMS.ration,
        price: 5
    });
    
    return selection;
};

const ShopModal = ({ onClose, gold, spendGold, addItem, stock }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 p-4">
        <div className="bg-slate-900 border border-amber-600/50 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* Header */}
            <div className="bg-slate-950 p-6 border-b border-amber-600/30 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-amber-500 uppercase tracking-tighter">Suministros</h2>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest">El Bazar de Aethelgard</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 px-4 py-2 rounded-lg border border-yellow-600/30 flex items-center gap-2 shadow-inner">
                        <span className="text-xl">🪙</span>
                        <span className="text-lg font-mono font-bold text-yellow-400">{gold}</span>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full text-white font-bold transition-colors">✕</button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-black/20">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {stock.map((entry: any, i: number) => (
                        <div key={i} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 hover:border-amber-500 transition-all group relative flex flex-col">
                            <div className="flex justify-center mb-3">
                                <div className="w-16 h-16 bg-black/50 rounded-xl flex items-center justify-center border border-slate-800 relative group-hover:scale-110 transition-transform">
                                    <img src={entry.item.icon} className="w-10 h-10 object-contain drop-shadow-md invert opacity-80" />
                                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: RARITY_COLORS[entry.item.rarity] }} />
                                </div>
                            </div>
                            <h4 className="text-[11px] font-black text-slate-200 text-center mb-1 uppercase tracking-tight truncate">{entry.item.name}</h4>
                            <p className="text-[9px] text-slate-500 text-center mb-4 h-8 overflow-hidden italic leading-tight">{entry.item.description}</p>
                            
                            <button 
                                onClick={() => {
                                    if (spendGold(entry.price)) {
                                        addItem(entry.item);
                                        sfx.playUiClick();
                                    } else {
                                        sfx.playUiHover();
                                    }
                                }}
                                disabled={gold < entry.price}
                                className="mt-auto w-full bg-slate-900 group-hover:bg-amber-700 disabled:opacity-50 disabled:hover:bg-slate-900 text-amber-100 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-slate-700 group-hover:border-amber-500 transition-all shadow-lg active:scale-95"
                            >
                                <span>{entry.price} ORO</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const InnModal = ({ onClose, gold, spendGold, party, healParty }: any) => {
    const cost = 15;
    const canAfford = gold >= cost;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur animate-in fade-in duration-500 p-4">
            <div className="bg-slate-900 border-2 border-amber-900/50 rounded-2xl w-full max-w-lg p-8 shadow-[0_0_100px_rgba(245,158,11,0.1)] text-center relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-orange-900/20 to-transparent pointer-events-none animate-pulse" />
                
                <div className="text-4xl mb-4">🏠</div>
                <h2 className="text-3xl font-serif font-bold text-amber-500 mb-2 uppercase tracking-tighter">La Posada</h2>
                <p className="text-amber-200/60 italic mb-8 text-sm">"Descansa, forastero. El fuego purifica el alma y el cuerpo."</p>

                <div className="bg-black/40 rounded-xl p-6 mb-8 border border-amber-900/30 text-left">
                    <div className="flex justify-between items-center text-xs text-slate-300 mb-4">
                        <span className="uppercase font-bold tracking-widest text-slate-500">Coste de Estancia</span>
                        <span className="text-yellow-400 font-mono font-bold text-lg">{cost} Oro</span>
                    </div>
                    <div className="h-px bg-slate-800 my-4" />
                    <ul className="text-xs text-slate-400 space-y-2 font-bold uppercase tracking-tighter">
                        <li className="flex items-center gap-2">✅ Restaurar HP y Stamina al 100%</li>
                        <li className="flex items-center gap-2 text-purple-400">✅ Purgar toda la Corrupción</li>
                        <li className="flex items-center gap-2">✅ Guardar progreso automáticamente</li>
                    </ul>
                </div>

                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-black text-[10px] uppercase tracking-widest transition-all">
                        SALIR
                    </button>
                    <button 
                        onClick={() => {
                            if (spendGold(cost)) {
                                healParty();
                                onClose();
                            }
                        }}
                        disabled={!canAfford}
                        className="flex-1 py-4 rounded-xl bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:grayscale text-white font-black text-[10px] uppercase tracking-widest shadow-xl transition-all transform active:scale-95"
                    >
                        DESCANSAR ({cost}G)
                    </button>
                </div>
            </div>
        </div>
    );
};

export const TownServicesManager = ({ activeService, onClose }: any) => {
    const { gold, spendGold, addItem, party, recalculateStats, addLog, saveGame } = useGameStore();
    const items = useContentStore(state => state.items);
    
    const [stock] = useState(() => generateShopItems(party[0]?.stats.level || 1, items));

    const healParty = () => {
        const healedParty = party.map((p: any) => {
            const stats = { ...p.stats, hp: p.stats.maxHp, stamina: p.stats.maxStamina, corruption: 0 };
            return { ...p, stats: recalculateStats({ ...p, stats }) };
        });
        useGameStore.setState({ party: healedParty });
        sfx.playVictory();
        addLog("La party ha descansado y está lista para el viaje.", "narrative");
        saveGame();
    };

    if (activeService === 'SHOP') {
        return <ShopModal onClose={onClose} gold={gold} spendGold={spendGold} addItem={addItem} stock={stock} />;
    }
    if (activeService === 'INN') {
        return <InnModal onClose={onClose} gold={gold} spendGold={spendGold} party={party} healParty={healParty} />;
    }
    return null;
};
