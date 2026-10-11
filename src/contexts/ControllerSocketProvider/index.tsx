import React, { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useControllerStore } from './useStore';
import { ControllerSocketRawMessage } from './utils';
import { axiosGw, axiosSec } from 'constants/axiosInstances';
import { useAuth } from 'contexts/AuthProvider';
import { useScopedNotifications } from 'hooks/useScopedNotifications';

export type ControllerSocketContextReturn = Record<string, unknown>;

const ControllerSocketContext = React.createContext<ControllerSocketContextReturn>({
  webSocket: undefined,
  isOpen: false,
});

export const ControllerSocketProvider = ({ children }: { children: React.ReactElement }) => {
  const { token, isUserLoaded } = useAuth();
  const canSubscribe = useScopedNotifications(useControllerStore, axiosGw?.defaults?.baseURL !== axiosSec?.defaults?.baseURL, true);
  const { addMessage, isOpen, webSocket, onStartWebSocket } = useControllerStore((state) => ({
    addMessage: state.addMessage,
    isOpen: state.isWebSocketOpen,
    webSocket: state.webSocket,
    onStartWebSocket: state.startWebSocket,
  }));

  const queryClient = useQueryClient();

  const onMessage = useCallback((message: MessageEvent<string>) => {
    try {
      const data = JSON.parse(message.data) as ControllerSocketRawMessage | undefined;
      if (data) {
        addMessage(data, queryClient);
      }
      return undefined;
    } catch {
      return undefined;
    }
  }, []);

  // useEffect for created the WebSocket and 'storing' it in useRef

  // useEffect for generating global notifications
  useEffect(() => {
    if (webSocket) {
      webSocket.addEventListener('message', onMessage);
    }

    return () => {
      if (webSocket) webSocket.removeEventListener('message', onMessage);
    };
  }, [webSocket]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      let timeoutId;

      if (webSocket) {
        if (document.visibilityState === 'hidden') {
          /* timeoutId = setTimeout(() => {
            if (webSocket) webSocket.onclose = () => {};
            webSocket?.close();
            setIsOpen(false);
          }, 5000); */
        } else {
          // If tab is active again, verify if browser killed the WS
          clearTimeout(timeoutId);

          if (!isOpen && canSubscribe) {
            onStartWebSocket(token ?? '');
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [webSocket, isOpen, canSubscribe, token]);

  const values: ControllerSocketContextReturn = useMemo(() => ({}), []);

  return <ControllerSocketContext.Provider value={values}>{children}</ControllerSocketContext.Provider>;
};

export const useGlobalControllerSocket: () => ControllerSocketContextReturn = () =>
  React.useContext(ControllerSocketContext);
