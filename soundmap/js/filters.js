'use strict';

/* ---------- filtros ---------- */
const SLOTS={all:[0,24],madrugada:[0,6],manha:[6,12],tarde:[12,18],noite:[18,24]};
function filt(o){
  o=o||{};const now=Date.now();
  const lim=o.period==='24h'?864e5:o.period==='7d'?7*864e5:Infinity;
  const sl=SLOTS[o.slot||'all'];
  return S.data.filter(d=>{
    if(now-d.ts>lim)return false;
    const h=hourOf(d.ts);if(h<sl[0]||h>=sl[1])return false;
    if(o.cls&&!o.cls.has(cls(d.db)))return false;
    if(o.src==='demo'&&!d.demo)return false;
    if(o.src==='real'&&d.demo)return false;
    return true;
  });
}
function regionsOf(rows){
  const m=new Map();
  rows.forEach(d=>{const k=d.region||'Sem localização';let r=m.get(k);
    if(!r){r={name:k,n:0,s:0,la:0,lo:0,ln:0,max:0};m.set(k,r);}
    r.n++;r.s+=d.db;r.max=Math.max(r.max,d.db);
    if(d.lat!=null){r.la+=d.lat;r.lo+=d.lng;r.ln++;}});
  return Array.from(m.values()).map(r=>({name:r.name,n:r.n,avg:r.s/r.n,max:r.max,lat:r.ln?r.la/r.ln:null,lng:r.ln?r.lo/r.ln:null}));
}
