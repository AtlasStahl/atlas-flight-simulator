/** Simple event bus for decoupled communication between game systems */

export type EventCallback<T> = (data: T) => void;

export class EventBus {
  private _listeners = new Map<string, Set<EventCallback<unknown>>>();

  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    const set = this._listeners.get(event)! as Set<EventCallback<T>>;
    set.add(callback);
    return () => this.off(event, callback);
  }

  off<T = unknown>(event: string, callback: EventCallback<T>): void {
    const set = this._listeners.get(event) as Set<EventCallback<T>> | undefined;
    set?.delete(callback);
  }

  emit<T = unknown>(event: string, data: T): void {
    const set = this._listeners.get(event) as Set<EventCallback<T>> | undefined;
    if (!set) return;
    for (const cb of set) {
      cb(data);
    }
  }

  clear(): void {
    this._listeners.clear();
  }
}