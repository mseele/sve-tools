// jsdom does not implement visualViewport, which Vuetify's overlay location
// strategies need when the notification snackbar opens.
if (typeof window !== 'undefined' && !('visualViewport' in window)) {
  const stub = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  }
  Object.defineProperty(window, 'visualViewport', { value: stub, configurable: true })
}
