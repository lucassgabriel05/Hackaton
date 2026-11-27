'use strict';

/* ---------- estado ---------- */
const S={route:'inicio',data:[],pos:null,watch:null,running:false,mode:null,cur:null,freq:null,
  opts:{save:true,geo:true},session:{n:0,sum:0,max:0},saved:0,buf:[],bufStart:0,hist:[],memOnly:false};
const E={ctx:null,an:null,stream:null,nodes:[],t:null,f:null,timer:0,demoTimer:0,sm:null,scale:0.01,lu:0,ls:0,pk:new Array(64).fill(-120)};
try{const o=JSON.parse(localStorage.getItem('soundmap.opts')||'{}');if(typeof o.save==='boolean')S.opts.save=o.save;if(typeof o.geo==='boolean')S.opts.geo=o.geo;if(Object.prototype.hasOwnProperty.call(o,'adj')){delete o.adj;localStorage.setItem('soundmap.opts',JSON.stringify(o));}}catch(e){}
const saveOpts=()=>{try{localStorage.setItem('soundmap.opts',JSON.stringify(S.opts));}catch(e){}};
const CAL_BASE=100; // dBFS -> dB SPL estimado: L = dBFS + 100
