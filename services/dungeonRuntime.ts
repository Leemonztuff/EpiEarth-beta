import { DungeonRuntimeState, PoiStateTag } from '../types';
import { getDungeonBlueprint } from '../data/dungeonBlueprints';
import { generateMixedDungeonLayout } from './dungeonLayout';

function resolveStateTag(threatLevel: number, timelineDay: number): PoiStateTag {
    if (timelineDay >= 3 || threatLevel >= 6) return 'Collapsing';
    if (threatLevel >= 4) return 'Contested';
    if (threatLevel >= 2) return 'Active';
    return 'Dormant';
}

export function createDungeonRuntime(
    dungeonId: string,
    blueprintId: string,
    initialWorldDay = 0,
    layoutSeed?: string
): DungeonRuntimeState {
    const blueprint = getDungeonBlueprint(blueprintId);
    const roomGraph = generateMixedDungeonLayout(blueprint, layoutSeed || `${dungeonId}:${initialWorldDay}`);
    const roomStates: DungeonRuntimeState['roomStates'] = {};
    Object.keys(roomGraph.rooms).forEach(roomId => {
        roomStates[roomId] = roomId === roomGraph.entryRoomId ? 'active' : 'unseen';
    });
    const doorStates: DungeonRuntimeState['doorStates'] = {};
    Object.values(roomGraph.doors).forEach(door => {
        doorStates[door.id] = door.state;
    });

    return {
        dungeonId,
        blueprintId: blueprint.id,
        lastSyncedWorldDay: initialWorldDay,
        threatLevel: 2,
        factionControl: 'Goblins',
        timelineDay: 0,
        resolvedRooms: [],
        discoveredSecrets: [],
        remainingLootTier: 5,
        activeTwists: [blueprint.twist],
        nextTimelineEventIndex: 0,
        roomCursor: 0,
        stateTag: 'Dormant',
        roomStates,
        doorStates,
        discoveredRooms: roomGraph.entryRoomId ? [roomGraph.entryRoomId] : [],
        activeRoomId: roomGraph.entryRoomId || null,
        roomGraph,
    };
}

export function advanceDungeonTimeline(state: DungeonRuntimeState, daysAdvanced: number): {
    next: DungeonRuntimeState;
    eventsApplied: string[];
} {
    if (daysAdvanced <= 0) {
        return { next: state, eventsApplied: [] };
    }

    const blueprint = getDungeonBlueprint(state.blueprintId);
    let next = { ...state, timelineDay: state.timelineDay + daysAdvanced };
    const eventsApplied: string[] = [];

    while (next.nextTimelineEventIndex < blueprint.timelineEvents.length) {
        const event = blueprint.timelineEvents[next.nextTimelineEventIndex];
        if (event.day > next.timelineDay) {
            break;
        }

        next = {
            ...next,
            threatLevel: Math.min(10, next.threatLevel + event.threatDelta),
            remainingLootTier: Math.max(1, next.remainingLootTier - event.lootPenalty),
            factionControl: event.factionControl ?? next.factionControl,
            activeTwists: event.twist && !next.activeTwists.includes(event.twist)
                ? [...next.activeTwists, event.twist]
                : next.activeTwists,
            nextTimelineEventIndex: next.nextTimelineEventIndex + 1,
        };
        eventsApplied.push(event.label);
    }

    next.stateTag = resolveStateTag(next.threatLevel, next.timelineDay);
    return { next, eventsApplied };
}

export function markDungeonRoomResolved(state: DungeonRuntimeState, roomId: string, discoveredSecret?: string): DungeonRuntimeState {
    const wasResolved = state.resolvedRooms.includes(roomId);
    const resolvedRooms = wasResolved
        ? state.resolvedRooms
        : [...state.resolvedRooms, roomId];
    const discoveredSecrets = discoveredSecret && !state.discoveredSecrets.includes(discoveredSecret)
        ? [...state.discoveredSecrets, discoveredSecret]
        : state.discoveredSecrets;

    const roomCursor = wasResolved
        ? state.roomCursor
        : Math.min(state.roomCursor + 1, resolvedRooms.length);
    const roomStates = {
        ...state.roomStates,
        [roomId]: 'resolved' as const,
    };
    const nextRoom = Object.keys(roomStates).find(key => roomStates[key] !== 'resolved') ?? null;
    if (nextRoom && roomStates[nextRoom] === 'unseen') {
        roomStates[nextRoom] = 'active';
    }
    return {
        ...state,
        resolvedRooms,
        discoveredSecrets,
        roomCursor,
        roomStates,
        activeRoomId: nextRoom,
    };
}

export function openDungeonDoor(state: DungeonRuntimeState, doorId: string): DungeonRuntimeState {
    if (!state.roomGraph || !state.roomGraph.doors[doorId]) return state;
    const door = state.roomGraph.doors[doorId];
    const doorStates = { ...state.doorStates, [doorId]: 'open' as const };
    const roomStates = { ...state.roomStates };

    if (roomStates[door.toRoomId] === 'unseen') {
        roomStates[door.toRoomId] = 'active';
    }

    return {
        ...state,
        doorStates,
        roomStates,
        discoveredRooms: state.discoveredRooms.includes(door.toRoomId)
            ? state.discoveredRooms
            : [...state.discoveredRooms, door.toRoomId],
    };
}
