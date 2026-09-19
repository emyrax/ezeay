type Listener = (...args: any[]) => void;

class EventBus {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, fn: Listener): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event: string, fn: Listener): void {
    const fns = this.listeners[event];
    if (!fns) return;
    this.listeners[event] = fns.filter((l) => l !== fn);
  }

  emit(event: string, ...args: any[]): void {
    this.listeners[event]?.forEach((fn) => fn(...args));
  }
}

export const eventBus = new EventBus();
