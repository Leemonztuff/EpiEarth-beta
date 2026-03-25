
import { isTouchDevice } from '../TouchFeedback';

export enum InputType {
    MOVE_UP = 'MOVE_UP',
    MOVE_DOWN = 'MOVE_DOWN',
    MOVE_LEFT = 'MOVE_LEFT',
    MOVE_RIGHT = 'MOVE_RIGHT',
    MOVE_TO = 'MOVE_TO',
    INTERACT = 'INTERACT',
    CONTEXT_MENU = 'CONTEXT_MENU',
    CANCEL = 'CANCEL',
    ACTION_1 = 'ACTION_1',
    ACTION_2 = 'ACTION_2',
    ACTION_3 = 'ACTION_3'
}

export interface InputEvent {
    type: InputType;
    q?: number;
    r?: number;
    x?: number;
    z?: number;
    originalEvent?: any;
}

export type InputCallback = (event: InputEvent) => void;

class InputManager {
    private callbacks: Set<InputCallback> = new Set();
    private isMobile: boolean = isTouchDevice();
    private activeKeys: Set<string> = new Set();

    constructor() {
        if (typeof window !== 'undefined') {
            this.setupListeners();
        }
    }

    private setupListeners() {
        window.addEventListener('keydown', (e) => {
            this.activeKeys.add(e.key.toLowerCase());
            this.handleKeyDown(e);
        });

        window.addEventListener('keyup', (e) => {
            this.activeKeys.delete(e.key.toLowerCase());
        });

        // Prevenir scroll con flechas
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    private handleKeyDown(e: KeyboardEvent) {
        const keyMap: Record<string, InputType> = {
            'w': InputType.MOVE_UP,
            's': InputType.MOVE_DOWN,
            'a': InputType.MOVE_LEFT,
            'd': InputType.MOVE_RIGHT,
            'arrowup': InputType.MOVE_UP,
            'arrowdown': InputType.MOVE_DOWN,
            'arrowleft': InputType.MOVE_LEFT,
            'arrowright': InputType.MOVE_RIGHT,
            'e': InputType.INTERACT,
            'f': InputType.INTERACT,
            'escape': InputType.CANCEL,
            '1': InputType.ACTION_1,
            '2': InputType.ACTION_2,
            '3': InputType.ACTION_3
        };

        const type = keyMap[e.key.toLowerCase()];
        if (type) {
            this.emit({ type, originalEvent: e });
        }
    }

    public subscribe(cb: InputCallback) {
        this.callbacks.add(cb);
        return () => this.callbacks.delete(cb);
    }

    public emit(event: InputEvent) {
        this.callbacks.forEach(cb => cb(event));
    }

    public getIsMobile() {
        return this.isMobile;
    }

    public isKeyDown(key: string): boolean {
        return this.activeKeys.has(key.toLowerCase());
    }
}

export const inputManager = new InputManager();
