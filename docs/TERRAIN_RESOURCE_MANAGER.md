# Informe Técnico: TerrainResourceManager

## 1. Resumen Ejecutivo

El `TerrainResourceManager` es un sistema de gestión de recursos de terreno hexagonal diseñado para optimizar el rendering del mapa de exploración en EpiEarth. Proporciona caching inteligente, precarga predictiva y control de memoria para sprites de terreno.

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                    TerrainResourceManager                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐  │
│  │   LRUCache      │    │   LRUCache      │    │ LoadingState │  │
│  │  (Sprites)      │    │  (TileData)     │    │              │  │
│  │  maxSize: 500   │    │  maxSize: 500   │    │ • isLoading  │  │
│  │                 │    │                 │    │ • loadedCnt  │  │
│  │  Canvas        │    │  TileResource   │    │ • totalCnt   │  │
│  │  (pre-rendered) │    │  (metadata)     │    │ • errors     │  │
│  └─────────────────┘    └─────────────────┘    └──────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    WesnothAtlas                             ││
│  │            (Atlas de sprites original)                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Componentes Principales

### 3.1 LRUCache (Least Recently Used)

Implementación genérica de cache LRU con auto-evicción:

```typescript
class LRUCache<K, V> {
    private cache: Map<K, V> = new Map();
    private maxSize: number;

    // get() también actualiza el orden de uso (move-to-end)
    get(key: K): V | undefined {
        if (!this.cache.has(key)) return undefined;
        this.cache.delete(key);
        this.cache.set(key, this.cache.get(key)!);
        return this.cache.get(key);
    }

    // set() evicts el más antiguo si se alcanza el límite
    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
}
```

**Características:**
- Complejidad O(1) para get/set
- Evicción automática del elemento menos usado
- Keys: `spriteName@scale` para sprites, `${q},${r}[-feature]` para tiles

### 3.2 TileResource

```typescript
interface TileResource {
    terrain: TerrainType;      // Tipo de terreno (GRASS, FOREST, etc.)
    sprites: string[];         // Lista de sprites a renderizar
    isLoaded: boolean;         // Estado de carga
    lastAccessed: number;      // Timestamp para LRU
}
```

### 3.3 LoadingState

```typescript
interface LoadingState {
    isLoading: boolean;         //true mientras carga
    loadedCount: number;       // Sprites cargados
    totalCount: number;        // Total a cargar
    errors: Set<string>;        // Sprites que fallaron
}
```

---

## 4. Flujo de Trabajo

### 4.1 Inicialización (Singleton)

```typescript
// получить instancia ( patrón Singleton)
const manager = TerrainResourceManager.getInstance({
    maxCacheSize: 500,      //Máximo elementos en cache
    preloadRadius: 3,       //Radio de precarga (no usado directamente)
    defaultTileSize: 72      //Tamaño base del tile
});
```

### 4.2 Carga de Sprites

```
Solicitud de tile
        │
        ▼
┌───────────────────┐
│ ¿En tileDataCache?│──SÍ──▶ Devolver cacheado
└───────────────────┘
        │NO
        ▼
┌───────────────────┐
│ getTerrainSprites│──▶ Determinar sprites necesarios
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ ¿Sprites en cache?│
└───────────────────┘
   │        │
  SÍ        NO
   │        │
   ▼        ▼
┌──────┐  ┌────────────────┐
│Render│  │ preloadSprite() │
└──────┘  │ (canvas cache) │
          └────────────────┘
                    │
                    ▼
          ┌────────────────────┐
          │ Crear HTMLCanvas   │
          │ Renderizar sprite  │
          │ Guardar en cache   │
          └────────────────────┘
```

### 4.3 Preload por Chunks

```typescript
async preloadTiles(tiles): Promise<void> {
    // Carga en chunks de 10 para no bloquear el hilo
    for (let i = 0; i < tiles.length; i += 10) {
        const chunk = tiles.slice(i, i + 10);
        await Promise.all(chunk.map(tile => loadTileResources(...)));
        // Actualizar progreso
        this.loadingState.loadedCount += chunk.length;
    }
}
```

---

## 5. Viewport Culling

### 5.1 Cálculo de Tiles Visibles

```typescript
getVisibleTiles(centerQ, centerR, viewportW, viewportH, hexSize) {
    const hexWidth = hexSize * 1.5;   // Ancho del hexágono
    const hexHeight = hexSize * Math.sqrt(3);  // Alto
    
    // Calcular cuántos tiles caben en pantalla
    const cols = Math.ceil(viewportW / hexWidth) + 2;
    const rows = Math.ceil(viewportH / hexHeight) + 2;
    
    // Generar coordenadas candidatas
    // +2 como buffer para evitar bordes vacíos
}
```

### 5.2 Precarga Automática del Viewport

```typescript
preloadViewport(centerQ, centerR, viewportW, viewportH, hexSize, terrainProvider) {
    // 1. Obtener tiles visibles
    const visibleTiles = getVisibleTiles(...);
    
    // 2. Obtener datos de terreno para cada tile
    const tilesToLoad = visibleTiles.map(({q, r}) => {
        return terrainProvider(q, r); // Función proveedora
    }).filter(Boolean);
    
    // 3. Precargar en background
    this.preloadTiles(tilesToLoad);
}
```

---

## 6. Rendering Optimizado

### 6.1 Dibujo de Tile con Cache

