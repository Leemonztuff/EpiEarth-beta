# AGENTS.md - EpiEarth Tactics Development Guide

EpiEarth Tactics es un RPG táctico construido con React 18, TypeScript, Three.js (@react-three/fiber), Zustand y Supabase. Usa Vite.

## Commands

### Development
```bash
npm run dev          # Start dev server on port 3000
```

### Build
```bash
npm run build        # Run TypeScript check (tsc) then build with Vite
npm run preview      # Preview production build
```

### Testing
```bash
npm test             # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage
```

**Single Test Execution:**
```bash
npx vitest run src/path/to/test.file.ts              # Run specific test file
npx vitest run --grep "pattern"                      # Run tests matching pattern
npx vitest run src/test/dndRules.test.ts             # Run specific test with coverage
```

### Type Checking
```bash
npx tsc --noEmit     # TypeScript type checking only
```

Note: No lint command configured (no ESLint/Prettier).

## Project Structure

```
src/test/           # Test setup and test files
services/           # Business logic (dndRules.ts, WorldGenerator.ts, etc.)
store/              # Zustand state (gameStore.ts + slices/)
store/slices/       # Zustand slice definitions (playerSlice.ts, etc.)
components/         # React components
components/battle/  # Battle system components (BattleScene, CinematicCamera, etc.)
components/ui/      # UI components
data/               # Static game data
constants.ts        # Game constants, enums, configuration
types.ts            # TypeScript types and enums
```

## Code Style Guidelines

### General
- Use TypeScript for all new code
- Prefer functional components and hooks
- Keep components small and focused (single responsibility)
- Avoid `any` - use `unknown` when type is unknown
- Use enums for type-safe string constants (see types.ts)

### Imports (order matters)
1. React core imports
2. TypeScript types/interfaces
3. External libraries
4. Internal components
5. Internal services/stores
6. Constants/assets

Use `@` alias: `import { x } from '@/services/module'` or `../../types`

