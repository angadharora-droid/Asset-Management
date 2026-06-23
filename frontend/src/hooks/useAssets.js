import { useCallback, useEffect, useState } from 'react';
import { getAssets } from '../api/assetApi.js';

// Loads the shared register from the API and exposes a stable `reload`.
// Sorted oldest-first by the server; components reverse as needed for display.
export function useAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    reload();
  }, [reload]);

  return { assets, loading, error, reload };
}
