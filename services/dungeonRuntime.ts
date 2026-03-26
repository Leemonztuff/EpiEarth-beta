import { DungeonRuntimeState, PoiStateTag } from '../types';
import { getDungeonBlueprint } from '../data/dungeonBlueprints';

function resolveStateTag(threatLevel: number, timelineDay: number): PoiStateTag {
    if (timelineDay >= 3 || threatLevel >= 6) return 'Collapsing';
    if (threatLevel >= 4) return 'Contested';
    if (threatLevel >= 2) return 'Active';
    return 'Dormant';
}

export function createDungeonRuntime(dungeonId: string, blueprintId: string, initialWorldDay = 0): DungeonRuntimeState {
    const blueprint = getDungeonBlueprint(blueprintId);
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
    return {
        ...state,
        resolvedRooms,
        discoveredSecrets,
        roomCursor,
    };
}
