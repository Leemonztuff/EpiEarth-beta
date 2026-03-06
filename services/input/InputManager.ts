
import { isTouchDevice } from '../TouchFeedback';

export enum InputType {
    MOVE_TO = 'MOVE_TO',
    INTERACT = 'INTERACT',
    CONTEXT_MENU = 'CONTEXT_MENU',
    CANCEL = 'CANCEL'
}

export interface InputEvent {
    type: InputType;
    q?: number;
    r?: number;
    x?: number;
    z?: number;
    originalEvent: any;
}

export type InputCallback = (event: InputEvent) => void;

class InputManager {
    private callbacks: Set<InputCallback> = new Set();
    private isMobile: boolean = isTouchDevice();

    constructor() {
        if (typeof window !== 'undefined') {
            this.setupListeners();
        }
    }

    private setupListeners() {
        // We'll use a mix of React event handlers and global listeners where needed.
        // For now, this manager will mostly serve as a translator.
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
}

export const inputManager = new InputManager();
