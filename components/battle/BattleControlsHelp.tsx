// @ts-nocheck
import React from 'react';

export const BattleControlsHelp: React.FC = () => {
    return (
        <div className="absolute top-2 right-2 z-[100] pointer-events-none opacity-40 hover:opacity-70 transition-opacity">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-[10px] text-white/60 font-mono space-y-1">
                <div><span className="text-amber-400">🖱️ Drag</span> Rotate</div>
                <div><span className="text-amber-400">⚙️ Scroll</span> Zoom</div>
                <div><span className="text-amber-400">⇧+Drag</span> Pan</div>
                <div><span className="text-amber-400">WASD</span> Move</div>
            </div>
        </div>
    );
};
