// Teste de fumaça em DOM simulado (jsdom). Uso: cd tests && npm i jsdom && node smoke.test.js
// Carrega ../index.html com os módulos locais, sem rede, e usa um microfone falso.
const { JSDOM, VirtualConsole, ResourceLoader } = require('jsdom');
const path = require('path');
const errs = [];
const geocodeRequests = [];
let geoLongitude = -49.4456;
let failNextGeocode = false;
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/scrollTo/.test(e.message)) errs.push(e.detail && e.detail.stack || e.message); });
class Loader extends ResourceLoader { fetch(url, o) { return /^https?:/.test(url) ? Promise.resolve(Buffer.from('')) : super.fetch(url, o); } }
JSDOM.fromFile(path.join(__dirname, '..', 'index-corrigido.html'), {
  runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = () => null;
    class An { constructor() { this.fftSize = 4096; this.frequencyBinCount = 2048; }
      getFloatTimeDomainData(a) { for (let i = 0; i < a.length; i++) a[i] = 0.02 * Math.sin(i * 2 * Math.PI * 440 / 48000); }
      getFloatFrequencyData(a) { for (let i = 0; i < a.length; i++) a[i] = -100 + (Math.abs(i - 37) < 2 ? 60 : 0); } connect() {} }
    w.AudioContext = class { constructor() { this.sampleRate = 48000; this.state = 'running'; }
      createAnalyser() { return new An(); } createMediaStreamSource() { return { connect() {} }; }
      resume() { return Promise.resolve(); } close() {} };
    w.navigator.mediaDevices = { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() {} }] }) };
    Object.defineProperty(w.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          success({ coords: { latitude: -18.9701, longitude: geoLongitude } });
        }
      }
    });
    w.fetch = (url) => {
      geocodeRequests.push(String(url));
      if (failNextGeocode) {
        failNextGeocode = false;
        return Promise.reject(new Error('offline'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ address: { road: 'Rua de Teste', suburb: 'Centro' } })
      });
    };
  }
}).then(async dom => {
  const w = dom.window, d = w.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  const ok = (c, m) => { if (!c) errs.push('FALHOU: ' + m); };
  await sleep(500);
  ok(!d.querySelector('#cal-range') && !d.querySelector('#cal-val'), 'controles de calibração removidos');
  ok(d.querySelector('#home-strip').textContent.includes('750'), 'dados de demonstração carregados');
  for (const r of ['monitor', 'mapa', 'dashboard', 'inicio']) { w.location.hash = '#' + r; await sleep(120); ok(!d.querySelector('#page-' + r).hidden, 'rota ' + r); }
  w.location.hash = '#dashboard'; await sleep(120);
  ok(d.querySelectorAll('#tb tr').length === 30, 'tabela do histórico');
  w.location.hash = '#mapa'; await sleep(120);
  ok(d.querySelectorAll('#rk-loud button').length === 3, 'ranking de regiões');
  w.location.hash = '#monitor'; await sleep(100);
  d.querySelector('#btn-start').click(); await sleep(1500);
  ok(!d.querySelector('#runbar').hidden, 'monitoramento iniciou');
  ok(d.querySelector('#db-num').textContent !== '—' && d.querySelector('#st-avg').textContent !== '—dB', 'medições atualizadas');
  ok(/Moderado/.test(d.querySelector('#cls-t').textContent), 'classificação (esperado Moderado)');
  d.querySelector('#btn-record-live').click();
  await sleep(250);
  const geocoded = w.RuidometroStore.getAll().find(r => r.src === 'real' && r.lat === -18.9701);
  ok(geocoded && geocoded.location === 'Rua de Teste', 'somente o nome da rua é salvo na medição');
  ok(d.querySelector('#tb').textContent.includes('Rua de Teste'), 'nome da rua exibido na tabela');
  ok(geocodeRequests.length === 1, 'cache evita repetir busca para as mesmas coordenadas');
  ok(geocodeRequests[0].includes('format=jsonv2&zoom=18&accept-language=pt-BR'), 'consulta Nominatim usa formato e idioma configurados');
  geoLongitude = -49.4457;
  failNextGeocode = true;
  d.querySelector('#btn-record-live').click();
  const pendingLookup = w.RuidometroStore.getAll().find(r => r.src === 'real' && r.lng === geoLongitude);
  ok(pendingLookup && pendingLookup.location === 'Microfone (-18.9701, -49.4457)', 'registro é salvo sem esperar pela geocodificação');
  await sleep(1250);
  const failedLookup = w.RuidometroStore.getAll().find(r => r.src === 'real' && r.lng === geoLongitude);
  ok(failedLookup && failedLookup.location === 'Microfone (-18.9701, -49.4457)', 'falha mantém o rótulo de coordenadas existente');
  d.querySelector('#btn-stop').click(); await sleep(100);
  ok(!d.querySelector('#consent').hidden, 'monitoramento parou');
  console.log(errs.length ? 'ERROS:\n' + errs.join('\n') : 'OK: todos os testes passaram');
  process.exit(errs.length ? 1 : 0);
});
