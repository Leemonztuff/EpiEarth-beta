/**
 * Simple pathfinding for 3D exploration maps using BFS (Breadth-First Search)
 * Works with square grids where only FLOOR tiles can be traversed
 */

export interface GridPoint {
    x: number;
    z: number;
}

export interface GridCell {
    type: 'FLOOR' | 'WALL' | 'TREE' | 'ROCK' | 'WATER';
}

const GRID_DIRECTIONS: Array<[number, number]> = [
    [0, -1], // North
    [1, 0],  // East
    [0, 1],  // South
    [-1, 0], // West
    // Diagonals (optional - set includeDiagonals = false in options)
    [1, -1], // NE
    [1, 1],  // SE
    [-1, 1], // SW
    [-1, -1] // NW
];

export interface PathfindingOptions {
    mapSize: number;
    includeDiagonals?: boolean;
}

export const findPath = (
    start: GridPoint,
    goal: GridPoint,
    map: GridCell[][],
    options: PathfindingOptions = { mapSize: 20, includeDiagonals: false }
): GridPoint[] | null => {
    const { mapSize, includeDiagonals = false } = options;

    // Early exit if start === goal
    if (start.x === goal.x && start.z === goal.z) {
        return [start];
    }

    // Validate positions
    if (
        start.x < 0 || start.x >= mapSize || start.z < 0 || start.z >= mapSize ||
        goal.x < 0 || goal.x >= mapSize || goal.z < 0 || goal.z >= mapSize ||
        map[goal.x]?.[goal.z]?.type !== 'FLOOR'
    ) {
        return null;
    }

    const queue: GridPoint[] = [start];
    const visited = new Set<string>();
    const parent = new Map<string, GridPoint | null>();
    
    const key = (p: GridPoint) => `${p.x},${p.z}`;
    visited.add(key(start));
    parent.set(key(start), null);

    while (queue.length > 0) {
        const current = queue.shift()!;

        if (current.x === goal.x && current.z === goal.z) {
            // Reconstruct path
            const path: GridPoint[] = [];
            let p: GridPoint | null = goal;
            while (p !== null) {
                path.unshift(p);
                p = parent.get(key(p)) || null;
            }
            return path;
        }

        // Explore neighbors
        const directions = includeDiagonals ? GRID_DIRECTIONS : GRID_DIRECTIONS.slice(0, 4);
        for (const [dx, dz] of directions) {
            const next: GridPoint = { x: current.x + dx, z: current.z + dz };
            const nextKey = key(next);

            // Check bounds
            if (next.x < 0 || next.x >= mapSize || next.z < 0 || next.z >= mapSize) {
                continue;
            }

            // Check if already visited
            if (visited.has(nextKey)) {
                continue;
            }

            // Check if walkable
            const cell = map[next.x]?.[next.z];
            if (!cell || cell.type !== 'FLOOR') {
                continue;
            }

            visited.add(nextKey);
            parent.set(nextKey, current);
            queue.push(next);
        }
    }

    // No path found
    return null;
};

/**
 * Get the next step in a path (useful for incremental movement)
 */
export const getNextStep = (path: GridPoint[]): GridPoint | null => {
    return path.length > 1 ? path[1] : null;
};
