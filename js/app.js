(async()=>{
"use strict";
const ADMIN_PASS=(window.CFG&&CFG.adminPass)||"admin123",ORDER_HOOK=(window.CFG&&CFG.orderHook)||""; /* cài đặt nằm ở js/config.js */
const K={u:"lh_users",ss:"lh_session",p:"lh_products",s:"lh_settings",c:"lh_cart",o:"lh_orders"};
const D=window.SHOP||{settings:{},products:[]};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const rd=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const vnd=n=>new Intl.NumberFormat("vi-VN").format(n)+"₫";
let P=D.products,S=D.settings||{},C=rd(K.c,{});
const page=document.body.dataset.page;
/* ===== Supabase (lưu sản phẩm, ảnh, đơn hàng trên mạng). Bỏ trống supabaseUrl/supabaseKey trong config.js để dùng data.js ===== */
const origin=u=>{try{return new URL(u).origin}catch(e){return String(u||"").replace(/\/+$/,"")}};
const SB={url:origin((window.CFG&&CFG.supabaseUrl)||""),key:(window.CFG&&CFG.supabaseKey)||""};SB.on=!!(SB.url&&SB.key);
const ses=()=>rd("lh_sb",null);
const token=async()=>{const s=ses();if(!s)return null;if(s.expires_at-60>Date.now()/1000)return s;
try{const r=await fetch(SB.url+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:s.refresh_token})});if(!r.ok)throw 0;const j=await r.json();
const n={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:j.expires_at||Math.floor(Date.now()/1000)+j.expires_in,email:s.email};wr("lh_sb",n);return n}catch(e){localStorage.removeItem("lh_sb");return null}};
const api=async(path,o={},auth=false)=>{const h={apikey:SB.key,...(o.json?{"Content-Type":"application/json"}:{}),...(o.headers||{})};
if(auth){const s=await token();if(!s)throw new Error("Phiên đăng nhập đã hết, hãy đăng nhập lại.");h.Authorization="Bearer "+s.access_token}
const r=await fetch(SB.url+path,{method:o.method||"GET",headers:h,body:o.json?JSON.stringify(o.json):o.body});
if(!r.ok){let t="";try{t=await r.text()}catch(e){}throw new Error("Lỗi "+r.status+": "+t.slice(0,160))}
return (r.headers.get("content-type")||"").includes("json")?r.json():r.text()};
const fromRow=r=>({id:r.id,name:r.name,cat:r.cat,price:+r.price,old:+r.old||0,desc:r.descr||"",video:r.video||"",imgs:Array.isArray(r.imgs)?r.imgs:[],hot:r.hot?1:0,date:r.created_at||"",variants:(r.variants&&typeof r.variants==="object")?r.variants:{}});
const toRow=p=>({name:p.name,cat:p.cat,price:p.price,old:p.old||0,descr:p.desc||"",video:p.video||"",imgs:p.imgs||[],hot:!!p.hot,created_at:p.date||new Date().toISOString(),variants:p.variants||{}});
const loadRemote=async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),4000);
try{const [a,b]=await Promise.all([fetch(SB.url+"/rest/v1/products?select=*&order=created_at.desc",{headers:{apikey:SB.key},signal:c.signal}),fetch(SB.url+"/rest/v1/settings?select=value&key=eq.site",{headers:{apikey:SB.key},signal:c.signal})]);
if(!a.ok||!b.ok)throw 0;const rows=await a.json(),st=await b.json();const out={products:rows.map(fromRow),settings:(st[0]&&st[0].value)||{}};wr("lh_remote",out);return out}catch(e){return rd("lh_remote",null)}finally{clearTimeout(t)}};
const refreshP=async()=>{P=(await api("/rest/v1/products?select=*&order=created_at.desc")).map(fromRow);if(!S.ready){try{await saveSettings()}catch(e){}}};
const saveSettings=()=>{S.ready=true;return api("/rest/v1/settings?on_conflict=key",{method:"POST",json:{key:"site",value:S},headers:{Prefer:"resolution=merge-duplicates,return=minimal"}},true)};
const shrinkBlob=(f,max,q)=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*k;c.height=i.height*k;c.getContext("2d").drawImage(i,0,0,c.width,c.height);c.toBlob(b=>b?ok(b):no(new Error("Không nén được ảnh")),"image/jpeg",q)};i.onerror=()=>no(new Error("Không đọc được ảnh"));i.src=r.result};r.onerror=no;r.readAsDataURL(f)});
const upload=async(blob,kind,ext)=>{const path=kind+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+"."+ext;
await api("/storage/v1/object/media/"+path,{method:"POST",body:blob,headers:{"Content-Type":blob.type||"application/octet-stream"}},true);return SB.url+"/storage/v1/object/public/media/"+path};
const img=async(f,max,q)=>{try{return SB.on?await upload(await shrinkBlob(f,max,q),"img","jpg"):await shrink(f,max,q)}catch(e){alert("Không tải ảnh lên được: "+e.message);throw e}};
const sendOrder=async o=>{if(o.website)return true;let ok=false;
if(SB.on){try{await api("/rest/v1/orders",{method:"POST",json:{code:o.id,name:o.name,phone:o.phone,addr:o.addr,note:o.note||"",items:o.items,total:o.total},headers:{Prefer:"return=minimal"}});ok=true}catch(e){}}
if(ORDER_HOOK){try{await fetch(ORDER_HOOK,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({id:o.id,name:o.name,phone:o.phone,addr:o.addr,note:o.note,website:o.website,total:o.total,items:o.items})});ok=true}catch(e){}}
return ok};
if(!SB.on){P=rd(K.p,null)||P;S=rd(K.s,null)||S}else{const R=await loadRemote();if(R&&(page==="admin"||R.settings.ready||R.products.length)){P=R.products;S=R.settings}}
const saveC=()=>{wr(K.c,C);badge()};
const badge=()=>{const n=Object.values(C).reduce((a,b)=>a+b,0),e=$("#cn");if(e){e.textContent=n;e.hidden=!n}};
const cats=()=>[...new Set(P.map(p=>p.cat))];
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};
const shrink=(f,max,q)=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*k;c.height=i.height*k;c.getContext("2d").drawImage(i,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",q))};i.onerror=no;i.src=r.result};r.onerror=no;r.readAsDataURL(f)});
const media=v=>{const m=v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);return m?`<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="Video sản phẩm" loading="lazy" allowfullscreen></iframe>`:`<video src="${esc(v)}" controls preload="metadata" playsinline></video>`};

