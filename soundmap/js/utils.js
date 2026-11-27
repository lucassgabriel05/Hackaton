'use strict';

/* ---------- utilidades ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const nfm=d=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const F0=nfm(0),F1=nfm(1),F2=nfm(2);
const n0=v=>F0.format(v),n1=v=>F1.format(v),n2=v=>F2.format(v);
const SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻'};
const sup=n=>String(n).split('').map(c=>SUP[c]||c).join('');
const sci=x=>{if(!isFinite(x)||x<=0)return '—';const e=Math.floor(Math.log10(x));return n1(x/Math.pow(10,e))+' × 10'+sup(e);};
const setT=(el,t)=>{if(el&&el.textContent!==t)el.textContent=t;};
const fmtDate=ts=>new Date(ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const hourOf=ts=>new Date(ts).getHours();

/* ---------- canvas ---------- */
function fit(c){const r=c.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return dpr;}
function ctx2(c){try{return c.getContext('2d');}catch(e){return null;}}

