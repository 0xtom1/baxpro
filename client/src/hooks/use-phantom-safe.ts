import { usePhantom, useModal } from "@phantom/react-sdk";

const phantomEnabled = !!import.meta.env.VITE_PHANTOM_APP_ID;

export function usePhantomSafe() {
  if (!phantomEnabled) {
    return {
      isConnected: false,
      user: null,
      openModal: () => {},
    };
  }
  
  // These hooks are only called when phantomEnabled is true
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isConnected, user } = usePhantom();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { open } = useModal();
  
  return {
    isConnected,
    user,
    openModal: open,
  };
}
