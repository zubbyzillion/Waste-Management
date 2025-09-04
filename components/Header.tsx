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
import {useMediaQuery} from "@/hooks/useMediaQuery"

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
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    privateKeyProvider,
})

interface HeaderProps {
    onMenuClick: () => void;
    totalEarnings: number;
}

// interface AppNotification {
//   id: number;
//   message: string;
//   read: boolean;
// }

export default function Header({ onMenuClick, totalEarnings}: HeaderProps){
    const [provider, setProvider] = useState<IProvider | null>(null)
    const [loggedIn, setLoggedIn] = useState(false)
    const [loading, setLoading] = useState(true)
    const [userInfo, setUserInfo] = useState<any>(null)
    const pathName = usePathname()
    // const [notifications, setNotifications] = useState<Notification[]>([])
    // const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [balance, setBalance] = useState(0)
    const isMobile = useMediaQuery("(max-width: 768px");

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
                    <Menu className="h-6 w-6 text-gray-800" />
                </Button>
                <Link href="/" className="flex items-center">
                <Leaf className="h-6 w-6 md:h-8 md:w-8 text-green-500 mr-1 md:mr-2" />
                <span className="font-bold text-base md:text-lg text-gray-800">reCyclers</span>
                </Link>
            </div>
            {!isMobile && (
                <div className="flex-1 max-w-xl mx-4">
                    <div className="relative">
                        <input type="text" placeholder="search..." className="w-full px-4 py-2 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500" />
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
            )}
            <div className="flex items-center">
                {isMobile && (
                    <Button variant="ghost" size="icon" className="mr-2">
                        <Search className="h-5 w-5" />
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="mr-2 relative">
                            <Bell className="h-5 w-5 text-gray-800" />
                            {notifications.length > 0 && (
                                <Badge className="absolute -top-1 right-1 px-1 min-w-[1.2rem] h-5">
                                    {notifications.length}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <DropdownMenuItem key={notification.id} onClick={() => handleNotificationClick(notification.id)}>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{notification.type}</span>
                                        <span className="text-sm text-gray-500">{notification.message}</span>
                                    </div>
                                </DropdownMenuItem>
                            ))
                        ):(
                            <DropdownMenuItem>No new notifications</DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="mr-2 md:mr-4 flex items-center bg-gray-100 rounded-full px-2 md:px-3 py-1">
                    <Coins className="h-4 w-4 md:h-5 md:w-5 mr-1 text-green-500" />
                    <span className="font-semibold text-sm md:text-base text-gray-800">{balance.toFixed(2)}</span>
                </div>
                {!loggedIn ? (
                    <Button onClick={login} className="bg-green-600 hover:bg-green-700 text-white text-sm md:text-base">
                        Login
                        <LogIn className="ml-1 md:ml-2 h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                ):(
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="items-center flex">
                                <User className="h-5 w-5 mr-1" />
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={getUserInfo}>
                                {userInfo ? userInfo.name : "Profile"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={getUserInfo}>
                                <Link href={"/settings"}>Settings</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={logout}>
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    </header>);
}

