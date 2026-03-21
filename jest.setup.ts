import '@testing-library/jest-dom'

// jsdom does not implement window.matchMedia — provide a minimal stub.
// Returns `matches: false` by default, which simulates a light-mode OS preference.
// Guard against node-environment test files where window is not defined.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