### Naming Conventions
- **Components**: PascalCase (`BattleScene.tsx`, `ErrorBoundary.tsx`)
- **Functions/variables**: camelCase (`calculateDamage`, `rollD20`)
- **Types/interfaces**: PascalCase (`Entity`, `BattleCell`, `PlayerSlice`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_LEVEL`, `HEX_SIZE`)
- **Enums**: PascalCase with UPPER_SNAKE_CASE values (`CharacterClass.FIGHTER`)
- **Files**: kebab-case for utils, PascalCase for components/classes

### TypeScript
- Use enums for fixed sets of values (CharacterClass, Ability, TerrainType)
- Use interfaces for extensible object shapes
- Use type aliases for unions/intersections
- Use `as const` for literal types
- tsconfig: ES2022, jsx: react-jsx, moduleResolution: bundler

### React & Zustand
- Functional components with hooks, memoize expensive calcs with useMemo
- Zustand slice pattern:
  1. Define interface in `store/slices/[name]Slice.ts`
  2. Create slice with `StateCreator<T, [], [], T>` pattern
  3. Compose in `store/gameStore.ts`
- Use selectors: `useGameStore(s => s.someState)`
- ErrorBoundary wraps complex components (see components/ErrorBoundary.tsx)

### Error Handling & Logging
- Use try/catch for async operations
- Add error boundaries around complex components
- Use custom logger: `import { logger } from '../services/logger'`
- Log with context: `logger.ui.error('[ComponentName] Message', details)`

### CSS/Styling
- Use Tailwind CSS utility classes
- Dark theme colors: slate-900, amber-600, etc.
- Avoid inline styles except for dynamic values
- Z-index scale: 50 (base), 9999 (modals)

### Three.js / React Three Fiber
- Dispose geometries/materials in `useEffect` cleanup
- Use `useFrame` for animation loops
- Keep 3D scene logic separate from UI
- Use `shaderMaterial` from drei

## Testing Guidelines
- Test files alongside source: `service.ts` → `src/test/service.test.ts`
- Use Vitest `describe` and `it` blocks
- Mock external dependencies (Supabase, Gemini API)
- Test game logic in isolation
- Test setup: `src/test/setup.ts` imports `@testing-library/jest-dom`

## Known Technical Notes

### Environment Variables
Create `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

### Dependencies
- React: react, react-dom, @react-three/fiber, @react-three/drei
- State: zustand (v4)
- 3D: three, three-stdlib
- Backend: @supabase/supabase-js
- AI: @google/genai
- Test: vitest, @testing-library/react, jsdom

### Performance
- Code-split heavy components (BattleScene, OverworldMap)
- Memoize expensive calculations with useMemo
- Object pooling for projectiles/particles
- Build chunks: 'three', 'vendor'

### Git Conventions
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

## Common Issues
- Build fails: try `npm install --legacy-peer-deps`
- Check types: `npx tsc --noEmit`
- Dev server: http://localhost:3000

## Game Flow (Current)

```
TITLE → OVERWORLD (Hex Map)
           │
           ├──[Enemy Tile]──► EXPLORATION_3D (Kagero Mode) ──► OVERWORLD
           │
           ├──[Dungeon Tile]──► EXPLORATION_3D (Kagero Mode) ──► OVERWORLD
           │
           ├──[Settlement]──► TOWN_EXPLORATION ──► OVERWORLD
           │
           └──[Other POIs]──► Various screens ──► OVERWORLD
```

## Kagero 2-Style Mission Mode

The game implements a Kagero 2-style trap hunting system in `components/Exploration3DScene.tsx`.

### Mission State Machine (KageroMissionState enum in types.ts)
```
WORLD_HEX → MISSION_LOAD → THIRD_PERSON_EXPLORATION ↔ TACTICAL_MODE
                                                         ↓
                                          ENEMY_APPROACH → TRAP_TRIGGER
                                                         ↓
                                              COMBO_RESOLUTION
                                                         ↓
                                                  VICTORY_CHECK
                                                         ↓
                                              MISSION_COMPLETE
                                                         ↓
                                                  RETURN_TO_HEX
```

### Inside Kagero Mission:
- `EXPLORATION` - Player moves in 3D, enemies patrol
- `TACTICAL_MODE` - Grid overlay, trap placement on floor/wall/ceiling
- `ENEMY_APPROACH` - Enemy AI detects and moves toward player
- `TRAP_TRIGGER` - Enemy triggers trap
- `COMBO_RESOLUTION` - Chain effects resolve
- `VICTORY_CHECK` - Check if mission complete

### Controls
- **[T]** Toggle between EXPLORATION ↔ TACTICAL mode
- **[WASD]** Move player in exploration mode
- **[Click]** Place/remove trap on grid cell
- **[1/2/3]** Switch surface: floor/wall/ceiling
- **[ESC]** Exit tactical mode or leave mission

### Systems Implemented
1. **3D Exploration** - Third-person camera, dungeon environment, WASD movement
2. **Tactical Trap Grid** - Overlay on floor/wall/ceiling surfaces
3. **Surface Selection** - Choose placement surface for traps
4. **Trap Preview** - See trap effect before placement
5. **Enemy AI** - Patrol → Detect → Chase → Trap Trigger → React
6. **Combo System** - Chain traps by timing and position
7. **Mission Progression** - Progress bar, victory conditions

### Key Interfaces (types.ts)
- `KageroMission` - Main mission state container
- `KageroRoom` - Room with trap slots and enemies
- `PlacedTrap` - Trap with position, surface, effects, cooldown
- `KageroEnemyState` - Enemy with AI state, patrol path, reactions
- `TrapPlacementSurface` - 'floor' | 'wall' | 'ceiling'

### Key Files
- `components/Exploration3DScene.tsx` - Main 3D scene with state machine
- `store/slices/explorationSlice.ts` - Zone initialization via `initZone()`
- `services/trapHuntMap.ts` - Tactical map generation (18x18 grid)
- `data/trapsData.ts` - Trap definitions and balance values
- `types.ts` - `KageroMissionState` enum and interfaces
