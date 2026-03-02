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
**No test framework is currently configured.** To add testing, consider installing Vitest:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

To run a single test file with Vitest:
```bash
npx vitest run src/path/to/test.file.ts
# or watch mode:
npx vitest src/path/to/test.file.ts
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
