import { useOnline } from '../hooks/useOnline';

//UX hint for offline mode (cached data)
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <p style={{ color: '#666', marginTop: 8 }}>
      Offline mode: showing cached data.
    </p>
  );
}