const me=()=>{const id=localStorage.getItem(K.ss);return rd(K.u,[]).find(x=>String(x.id)===id)||null};
const DEFAULT_CATS=[{name:"Phụ kiện điện thoại",icon:"📱"},{name:"Gia dụng",icon:"🍳"},{name:"Nhà cửa & đời sống",icon:"🏠"},{name:"Thú cưng",icon:"🐾"},{name:"Ô tô - Xe máy - Xe đạp",icon:"🛵"},{name:"Đồ chơi",icon:"🧸"}];
const catItems=()=>{const r=(S.cats||DEFAULT_CATS).map(c=>({...c}));cats().forEach(n=>{if(!r.some(c=>c.name===n))r.push({name:n,icon:"🛍️"})});return r};
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,"0")).join("");
const vItems=p=>(p&&p.variants&&Array.isArray(p.variants.items))?p.variants.items:[];
const vInfo=(p,i)=>{const it=vItems(p)[i];return it?{name:it.n,price:it.p>0?it.p:p.price}:null};
const fromPrice=p=>{const pr=vItems(p).map(i=>i.p>0?i.p:p.price),mn=Math.min(...pr),mx=Math.max(...pr);return (mx>mn?"Từ ":"")+vnd(mn)};
const parseV=t=>String(t||"").split("\n").map(l=>l.trim()).filter(Boolean).slice(0,30).map(l=>{const [n,p]=l.split("|").map(s=>s.trim());return{n:(n||"").slice(0,60),p:Math.max(0,parseInt(String(p||"").replace(/[^\d]/g,""))||0)}}).filter(i=>i.n);
const ymd=s=>{const d=new Date(s);if(!s||isNaN(d))return"";const z=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())};
const dmy=s=>{const y=ymd(s);return y?y.split("-").reverse().join("/"):""};
const isNew=p=>p.date&&Date.now()-new Date(p.date)<7*864e5&&Date.now()-new Date(p.date)>=-864e5;
const nkey=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const dupKeys=()=>{const m={};P.forEach(p=>{const k=nkey(p.name);if(k)m[k]=(m[k]||0)+1});return new Set(Object.keys(m).filter(k=>m[k]>1))};
const plink=p=>{const s=nkey(p.name).replace(/ /g,"-");return "/p/"+p.id+(s?"-"+s:"")};
const copyText=async(t,btn)=>{try{await navigator.clipboard.writeText(t);if(btn){const o=btn.textContent;btn.textContent="Đã sao chép";setTimeout(()=>btn.textContent=o,1500)}}catch(e){prompt("Sao chép link này:",t)}};
const IC={
menu:'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>',
cart:'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
user:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
search:'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
phone:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
chat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
logo:'<svg viewBox="0 0 32 32" width="38" height="38" aria-hidden="true"><path d="M4 12 6.5 5h19L28 12z" fill="#e11d2e"/><path d="M4 12h24v2a4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0z" fill="#ffc21a"/><path d="M6 17h20v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" fill="#1f4fd8"/><rect x="13" y="20" width="6" height="8" rx="1" fill="#fff"/></svg>'};
/* Header & footer */
const links=[["index.html","Trang chủ","home"],["gioi-thieu.html","Giới thiệu","about"],["san-pham.html","Sản phẩm","products"],["/game","Giải trí","game"],["lien-he.html","Liên hệ","contact"]];
const cu=me();
$("#hdr").innerHTML=`<nav class="nav" aria-label="Chính"><a class="logo" href="/" aria-label="Tiệm Tạp Hóa - Trang chủ">${IC.logo}<span class="lt"><b>Tiệm <i>Tạp</i> Hóa</b><small>Điện thoại · Gia dụng · Đồ tiện ích</small></span></a>
<div class="dd dm"><button class="btn gold" id="cb" aria-expanded="false" aria-controls="cm">${IC.menu}<span>Danh mục</span></button><div class="menu" id="cm" hidden>${catItems().map(c=>`<a href="san-pham.html?cat=${encodeURIComponent(c.name)}"><span class="mi">${c.icon}</span>${esc(c.name)}</a>`).join("")}</div></div>
<form class="search" action="san-pham.html" role="search"><input name="q" type="search" placeholder="Tìm sản phẩm…" aria-label="Tìm sản phẩm"><button class="btn gold" aria-label="Tìm">${IC.search}<span class="stx">Tìm</span></button></form>
<a class="cartlink" href="gio-hang.html" aria-label="Giỏ hàng">${IC.cart}<span id="cn">0</span></a>
<div class="dd ac"><button class="btn sec" id="ab" aria-expanded="false" aria-controls="am" aria-label="Tài khoản">${IC.user}<span class="acn">${cu?esc(cu.name.split(" ").pop()):"Tài khoản"}</span></button><div class="menu right" id="am" hidden>${cu?`<a href="tai-khoan.html">Tài khoản của tôi</a><button id="lg">Đăng xuất</button>`:`<a href="dang-nhap.html">Đăng nhập</a><a href="dang-nhap.html#dang-ky">Đăng ký</a>`}</div></div></nav>
<div class="sub">${links.map(l=>`<a class="${l[2]===page?"on":""}" href="${l[0]}"${l[2]===page?' aria-current="page"':""}>${l[1]}</a>`).join("")}</div>`;
{const tb=document.createElement("div");tb.className="topbar";tb.innerHTML='<div class="in"><span>🚚 <b>Giao hàng toàn quốc</b> · Bảo hành rõ ràng</span><span class="tb-r">Hotline: <a href="tel:0989740300">0989 740 300</a> · Zalo: <a href="https://zalo.me/0989740300" target="_blank" rel="noopener">0989 740 300</a></span></div>';$("#hdr").before(tb)}
[["cb","cm"],["ab","am"]].forEach(([b,m])=>{const bt=$("#"+b),mn=$("#"+m);bt.onclick=e=>{e.stopPropagation();const h=mn.hidden;$$(".menu").forEach(x=>x.hidden=true);mn.hidden=!h;bt.setAttribute("aria-expanded",String(h))}});
document.addEventListener("click",()=>$$(".menu").forEach(x=>x.hidden=true));
const lg=$("#lg");if(lg)lg.onclick=()=>{localStorage.removeItem(K.ss);location.href="index.html"};
$("#ftr").innerHTML=`<div class="wrap"><div><h3>Tiệm Tạp Hóa</h3><p>Điện thoại, gia dụng và đồ tiện ích chọn lọc. Bảo hành rõ ràng, giao hàng toàn quốc, hỗ trợ tận tâm.</p></div>
<div><h3>Liên kết</h3><p>${links.map(l=>`<a href="${l[0]}">${l[1]}</a>`).join("<br>")}</p></div>
<div><h3>Liên hệ</h3><p>📍 Thôn Tân Trà, xã Hương Đô<br>📞 <a href="tel:0989740300">0989 740 300</a><br>💬 <a href="https://zalo.me/0989740300" target="_blank" rel="noopener">Chat Zalo</a><br><a href="quan-tri.html">Quản trị</a></p></div></div><div class="copy">© ${new Date().getFullYear()} Tiệm Tạp Hóa · Hotline 0989 740 300</div>`;
badge();
const fab=document.createElement("div");fab.className="fab";fab.innerHTML=`<a class="fb fb-call" href="tel:0989740300" aria-label="Gọi ngay 0989 740 300"><span class="fi">${IC.phone}</span><span>Gọi ngay</span></a><a class="fb fb-zalo" href="https://zalo.me/0989740300" target="_blank" rel="noopener" aria-label="Chat Zalo"><span class="fi">Zalo</span><span>Chat Zalo</span></a>`;document.body.append(fab);
const hw=$("#herowrap");if(hw&&S.heroBg){hw.style.backgroundImage=`url("${S.heroBg.replace(/"/g,"%22")}")`;hw.classList.add("hasbg")}

