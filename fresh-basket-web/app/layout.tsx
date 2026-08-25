import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"FixPrice UAE | Home Service Estimates",description:"Compare clear starting prices for AC, plumbing, electrical, cleaning and repair services in the UAE.",icons:{icon:"/favicon.svg"},openGraph:{title:"FixPrice UAE",description:"Know the price before they arrive."},twitter:{card:"summary",title:"FixPrice UAE",description:"Know the price before they arrive."}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
