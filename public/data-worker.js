
// This worker is a simple "fire-and-forget" preloader.
// Its only job is to fetch large data files so they are in the browser's
// HTTP cache when the main application needs them.

self.addEventListener('message', async (event) => {
  if (event.data && event.data.action === 'start-preload') {
    // We don't need to do anything with the data, just fetch it.
    // The browser's cache will handle the rest.
    try {
      await Promise.all([
        fetch('/quran.json'),
        fetch('/layout.json'),
        fetch('/surah-ligatures.json')
      ]);
      // Optional: Send a message back to the main thread if needed for debugging
      // self.postMessage({ status: 'success' });
    } catch (error) {
      // Optional: Handle errors
      // self.postMessage({ status: 'error', error: error.message });
    }
  }
});
