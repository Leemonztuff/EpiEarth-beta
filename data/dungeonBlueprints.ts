import { DungeonBlueprint } from '../types';

export const DUNGEON_BLUEPRINTS: DungeonBlueprint[] = [
    {
        id: 'dorgotar-crypt',
        name: 'Cripta de Dorgotar',
        hook: 'El gremio mercante paga por limpiar la cripta antes de que una tercera faccion saquee todo.',
        twist: 'Una caverna natural conecta con la cripta y un depredador acecha en la oscuridad.',
        rooms: [
            { id: 'fountain-hall', objective: 'investigate', label: 'Investigar la fuente ritual.' },
            { id: 'ambush-gallery', objective: 'survive_n_rounds', label: 'Resistir la emboscada 4 rondas.' },
            { id: 'blood-corner', objective: 'investigate', label: 'Seguir rastros de sangre hacia una puerta secreta.', isSecret: true },
            { id: 'altar-trap', objective: 'disarm_trap', label: 'Desactivar la trampa del altar.' },
            { id: 'collapsed-barrels', objective: 'clear', label: 'Limpiar la sala de barriles y asegurar el paso.' },
            { id: 'chasm-bridge', objective: 'elite_contact', label: 'Derrotar a la elite del abismo.', elite: true },
        ],
        timelineEvents: [
            {
                id: 'goblin-skirmish',
                day: 1,
                label: 'Goblins se reagrupan en la entrada.',
                threatDelta: 1,
                lootPenalty: 0,
                factionControl: 'Goblins',
            },
            {
                id: 'bandit-raid',
                day: 2,
                label: 'Bandidos irrumpen para robar el botin.',
                threatDelta: 2,
                lootPenalty: 1,
                factionControl: 'Contested',
            },
            {
                id: 'collapse-warning',
                day: 3,
                label: 'La estructura colapsa parcialmente.',
                threatDelta: 1,
                lootPenalty: 1,
                twist: 'Pasillos inestables; menos rutas seguras.',
            },
        ],
    },
];

export function getDungeonBlueprint(id: string): DungeonBlueprint {
    return DUNGEON_BLUEPRINTS.find(bp => bp.id === id) ?? DUNGEON_BLUEPRINTS[0];
}

