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
import { formatEther } from "@ethersproject/units";

import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3Modal from "web3modal";

import { chooseBestWeb3Provider, alchemyURL } from "../utils";

async function launchModalLazy(
  t: (text: string, extra?: any) => string,
  cacheProvider: boolean = true
) {
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
  if (!cacheProvider) {
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
  }
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

  return web3Modal.connect();
}

export interface YobotContextData {
  yobot: Yobot;
  web3ModalProvider: any | null;
  isAuthed: boolean;
  login: (cacheProvider?: boolean) => Promise<any>;
  logout: () => any;
  address: string;
  // ** account ethers balance in ETH **
  balance: number;
  chainId: number;
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

  const [isAttemptingLogin, setIsAttemptingLogin] = useState<boolean>(false);
  const toast = useToast();

  // ** Save chainId for context switches **
  const [chainId, setChainId] = useState<number>(-1);

  // ** Refresh chain id **
  const refreshChainId = ({ yobotInstance = yobot }) => {
    Promise.all([
      yobotInstance.web3.eth.net.getId(),
      yobotInstance.web3.eth.getChainId(),
    ]).then(([netId, currChainId]) => {
      setChainId(currChainId);
      // ** Don't show "wrong network" toasts if dev
      // if (process.env.NODE_ENV === "development") {
      //   console.log("[NODE_ENV] Development")
      //   return;
      // }

      if (netId !== 1 || currChainId !== 1) {
        setTimeout(() => {
          toast({
            title: "Wrong network!",
            description:
              "You are on the wrong network! Switch to the mainnet and reload this page!",
            status: "warning",
            position: "bottom",
            duration: 3000,
            isClosable: true,
          });
        }, 1500);
      }
    });
  };

  useEffect(() => {
    // refreshChainId({});
    if (localStorage.WEB3_CONNECT_CACHED_PROVIDER) {
      // if(!isAttemptingLogin) {
      login();
      // }
    } else {
      // ** If we weren't previously connected, let's try to logout **
      logout();
    }
  }, []);

  const [address, setAddress] = useState<string>(EmptyAddress);
  const [balance, setBalance] = useState<number>(0);
  const [web3ModalProvider, setWeb3ModalProvider] = useState<any | null>(null);

  const setYobotAndAddressFromModal = (modalProvider) => {
    const yobotInstance = new Yobot(modalProvider);
    setYobot(yobotInstance);

    yobotInstance.web3.eth.getAccounts().then((addresses) => {
      console.log("got accounts:", addresses);
      if (addresses.length === 0) {
        if (typeof window !== "undefined") {
          console.log("reloading window");
          setIsAttemptingLogin(true);
          logout();
          setAddress(EmptyAddress);
          return;
        }
      }

      // ** We only want to refresh the chain id and do the rest if we have addresses **
      refreshChainId({ yobotInstance });

      // ** Set the new address **
      const address = addresses[0] as string;
      const requestedAddress = query.address as string;
      LogRocket.identify(address);
      setAddress(requestedAddress ?? address);

      // ** Get the selected address balance
      yobotInstance.web3.eth
        .getBalance(requestedAddress ?? address)
        .then((bal) => {
          setBalance(parseFloat(formatEther(bal)));
        })
        .catch((balance_err) =>
          console.error("Failed to get account ethers with error:", balance_err)
        );
    });
  };

  const login = async (cacheProvider: boolean = true) => {
    try {
      setIsAttemptingLogin(true);
      let provider = await launchModalLazy(t, cacheProvider);
      setWeb3ModalProvider(provider);
      setYobotAndAddressFromModal(provider);
      setIsAttemptingLogin(false);
    } catch (err) {
      setIsAttemptingLogin(false);
      return console.error(err);
    }
  };

  const refetchAccountData = () => {
    setYobotAndAddressFromModal(web3ModalProvider);
  }; // }, [setYobotAndAddressFromModal, web3ModalProvider]);

  const logout = () => {
    setWeb3ModalProvider((past: any) => {
      try {
        past.clearCachedProvider().then((res) => {
          console.log("Cleared past cached provider!", res);
        });
        console.log(past);
        console.log(web3ModalProvider);
        past.request({
          method: "wallet_requestPermissions",
          params: [
            {
              eth_accounts: {},
            },
          ],
        });
      } catch (e) {
        console.error("Failed to close web3 modal provider");
        console.error(e);
      }
      if (past?.off) {
        past.off("accountsChanged", refetchAccountData);
        past.off("chainChanged", refetchAccountData);
      }
      return null;
    });
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
    setAddress(EmptyAddress);
  };

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

  const value = useMemo(
    () => ({
      web3ModalProvider,
      yobot,
      isAuthed: address !== EmptyAddress,
      login,
      logout,
      address,
      balance,
      chainId,
      isAttemptingLogin,
    }),
    [
      yobot,
      web3ModalProvider,
      login,
      logout,
      address,
      balance,
      chainId,
      isAttemptingLogin,
    ]
  );

  return (
    <YobotContext.Provider value={value}>{children}</YobotContext.Provider>
  );
};

export function useYobot() {
  const context = useContext(YobotContext);

  if (context === undefined) {
    throw new Error(`useYobot must be used within a YobotProvider`);
  }

  return context;
}
