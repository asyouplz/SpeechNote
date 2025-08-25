import type { IStateManager, AppState, StateListener, Unsubscribe } from '../types';

export class StateManager implements IStateManager {
    private state: AppState = {
        status: 'idle',
        currentFile: null,
        progress: 0,
        error: null,
        history: [],
    };
    private listeners: Set<StateListener> = new Set();

    getState(): Readonly<AppState> {
        return Object.freeze({ ...this.state });
    }

    setState(updates: Partial<AppState>): void {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };
        this.notifyListeners(prevState);
    }

    subscribe(listener: StateListener): Unsubscribe {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    reset(): void {
        this.setState({
            status: 'idle',
            currentFile: null,
            progress: 0,
            error: null,
        });
    }

    private notifyListeners(prevState: AppState): void {
        this.listeners.forEach((listener) => {
            listener(this.state, prevState);
        });
    }
}