```typescript
drawTile(ctx, q, r, cx, cy, hexSize, feature) {
    // 1. Obtener datos del tile
    const tileData = this.tileDataCache.get(key);
    if (!tileData) return; // No renderiza si no está cargado
    
    // 2. Para cada sprite del tile
    for (const spriteName of tileData.sprites) {
        // 3. Obtener canvas pre-renderizado
        const canvas = this.spriteCache.get(spriteKey);
        if (!canvas) continue;
        
        // 4. Escalar y dibujar
        const scale = hexSize / this.config.defaultTileSize;
        ctx.drawImage(canvas, cx - drawW/2, cy - drawH/2, drawW, drawH);
    }
    
    // 5. Actualizar timestamp de acceso
    tileData.lastAccessed = Date.now();
}
```

### 6.2 Ventajas del Rendering con Cache

| Aspecto | Sin Cache | Con Cache |
|---------|-----------|-----------|
| Lecturas atlas | N por frame | 1 por tile (primera vez) |
| Transformaciones | N por frame | 0 (pre-calculadas) |
| drawImage calls | Directas | Desde canvas pre-renderizado |

---

## 7. Integración con HexTileRenderer

### 7.1 Métodos Extendidos

```typescript
// Obtener progreso de carga
const progress = hexTileRenderer.getLoadingProgress();
// { isLoading: boolean, progress: 0-1, errors: number }

// Precargar viewport
hexTileRenderer.preloadTilesForViewport(
    playerQ, playerR,
    canvas.width, canvas.height,
    HEX_SIZE,
    (q, r) => WorldGenerator.getTile(q, r, dimension)
);

// Obtener stats
const stats = hexTileRenderer.getResourceManager().getCacheStats();
// { spriteCacheSize, tileCacheSize, errorCount }
```

---

## 8. Control de Memoria

### 8.1 Estimación de Memoria

```typescript
getMemoryUsage(): number {
    let bytes = 0;
    for (const canvas of this.spriteCache.keys()) {
        const c = this.spriteCache.get(canvas);
        if (c) bytes += c.width * c.height * 4; // RGBA
    }
    return bytes; // bytes
}
```

### 8.2 Límites y Estrategias

| Config | Valor Default | Descripción |
|--------|---------------|-------------|
| `maxCacheSize` | 500 | Máximo tiles/sprites en cache |
| Evicción | LRU | Least Recently Used |
| Limpieza | `clearCache()` | Manual o al cambiar dimensión |

---

## 9. Casos de Uso

### 9.1 Mapa de Exploración (OverworldMap)

```typescript
// En OverworldMap.tsx
useEffect(() => {
    // Precargar tiles alrededor del jugador
    hexTileRenderer.preloadTilesForViewport(
        playerPos.x, playerPos.y,
        canvas.width / zoom, canvas.height / zoom,
        HEX_SIZE,
        (q, r) => WorldGenerator.getTile(q, r, safeDimension)
    );
}, [playerPos, canvasSize]);
```

### 9.2 Pantalla de Carga

```typescript
function LoadingScreen() {
    const [progress, setProgress] = useState({ progress: 0, isLoading: true });
    
    useInterval(() => {
        const state = hexTileRenderer.getLoadingProgress();
        setProgress({ 
            progress: state.progress * 100, 
            isLoading: state.isLoading 
        });
    }, 100);
    
    return <ProgressBar value={progress.progress} />;
}
```

---

## 10. Métricas y Debugging

### 10.1 Stats Disponibles

```typescript
const stats = terrainResourceManager.getCacheStats();
// {
//   spriteCacheSize: 342,    // Sprites en memoria
//   tileCacheSize: 156,      // Tiles cacheados  
//   errorCount: 3            // Sprites que fallaron
// }

const memory = terrainResourceManager.getMemoryUsage();
// 15728640 bytes (~15 MB)
```

### 10.2 Errores Comunes

- **Sprite no encontrado**: Se registra en `loadingState.errors`
- **Canvas context null**: Se ignora el sprite silenciosamente
- **Memoria agotada**: LRU evicta automáticamente

---

## 11. Configuración Recomendada

| Escenario | maxCacheSize | defaultTileSize |
|-----------|--------------|-----------------|
| Desktop | 500-1000 | 72 |
| Mobile | 200-300 | 48 |
| Low-end | 100 | 36 |

---

## 12. Diagramas de Secuencia

### 12.1 Primera Carga del Mapa

```
Player Movement
      │
      ▼
getVisibleTiles()
      │
      ▼
preloadViewport()
      │
      ▼
   ┌──────┐
   │Chunk │ × N
   │  10  │
   └──────┘
      │
      ▼
loadTileResources()
      │
      ├──► getTerrainSprites()
      │         │
      ├──► preloadSprite() ──► WesnothAtlas.getSprite()
      │                            │
      │                            ▼
      │                    Create Canvas
      │                            │
      │                            ▼
      │                    spriteCache.set()
      │
      ▼
tileDataCache.set()
      │
      ▼
drawTile() → render frame
```

### 12.2 Renderizado Continuo

```
Frame Update
      │
      ▼
render() loop
      │
      ├──► drawTile() → spriteCache.get() → ctx.drawImage()
      │                                    (O(1) - no I/O)
      │
      ├──► drawTile() → spriteCache.get() → ctx.drawImage()
      │
      └──► drawTile() → spriteCache.get() → ctx.drawImage()
```

---

## 13. Conclusión

El `TerrainResourceManager` proporciona:

1. **Rendimiento**: Sprites pre-renderizados en canvas, cache O(1)
2. **Memoria**: LRU con evicción automática, control de límites
3. **UX**: Loading states, progreso de carga, precarga predictiva
4. **Integración**: Compatible con HexTileRenderer existente

El sistema está diseñado para escalar desde dispositivos móviles hasta desktops de alto rendimiento con configuración adaptable.
