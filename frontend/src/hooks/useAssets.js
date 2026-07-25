import { useCallback, useEffect, useRef, useState } from 'react';
import { getAssets } from '../api/assetApi.js';

// How often the shared register re-fetches in the background so every device
// sees the team's new entries without pressing Refresh.
const POLL_MS = 30_000;

// Loads the shared register from the API and exposes a stable `reload`.
// Sorted oldest-first by the server; components reverse as needed for display.
export function useAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const busy = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAssets();
      setAssets(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load the register.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Background refresh: same data, but without the loading state (no skeleton
  // flicker mid-use). A failed poll keeps the data it has and simply waits for
  // the next tick, so a brief network blip never throws up the error banner.
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const data = await getAssets();
      setAssets(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      // next poll retries
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Keep the register live: poll while the browser tab is visible, and refresh
  // immediately when the user comes back to it.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { assets, loading, error, reload };
}