/* Thẻ sản phẩm + cửa sổ chi tiết */
const imgs=p=>p.imgs||[];
const card=p=>{const a=imgs(p)[0];return `<article class="card"><a class="lk pw" href="${plink(p)}" aria-label="Xem chi tiết ${esc(p.name)}">${a?`<img class="thumb" src="${esc(a)}" alt="${esc(p.name)}" loading="lazy" width="400" height="300">`:`<div class="thumb" style="background:hsl(${hue(p.name)} 68% 54%)">${esc(p.name[0])}</div>`}${p.video?'<span class="vb">Video</span>':""}${p.old>p.price?`<span class="sb">-${Math.round(100-p.price*100/p.old)}%</span>`:""}</a>
<div class="b"><small>${esc(p.cat)}${isNew(p)?' · <b class="new">Mới</b>':""}</small><h3><a class="tl" href="${plink(p)}">${esc(p.name)}</a></h3><small class="ds">${esc(p.desc)}</small><div class="price">${vItems(p).length?fromPrice(p):vnd(p.price)}${p.old>p.price&&!vItems(p).length?` <s class="old">${vnd(p.old)}</s>`:""}</div>${vItems(p).length?`<a class="btn gold buy" href="${plink(p)}">Chọn phân loại</a>`:`<button class="btn gold buy" data-buy="${p.id}">Mua ngay</button><div class="acts"><a class="btn sec" href="${plink(p)}">Chi tiết</a><button class="btn" data-add="${p.id}">Thêm vào giỏ</button></div>`}</div></article>`};
const dlg=document.createElement(page==="detail"?"div":"dialog");dlg.className="dlg";dlg.setAttribute("aria-label","Chi tiết sản phẩm");
if(page==="detail"){dlg.open=true;dlg.showModal=()=>{};dlg.close=()=>{if(dlg.dataset.pid)open(dlg.dataset.pid)};$("#pd").append(dlg)}else document.body.append(dlg);
const open=id=>{const p=P.find(x=>x.id==id);if(!p)return;const im=imgs(p);dlg.dataset.pid=String(id);dlg.dataset.vi="";
dlg.innerHTML=`<div class="in"><div class="main" id="mm">${im[0]?`<img src="${esc(im[0])}" alt="${esc(p.name)}">`:""}${p.video&&!im[0]?media(p.video):""}</div>
<div class="th">${im.map((x,i)=>`<img src="${esc(x)}" alt="Ảnh ${i+1}" data-g="${i}" class="${i?"":"on"}">`).join("")}${p.video&&im[0]?`<img src="${esc(im[0])}" alt="Xem video" data-vid="1" style="opacity:.6">`:""}</div>
<div><small>${esc(p.cat)}${p.date?` · Đăng ngày ${dmy(p.date)}`:""}</small><${page==="detail"?"h1":"h2"}>${esc(p.name)}</${page==="detail"?"h1":"h2"}><p>${esc(p.desc)}</p><div class="price" id="mp">${vItems(p).length?fromPrice(p):vnd(p.price)}</div></div>${vItems(p).length?`<div class="vr"><strong>${esc((p.variants&&p.variants.label)||"Phân loại")}</strong><div class="chips2">${vItems(p).map((it,i)=>`<button type="button" class="chip" data-vi="${i}">${esc(it.n)}${it.p>0?` · ${vnd(it.p)}`:""}</button>`).join("")}</div><small id="vmsg" class="err" role="alert"></small></div>`:""}
<button class="btn gold buy" data-buy="${p.id}">Mua ngay</button><div class="acts"><button class="btn" data-add="${p.id}">Thêm vào giỏ</button>${page==="detail"?'<a class="btn sec" href="/san-pham">← Tất cả sản phẩm</a>':'<button class="btn sec" id="xc">Đóng</button>'}</div>${page==="detail"?`<div class="acts"><button type="button" class="btn sec" id="cplink">Sao chép link</button><a class="btn sec" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.origin+plink(p))}">Chia sẻ Facebook</a></div>`:""}</div>`;
dlg.showModal();if($("#xc",dlg))$("#xc",dlg).onclick=()=>dlg.close();if($("#cplink",dlg))$("#cplink",dlg).onclick=()=>copyText(location.origin+plink(p),$("#cplink",dlg));
$$("[data-g]",dlg).forEach(i=>i.onclick=()=>{$$("[data-g],[data-vid]",dlg).forEach(x=>x.classList.remove("on"));i.classList.add("on");$("#mm",dlg).innerHTML=`<img src="${esc(im[i.dataset.g])}" alt="${esc(p.name)}">`});
const v=$("[data-vid]",dlg);if(v)v.onclick=()=>{$$("[data-g]",dlg).forEach(x=>x.classList.remove("on"));$("#mm",dlg).innerHTML=media(p.video)}};
if(page!=="detail")dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close()});
dlg.addEventListener("close",()=>{dlg.innerHTML=""});
const buy=(id,vi=null)=>{const p=P.find(x=>String(x.id)===String(id));if(!p)return;const u=me(),vv=vi===null?null:vInfo(p,vi),unit=vv?vv.price:p.price,pname=vv?`${p.name} (${vv.name})`:p.name;
dlg.innerHTML=`<div class="in"><h2>Mua ngay</h2><div class="cp"><strong>${esc(pname)}</strong><span class="price" id="bt">${vnd(unit)}</span></div>
<form id="qf" class="form"><label>Số lượng<input name="qty" type="number" min="1" max="99" value="1"></label><label>Họ tên<input name="name" required autocomplete="name" value="${esc(u?u.name:"")}"></label><label>Số điện thoại<input name="phone" type="tel" required pattern="0[0-9]{9}" title="Nhập số điện thoại 10 chữ số" autocomplete="tel" value="${esc(u?u.phone||"":"")}"></label><label>Địa chỉ nhận hàng<input name="addr" required autocomplete="street-address"></label><label>Ghi chú<textarea name="note" rows="2"></textarea></label><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="acts"><button class="btn" id="qb">Đặt hàng ngay</button><button type="button" class="btn sec" id="qx">Hủy</button></div></form></div>`;
if(!dlg.open)dlg.showModal();
$("#qx",dlg).onclick=()=>dlg.close();
$("[name=qty]",dlg).oninput=e=>{$("#bt",dlg).textContent=vnd(unit*Math.max(1,Math.min(99,+e.target.value||1)))};
$("#qf",dlg).onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),q=Math.max(1,Math.min(99,+f.qty||1)),tot=unit*q,oid="TH"+Date.now().toString().slice(-7),its=[pname+" × "+q];
const b=$("#qb",dlg);b.disabled=true;b.textContent="Đang gửi đơn…";
const O=rd(K.o,[]);O.unshift({id:oid,uid:u?u.id:null,time:new Date().toLocaleString("vi-VN"),name:f.name,phone:f.phone,addr:f.addr,note:f.note,total:tot,items:its});wr(K.o,O);
const sent=await sendOrder({id:oid,name:f.name,phone:f.phone,addr:f.addr,note:f.note,website:f.website,total:tot,items:its});
dlg.innerHTML=`<div class="in"><div class="ok"><h2>Đặt hàng thành công</h2><p>Mã đơn <strong>${oid}</strong>. ${sent?"Chúng tôi sẽ gọi xác nhận trong vòng 2 giờ.":'Chưa gửi được thông báo tới cửa hàng, vui lòng <a href="tel:0989740300">gọi 0989 740 300</a> hoặc nhắn <a href="https://zalo.me/0989740300" target="_blank" rel="noopener">Zalo</a> kèm mã đơn.'}</p></div><div class="acts"><button class="btn" id="qx">Đóng</button></div></div>`;
$("#qx",dlg).onclick=()=>dlg.close()}};
document.addEventListener("click",e=>{
const ch=e.target.closest(".chip");if(ch){dlg.dataset.vi=ch.dataset.vi;$$(".chip",dlg).forEach(x=>x.classList.toggle("on",x===ch));const pp=P.find(x=>String(x.id)===dlg.dataset.pid),vv=pp&&vInfo(pp,+ch.dataset.vi);if(vv)$("#mp",dlg).textContent=vnd(vv.price);const m=$("#vmsg",dlg);if(m)m.textContent="";return}
const v=e.target.closest("[data-v]");if(v){open(v.dataset.v);return}
const pick=id=>{const p=P.find(x=>String(x.id)===String(id));if(!p)return null;if(!vItems(p).length)return{p,vi:null};
const same=dlg.open&&dlg.dataset.pid===String(p.id);if(same&&dlg.dataset.vi!=="")return{p,vi:+dlg.dataset.vi};
if(same){const m=$("#vmsg",dlg);if(m)m.textContent="Vui lòng chọn phân loại.";return null}open(p.id);return null};
const y=e.target.closest("[data-buy]");if(y){const s=pick(y.dataset.buy);if(s)buy(s.p.id,s.vi);return}
const b=e.target.closest("[data-add]");if(!b)return;const s=pick(b.dataset.add);if(!s)return;const k=s.vi===null?String(s.p.id):s.p.id+"|"+s.vi;C[k]=(C[k]||0)+1;saveC();b.textContent="Đã thêm";setTimeout(()=>b.textContent="Thêm vào giỏ",1200)});

