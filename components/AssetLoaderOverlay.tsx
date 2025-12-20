
import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useContentStore } from '../store/contentStore';
import { AssetManager } from '../services/AssetManager';

/**
 * Overlay cinemático que bloquea el juego hasta que todos los assets críticos
 * están cargados en memoria.
 */
export const AssetLoaderOverlay: React.FC = () => {
    const { assetLoadingProgress, setAssetLoadingProgress, setAssetsLoaded } = useGameStore();
    const { isLoading: isContentLoading } = useContentStore();
    const [statusMessage, setStatusMessage] = useState('Initializing Systems...');

    useEffect(() => {
        // No empezamos la precarga de imágenes hasta que las definiciones JSON de la DB estén listas
        if (isContentLoading) return;

        const startLoading = async () => {
            setStatusMessage('Cataloging Artifacts...');
            const assets = AssetManager.getRequiredAssets();
            
            setStatusMessage('Harvesting Reality...');
            await AssetManager.prefetch(assets, (progress) => {
                setAssetLoadingProgress(progress);
                if (progress > 90) setStatusMessage('Stabilizing Dimensions...');
            });

            // Pequeña pausa para que el usuario vea el 100% y por estética
            setTimeout(() => {
                setAssetsLoaded(true);
            }, 800);
        };

        startLoading();
    }, [isContentLoading, setAssetLoadingProgress, setAssetsLoaded]);

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-50" />
            
            <div className="relative z-10 mb-12">
                <div className="w-32 h-32 bg-amber-500/10 rounded-full blur-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                <img 
                    src="https://iukchvkoumfwaxlgfhso.supabase.co/storage/v1/object/public/game-assets/wesnoth/items/gem-large-blue.png" 
                    className="w-24 h-24 mx-auto drop-shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-bounce mb-4" 
                    style={{ animationDuration: '3s' }}
                    alt="Loading..."
                />
                <h1 className="text-4xl md:text-6xl font-serif font-black text-white tracking-tighter">EPIC EARTH</h1>
                <div className="h-1 w-24 bg-amber-500 mx-auto mt-2" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="flex justify-between items-end mb-2 px-1">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] drop-shadow-sm">
                        {statusMessage}
                    </span>
                    <span className="text-xs font-mono font-bold text-white/80">{assetLoadingProgress}%</span>
                </div>
                
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div 
                        className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                        style={{ width: `${assetLoadingProgress}%` }}
                    />
                </div>
                
                <p className="mt-8 text-[9px] text-slate-500 uppercase tracking-widest font-bold animate-pulse">
                    Synchronizing with Eternum Database...
                </p>
            </div>

            {/* Hint decorativo en la parte inferior */}
            <div className="absolute bottom-10 left-0 right-0 text-center opacity-30">
                <p className="text-[8px] text-slate-400 font-mono">ASSET_MGR_V1.5 // SUPABASE_READY // CACHE_INIT</p>
            </div>
        </div>
    );
};
