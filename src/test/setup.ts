// jsdom has no ResizeObserver; Radix uses it to position popovers.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
