"use client";
import { useMemo, useState } from "react";

const services=[
 {id:1,name:"AC Cleaning",detail:"Complete indoor unit cleaning",category:"AC Services",price:149,time:"60–90 min",image:"https://images.unsplash.com/photo-1631545806609-8b7219b48788?auto=format&fit=crop&w=900&q=85"},
 {id:2,name:"AC Repair Visit",detail:"Inspection and fault diagnosis",category:"AC Services",price:99,time:"45–60 min",image:"https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=85"},
 {id:3,name:"Plumbing Visit",detail:"Leaks, taps and drainage inspection",category:"Repairs",price:129,time:"45–90 min",image:"https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=900&q=85"},
 {id:4,name:"Electrical Visit",detail:"Sockets, lights and fault inspection",category:"Repairs",price:119,time:"45–90 min",image:"https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=85"},
 {id:5,name:"Deep Home Cleaning",detail:"Professional team with supplies",category:"Cleaning",price:299,time:"From 4 hours",image:"https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85"},
 {id:6,name:"Pest Control",detail:"General apartment treatment",category:"Cleaning",price:179,time:"60–90 min",image:"https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?auto=format&fit=crop&w=900&q=85"},
 {id:7,name:"Appliance Repair Visit",detail:"Diagnosis for major home appliances",category:"Appliances",price:149,time:"45–90 min",image:"https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=85"},
];

export default function Home(){
 const [category,setCategory]=useState("All");
 const [query,setQuery]=useState("");
 const [selected,setSelected]=useState<Record<number,number>>({});
 const [submitted,setSubmitted]=useState(false);
 const visible=useMemo(()=>services.filter(s=>(category==="All"||s.category===category)&&`${s.name} ${s.detail}`.toLowerCase().includes(query.toLowerCase())),[category,query]);
 const selectedServices=services.filter(s=>selected[s.id]);
 const count=Object.values(selected).reduce((a,b)=>a+b,0);
 const estimate=services.reduce((sum,s)=>sum+s.price*(selected[s.id]||0),0);
 const change=(id:number,amount:number)=>setSelected(current=>{const qty=Math.max(0,(current[id]||0)+amount);const next={...current,[id]:qty};if(!qty)delete next[id];return next;});
 return <main>
  <div className="topbar"><span>✓</span> Transparent starting prices <b>•</b> Serving Ajman, Dubai & Sharjah</div>
  <header><a className="logo" href="#top"><span>FIX</span>PRICE<b> UAE</b></a><label className="search">⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="What do you need fixed?"/></label><button className="requestButton" onClick={()=>document.getElementById("request")?.scrollIntoView({behavior:"smooth"})}>My request <span>{count}</span></button></header>
  <section className="hero" id="top"><div className="heroCopy"><p className="eyebrow">HOME SERVICES, WITHOUT THE GUESSWORK</p><h1>Know the price before they arrive.</h1><p>Compare clear starting prices for trusted home services across the UAE. Choose what you need and request a callback in minutes.</p><a href="#services">Browse services <span>↓</span></a><div className="proof"><div><strong>Upfront</strong><span>starting prices</span></div><div><strong>Local</strong><span>UAE providers</span></div><div><strong>Simple</strong><span>request process</span></div></div></div><div className="heroPhoto"><div><span>POPULAR</span><strong>AC cleaning</strong><small>from AED 149</small></div></div></section>
  <section className="how"><p className="eyebrow">HOW IT WORKS</p><div><article><span>01</span><h3>Choose a service</h3><p>Pick the work your home needs.</p></article><article><span>02</span><h3>See the estimate</h3><p>Review clear starting prices in AED.</p></article><article><span>03</span><h3>Request a visit</h3><p>Share your details and preferred date.</p></article></div></section>
  <section className="services" id="services"><div className="sectionHead"><div><p className="eyebrow">SERVICE MENU</p><h2>What can we help with?</h2></div><p>{visible.length} services · Prices in AED</p></div><div className="filters">{["All","AC Services","Repairs","Cleaning","Appliances"].map(item=><button className={category===item?"active":""} key={item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
   {visible.length?<div className="serviceGrid">{visible.map(service=>{const qty=selected[service.id]||0;return <article className="serviceCard" key={service.id}><div className="serviceImage"><img src={service.image} alt=""/><span>{service.category}</span></div><div className="serviceBody"><p className="time">Typical visit · {service.time}</p><h3>{service.name}</h3><p>{service.detail}</p><div className="serviceBuy"><div><small>Starting from</small><strong>AED {service.price}</strong></div>{qty?<div className="stepper"><button onClick={()=>change(service.id,-1)}>−</button><span>{qty}</span><button onClick={()=>change(service.id,1)}>+</button></div>:<button onClick={()=>change(service.id,1)}>Add service</button>}</div></div></article>})}</div>:<div className="empty"><h3>No services found</h3><p>Try a different search.</p></div>}
  </section>
  <section className="request" id="request"><div className="requestHead"><div><p className="eyebrow">YOUR SERVICE REQUEST</p><h2>{count?`${count} service${count>1?"s":""} selected`:"Ready when you are."}</h2><p>{count?"Confirm the details below to request your visit.":"Select a service above to begin."}</p></div><button onClick={()=>document.getElementById("services")?.scrollIntoView({behavior:"smooth"})}>Add another service ↑</button></div>
   {count?<div className="requestContent"><div className="chosen">{selectedServices.map(s=><div className="chosenItem" key={s.id}><img src={s.image} alt=""/><div><span>{s.category}</span><h3>{s.name}</h3><p>Starting at AED {s.price} · {s.time}</p><button onClick={()=>change(s.id,-selected[s.id])}>Remove</button></div><div className="stepper dark"><button onClick={()=>change(s.id,-1)}>−</button><span>{selected[s.id]}</span><button onClick={()=>change(s.id,1)}>+</button></div><strong>AED {s.price*selected[s.id]}</strong></div>)}</div>
    <form className="requestForm" onSubmit={e=>{e.preventDefault();setSubmitted(true)}}><p className="eyebrow">VISIT DETAILS</p><label>Emirate<select required defaultValue=""><option value="" disabled>Select emirate</option><option>Ajman</option><option>Dubai</option><option>Sharjah</option><option>Abu Dhabi</option><option>Other UAE emirate</option></select></label><label>Property type<select required defaultValue=""><option value="" disabled>Select property</option><option>Apartment</option><option>Villa</option><option>Office</option><option>Shop</option></select></label><label>Preferred date<input type="date" required/></label><label>Mobile number<input type="tel" placeholder="+971 50 000 0000" required/></label><div className="estimate"><span>Estimated starting total</span><strong>AED {estimate}</strong></div><p className="fineprint">Final price is confirmed by the provider after reviewing the job details. Parts and additional work are not included.</p><button type="submit">Request free callback →</button>{submitted&&<div className="success">✓ Request received. A provider will contact you shortly.</div>}</form>
   </div>:<button className="browse" onClick={()=>document.getElementById("services")?.scrollIntoView({behavior:"smooth"})}>Browse home services</button>}
  </section>
  <footer><a className="logo" href="#top"><span>FIX</span>PRICE<b> UAE</b></a><p>Clear starting prices for everyday home services.</p><p>© 2026 FixPrice UAE</p></footer>
 </main>;
}
