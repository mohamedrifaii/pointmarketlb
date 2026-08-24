import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Fresh Basket Grocery",description:"Fresh groceries and pantry staples with simple USD pricing.",icons:{icon:"/favicon.svg"},openGraph:{title:"Fresh Basket Grocery",description:"Your everyday grocery run, made lighter."},twitter:{card:"summary",title:"Fresh Basket Grocery",description:"Your everyday grocery run, made lighter."}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
