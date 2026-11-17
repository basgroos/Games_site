/* =========================================================================
 * device.js — detecteert op welk apparaat je speelt (telefoon, tablet of
 * computer) en of er een touchscreen is, en kiest daarbij de layout:
 *   - 'phone'   : compacte layout (podium 1000 breed), grote touch-knoppen
 *   - 'desktop' : volledige layout (podium 1600×900); ook voor tablets
 * In Instellingen kun je de detectie overschrijven.
 * ========================================================================= */
var AC = window.AC;
(function () {
  var D = { type: 'desktop', touch: false, override: 'auto', listeners: [] };
  AC.Device = D;

  function mq(q) { try { return typeof window.matchMedia === 'function' && window.matchMedia(q).matches; } catch (e) { return false; } }

  D.detect = function () {
    var nav = window.navigator || {}, ua = nav.userAgent || '';
    var tp = nav.maxTouchPoints || 0;
    var coarse = mq('(pointer: coarse)'), fine = mq('(pointer: fine)');
    var touch = coarse || tp > 0 || 'ontouchstart' in window;
    var sw = (window.screen && window.screen.width) || window.innerWidth || 0, sh = (window.screen && window.screen.height) || window.innerHeight || 0;
    var short = Math.min(sw, sh) || Math.min(window.innerWidth, window.innerHeight);
    var iPadOS = /Macintosh/.test(ua) && tp > 1; // iPad doet zich voor als Mac
    var type;
    if (/iPhone|iPod|Windows Phone|Android.+Mobile|Mobile.+Firefox|BlackBerry|Opera Mini/i.test(ua) || (touch && !fine && short > 0 && short < 600)) type = 'phone';
    else if (/iPad|Android|Tablet|Silk|Kindle/i.test(ua) || iPadOS || (touch && !fine && short >= 600 && short < 1100)) type = 'tablet';
    else type = 'desktop';
    D.type = type; D.touch = !!touch;
    return type;
  };

  // Welke layout gebruiken we? Telefoon → compact. Ook een heel klein venster
  // (bijv. een smal paneel naast een chat) krijgt de compacte layout.
  D.layout = function () {
    var o = D.override;
    if (o === 'phone') return 'phone';
    if (o === 'tablet' || o === 'desktop') return 'desktop';
    if (D.type === 'phone') return 'phone';
    var w = window.innerWidth || 1600, h = window.innerHeight || 900;
    var s = Math.min(w / 1600, h / 900);
    return s < 0.5 ? 'phone' : 'desktop';
  };
  D.isPortrait = function () { return (window.innerHeight || 0) > (window.innerWidth || 0) * 1.05; };
  D.label = function (t) { return { phone: 'Telefoon', tablet: 'Tablet', desktop: 'Computer' }[t || D.type]; };
  D.icon = function (t) { return { phone: '📱', tablet: '📲', desktop: '🖥' }[t || D.type]; };

  D.canFullscreen = function () { var el = document.documentElement; return !!(el.requestFullscreen || el.webkitRequestFullscreen) && document.fullscreenEnabled !== false; };
  D.fullscreen = function () {
    var el = document.documentElement, p;
    try { p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen && el.webkitRequestFullscreen(); } catch (e) { p = null; }
    Promise.resolve(p).then(function () {
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () { }); } catch (e) { }
    }).catch(function () { if (AC.UI) AC.UI.toast('Volledig scherm wordt hier niet ondersteund'); });
  };

  D.detect();
})();
