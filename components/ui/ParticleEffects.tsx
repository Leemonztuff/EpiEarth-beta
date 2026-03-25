
// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    type: 'sparkle' | 'glow' | 'confetti' | 'smoke';
}

const COLORS = {
    gold: ['#FFD700', '#FFA500', '#FFC125'],
    emerald: ['#50C878', '#2ECC71', '#00FF7F'],
    ruby: ['#E0115F', '#FF0040', '#DC143C'],
    amethyst: ['#9966CC', '#8B008B', '#9370DB'],
    sapphire: ['#0F52BA', '#4169E1', '#1E90FF']
};

interface ParticleOverlayProps {
    trigger: boolean;
    type?: 'victory' | 'defeat' | 'levelup' | 'heal' | 'damage' | 'magic';
    position?: { x: number; y: number };
    duration?: number;
}

export const ParticleOverlay: React.FC<ParticleOverlayProps> = ({ 
    trigger, 
    type = 'magic',
    position,
    duration = 2000 
}) => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [isActive, setIsActive] = useState(false);
    const particleId = useRef(0);

    const getParticleConfig = useCallback(() => {
        const configs = {
            victory: { colors: COLORS.gold, count: 80, type: 'confetti' as const, size: [4, 10], speed: [3, 8] },
            defeat: { colors: COLORS.ruby, count: 40, type: 'smoke' as const, size: [10, 25], speed: [1, 3] },
            levelup: { colors: COLORS.emerald, count: 60, type: 'sparkle' as const, size: [3, 8], speed: [4, 10] },
            heal: { colors: COLORS.emerald, count: 30, type: 'glow' as const, size: [5, 15], speed: [2, 5] },
            damage: { colors: COLORS.ruby, count: 25, type: 'smoke' as const, size: [8, 20], speed: [3, 7] },
            magic: { colors: COLORS.amethyst, count: 45, type: 'sparkle' as const, size: [3, 9], speed: [3, 8] }
        };
        return configs[type];
    }, [type]);

    useEffect(() => {
        if (!trigger) return;

        setIsActive(true);
        const config = getParticleConfig();
        const startX = position?.x ?? window.innerWidth / 2;
        const startY = position?.y ?? window.innerHeight / 2;

        const newParticles: Particle[] = [];
        for (let i = 0; i < config.count; i++) {
            const angle = (Math.PI * 2 * i) / config.count + Math.random() * 0.5;
            const speed = config.speed[0] + Math.random() * (config.speed[1] - config.speed[0]);
            const life = 1 + Math.random() * 1.5;
            
            newParticles.push({
                id: particleId.current++,
                x: startX,
                y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (type === 'confetti' ? 2 : 0),
                life: life,
                maxLife: life,
                size: config.size[0] + Math.random() * (config.size[1] - config.size[0]),
                color: config.colors[Math.floor(Math.random() * config.colors.length)],
                type: config.type
            });
        }
        setParticles(newParticles);

        const timer = setTimeout(() => setIsActive(false), duration);
        return () => clearTimeout(timer);
    }, [trigger, type, position, duration, getParticleConfig]);

    useEffect(() => {
        if (!isActive) return;

        let animationId: number;
        const animate = () => {
            setParticles(prev => {
                const gravity = type === 'confetti' ? 0.15 : 0;
                return prev
                    .map(p => ({
                        ...p,
                        x: p.x + p.vx,
                        y: p.y + p.vy + gravity,
                        vx: p.vx * 0.98,
                        vy: p.vy * 0.98,
                        life: p.life - 0.02,
                        size: p.type === 'smoke' ? p.size * 1.02 : p.size
                    }))
                    .filter(p => p.life > 0);
            });
            animationId = requestAnimationFrame(animate);
        };
        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [isActive, type]);

    if (!isActive && particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: p.x,
                        top: p.y,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        transform: 'translate(-50%, -50%)',
                        opacity: Math.min(1, p.life * 1.5),
                        boxShadow: p.type === 'glow' || p.type === 'sparkle' 
                            ? `0 0 ${p.size * 2}px ${p.color}` 
                            : 'none',
                        filter: p.type === 'smoke' ? 'blur(4px)' : 'none'
                    }}
                />
            ))}
        </div>
    );
};

// Componente de screen flash/ripple
export const ScreenFlash: React.FC<{ active: boolean; type: 'white' | 'red' | 'gold'; duration?: number }> = ({ 
    active, 
    type = 'white',
    duration = 150 
}) => {
    if (!active) return null;

    const colors = {
        white: 'bg-white',
        red: 'bg-red-500',
        gold: 'bg-yellow-400'
    };

    return (
        <div 
            className={`fixed inset-0 ${colors[type]} pointer-events-none z-[9997] animate-[screen-flash_0.3s_ease-out_forwards]`}
            style={{ animationDuration: `${duration}ms` }}
        />
    );
};

// Componente de border glow animado
export const AnimatedBorder: React.FC<{ children: React.ReactNode; color?: string; active?: boolean }> = ({ 
    children, 
    color = '#FFD700',
    active = true 
}) => {
    if (!active) return <>{children}</>;

    return (
        <div 
            className="relative rounded-2xl"
            style={{
                '--glow-color': color,
                background: `linear-gradient(#0f172a, #0f172a) padding-box,
                            linear-gradient(135deg, ${color}, transparent 50%, ${color}) border-box`,
                border: '2px solid transparent'
            }}
        >
            <div className="absolute inset-0 rounded-2xl animate-[border-pulse_2s_ease-in-out_infinite]" 
                style={{ 
                    background: `linear-gradient(135deg, ${color}44, transparent 50%, ${color}44)`,
                    filter: 'blur(8px)',
                    zIndex: -1
                }} 
            />
            {children}
        </div>
    );
};
