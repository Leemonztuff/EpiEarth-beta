
export interface SpriteFrame {
    filename: string;
    frame: { x: number; y: number; w: number; h: number };
    rotated: boolean;
    trimmed: boolean;
    spriteSourceSize: { x: number; y: number; w: number; h: number };
    sourceSize: { w: number; h: number };
    pivot: { x: number; y: number };
}

export interface AtlasData {
    frames: SpriteFrame[];
}

export interface LoadedSprite {
    image: HTMLImageElement;
    frame: SpriteFrame;
}

export class WesnothAtlas {
    private atlases: Map<number, HTMLImageElement> = new Map();
    private definitions: Map<string, SpriteFrame> = new Map();
    private loadingPromise: Promise<void> | null = null;
    private isLoaded: boolean = false;

    private static instance: WesnothAtlas | null = null;

    static getInstance(): WesnothAtlas {
        if (!WesnothAtlas.instance) {
            WesnothAtlas.instance = new WesnothAtlas();
        }
        return WesnothAtlas.instance;
    }

    isReady(): boolean {
        return this.isLoaded;
    }

    async load(): Promise<void> {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this.loadAtlases();
        return this.loadingPromise;
    }

    private async loadAtlases(): Promise<void> {
        const baseUrl = '/assets/wesnoth';
        const promises: Promise<void>[] = [];
        
        for (let i = 0; i < 2; i++) {
            promises.push(this.loadAtlas(i, baseUrl));
        }

        await Promise.all(promises);
        this.isLoaded = true;
        console.log(`[WesnothAtlas] All atlases loaded and definitions are set.`);
    }

    private async loadAtlas(index: number, baseUrl: string): Promise<void> {
        const pngUrl = `${baseUrl}/hexes_${index}.png`;
        const jsonUrl = `${baseUrl}/hexes_${index}.json`;

        const [image, atlasData] = await Promise.all([
            this.loadImage(pngUrl),
            this.loadJson<AtlasData>(jsonUrl)
        ]);

        this.atlases.set(index, image);

        for (const frame of atlasData.frames) {
            const key = frame.filename.replace(/\//g, '_');
            this.definitions.set(key, frame);
            this.definitions.set(frame.filename, frame);
            
            if (frame.filename.startsWith('terrain/')) {
                const shortName = frame.filename
                    .replace('terrain/', '')
                    .replace('.png', '')
                    .replace('-tile', '');
                if (!this.definitions.has(shortName)) {
                    this.definitions.set(shortName, frame);
                }
            }
        }

        console.log(`[WesnothAtlas] Loaded atlas ${index} with ${atlasData.frames.length} sprites`);
    }

    private resolveUrl(src: string): string {
        if (/^(https?:|data:|blob:)/i.test(src)) {
            return src;
        }

        const origin =
            (typeof window !== 'undefined' && window.location?.origin)
                ? window.location.origin
                : 'http://localhost';

        return new URL(src, origin).toString();
    }

    private loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = this.resolveUrl(src);
        });
    }

    private loadJson<T>(src: string): Promise<T> {
        return fetch(this.resolveUrl(src))
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch: ${src}`);
                return res.json();
            });
    }

    getSprite(name: string): LoadedSprite | null {
        const frame = this.definitions.get(name);
        if (!frame) {
            return null;
        }

        const atlasIndex = this.atlases.size > 1 && this.atlases.get(0) && frame.frame.x >= this.atlases.get(0)!.width ? 1 : 0;
        const image = this.atlases.get(atlasIndex);

        if (!image) {
            return null;
        }

        return { image, frame };
    }

    drawSprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, scale: number = 1): boolean {
        const sprite = this.getSprite(name);
        if (!sprite) {
            return false;
        }

        const { image, frame } = sprite;
        const { frame: f, spriteSourceSize } = frame;

        const srcX = f.x;
        const srcY = f.y;
        const srcW = f.w;
        const srcH = f.h;

        const drawW = srcW * scale;
        const drawH = srcH * scale;

        const centerX = x - (drawW / 2);
        const centerY = y - (drawH / 2);

        const offsetX = spriteSourceSize.x * scale;
        const offsetY = spriteSourceSize.y * scale;

        ctx.drawImage(
            image,
            srcX, srcY, srcW, srcH,
            centerX + offsetX,
            centerY + offsetY,
            drawW,
            drawH
        );

        return true;
    }

    hasSprite(name: string): boolean {
        return this.definitions.has(name);
    }

    getAllSprites(): string[] {
        return Array.from(this.definitions.keys());
    }

    getSpritesByCategory(category: string): string[] {
        const prefix = category + '/';
        return Array.from(this.definitions.keys()).filter(name => 
            name.startsWith(prefix) || name === category
        );
    }
}

export const wesnothAtlas = WesnothAtlas.getInstance();
