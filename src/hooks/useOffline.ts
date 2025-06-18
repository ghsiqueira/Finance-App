import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore } from '../store/offlineStore';

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(true);
  const { 
    pendingRequests, 
    addPendingRequest, 
    syncAllData,
    saveOfflineTransaction,
    getOfflineTransactions,
    clearOfflineTransactions,
  } = useOfflineStore();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
      
      // Se voltou online, sincronizar dados
      if (online && !isOnline) {
        syncAllData();
      }
    });

    return unsubscribe;
  }, [isOnline, syncAllData]);

  const executeOfflineFirst = async <T>(
    onlineAction: () => Promise<T>,
    offlineAction?: () => Promise<T>
  ): Promise<T> => {
    if (isOnline) {
      try {
        return await onlineAction();
      } catch (error) {
        if (offlineAction) {
          return await offlineAction();
        }
        throw error;
      }
    } else {
      if (offlineAction) {
        return await offlineAction();
      }
      throw new Error('Sem conexão e sem ação offline definida');
    }
  };

  return {
    isOnline,
    pendingRequests,
    executeOfflineFirst,
    addPendingRequest,
    syncAllData,
    saveOfflineTransaction,
    getOfflineTransactions,
    clearOfflineTransactions,
  };
};
