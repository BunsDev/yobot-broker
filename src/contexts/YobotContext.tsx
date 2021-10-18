import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import LogRocket from "logrocket";
import { useToast } from "@chakra-ui/react";
import { Yobot } from "../yobot-sdk/index";

import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3Modal from "web3modal";

import {
  chooseBestWeb3Provider,
  alchemyURL,
} from "../utils";

async function launchModalLazy(
  t: (text: string, extra?: any) => string,
  cacheProvider: boolean = true
) {
  console.log("Launching lazy modal...");
  // const [WalletConnectProvider, Web3Modal] = await Promise.all([
  //   import("@walletconnect/web3-provider"),
  //   import("web3modal"),
  // ]);


  console.log("Got WalletConnectProvider:", WalletConnectProvider);
  console.log("Got Web3Modal:", Web3Modal);

  const providerOptions = {
    injected: {
      display: {
        description: t("Connect with a browser extension"),
      },
      package: null,
    },
    walletconnect: {
      package: WalletConnectProvider.default,
      options: {
        rpc: {
          1: alchemyURL,
        },
      },
      display: {
        description: t("Scan with a wallet to connect"),
      },
    },
  };

  console.log("Got Provider Options:", providerOptions);

  if (!cacheProvider) {
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
  }

  console.log("No cached provider");

  const web3Modal = new Web3Modal({
    cacheProvider,
    providerOptions,
    theme: {
      background: "#121212",
      main: "#FFFFFF",
      secondary: "#858585",
      border: "#272727",
      hover: "#000000",
    },
  });

  console.log("Got web3modal:", web3Modal);

  // ?? await here ??
  let connect_res = web3Modal.connect();

  console.log("Connection result:", connect_res);

  return connect_res;
}

export interface YobotContextData {
  yobot: Yobot;
  web3ModalProvider: any | null;
  isAuthed: boolean;
  login: (cacheProvider?: boolean) => Promise<any>;
  logout: () => any;
  address: string;
  isAttemptingLogin: boolean;
}

export const EmptyAddress = "0x0000000000000000000000000000000000000000";

export const YobotContext = createContext<YobotContextData | undefined>(
  undefined
);

export const YobotProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();

  const { query } = useRouter();

  const [yobot, setYobot] = useState<Yobot>(
    () => new Yobot(chooseBestWeb3Provider())
  );

  console.log("Have yobot:", yobot);

  const [isAttemptingLogin, setIsAttemptingLogin] = useState<boolean>(false);
  const toast = useToast();

  // Check the user's network:
  useEffect(() => {
    Promise.all([yobot.web3.eth.net.getId(), yobot.web3.eth.getChainId()]).then(
      ([netId, chainId]) => {
        console.log("Network ID: " + netId, "Chain ID: " + chainId);

        // Don't show "wrong network" toasts if dev
        if (process.env.NODE_ENV === "development") {
          console.log("development node env...");
          return;
        }

        if (netId !== 1 || chainId !== 1) {
          // setTimeout(() => {
          //   toast({
          //     title: "Wrong network!",
          //     description:
          //       "You are on the wrong network! Switch to the mainnet and reload this page!",
          //     status: "warning",
          //     position: "top-right",
          //     duration: 300000,
          //     isClosable: true,
          //   });
          // }, 1500);
        }
      }
    );
  }, [yobot, toast]);

  const [address, setAddress] = useState<string>(EmptyAddress);

  const [web3ModalProvider, setWeb3ModalProvider] = useState<any | null>(null);

  // const queryClient = useQueryClient();

  const setYobotAndAddressFromModal = useCallback(
    (modalProvider) => {
      console.log("inside setYobotAndAddressFromModal...");
      const yobotInstance = new Yobot(modalProvider);
      console.log("Created yobotInstance:", yobotInstance);
      setYobot(yobotInstance);

      yobotInstance.web3.eth.getAccounts().then((addresses) => {
        if (addresses.length === 0) {
          console.log("Address array was empty. Reloading!");
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }

        const address = addresses[0] as string;
        const requestedAddress = query.address as string;
        console.log("got first address:", address);
        console.log("got requested address:", requestedAddress);

        console.log("Setting Logrocket user to new address: " + address);
        LogRocket.identify(address);

        console.log("Requested address: ", requestedAddress);
        setAddress(requestedAddress ?? address);
      });
    },
    [setYobot, setAddress, query.address]
  );

  const login = useCallback(
    async (cacheProvider: boolean = true) => {
      try {
        setIsAttemptingLogin(true);
        console.log("Logging in...", isAttemptingLogin);
        let provider = await launchModalLazy(t, cacheProvider);
        console.log("AWAITED provider")
        console.log("Got provider:", provider);
        setWeb3ModalProvider(provider);
        console.log("Set Web3ModalProvider:", web3ModalProvider);
        setYobotAndAddressFromModal(provider);
        console.log("Set YobotAndAddressFromModal...");
        setIsAttemptingLogin(false);
        console.log("Finished logging in!");
      } catch (err) {
        setIsAttemptingLogin(false);
        return console.error(err);
      }
    },
    [setWeb3ModalProvider, setYobotAndAddressFromModal, setIsAttemptingLogin, t]
  );

  const refetchAccountData = useCallback(() => {
    console.log("New account, clearing the queryClient!");
    setYobotAndAddressFromModal(web3ModalProvider);
    // queryClient.clear();
  }, [
    setYobotAndAddressFromModal,
    web3ModalProvider,
    // queryClient
    ]);

  const logout = useCallback(() => {
    console.log("in logout")
    setWeb3ModalProvider((past: any) => {
      console.log("logout - set web3 modal provider with prev val:", past);
      if (past?.off) {
        past.off("accountsChanged", refetchAccountData);
        past.off("chainChanged", refetchAccountData);
      }
      return null;
    });

    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
    setAddress(EmptyAddress);
  }, [setWeb3ModalProvider, refetchAccountData]);

  useEffect(() => {
    if (web3ModalProvider !== null && web3ModalProvider.on) {
      web3ModalProvider.on("accountsChanged", refetchAccountData);
      web3ModalProvider.on("chainChanged", refetchAccountData);
    }
    return () => {
      if (web3ModalProvider?.off) {
        web3ModalProvider.off("accountsChanged", refetchAccountData);
        web3ModalProvider.off("chainChanged", refetchAccountData);
      }
    };
  }, [web3ModalProvider, refetchAccountData]);

  // Automatically open the web3modal if they have previously logged in on the site:
  useEffect(() => {
    if (localStorage.WEB3_CONNECT_CACHED_PROVIDER) {
      login();
    }
  }, [login]);

  const value = useMemo(
    () => ({
      web3ModalProvider,
      yobot,
      // fuse,
      isAuthed: address !== EmptyAddress,
      login,
      logout,
      address,
      isAttemptingLogin,
    }),
    [
      yobot,
      web3ModalProvider,
      login,
      logout,
      address,
      // fuse,
      isAttemptingLogin]
  );

  return <YobotContext.Provider value={value}>{children}</YobotContext.Provider>;
};

export function useYobot() {
  const context = useContext(YobotContext);

  if (context === undefined) {
    console.log("context undefined???");
    throw new Error(`useYobot must be used within a YobotProvider`);
  }

  return context;
}