/* ---------- roteamento ---------- */
const ROUTES = ['inicio', 'monitor', 'mapa', 'dashboard'];
const heroState = { raf: 0 };

function route() {
  let r = (location.hash || '').replace('#', '');
  if (ROUTES.indexOf(r) < 0) r = 'inicio';

  S.route = r;

  ROUTES.forEach(n => {
    $('#page-' + n).hidden = n !== r;
  });

  $$('[data-route]').forEach(a => {
    a.classList.toggle('on', a.dataset.route === r);
  });

  window.scrollTo(0, 0);

  if (r === 'inicio') startHero();
  if (r === 'monitor') drawIdle();
  if (r === 'mapa') onMapShow();
  if (r === 'dashboard') renderDash();
}