if(page==="detail"){const m=(location.pathname.split("/").filter(Boolean).pop()||"").match(/^(\d+)/),pp=m&&P.find(x=>String(x.id)===m[1]);
if(pp){open(pp.id);document.title=pp.name+" – Tiệm Tạp Hóa"}else $("#pd").innerHTML='<div class="ok"><h1>Không tìm thấy sản phẩm</h1><p>Sản phẩm có thể đã bị xóa hoặc đường dẫn chưa đúng.</p><a class="btn" href="/san-pham">Xem tất cả sản phẩm</a></div>'}
if(page==="home"){
const bn=S.banners||[],el=$("#bn");
if(bn.length){el.hidden=false;if(hw)hw.hidden=true;let i=0;
el.innerHTML=`<div class="sl">${bn.map((b,k)=>{const im=`<img src="${esc(b.img)}" alt="Banner ${k+1}" ${k?'loading="lazy"':""}>`;return `<div class="sd" ${k?"hidden":""}>${b.link?`<a href="${esc(b.link)}">${im}</a>`:im}</div>`}).join("")}${bn.length>1?'<button class="sp" aria-label="Trước">‹</button><button class="sn" aria-label="Sau">›</button>':""}</div>`;
const sd=$$(".sd",el),go=n=>{i=(n+sd.length)%sd.length;sd.forEach((x,k)=>x.hidden=k!==i)};
if(bn.length>1){$(".sp",el).onclick=()=>go(i-1);$(".sn",el).onclick=()=>go(i+1);setInterval(()=>go(i+1),5000)}}
$("#catstrip").innerHTML=`<a class="ct fs" href="san-pham.html?sale=1"><span class="ci">⚡</span>Flash Sale</a>`+catItems().map(c=>`<a class="ct" href="san-pham.html?cat=${encodeURIComponent(c.name)}"><span class="ci">${c.icon}</span>${esc(c.name)}</a>`).join("")}
if(page==="home")$("#featured").innerHTML=(P.some(p=>p.hot)?P.filter(p=>p.hot):P).slice(0,8).map(card).join("")||"<p>Chưa có sản phẩm.</p>";

if(page==="products"){
const u=new URLSearchParams(location.search),q=$("#q"),c=$("#cat"),s=$("#sort");
c.innerHTML='<option value="">Tất cả danh mục</option>'+catItems().map(y=>y.name).map(x=>`<option>${esc(x)}</option>`).join("");
q.value=u.get("q")||"";const sale=u.get("sale");if(sale)$("h1").textContent="Flash Sale";c.value=u.get("cat")||"";
const bare=t=>t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase();
const PER=(window.CFG&&+CFG.perPage)||8;let pg=Math.max(1,+u.get("page")||1);
const draw=keep=>{let r=P.filter(p=>(!sale||p.old>p.price)&&(!c.value||p.cat===c.value)&&(!q.value||bare(p.name+" "+p.desc).includes(bare(q.value))));
if(s.value)r.sort((a,b)=>s.value==="new"?new Date(b.date||0)-new Date(a.date||0):s.value==="asc"?a.price-b.price:b.price-a.price);
const pages=Math.max(1,Math.ceil(r.length/PER));if(!keep)pg=1;pg=Math.min(pg,pages);const from=(pg-1)*PER;
$("#count").textContent=r.length?`Hiển thị ${from+1}–${Math.min(from+PER,r.length)} trong ${r.length} sản phẩm · Trang ${pg}/${pages}`:"0 sản phẩm";
$("#list").innerHTML=r.slice(from,from+PER).map(card).join("")||"<p>Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa khác.</p>";
const nu=new URLSearchParams();if(q.value)nu.set("q",q.value);if(c.value)nu.set("cat",c.value);if(sale)nu.set("sale",sale);if(pg>1)nu.set("page",pg);
try{history.replaceState(null,"",location.pathname+(nu.toString()?"?"+nu:""))}catch(x){}
const nav=$("#pg"),nums=[];for(let i=1;i<=pages;i++)if(i===1||i===pages||Math.abs(i-pg)<=1)nums.push(i);
let h="";if(pages>1){h=`<button data-p="${pg-1}" ${pg===1?"disabled":""}>‹ Trước</button>`;let last=0;nums.forEach(i=>{if(i-last>1)h+="<span>…</span>";h+=`<button data-p="${i}" ${i===pg?'aria-current="page" class="on"':""}>${i}</button>`;last=i});h+=`<button data-p="${pg+1}" ${pg===pages?"disabled":""}>Sau ›</button>`}
nav.innerHTML=h;
$$("[data-p]",nav).forEach(b=>b.onclick=()=>{pg=+b.dataset.p;draw(true);$("#count").scrollIntoView({behavior:"smooth",block:"start"})})};
[q,c,s].forEach(x=>x.addEventListener("input",()=>draw()));
const view=()=>{let l=false;try{l=localStorage.getItem("lh_view")==="list"}catch(e){}$("#list").classList.toggle("list",l);$("#vg").setAttribute("aria-pressed",String(!l));$("#vl").setAttribute("aria-pressed",String(l))};
const sv=l=>{try{localStorage.setItem("lh_view",l?"list":"grid")}catch(e){}view()};$("#vg").onclick=()=>sv(0);$("#vl").onclick=()=>sv(1);view();draw(true)}


if(page==="cart"){
const box=$("#cartbox");
const draw=(done,sent)=>{const u0=me();
if(done){box.innerHTML=`<div class="ok"><h2>Đặt hàng thành công</h2><p>Mã đơn <strong>${done}</strong>. ${sent===false?'Chưa gửi được thông báo tới cửa hàng, vui lòng <a href="tel:0989740300">gọi 0989 740 300</a> hoặc nhắn <a href="https://zalo.me/0989740300" target="_blank" rel="noopener">Zalo</a> kèm mã đơn.':"Chúng tôi sẽ gọi xác nhận trong vòng 2 giờ."}</p><a class="btn" href="san-pham.html">Tiếp tục mua sắm</a></div>`;return}
const items=Object.keys(C).map(k=>{const [id,vi]=k.split("|"),p=P.find(x=>String(x.id)===id);if(!p)return null;const v=vi===undefined?null:vInfo(p,+vi);if(vi!==undefined&&!v)return null;return{k,p,n:C[k],name:v?`${p.name} (${v.name})`:p.name,price:v?v.price:p.price}}).filter(Boolean);
if(!items.length){box.innerHTML='<p>Giỏ hàng đang trống.</p><a class="btn" href="san-pham.html">Chọn sản phẩm</a>';return}
const tot=items.reduce((a,x)=>a+x.price*x.n,0);
box.innerHTML=`<div class="tw"><table><thead><tr><th>Sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th><th></th></tr></thead><tbody>${items.map(x=>`<tr><td>${esc(x.name)}</td><td>${vnd(x.price)}</td><td><input class="qty" type="number" min="1" value="${x.n}" data-q="${x.k}" aria-label="Số lượng"></td><td>${vnd(x.price*x.n)}</td><td><button class="btn del sm" data-rm="${x.k}">Xóa</button></td></tr>`).join("")}</tbody></table></div>
<div class="sum"><span>Tổng cộng</span><span>${vnd(tot)}</span></div>
${u0?"":'<p class="note">Bạn đã có tài khoản? <a href="dang-nhap.html">Đăng nhập</a> để tự điền thông tin và xem lại đơn hàng.</p>'}<form id="of" class="form"><h2>Thông tin giao hàng</h2><label>Họ tên<input name="name" required autocomplete="name" value="${esc(u0?u0.name:"")}"></label><label>Số điện thoại<input name="phone" value="${esc(u0?u0.phone:"")}" type="tel" required pattern="0[0-9]{9}" title="Nhập số điện thoại 10 chữ số" autocomplete="tel"></label><label>Địa chỉ nhận hàng<input name="addr" required autocomplete="street-address"></label><label>Ghi chú<textarea name="note" rows="2"></textarea></label><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn" id="ob">Đặt hàng</button></form>`;
$$("[data-q]",box).forEach(i=>i.onchange=()=>{C[i.dataset.q]=Math.max(1,+i.value||1);saveC();draw()});
$$("[data-rm]",box).forEach(b=>b.onclick=()=>{delete C[b.dataset.rm];saveC();draw()});
$("#of").onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const btn=$("#ob");btn.disabled=true;btn.textContent="Đang gửi đơn…";
const O=rd(K.o,[]),id="TH"+Date.now().toString().slice(-7),its=items.map(x=>x.name+" × "+x.n);
O.unshift({id,uid:u0?u0.id:null,time:new Date().toLocaleString("vi-VN"),...f,total:tot,items:its});wr(K.o,O);
const sent=await sendOrder({id,name:f.name,phone:f.phone,addr:f.addr,note:f.note,website:f.website,total:tot,items:its});
C={};saveC();draw(id,sent)}};
draw()}


