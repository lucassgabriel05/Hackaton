'use strict';

/* ---------- banco de dados (IndexedDB, com reserva em memória) ---------- */
const Store={db:null,ok:false,
  open(){return new Promise(res=>{try{
    if(!window.indexedDB)return res(false);
    const r=indexedDB.open('soundmap',1);
    r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('measures',{keyPath:'id'});};
    r.onsuccess=()=>{Store.db=r.result;Store.ok=true;res(true);};
    r.onerror=()=>res(false);r.onblocked=()=>res(false);
  }catch(e){res(false);}});},
  run(mode,fn){return new Promise(res=>{if(!Store.ok)return res(null);try{
    const t=Store.db.transaction('measures',mode);const s=t.objectStore('measures');const r=fn(s);
    t.oncomplete=()=>res(r&&r.result!==undefined?r.result:true);t.onerror=()=>res(null);t.onabort=()=>res(null);
  }catch(e){res(null);}});},
  all(){return Store.run('readonly',s=>s.getAll()).then(v=>Array.isArray(v)?v:[]);},
  put(rec){return Store.run('readwrite',s=>{s.put(rec);});},
  putMany(a){return Store.run('readwrite',s=>{a.forEach(x=>s.put(x));});},
  del(list){return Store.run('readwrite',s=>{list.forEach(x=>s.delete(x.id));});}
};
