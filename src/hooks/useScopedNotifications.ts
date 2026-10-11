import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'contexts/AuthProvider';

type SocketStore = { getState: () => {
  setNotificationsEnabled: (enabled: boolean) => void;
  startWebSocket: (token: string) => void;
} };

export const useScopedNotifications = (store: SocketStore, endpointAvailable = true, poll = false) => {
  const { user, token, isUserLoaded } = useAuth();
  const queryClient = useQueryClient();
  const canSubscribe = isUserLoaded && user?.userRole === 'root' && !!token && endpointAvailable;
  useEffect(() => {
    store.getState().setNotificationsEnabled(canSubscribe);
    if (canSubscribe) store.getState().startWebSocket(token ?? '');
    return () => store.getState().setNotificationsEnabled(false);
  }, [store, canSubscribe, token]);
  useEffect(() => {
    if (!poll || !isUserLoaded || !token || user?.userRole === 'root') return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden')
        queryClient.refetchQueries({ type: 'active', predicate: (query) => query.state.status === 'success' });
    }, 30000);
    return () => clearInterval(timer);
  }, [poll, isUserLoaded, token, user?.userRole, queryClient]);
  return canSubscribe;
};
