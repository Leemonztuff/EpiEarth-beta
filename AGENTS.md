# AGENTS.md - EpiEarth Tactics Development Guide

## Project Overview

EpiEarth Tactics is a tactical RPG game built with React 18, TypeScript, Three.js (@react-three/fiber), Zustand for state management, and Supabase for backend services. The project uses Vite as the build tool.

## Commands

### Development
```bash
npm run dev          # Start development server on port 3000
```

### Build
```bash
npm run build        # Run TypeScript check (tsc) then build with Vite
npm run preview      # Preview production build
```

### Testing
```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

To run a single test file:
```bash
npx vitest run src/path/to/test.file.ts
```

### Type Checking
```bash
npx tsc --noEmit     # TypeScript type checking only
```

## Code Style Guidelines

### General Principles
- Use TypeScript for all new code - avoid plain JavaScript
- Prefer functional components and hooks over class components
- Keep components small and focused on a single responsibility
- Use explicit typing rather than `any`

### File Organization
```
components/          # React components
  battle/            # Battle scene components
  ui/                # Reusable UI components
  admin/             # Admin-related components
store/               # Zustand state management
  slices/            # Store slices for modular state
services/            # Business logic and external integrations
shaders/              # GLSL shader files
tools/                # Utility scripts
```

### Imports
Order imports as follows:
1. React core imports
2. TypeScript types/interfaces
3. External libraries
4. Internal components
5. Internal services/stores
6. Constants/assets

Example:
```typescript
import React, { useEffect, useState, useMemo } from 'react';
import { SomeType, AnotherType } from './types';
import { useGameStore } from './store/gameStore';
import { calculateDamage } from './services/dndRules';
import { UIOverlay } from './components/UIOverlay';
import { ATTACK_ICONS } from '../constants';
```

Use the `@` alias for absolute imports from root:
```typescript
import { SomeModule } from '@/services/module';
```

### Naming Conventions
- **Components**: PascalCase (e.g., `BattleScene.tsx`, `OverworldMap.tsx`)
- **Functions/variables**: camelCase (e.g., `calculateDamage`, `currentPlayer`)
- **Types/interfaces**: PascalCase with descriptive names (e.g., `Entity`, `BattleCell`)
- **Constants**: UPPER_SNAKE_CASE for values, PascalCase for objects (e.g., `MAX_LEVEL`, `GameState`)
- **Files**: kebab-case for utilities, PascalCase for components

### TypeScript Guidelines
- Use interfaces for object shapes that may be extended
- Use type aliases for unions, intersections, and computed types
- Avoid `any` - use `unknown` when type is truly unknown
- Enable strict null checks
- Use `const` assertions (`as const`) for literal types

### React Patterns
- Use functional components with explicit return types for export:
```typescript
export const BattleScene: React.FC<Props> = ({ prop1, prop2 }) => {
  // component logic
};
```
- Use `useMemo` for expensive calculations
- Use `useCallback` for callbacks passed to child components
- Avoid inline object definitions for styles/props

### Zustand Store
The project uses Zustand with a slice pattern:
```typescript
// store/slices/featureSlice.ts
import { StateCreator } from 'zustand';

export interface FeatureSlice {
  someState: string;
  someAction: () => void;
}

export const createFeatureSlice: StateCreator<Store, [], [], FeatureSlice> = (set, get) => ({
  someState: '',
  someAction: () => set({ someState: 'updated' }),
});
```
- Import slices and compose in `gameStore.ts`
- Use selectors for optimal re-renders: `useGameStore(s => s.someState)`

### Error Handling
- Use try/catch for async operations
- Add error boundaries around complex components
- Log errors with contextual information: `console.error('[COMPONENT] Error:', error)`
- Handle unhandled rejections in entry points

### CSS/Styling
- Use Tailwind CSS classes for styling
- Avoid inline styles except for dynamic values
- Use consistent spacing and color tokens

### Three.js / React Three Fiber
- Dispose of geometries and materials in `useEffect` cleanup
- Use `useFrame` for animation loops
- Keep 3D scene logic separate from UI logic

### Git Conventions
- Use clear, descriptive commit messages
- Keep commits focused and atomic
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

### Adding New Dependencies
Before adding a new package, check if existing dependencies can fulfill the need:
- **React ecosystem**: react, react-dom, @react-three/fiber, @react-three/drei
- **State**: zustand (current choice)
- **3D**: three, three-stdlib
- **Backend**: @supabase/supabase-js
- **AI**: @google/genai

## Known Technical Notes

### Environment Variables
Create `.env.local` with:
```
GEMINI_API_KEY=your_api_key_here
```

### Type Checking Suppression
Some legacy files may contain `// @ts-nocheck` - avoid adding new suppressions.

### Asset Loading
Use the `AssetManager` service for handling game assets. Large assets should be lazy-loaded using React.lazy.

### Performance Considerations
- Code-split heavy components (BattleScene, OverworldMap)
- Memoize expensive game calculations
- Use object pooling for frequently created/destroyed objects (projectiles, particles)

## Battle System Patterns

### Battle Scene Components
Battle-related components are located in `components/battle/`:
- `BattleScene.tsx` - Main battle canvas with 3D rendering
- `CinematicCamera.tsx` - Camera control and transitions
- `TerrainLayer.tsx` - Grid-based terrain rendering with InstancedMesh
- `EntityRenderer.tsx` - Character/enemy sprite rendering
- `LightingSystem.tsx` - Dynamic lighting per biome
- `FogController.tsx` - Atmospheric fog effects
- `PixelPostProcess.tsx` - Pixel-art post-processing shader

### Post-Processing Pipeline
The battle scene uses a custom pixel-art post-processing pipeline:
```tsx
<PixelPostProcess 
    pixelSize={3}        // Resolution divisor
    colorDepth={16}      // Color levels per channel
    ditherIntensity={0.4}
    enablePalette={false} // Optional palette limitation
/>
```

### Three.js Shaders
Custom shaders should use `@react-three/fiber` patterns:
- Use `shaderMaterial` from drei for reusable materials
- Handle cleanup in `useEffect` return
- Use `useFrame` for animated shaders

## Testing Guidelines

### Single Test Execution
```bash
# Run specific test file
npx vitest run src/path/to/test.file.ts

# Run tests matching a pattern
npx vitest run --grep "battle"

# Run with coverage for specific file
npx vitest run src/services/dndRules.test.ts --coverage
```

### Test Patterns
- Place tests alongside source files: `service.ts` → `service.test.ts`
- Use Vitest's `describe` and `it` blocks
- Mock external dependencies (Supabase, Gemini API)
- Test game logic (damage calculation, pathfinding) in isolation

## Common Issues

### Build Errors
- If `npm run build` fails with peer dependencies, try `npm install --legacy-peer-deps`
- Run `npx tsc --noEmit` to check types without building

### Development Server
- Server runs on port 3000: `http://localhost:3000`
- Use `npm run dev` for hot-reload development
