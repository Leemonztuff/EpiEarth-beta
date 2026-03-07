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
npx vitest run src/services/dndRules.test.ts        # Run with coverage
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
components/     # React components (battle/, ui/)
store/          # Zustand state (slices/)
services/       # Business logic
shaders/        # GLSL shaders
```

### Imports (order matters)
1. React core imports
2. TypeScript types/interfaces
3. External libraries
4. Internal components
5. Internal services/stores
6. Constants/assets

Use `@` alias: `import { x } from '@/services/module'`

### Naming
- **Components**: PascalCase (`BattleScene.tsx`)
- **Functions/variables**: camelCase (`calculateDamage`)
- **Types/interfaces**: PascalCase (`Entity`, `BattleCell`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_LEVEL`)
- **Files**: kebab-case for utils, PascalCase for components

### TypeScript
- Use interfaces for extensible object shapes
- Use type aliases for unions/intersections
- Use `as const` for literal types
- tsconfig: ES2022, jsx: react-jsx, moduleResolution: bundler

### React & Zustand
- Functional components with hooks, memoize expensive calcs with useMemo
- Zustand slice pattern: define interface, create slice with StateCreator, compose in gameStore.ts
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
- Use `shaderMaterial` from drei

## Known Technical Notes

### Environment Variables
Create `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

### Dependencies
- React: react, react-dom, @react-three/fiber, @react-three/drei
- State: zustand
- 3D: three, three-stdlib
- Backend: @supabase/supabase-js
- AI: @google/genai
- Test: vitest, @testing-library/react, jsdom

### Performance
- Code-split heavy components (BattleScene, OverworldMap)
- Memoize expensive calculations
- Object pooling for projectiles/particles
- Build chunks: 'three', 'vendor'

### Battle Components
`components/battle/`: BattleScene, CinematicCamera, TerrainLayer, EntityRenderer, LightingSystem, FogController, PixelPostProcess

### Git Conventions
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

## Testing Guidelines
- Tests alongside source: `service.ts` → `service.test.ts`
- Use Vitest `describe` and `it` blocks
- Mock external dependencies (Supabase, Gemini API)
- Test game logic in isolation

## Common Issues
- Build fails: try `npm install --legacy-peer-deps`
- Check types: `npx tsc --noEmit`
- Dev server: http://localhost:3000
