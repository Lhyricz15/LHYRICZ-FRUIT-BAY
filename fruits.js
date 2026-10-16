(function(){
  // Lightweight floating fruits script — self-contained and runs independently of other scripts
  const MIN_SCREEN_WIDTH = 360; // allow on most devices; set higher to disable on small phones
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // inject CSS once
  if (!document.getElementById('fruits-style')) {
    const s = document.createElement('style');
    s.id = 'fruits-style';
    s.textContent = `
#fruit-container{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999}
.fruit{position:absolute;bottom:-12vh;display:grid;place-items:center;user-select:none;will-change:transform,opacity;filter:drop-shadow(0 14px 18px rgba(14,64,36,0.14));opacity:0}
@keyframes fruitFloatUp{0%{opacity:0;transform:translate3d(0,12vh,0) scale(.85)}12%{opacity:1}45%{opacity:1;transform:translate3d(var(--fruit-drift-x,0px),-28vh,0) rotate(var(--fruit-rotation,0deg)) scale(1)}100%{opacity:0;transform:translate3d(calc(var(--fruit-drift-x,0px)*1.4),-80vh,0) rotate(calc(var(--fruit-rotation,0deg)*1.5)) scale(.9)}}
.fruit.float-up{animation-name:fruitFloatUp;animation-timing-function:cubic-bezier(.18,.82,.2,1);animation-fill-mode:forwards}
    `;
    document.head.appendChild(s);
  }

  // ensure container exists
  let container = document.getElementById('fruit-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'fruit-container';
    container.setAttribute('aria-hidden','true');
    document.body.appendChild(container);
  }

  // stop any previous spawners
  if (window._fruitSpawnerInterval) {
    clearInterval(window._fruitSpawnerInterval);
    window._fruitSpawnerInterval = null;
  }

  // config
  const cfg = {
    emojis: ['🍎','🍌','🍊','🍍','🍓','🍇','🥭','🍉','🥝','🍋','🥥','🍑'],
    interval: 480,
    maxOnScreen: 36,
    minSize: 18,
    maxSize: 64,
    durMin: 4200,
    durMax: 9000
  };

  function rand(min, max) { return Math.random()*(max-min)+min; }

  function spawn() {
    // don't spawn on tiny screens to save CPU and clutter
    if (window.innerWidth < MIN_SCREEN_WIDTH) return;
    if (!container) return;
    if (container.children.length >= cfg.maxOnScreen) return;

    const el = document.createElement('div');
    el.className = 'fruit float-up';
    el.textContent = cfg.emojis[Math.floor(Math.random()*cfg.emojis.length)];
    el.style.left = (rand(3, 97)) + 'vw';
    el.style.fontSize = Math.round(rand(cfg.minSize, cfg.maxSize)) + 'px';
    el.style.setProperty('--fruit-drift-x', Math.round(rand(-120, 120)) + 'px');
    el.style.setProperty('--fruit-rotation', Math.round(rand(-360, 360)) + 'deg');
    el.style.animationDuration = Math.round(rand(cfg.durMin, cfg.durMax)) + 'ms';

    container.appendChild(el);
    el.addEventListener('animationend', () => { try{ el.remove(); } catch(e){} });
  }

  // warm up: spawn a few immediately
  for (let i=0;i<6;i++) setTimeout(spawn, i*140);
  window._fruitSpawnerInterval = setInterval(spawn, cfg.interval);

  // expose control API
  window.fruits = window.fruits || {};
  window.fruits.stop = function(){ if (window._fruitSpawnerInterval) { clearInterval(window._fruitSpawnerInterval); window._fruitSpawnerInterval = null; } };
  window.fruits.start = function(){ if (!window._fruitSpawnerInterval) window._fruitSpawnerInterval = setInterval(spawn, cfg.interval); };
  window.fruits.clear = function(){ if (container) container.innerHTML = ''; };

})();
