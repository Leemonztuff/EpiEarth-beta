
import React, { useState, useEffect } from 'react';
import { AssetManager } from '../../services/AssetManager';

interface SpriteProps {
    src: string;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
    onLoad?: () => void;
}

/**
 * Standardized Sprite component for UI that maintains aspect ratio
 * and prevents deformation while keeping a consistent height.
 */
export const Sprite: React.FC<SpriteProps> = ({ src, alt = '', className = '', style = {}, onLoad }) => {
    const [aspectRatio, setAspectRatio] = useState<number>(1);
    const [isLoaded, setIsLoaded] = useState(false);
    const safeSrc = AssetManager.getSafeSprite(src);

    useEffect(() => {
        const img = new Image();
        img.src = safeSrc;
        img.onload = () => {
            setAspectRatio(img.width / img.height);
            setIsLoaded(true);
            if (onLoad) onLoad();
        };
    }, [safeSrc, onLoad]);

    return (
        <div 
            className={`inline-flex items-center justify-center overflow-visible ${className}`}
            style={{
                height: '100%',
                aspectRatio: `${aspectRatio}`,
                visibility: isLoaded ? 'visible' : 'hidden',
                ...style
            }}
        >
            <img 
                src={safeSrc} 
                alt={alt}
                className="h-full w-full object-contain pixelated"
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    );
};
