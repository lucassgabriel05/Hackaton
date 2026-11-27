'use strict';

/* ---------- física ---------- */
const P0=20e-6,I0=1e-12,VSOM=343;
const pRms=db=>P0*Math.pow(10,db/20);
const inten=db=>I0*Math.pow(10,db/10);
const fmtP=p=>p>=1?n2(p)+' Pa':p>=1e-3?n1(p*1e3)+' mPa':n1(p*1e6)+' µPa';
const NOTES=['Dó','Dó♯','Ré','Ré♯','Mi','Fá','Fá♯','Sol','Sol♯','Lá','Lá♯','Si'];
const noteOf=f=>{if(!f||f<40||f>4200)return null;const m=Math.round(12*Math.log2(f/440)+69);return NOTES[((m%12)+12)%12]+(Math.floor(m/12)-1);};
const bandOf=f=>f<250?'grave':f<=2000?'médio':'agudo';

/* ---------- classificação ---------- */
const T={quiet:55,crit:70};
const COL={quiet:css('--quiet'),mod:css('--mod'),crit:css('--crit'),cyan:css('--cyan'),blue:css('--blue'),muted:css('--muted'),fg:css('--fg'),mono:css('--f-mono')||'monospace'};
const CLS={
  quiet:{label:'Tranquilo',msg:'Ambiente tranquilo, adequado para descanso e concentração.'},
  mod:{label:'Moderado',msg:'Ruído moderado, típico de conversas e tráfego leve. Exposição longa pode incomodar.'},
  crit:{label:'Crítico',msg:'Ruído alto. Exposição prolongada causa estresse e pode prejudicar o sono e a audição.'}
};
const cls=db=>db<T.quiet?'quiet':db<T.crit?'mod':'crit';
const mix=(a,b,t)=>[Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)];
const RG=[34,197,94],RY=[250,204,21],RR=[239,68,68];
const ramp=db=>db<=40?RG:db<=55?mix(RG,RY,(db-40)/15):db<=70?mix(RY,RR,(db-55)/15):RR;
