import { useState, useEffect } from 'react';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * Hook para detectar estado de conexión a internet.
 * - isOnline: true si hay conexión activa
 * - wasOffline: true si hubo desconexión reciente (se resetea después de 5 segundos)
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Si volvemos online después de estar offline, marcar wasOffline
      setWasOffline(true);
      // Resetear wasOffline después de 5 segundos
      setTimeout(() => setWasOffline(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
