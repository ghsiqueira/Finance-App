import NetInfo from '@react-native-community/netinfo';

export const checkNetworkConnection = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
};

export const subscribeToNetworkChanges = (callback: (isConnected: boolean) => void) => {
  return NetInfo.addEventListener(state => {
    callback(state.isConnected ?? false);
  });
};

export const getNetworkType = async (): Promise<string | null> => {
  const state = await NetInfo.fetch();
  return state.type;
};

export const isWifiConnection = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.type === 'wifi';
};
