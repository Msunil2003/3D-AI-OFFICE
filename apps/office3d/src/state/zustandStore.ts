import { useSyncExternalStore } from "react";

type SetStateFn<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
type GetStateFn<T> = () => T;

export function createStore<T extends object>(
  initializer: (set: SetStateFn<T>, get: GetStateFn<T>) => T
) {
  let state: T;
  const listeners = new Set<() => void>();

  const getState: GetStateFn<T> = () => state;

  const setState: SetStateFn<T> = (partial) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (nextState !== state) {
      state = Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener());
    }
  };

  state = initializer(setState, getState);

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  function useStore(): T;
  function useStore<U>(selector: (state: T) => U): U;
  function useStore<U>(selector?: (state: T) => U): U | T {
    return useSyncExternalStore(
      subscribe,
      () => (selector ? selector(state) : state),
      () => (selector ? selector(state) : state)
    );
  }

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
}
