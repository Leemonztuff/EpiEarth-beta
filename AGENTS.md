# AGENTS.md - EpiEarth Tactics Development Guide

## Project Overview

EpiEarth Tactics is a tactical RPG built with React 18, TypeScript, Three.js (@react-three/fiber), Zustand, and Supabase. Uses Vite.

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

### Single Test Execution
```bash
npx vitest run src/path/to/test.file.ts              # Run specific test file
npx vitest run --grep "pattern"                     # Run tests matching pattern
npx vitest run src/services/dndRules.test.ts --coverage
```

### Type Checking
```bash
npx tsc --noEmit     # TypeScript type checking only
```

Note: No lint command configured (no ESLint/Prettier).

## Code Style Guidelines

### General
- Use TypeScript for all new code
- Prefer functional components and hooks
- Keep components small and focused
- Avoid `any` - use `unknown` when type is unknown

### File Organization
```
components/          # React components
  battle/            # Battle scene components
  ui/                # Reusable UI components
store/               # Zustand state management
  slices/            # Store slices
services/            # Business logic
shaders/             # GLSL shaders
```

### Imports (order matters)
1. React core imports
2. TypeScript types/interfaces
3. External libraries
4. Internal components
5. Internal services/stores
6. Constants/assets

Use `@` alias for absolute imports: `import { x } from '@/services/module'`

### Naming
- **Components**: PascalCase (`BattleScene.tsx`)
- **Functions/variables**: camelCase (`calculateDamage`)
- **Types/interfaces**: PascalCase (`Entity`, `BattleCell`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_LEVEL`)
- **Files**: kebab-case for utils, PascalCase for components

### TypeScript
- Use interfaces for extensible object shapes
- Use type aliases for unions/intersections
- Enable strict null checks
- Use `as const` for literal types

### React Patterns
```typescript
export const MyComponent: React.FC<Props> = ({ prop1 }) => {
  // useMemo for expensive calculations
  // useCallback for callbacks to children
  // Avoid inline object definitions
};
```

### Zustand Store (Slice Pattern)
```typescript
// store/slices/featureSlice.ts
export interface FeatureSlice {
  state: string;
  action: () => void;
}

export const createFeatureSlice: StateCreator<Store, [], [], FeatureSlice> = (set) => ({
  state: '',
  action: () => set({ state: 'updated' }),
});
```
- Compose slices in `gameStore.ts`
- Use selectors: `useGameStore(s => s.someState)`

### Error Handling
- Use try/catch for async operations
- Add error boundaries around complex components
- Log with context: `console.error('[COMPONENT] Error:', error)`

### CSS/Styling
- Use Tailwind CSS classes
- Avoid inline styles except for dynamic values

### Three.js / React Three Fiber
- Dispose geometries/materials in `useEffect` cleanup
- Use `useFrame` for animation loops
- Keep 3D scene logic separate from UI

### Git Conventions
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

## Known Technical Notes

### Environment Variables
Create `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

### Dependencies (check before adding new)
- React: react, react-dom, @react-three/fiber, @react-three/drei
- State: zustand
- 3D: three, three-stdlib
- Backend: @supabase/supabase-js
- AI: @google/genai

### Performance
- Code-split heavy components (BattleScene, OverworldMap)
- Memoize expensive calculations
- Object pooling for projectiles/particles

### Battle System Components
`components/battle/`: BattleScene, CinematicCamera, TerrainLayer, EntityRenderer, LightingSystem, FogController, PixelPostProcess

### Post-Processing
```tsx
<PixelPostProcess 
  pixelSize={3}
  colorDepth={16}
  ditherIntensity={0.4}
  enablePalette={false}
/>
```

### Three.js Shaders
- Use `shaderMaterial` from drei
- Handle cleanup in `useEffect`
- Use `useFrame` for animated shaders

## Testing Guidelines
- Tests alongside source: `service.ts` → `service.test.ts`
- Use Vitest `describe` and `it` blocks
- Mock external dependencies (Supabase, Gemini API)
- Test game logic in isolation

## Common Issues
- Build fails: try `npm install --legacy-peer-deps`
- Check types: `npx tsc --noEmit`
- Dev server: http://localhost:3000
