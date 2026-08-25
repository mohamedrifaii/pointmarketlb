"use client";
import { useMemo, useState } from "react";

const products = [
 {id:1,name:"Al Ain Fresh Full Cream Milk",detail:"1 L",brand:"Al Ain Farms",category:"Dairy",price:2.12,stock:22,image:"https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80"},
 {id:2,name:"Almarai Long Life Full Fat Milk",detail:"4 × 1 L",brand:"Almarai",category:"Dairy",price:2.72,stock:24,image:"https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80"},
 {id:3,name:"Traditional Basmati Rice",detail:"5 kg",brand:"Daawat",category:"Pantry",price:13.01,stock:18,image:"https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80"},
 {id:4,name:"Organic Extra Virgin Olive Oil",detail:"16.9 fl oz",brand:"Amazon Grocery",category:"Pantry",price:25.60,stock:11,image:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80"},
 {id:5,name:"Buldak Carbonara Ramen",detail:"Pack of 5",brand:"Samyang",category:"Pantry",price:7.49,stock:30,image:"https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80"},
 {id:6,name:"Viva Jasmine Rice",detail:"5 kg",brand:"Silver Lotus",category:"Pantry",price:6.94,stock:16,image:"https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=800&q=80"},
];

export default function Home(){
 const [category,setCategory]=useState("All");
 const [query,setQuery]=useState("");
 const [cart,setCart]=useState<Record<number,number>>({});
 const visible=useMemo(()=>products.filter(p=>(category==="All"||p.category===category)&&`${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase())),[category,query]);
 const count=Object.values(cart).reduce((a,b)=>a+b,0);
 const total=products.reduce((sum,p)=>sum+p.price*(cart[p.id]||0),0);
 const cartItems=products.filter(p=>cart[p.id]);
 const change=(id:number,amount:number)=>setCart(current=>{const next=Math.max(0,(current[id]||0)+amount);const updated={...current,[id]:next};if(!next)delete updated[id];return updated;});
 return <main>
  <div className="announcement">Free delivery on orders over $35 <span>•</span> Fresh groceries, every day</div>
  <header className="header"><a className="brand" href="#top"><span>FRESH</span>BASKET<b>.</b></a><label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search groceries, brands and more…"/></label><button className="cartButton" onClick={()=>document.getElementById("cart")?.scrollIntoView({behavior:"smooth"})}>Bag <span>{count}</span></button></header>
  <section className="hero" id="top"><div className="heroCopy"><p className="eyebrow">FRESH PICKS • SIMPLE PRICES</p><h1>Your everyday grocery run, made lighter.</h1><p>Useful staples, honest USD pricing, and a checkout that doesn’t get in your way.</p><a href="#shop">Shop the collection <span>→</span></a></div><div className="heroImage" role="img" aria-label="Fresh vegetables in a market basket"><div><small>THIS WEEK</small><strong>Pantry refresh</strong><span>from $2.12</span></div></div></section>
  <section className="shop" id="shop"><div className="sectionHead"><div><p className="eyebrow">THE MARKET EDIT</p><h2>Good food starts here.</h2></div><p>{visible.length} products · Prices in USD</p></div>
   <div className="filters">{[["All","Everything"],["Dairy","Milk & dairy"],["Pantry","Pantry staples"]].map(([key,label])=><button key={key} className={category===key?"active":""} onClick={()=>setCategory(key)}>{label}</button>)}</div>
   {visible.length?<div className="grid">{visible.map(product=>{const qty=cart[product.id]||0;return <article className="card" key={product.id}><div className="productImage"><img src={product.image} alt=""/><span>{product.category}</span></div><div className="cardBody"><p className="brandName">{product.brand}</p><h3>{product.name}</h3><p className="detail">{product.detail} · {product.stock} in stock</p><div className="buyRow"><strong>${product.price.toFixed(2)}</strong>{qty?<div className="stepper"><button onClick={()=>change(product.id,-1)}>−</button><span>{qty}</span><button onClick={()=>change(product.id,1)}>+</button></div>:<button className="add" onClick={()=>change(product.id,1)}>Add to bag</button>}</div></div></article>})}</div>:<div className="empty"><strong>No groceries found.</strong><p>Try another search or category.</p></div>}
  </section>
  <section className="cartPanel" id="cart">
   <div className="cartHeading"><div><p className="eyebrow">YOUR BASKET</p><h2>{count?`${count} item${count>1?"s":""} ready`:"Your bag is waiting."}</h2><p>{count?"Review your selection before checkout.":"Add a few everyday essentials to get started."}</p></div><button className="continueShopping" onClick={()=>document.getElementById("shop")?.scrollIntoView({behavior:"smooth"})}>Continue shopping ↑</button></div>
   {count?<div className="cartContent">
    <div className="cartItems">{cartItems.map(product=>{const qty=cart[product.id];return <div className="cartItem" key={product.id}>
     <img src={product.image} alt=""/>
     <div className="cartProduct"><p>{product.brand}</p><h3>{product.name}</h3><span>{product.detail} · ${product.price.toFixed(2)} each</span><button onClick={()=>setCart(current=>{const updated={...current};delete updated[product.id];return updated;})}>Remove</button></div>
     <div className="cartQty" aria-label={`Quantity for ${product.name}`}><button onClick={()=>change(product.id,-1)} aria-label="Decrease quantity">−</button><span>{qty}</span><button onClick={()=>change(product.id,1)} aria-label="Increase quantity">+</button></div>
     <strong className="lineTotal">${(product.price*qty).toFixed(2)}</strong>
    </div>})}</div>
    <aside className="orderSummary"><p className="eyebrow">ORDER SUMMARY</p><div><span>Items ({count})</span><strong>${total.toFixed(2)}</strong></div><div><span>Delivery</span><strong>{total>=35?"Free":"Calculated next"}</strong></div><div className="summaryTotal"><span>Estimated total</span><strong>${total.toFixed(2)}</strong></div>{total<35&&<p className="deliveryNote">Add ${(35-total).toFixed(2)} more for free delivery.</p>}<button onClick={()=>alert("Demo checkout — payment will be connected next.")}>Checkout securely →</button></aside>
   </div>:<button className="emptyCartButton" onClick={()=>document.getElementById("shop")?.scrollIntoView({behavior:"smooth"})}>Browse groceries</button>}
  </section>
  <footer><a className="brand" href="#top"><span>FRESH</span>BASKET<b>.</b></a><p>Sample grocery catalog managed in Notion. Product references from Noon.</p><p>© 2026 Fresh Basket</p></footer>
 </main>;
}
