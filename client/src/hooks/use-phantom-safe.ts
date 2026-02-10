import { usePhantom, useModal, useSolana } from "@phantom/react-sdk";

const phantomEnabled = !!import.meta.env.VITE_PHANTOM_APP_ID;

export function usePhantomSafe() {
  if (!phantomEnabled) {
    return {
      isConnected: false,
      user: null,
      openModal: () => {},
      signMessage: async (_message: Uint8Array) => ({ signature: new Uint8Array() }),
    };
  }
  
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isConnected, user } = usePhantom();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { open } = useModal();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { solana } = useSolana();
  
  const signMessage = async (message: Uint8Array): Promise<{ signature: Uint8Array }> => {
    const result = await solana.signMessage(message);
    return { signature: result.signature };
  };
  
  return {
    isConnected,
    user,
    openModal: open,
    signMessage,
  };
}