if(page==="login"){
const L=$("#lf2"),R=$("#rf"),m=$("#am2"),tl=$("#tl"),tr=$("#tr");
if(!window.crypto||!crypto.subtle)m.textContent="Trình duyệt cần mở web bằng https để đăng nhập.";
const show=r=>{R.hidden=!r;L.hidden=!!r;tl.classList.toggle("sec",!!r);tr.classList.toggle("sec",!r);m.textContent=""};
tl.onclick=()=>show(0);tr.onclick=()=>show(1);if(location.hash==="#dang-ky")show(1);
L.onsubmit=async e=>{e.preventDefault();const f=new FormData(L),id=f.get("id").trim().toLowerCase(),x=rd(K.u,[]).find(z=>z.email===id||z.phone===id);
if(!x||x.hash!==await sha(x.salt+f.get("pw"))){m.textContent="Tài khoản hoặc mật khẩu chưa đúng.";return}
localStorage.setItem(K.ss,x.id);location.href="index.html"};
R.onsubmit=async e=>{e.preventDefault();const f=new FormData(R),U=rd(K.u,[]),email=f.get("email").trim().toLowerCase(),phone=f.get("phone").trim();
if(f.get("pw")!==f.get("pw2")){m.textContent="Mật khẩu nhập lại chưa khớp.";return}
if(U.some(z=>z.email===email||z.phone===phone)){m.textContent="Email hoặc số điện thoại đã có tài khoản.";return}
const salt=[...crypto.getRandomValues(new Uint32Array(2))].join("-"),x={id:Date.now(),name:f.get("name").trim(),email,phone,salt,hash:await sha(salt+f.get("pw"))};
U.push(x);if(!wr(K.u,U)){m.textContent="Không lưu được tài khoản.";return}localStorage.setItem(K.ss,x.id);location.href="index.html"}}
if(page==="account"){const x=me();if(!x)location.replace("dang-nhap.html");else{const O=rd(K.o,[]).filter(o=>o.uid===x.id);
$("#acc").innerHTML=`<h1>Xin chào, ${esc(x.name)}</h1><p class="muted">${esc(x.email)} · ${esc(x.phone)}</p><h2>Đơn hàng của tôi</h2>${O.length?`<div class="tw"><table><thead><tr><th>Mã đơn</th><th>Sản phẩm</th><th>Tổng</th></tr></thead><tbody>${O.map(o=>`<tr><td>${esc(o.id)}<br><small>${esc(o.time)}</small></td><td>${o.items.map(esc).join("<br>")}</td><td>${vnd(o.total)}</td></tr>`).join("")}</tbody></table></div>`:"<p>Bạn chưa có đơn hàng nào.</p>"}`}}

