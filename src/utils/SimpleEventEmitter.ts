/**
 * Simple EventEmitter implementation to replace Node.js 'events' module
 * This is compatible with Obsidian plugin requirements (no Node.js builtins)
 */

type EventCallback = (...args: unknown[]) => void;

export class SimpleEventEmitter {
    private events: Map<string, Set<EventCallback>> = new Map();

    /**
     * Register an event listener
     */
    on(event: string, callback: EventCallback): this {
        let set = this.events.get(event);
        if (!set) {
            set = new Set();
            this.events.set(event, set);
        }
        set.add(callback);
        return this;
    }

    /**
     * Register a one-time event listener
     */
    once(event: string, callback: EventCallback): this {
        const wrappedCallback: EventCallback = (...args) => {
            this.off(event, wrappedCallback);
            callback(...args);
        };
        return this.on(event, wrappedCallback);
    }

    /**
     * Remove an event listener
     */
    off(event: string, callback: EventCallback): this {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.events.delete(event);
            }
        }
        return this;
    }

    /**
     * Emit an event
     */
    emit(event: string, ...args: unknown[]): boolean {
        const callbacks = this.events.get(event);
        if (!callbacks || callbacks.size === 0) {
            return false;
        }

        callbacks.forEach((callback) => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in event listener for '${event}':`, error);
            }
        });

        return true;
    }

    /**
     * Remove all listeners for an event or all events
     */
    removeAllListeners(event?: string): this {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        return this;
    }

    /**
     * Get listener count for an event
     */
    listenerCount(event: string): number {
        return this.events.get(event)?.size ?? 0;
    }

    /**
     * Get all event names
     */
    eventNames(): string[] {
        return Array.from(this.events.keys());
    }
}
