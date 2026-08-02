import { describe, it, expect } from 'vitest';
import { EventBus } from '../src/core/EventBus';

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const bus = new EventBus();
    const data = { value: 42 };
    let received: typeof data | undefined;

    bus.on('test', (d) => { received = d; });
    bus.emit('test', data);

    expect(received).toEqual(data);
  });

  it('should unsubscribe with returned function', () => {
    const bus = new EventBus();
    let count = 0;

    const unsub = bus.on('test', () => { count++; });
    bus.emit('test', null);
    unsub();
    bus.emit('test', null);

    expect(count).toBe(1);
  });

  it('should handle multiple listeners', () => {
    const bus = new EventBus();
    const values: number[] = [];

    bus.on('num', (n: number) => values.push(n));
    bus.on('num', (n: number) => values.push(n * 2));

    bus.emit('num', 5);
    expect(values).toEqual([5, 10]);
  });

  it('should clear all listeners', () => {
    const bus = new EventBus();
    let count = 0;

    bus.on('test', () => { count++; });
    bus.clear();
    bus.emit('test', null);

    expect(count).toBe(0);
  });
});