/* Chatbot tư vấn (trả lời theo từ khóa, không cần máy chủ). Sửa nội dung trả lời ở mảng FAQ bên dưới. */
if(page!=="admin"){
const bare=t=>String(t).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const has=(n,ks)=>ks.some(k=>(" "+n+" ").includes(" "+k+" "));
const FAQ=[
[["giao hang","van chuyen","ship","phi giao","bao lau","nhan hang"],"Cửa hàng giao toàn quốc, thường 1–3 ngày. Miễn phí vận chuyển cho đơn từ 500.000₫."],
[["bao hanh","doi tra","hoan tien","bi loi","hu hong"],"Sản phẩm được bảo hành 12 tháng. Lỗi do nhà sản xuất được đổi mới trong 30 ngày, bạn nhớ giữ lại hộp và hóa đơn nhé."],
[["thanh toan","chuyen khoan","cod","tra tien"],"Bạn có thể thanh toán khi nhận hàng (COD) hoặc chuyển khoản. Nhân viên sẽ gọi xác nhận đơn trước khi giao."],
[["dia chi","o dau","cua hang","gio mo","mo cua","may gio"],"Cửa hàng ở Thôn Tân Trà, xã Hương Đô. Mở cửa 8:00 – 21:00 mỗi ngày."],
[["dat hang","mua hang","cach mua","gio hang"],"Cách đặt hàng: chọn sản phẩm, bấm \"Thêm vào giỏ\", vào Giỏ hàng, điền họ tên, số điện thoại, địa chỉ rồi bấm \"Đặt hàng\". Cửa hàng sẽ gọi xác nhận."],
[["game","tro choi","giai tri","choi game"],"Tiệm Tạp Hóa có khu Giải trí với các game miễn phí: lật hình, rắn săn mồi, 2048 và cờ ca-rô. Bạn bấm mục Giải trí trên thanh menu để chơi nhé."],
[["tai khoan","dang ky","dang nhap","mat khau"],"Bạn có thể đăng ký hoặc đăng nhập ở menu Tài khoản trên đầu trang để lưu thông tin và xem lại đơn hàng."]];
const STOP=new Set("cho toi can mua gia bao nhieu la co khong shop ban minh xem tim ve cua cac nhung mot cai chiec nay do nao o san pham hoi".split(" "));
const find=n=>{const ks=n.split(" ").filter(w=>w.length>1&&!STOP.has(w));if(!ks.length)return[];
return P.map(p=>{const hw=bare(p.name+" "+p.cat+" "+p.desc).split(" ");return{p,s:ks.filter(k=>hw.some(w=>w.startsWith(k))).length}}).filter(x=>x.s).sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.p)};
const row=p=>`<div class="cp"><div><strong>${esc(p.name)}</strong><br><span class="price">${vItems(p).length?fromPrice(p):vnd(p.price)}</span>${p.old>p.price&&!vItems(p).length?` <s class="old">${vnd(p.old)}</s>`:""}</div><div class="acts"><a class="btn sm sec" href="${plink(p)}">Xem</a>${vItems(p).length?"":`<button class="btn sm" data-add="${p.id}">Thêm giỏ</button><button class="btn sm gold" data-buy="${p.id}">Mua ngay</button>`}</div></div>`;
const contact='<div class="qr"><a class="btn sm" href="tel:0989740300">📞 Gọi 0989 740 300</a><a class="btn sm zl" href="https://zalo.me/0989740300" target="_blank" rel="noopener">💬 Chat Zalo</a></div>';
const reply=raw=>{const n=bare(raw),short=n.split(" ").length;
if(has(n,["nhan vien","tu van","lien he","goi dien","sdt","so dien thoai","zalo","hotline","nguoi that"]))return "Bạn liên hệ nhân viên tại đây nhé:"+contact;
if(has(n,["giam gia","khuyen mai","sale","flash sale","uu dai","re nhat"])){const s=P.filter(p=>p.old>p.price).slice(0,4);return s.length?"Các sản phẩm đang giảm giá:"+s.map(row).join("")+'<a href="san-pham.html?sale=1">Xem tất cả Flash Sale</a>':"Hiện chưa có chương trình giảm giá. Bạn theo dõi website để cập nhật nhé."}
for(const [ks,t] of FAQ)if(has(n,ks))return t;
if(short<=4&&has(n,["xin chao","chao","hello","hi","alo"]))return 'Chào bạn! Bạn muốn tìm sản phẩm gì ạ? Bạn có thể gõ tên sản phẩm, ví dụ "ốp lưng" hoặc "nồi chiên".';
if(short<=4&&has(n,["noi bat","san pham","xem hang"])){const h=P.filter(p=>p.hot).slice(0,4);return "Một số sản phẩm nổi bật:"+h.map(row).join("")+'<a href="san-pham.html">Xem tất cả sản phẩm</a>'}
const cat=catItems().map(c=>c.name).find(c=>{const b=bare(c);return n.includes(b)||(n.length>=6&&b.includes(n))});
const list=cat?P.filter(p=>p.cat===cat).slice(0,4):find(n);
if(list.length)return (cat?`Sản phẩm trong "${esc(cat)}":`:"Mình tìm thấy:")+list.map(row).join("")+`<a href="san-pham.html${cat?"?cat="+encodeURIComponent(cat):"?q="+encodeURIComponent(raw)}">Xem thêm trên trang sản phẩm</a>`;
return "Mình chưa hiểu rõ câu hỏi. Bạn thử gõ tên sản phẩm, hoặc hỏi về giao hàng, bảo hành, thanh toán. Hoặc nhắn nhân viên:"+contact};
const box=document.createElement("div");box.className="cb";
box.innerHTML=`<button class="cb-open" aria-expanded="false" aria-controls="cb-panel"><span class="fi">${IC.chat}</span><span>Chat với shop</span></button>
<section class="cb-panel" id="cb-panel" role="dialog" aria-label="Trợ lý cửa hàng" hidden><div class="cb-h"><strong>Trợ lý Tiệm Tạp Hóa</strong><button class="cb-x" aria-label="Đóng">×</button></div><div class="cb-log" id="cb-log" role="log" aria-live="polite"></div>
<div class="cb-qr">${["Sản phẩm nổi bật","Khuyến mãi","Giao hàng","Bảo hành","Nhân viên tư vấn"].map(q=>`<button data-q="${q}">${q}</button>`).join("")}</div>
<form class="cb-f" id="cb-f"><input id="cb-in" placeholder="Nhập câu hỏi…" aria-label="Nhập câu hỏi" maxlength="200" autocomplete="off"><button class="btn sm">Gửi</button></form></section>`;
document.body.append(box);
const log=$("#cb-log",box),panel=$("#cb-panel",box),ob=$(".cb-open",box),inp=$("#cb-in",box);let started=false;
const add=(c,h)=>{const d=document.createElement("div");d.className="m "+c;d.innerHTML=h;log.append(d);log.scrollTop=log.scrollHeight;return d};
const ask=t=>{t=t.trim().slice(0,200);if(!t)return;add("u",esc(t));const w=add("b","…");setTimeout(()=>{w.innerHTML=reply(t);log.scrollTop=log.scrollHeight},450)};
const toggle=o=>{panel.hidden=!o;ob.setAttribute("aria-expanded",String(o));if(o){if(!started){started=true;add("b","Xin chào! Mình là trợ lý của Tiệm Tạp Hóa. Mình có thể gợi ý sản phẩm, báo giá, giải đáp giao hàng và bảo hành.")}inp.focus()}};
ob.onclick=()=>toggle(panel.hidden);$(".cb-x",box).onclick=()=>{toggle(false);ob.focus()};
panel.addEventListener("keydown",e=>{if(e.key==="Escape"){toggle(false);ob.focus()}});
$("#cb-f",box).onsubmit=e=>{e.preventDefault();ask(inp.value);inp.value=""};
$$("[data-q]",box).forEach(b=>b.onclick=()=>ask(b.dataset.q))}
/* Quản trị */
if(page==="admin"){
const A=$("#adm");let tab="p",w=null,OD=null,ok=SB.on?!!ses():sessionStorage.getItem("lh_ok")==="1";
const getO=async()=>{if(!SB.on)return rd(K.o,[]);if(OD===null){try{OD=await api("/rest/v1/orders?select=*&order=created_at.desc&limit=300",{},true)}catch(e){OD=[]}}return OD};
const save=async()=>{if(SB.on){try{await saveSettings()}catch(e){alert("Không lưu được: "+e.message)}return}if(!(wr(K.p,P)&&wr(K.s,S)))alert("Bộ nhớ trình duyệt đã đầy. Hãy dùng đường dẫn ảnh (img/ten.jpg) hoặc xóa bớt ảnh tải lên.")};
const dl=()=>{const b=new Blob(["window.SHOP="+JSON.stringify({settings:S,products:P},null,1)+";\n"],{type:"text/javascript"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="data.js";a.click()};
const draw=async()=>{
if(!ok&&SB.on){A.innerHTML=`<h1>Đăng nhập quản trị</h1><form id="lf" class="form" style="max-width:360px"><label>Email<input type="email" id="em" required autocomplete="username"></label><label>Mật khẩu<input type="password" id="pw" required autocomplete="current-password"></label><button class="btn">Đăng nhập</button><p id="le" class="err" role="alert"></p></form>`;
$("#lf").onsubmit=async e=>{e.preventDefault();$("#le").textContent="Đang đăng nhập…";try{const r=await fetch(SB.url+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({email:$("#em").value.trim(),password:$("#pw").value})});const j=await r.json().catch(()=>({}));if(!r.ok){const m=String(j.msg||j.error_description||j.message||j.error||r.status);throw new Error(/invalid login|invalid_credentials|invalid credentials/i.test(m)?"SAI":m)}
wr("lh_sb",{access_token:j.access_token,refresh_token:j.refresh_token,expires_at:j.expires_at||Math.floor(Date.now()/1000)+j.expires_in,email:j.user&&j.user.email});ok=true;OD=null;draw()}catch(x){$("#le").textContent=x instanceof TypeError?"Không kết nối được tới Supabase. Kiểm tra mạng và supabaseUrl trong config.js.":x.message==="SAI"?"Email hoặc mật khẩu chưa đúng.":"Không đăng nhập được. Mã lỗi: "+x.message}};return}
if(!ok){A.innerHTML=`<h1>Đăng nhập quản trị</h1><form id="lf" class="form" style="max-width:360px"><label>Mật khẩu<input type="password" id="pw" required autocomplete="current-password"></label><button class="btn">Đăng nhập</button><p id="le" class="err" role="alert"></p></form>`;
$("#lf").onsubmit=e=>{e.preventDefault();if($("#pw").value===ADMIN_PASS){ok=true;sessionStorage.setItem("lh_ok","1");draw()}else $("#le").textContent="Mật khẩu chưa đúng."};return}
const O=await getO();
A.innerHTML=`<div class="adm-head"><h1>Quản trị</h1><div class="acts">${SB.on?"":'<button class="btn sm" id="dl">Tải data.js để đăng lên web</button>'}<button class="btn sec sm" id="lo">Đăng xuất</button></div></div>
${SB.on?'<p class="note">Thay đổi được lưu thẳng lên web, khách thấy ngay, không cần tải file hay đưa lên GitHub.</p>':'<p class="note">Thay đổi đang lưu như bản nháp trên máy này. Khách chỉ thấy sau khi bạn tải <strong>data.js</strong>, chép đè vào thư mục <strong>js/</strong> rồi đưa lên GitHub để Vercel cập nhật.</p>'}
<div class="tabs"><button class="btn ${tab==="p"?"":"sec"}" data-t="p">Sản phẩm (${P.length})</button><button class="btn ${tab==="s"?"":"sec"}" data-t="s">Banner & nền</button><button class="btn ${tab==="c"?"":"sec"}" data-t="c">Danh mục</button><button class="btn ${tab==="o"?"":"sec"}" data-t="o">Đơn hàng (${O.length})</button></div><div id="tb"></div>`;
if($("#dl"))$("#dl").onclick=dl;$("#lo").onclick=()=>{sessionStorage.removeItem("lh_ok");localStorage.removeItem("lh_sb");OD=null;ok=false;draw()};
$$("[data-t]",A).forEach(b=>b.onclick=()=>{tab=b.dataset.t;w=null;draw()});
const tb=$("#tb"),DK=dupKeys();
if(tab==="o"){const oo=O.map(o=>SB.on?{id:o.code,rid:o.id,time:new Date(o.created_at).toLocaleString("vi-VN"),name:o.name,phone:o.phone,addr:o.addr,note:o.note,items:o.items||[],total:o.total,status:o.status}:o);
tb.innerHTML=(SB.on?'<p><button class="btn sec sm" id="ro">Tải lại đơn hàng</button></p>':"")+(oo.length?`<div class="tw"><table><thead><tr><th>Mã</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng</th>${SB.on?"<th>Trạng thái</th>":""}</tr></thead><tbody>${oo.map(o=>`<tr><td>${esc(o.id)}<br><small>${esc(o.time)}</small></td><td>${esc(o.name)}<br>${esc(o.phone)}<br><small>${esc(o.addr)}</small>${o.note?`<br><small>Ghi chú: ${esc(o.note)}</small>`:""}</td><td>${o.items.map(esc).join("<br>")}</td><td>${vnd(o.total)}</td>${SB.on?`<td><select data-st="${o.rid}" aria-label="Trạng thái đơn">${["Mới","Đã gọi","Đang giao","Hoàn thành","Hủy"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></td>`:""}</tr>`).join("")}</tbody></table></div>`:"<p>Chưa có đơn hàng nào.</p>");
if($("#ro"))$("#ro").onclick=()=>{OD=null;draw()};
$$("[data-st]",tb).forEach(s=>s.onchange=async()=>{try{const r=await api("/rest/v1/orders?id=eq."+s.dataset.st,{method:"PATCH",json:{status:s.value},headers:{Prefer:"return=representation"}},true);if(!r.length)throw new Error("Không đủ quyền cập nhật.");const x=OD.find(z=>String(z.id)===s.dataset.st);if(x)x.status=s.value}catch(e){alert(e.message)}});return}
if(tab==="s"){tb.innerHTML=`<div class="fgrid"><div class="full"><h2>Banner trang chủ</h2><p class="muted">Ảnh ngang (tỉ lệ 16:6), tự chạy luân phiên. Có thể gắn link khi khách bấm vào banner.</p><div class="pv">${(S.banners||[]).map((b,i)=>`<div><img src="${esc(b.img)}" alt="Banner ${i+1}" style="width:150px;height:56px"><button type="button" data-bx="${i}" aria-label="Xóa banner ${i+1}">×</button></div>`).join("")}</div></div><label>Thêm banner từ máy<input type="file" id="bnf" accept="image/*"></label><label>Link khi bấm vào (không bắt buộc)<input id="bnl" placeholder="san-pham.html?sale=1"></label><div class="full"><h2>Ảnh nền chữ (khi chưa có banner)</h2><div class="bgpv" style="${S.heroBg?`background-image:url('${esc(S.heroBg)}')`:""}" role="img" aria-label="Xem trước ảnh nền"></div></div>
<label>Tải ảnh từ máy<input type="file" id="bf" accept="image/*"></label><label>Hoặc dán link / đường dẫn ảnh<input id="bu" placeholder="img/banner.jpg hoặc https://…" value="${S.heroBg&&!S.heroBg.startsWith("data:")?esc(S.heroBg):""}"></label>
<div class="full"><button class="btn" id="bs">Lưu link ảnh</button> <button class="btn del" id="bd">Xóa ảnh nền</button></div></div>`;
$("#bf").onchange=async e=>{if(e.target.files[0]){S.heroBg=await img(e.target.files[0],1600,.75);save();draw()}};
$("#bs").onclick=()=>{S.heroBg=$("#bu").value.trim();save();draw()};$("#bd").onclick=()=>{S.heroBg="";save();draw()};
$("#bnf").onchange=async e=>{if(e.target.files[0]){(S.banners=S.banners||[]).push({img:await img(e.target.files[0],1600,.75),link:$("#bnl").value.trim()});save();draw()}};
$$("[data-bx]",tb).forEach(b=>b.onclick=()=>{S.banners.splice(+b.dataset.bx,1);save();draw()});return}
if(tab==="c"){const cs=catItems();tb.innerHTML=`<form id="cf2" class="fgrid"><p class="full muted">Biểu tượng là một emoji (ví dụ 📱). Xóa trống tên để bỏ danh mục. Đổi tên danh mục thì cũng sửa danh mục của các sản phẩm tương ứng.</p>${cs.map((c,i)=>`<label>Tên danh mục<input name="n${i}" value="${esc(c.name)}"></label><label>Biểu tượng<input name="i${i}" value="${esc(c.icon)}" maxlength="4"></label>`).join("")}<label>Danh mục mới<input name="nn" placeholder="Ví dụ: Thời trang"></label><label>Biểu tượng<input name="ni" maxlength="4" placeholder="👕"></label><div class="full"><button class="btn">Lưu danh mục</button></div></form>`;
$("#cf2").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),o=cs.map((c,i)=>({name:f.get("n"+i).trim(),icon:f.get("i"+i).trim()||"🛍️"})).filter(c=>c.name);if(f.get("nn").trim())o.push({name:f.get("nn").trim(),icon:f.get("ni").trim()||"🛍️"});S.cats=o;save();draw()};return}
tb.innerHTML=(w?`<form id="pf" class="fgrid"><label>Tên sản phẩm<input name="name" required value="${esc(w.name)}"></label><label>Danh mục<input name="cat" required list="cl" value="${esc(w.cat)}"><datalist id="cl">${catItems().map(c=>c.name).map(c=>`<option value="${esc(c)}">`).join("")}</datalist></label><label>Giá bán (₫)<input name="price" type="number" min="0" step="1000" required value="${w.price}"></label><label>Giá gốc (nếu đang giảm giá)<input name="old" type="number" min="0" step="1000" value="${w.old||""}"></label><label>Link video (YouTube hoặc .mp4)<input name="video" value="${esc(w.video||"")}" placeholder="https://youtu.be/… hoặc video/ten.mp4"></label>${SB.on?'<label>Hoặc tải video từ máy (tối đa 45MB)<input type="file" id="pv" accept="video/*"></label>':""}<label class="full">Mô tả<textarea name="desc" rows="2">${esc(w.desc)}</textarea></label><label>Ngày đăng<input type="date" name="pdate" value="${w.date?ymd(w.date):(w.id?"":ymd(new Date().toISOString()))}"></label><label>Tên nhóm phân loại (ví dụ: Màu sắc, Dòng máy)<input name="vlabel" value="${esc((w.variants&&w.variants.label)||"")}"></label><label class="full">Các phân loại: mỗi dòng một phân loại. Muốn giá riêng, ghi thêm dấu | rồi giá (ví dụ: iPhone 15 | 109000). Để trống nếu sản phẩm không có phân loại.<textarea name="vtext" rows="4" placeholder="Đen&#10;Trắng | 99000">${esc(vItems(w).map(i=>i.n+(i.p>0?" | "+i.p:"")).join("\n"))}</textarea></label><label class="full"><span><input type="checkbox" name="hot" style="width:auto" ${w.hot?"checked":""}> ⭐ Sản phẩm nổi bật (hiện ở trang chủ)</span></label>
<div class="full"><strong>Ảnh sản phẩm</strong> <small>(ảnh đầu tiên là ảnh đại diện)</small><div class="pv">${w.imgs.map((x,i)=>`<div><img src="${esc(x)}" alt="Ảnh ${i+1}"><button type="button" data-x="${i}" aria-label="Xóa ảnh ${i+1}">×</button></div>`).join("")}</div></div>
<label>Tải ảnh từ máy (chọn nhiều ảnh)<input type="file" id="pi" accept="image/*" multiple></label><label>Hoặc dán link / đường dẫn ảnh<input id="pu" placeholder="img/ten.jpg"></label>
<div class="full"><button type="button" class="btn sec sm" id="pa">Thêm ảnh từ link</button></div>
<div class="full"><button class="btn">Lưu sản phẩm</button> <button type="button" class="btn sec" id="cx">Hủy</button></div></form>`:`<p><button class="btn" id="nw">Thêm sản phẩm</button> ${SB.on?'<button class="btn sec" id="im">Nhập sản phẩm từ data.js</button>':'<button class="btn sec" id="rs">Bỏ bản nháp, dùng lại dữ liệu đã đăng</button>'}</p>`)+
`<input id="aq" type="search" placeholder="Tìm sản phẩm đã đăng để tránh đăng trùng…" aria-label="Tìm sản phẩm đã đăng" style="margin-bottom:10px">${DK.size?`<p class="err" role="alert">Có ${DK.size} tên sản phẩm đang bị đăng trùng (đánh dấu "Trùng tên" bên dưới). Hãy xóa bản thừa.</p>`:""}<p class="muted">Bấm ngôi sao ở cột Nổi bật để chọn sản phẩm hiện ở trang chủ (đang chọn ${P.filter(p=>p.hot).length}).</p><div class="tw"><table><thead><tr><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Ngày đăng</th><th>Nổi bật</th><th></th></tr></thead><tbody>${P.map(p=>`<tr data-n="${esc(nkey(p.name+" "+p.cat))}"><td>${esc(p.name)}${DK.has(nkey(p.name))?' <small class="err">Trùng tên</small>':""}${vItems(p).length?` <small class="muted">(${vItems(p).length} phân loại)</small>`:""}</td><td>${esc(p.cat)}</td><td>${vnd(p.price)}</td><td>${dmy(p.date)||"—"}</td><td><button type="button" class="star${p.hot?" on":""}" data-h="${p.id}" aria-pressed="${p.hot?"true":"false"}" aria-label="Nổi bật: ${esc(p.name)}">${p.hot?"★":"☆"}</button></td><td><button class="btn sec sm" data-e="${p.id}">Sửa</button> <button class="btn del sm" data-d="${p.id}">Xóa</button> <button class="btn sec sm" data-cp="${p.id}">Sao chép link</button></td></tr>`).join("")}</tbody></table></div>`;
if($("#nw"))$("#nw").onclick=()=>{w={id:0,name:"",cat:cats()[0]||"",price:0,imgs:[],video:"",desc:"",hot:0};draw()};
if($("#im"))$("#im").onclick=async()=>{if(!confirm("Nhập các sản phẩm và cài đặt trong data.js lên Supabase? Chỉ nên làm một lần."))return;try{const seen=new Set(P.map(p=>nkey(p.name))),rows=(D.products||[]).filter(p=>{const k=nkey(p.name);if(!k||seen.has(k))return false;seen.add(k);return true}).map(toRow);
if(!rows.length){alert("Tất cả sản phẩm trong data.js đã có trên Supabase, không nhập lại để tránh trùng.");return}
await api("/rest/v1/products",{method:"POST",json:rows,headers:{Prefer:"return=minimal"}},true);S={...(D.settings||{}),...S};await saveSettings();await refreshP();alert("Đã nhập "+rows.length+" sản phẩm mới (bỏ qua sản phẩm trùng tên).");draw()}catch(e){alert(e.message)}};
if($("#rs"))$("#rs").onclick=()=>{if(confirm("Xóa bản nháp trên máy này?")){localStorage.removeItem(K.p);localStorage.removeItem(K.s);P=D.products;S=D.settings||{};draw()}};
if($("#cx"))$("#cx").onclick=()=>{w=null;draw()};
$$("[data-e]",tb).forEach(b=>b.onclick=()=>{const p=P.find(x=>x.id==b.dataset.e);w={...p,imgs:[...(p.imgs||[])]};draw();scrollTo(0,0)});
if($("#aq"))$("#aq").oninput=e=>{const k=nkey(e.target.value);$$("tbody tr",tb).forEach(r=>{r.hidden=!!k&&!String(r.dataset.n).includes(k)})};
$$("[data-cp]",tb).forEach(b=>b.onclick=()=>{const p=P.find(x=>String(x.id)===b.dataset.cp);if(p)copyText(location.origin+plink(p),b)});
$$("[data-h]",tb).forEach(b=>b.onclick=async()=>{const p=P.find(x=>String(x.id)===b.dataset.h);if(!p)return;const v=p.hot?0:1;
if(SB.on){try{const r=await api("/rest/v1/products?id=eq."+p.id,{method:"PATCH",json:{hot:!!v},headers:{Prefer:"return=representation"}},true);if(!r.length)throw new Error("Không đủ quyền sửa.");p.hot=v}catch(e){alert(e.message)}draw();return}
p.hot=v;save();draw()});
$$("[data-d]",tb).forEach(b=>b.onclick=async()=>{if(!confirm("Xóa sản phẩm này?"))return;
if(SB.on){try{const r=await api("/rest/v1/products?id=eq."+b.dataset.d,{method:"DELETE",headers:{Prefer:"return=representation"}},true);if(!r.length)throw new Error("Không xóa được (không đủ quyền).");await refreshP()}catch(e){alert(e.message)}draw();return}
P=P.filter(p=>p.id!=b.dataset.d);save();draw()});
const pf=$("#pf");if(pf){
const sync=()=>{const f=new FormData(pf),pd=f.get("pdate"),nowI=new Date().toISOString();Object.assign(w,{date:(pd&&pd!==ymd(w.date))?(pd===ymd(nowI)?nowI:new Date(pd+"T12:00:00").toISOString()):(w.date||""),name:f.get("name"),cat:f.get("cat"),price:+f.get("price"),old:+f.get("old")||0,video:f.get("video").trim(),desc:f.get("desc"),hot:f.get("hot")?1:0,variants:{label:String(f.get("vlabel")||"").trim().slice(0,40),items:parseV(f.get("vtext"))}})};
pf.addEventListener("input",sync);
$$("[data-x]",pf).forEach(b=>b.onclick=()=>{sync();w.imgs.splice(+b.dataset.x,1);draw()});
const wait=el=>{const s=document.createElement("small");s.textContent=" Đang tải lên, vui lòng chờ…";el.after(s)};
$("#pi").onchange=async e=>{sync();wait(e.target);try{for(const f of e.target.files)w.imgs.push(await img(f,900,.8))}catch(x){}draw()};
if($("#pv"))$("#pv").onchange=async e=>{sync();const f=e.target.files[0];if(!f)return;if(f.size>45*1024*1024){alert("Video lớn hơn 45MB. Hãy nén video nhỏ hơn hoặc đăng lên YouTube rồi dán link.");e.target.value="";return}
wait(e.target);try{w.video=await upload(f,"video",(f.name.split(".").pop()||"mp4").toLowerCase().replace(/[^a-z0-9]/g,"")||"mp4")}catch(x){alert("Không tải video lên được: "+x.message)}draw()};
$("#pa").onclick=()=>{sync();const v=$("#pu").value.trim();if(v)w.imgs.push(v);draw()};
pf.onsubmit=async ev=>{ev.preventDefault();sync();const o={...w,id:w.id||Date.now(),name:w.name.trim(),cat:w.cat.trim(),desc:w.desc.trim()};
const dup=P.find(p=>String(p.id)!==String(w.id)&&nkey(p.name)===nkey(o.name));
if(dup&&!confirm(`Đã có sản phẩm "${dup.name}"${dup.date?` (đăng ngày ${dmy(dup.date)})`:""}. Bạn có chắc muốn đăng thêm một sản phẩm trùng tên không?\n\nChọn Hủy để quay lại và sửa sản phẩm cũ.`))return;
if(SB.on){const btn=$("button:not([type=button])",pf);if(btn){btn.disabled=true;btn.textContent="Đang lưu…"}
try{if(w.id){const r=await api("/rest/v1/products?id=eq."+w.id,{method:"PATCH",json:toRow(o),headers:{Prefer:"return=representation"}},true);if(!r.length)throw new Error("Không đủ quyền sửa. Kiểm tra email quản trị trong file SQL.")}else await api("/rest/v1/products",{method:"POST",json:toRow(o),headers:{Prefer:"return=minimal"}},true);await refreshP()}catch(e){alert("Không lưu được: "+e.message+(/duplicate|23505/i.test(e.message)?"\nTên sản phẩm này đã có, hãy đổi tên hoặc sửa sản phẩm cũ.":"")+(/variants/.test(e.message)?"\nBạn cần chạy lệnh SQL thêm cột phân loại trong Supabase (xem hướng dẫn).":""));draw();return}
w=null;draw();return}
if(w.id)P=P.map(p=>p.id===w.id?o:p);else P.unshift(o);w=null;save();draw()}}};
(async()=>{if(SB.on&&ok&&!(await token()))ok=false;draw()})()}
})();
