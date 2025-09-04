"use client"

import {useState, useEffect} from "react"
import Link from "next/link"
import {usePathname} from "next/navigation"
import { Button } from "./ui/button"
import {Menu, Coins, Leaf, Search, Bell, User, ChevronDown, LogIn, LogOut} from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "./ui/dropdown-menu"
import {Badge} from "./ui/badge"
import {Web3Auth} from "@web3auth/modal"
// import { Web3Auth } from "web3auth";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base"
import {EthereumPrivateKeyProvider} from "@web3auth/ethereum-provider"
// import { createUseCacheTracker } from "next/dist/build/webpack/plugins/telemetry-plugin/use-cache-tracker-utils"
import { createUser, getUnreadNotifications, getUserBalance, getUserByEmail, markNotificationAsRead } from "@/utils/db/actions"
// import {useMediaQuery} from ""

// const clientId = process.env.NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID as string
const clientId = process.env.WEB3_AUTH_CLIENT_ID

const chainConfig = {
    chainNamespace:CHAIN_NAMESPACES.EIP155,
    chainId: "0xaa36a7",
    rpcTarget: "https://rpc.ankr.com/eth_sepolia",
    displayName: "Ethereum Sepolia Testnet",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
    logo: "https://assets.web3auth.io/evm-chains/sepolia.png",
}

const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig }
})

const web3auth = new Web3Auth({
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.TESTNET,
    privateKeyProvider,
})

interface HeaderProps {
    onMenuClick: () => void;
    totalEarnings: number;
}

interface AppNotification {
  id: number;
  message: string;
  read: boolean;
}

export default function Header({ onMenuClick, totalEarnings}: HeaderProps){
    const [provider, setProvider] = useState<IProvider | null>(null)
    const [loggedIn, setLoggedIn] = useState(false)
    const [loading, setLoading] = useState(true)
    const [userInfo, setUserInfo] = useState<any>(null)
    const pathName = usePathname()
    // const [notifications, setNotifications] = useState<Notification[]>([])
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [balance, setBalance] = useState(0)

    useEffect(() => {
        const init = async () => {
            try {
                // await web3auth.initModal();
                await web3auth.init();
                // await web3auth.init();
                setProvider(web3auth.provider)

                if(web3auth.connected) {
                    setLoggedIn(true)
                    const user = await web3auth.getUserInfo()
                    setUserInfo(user)

                    if(user.email){
                        localStorage.setItem("userEmail", user.email)
                        try {
                            await createUser(user.email, user.name || "Anonymous user")
                        }catch(error) {
                            console.error("Error creating user", error)
                        }
                    }
                }
            }catch(error){
                console.error("Error initializing web3auth", error)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    useEffect(() => {
        const fetchNotifications = async () => {
            if(userInfo && userInfo.email){
                const user = await getUserByEmail(userInfo.email)
                if(user){
                    const unreadNotifications = await getUnreadNotifications(user.id)
                    setNotifications(unreadNotifications)
                }
            }
        }
        fetchNotifications();

        const notificationInterval = setInterval(fetchNotifications, 3000)
        return () => clearInterval(notificationInterval)
    }, [userInfo])

    useEffect(() => {
        const fetchUserBalance = async () => {
            if(userInfo && userInfo.email){
                const user = await getUserByEmail(userInfo.email);
                if(user){
                    const userBalance = await getUserBalance(user.id)
                    setBalance(userBalance);
                }
            }
        }
        fetchUserBalance();

        const handleBalanceUpdate = (event: CustomEvent) => {
            setBalance(event.detail)
        }

        window.addEventListener("balanceUpdated", handleBalanceUpdate as EventListener)

        return () => {
            window.removeEventListener("balanceUpdated", handleBalanceUpdate as EventListener)
        }
    }, [userInfo])

    const login = async () => {
        if(!web3auth) {
            console.error("web3auth is not initialized")
            return;
        }
        try{
            const web3authProvider = await web3auth.connect();
            setProvider(web3authProvider)
            setLoggedIn(true)
            const user = await web3auth.getUserInfo();
            setUserInfo(user)
            if(user.email){
                localStorage.setItem("userEmail", user.email)
                try{
                    await createUser(user.email, user.name || "Anonymous User")
                }catch(error){
                    console.error("Error creating user", error)
                }
            }
        }catch(error){
            console.error("Error logging in", error)
        }
    }

    const logout = async () => {
        if(!web3auth){
            console.log("Web3Auth is not intialized")
            return;
        }
        try{
            await web3auth.logout();
            setProvider(null)
            setLoggedIn(false)
            setUserInfo(null)
            localStorage.removeItem("userEmail")
        }catch(error){
            console.error("Error logging out", error)
        }
    }

    const getUserInfo = async () => {
        if(web3auth.connected){
        // if(web3auth.provider){
            const user = await web3auth.getUserInfo()
            setUserInfo(user);

            if(user.email){
                localStorage.setItem("userEmail", user.email)
                try{
                    await createUser(user.email, user.name || "Anonymous User")
                }catch(error){
                    console.error("Error creating user", error)
                }
            }
        }
    }

    const handleNotificationClick = async (notificationId: number) => {
        await markNotificationAsRead(notificationId);
    };

    if(loading){
        return <div>Loading web3Auth...</div>
    }

    return (<header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="mr-2 md:mr-4" onClick={onMenuClick}>
                    <Menu className="h-6 w-6" />
                </Button>
            </div>
        </div>
    </header>);
}

