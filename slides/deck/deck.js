/* ==========================================================================
   deck.js — スライド送り・拡大縮小・一覧表示・数式・証明ステップ表示
   依存: katex (deck/katex/), highlight.js (同じフォルダ)

   キー操作
     → ↓ Space PageDown : 次へ        ← ↑ PageUp : 前へ
     Home / End           : 最初 / 最後
     O または Esc         : 一覧表示の切り替え
     F                    : 全画面
     [ / ]                : 証明ステップ（Infoview）を前へ / 次へ
     H                    : 操作案内を表示
   コードブロックにマウスを置くと「コピー」ボタンが出る（ソースをクリップボードへ）．
   URL の #12 は 12 枚目を開く．印刷（PDF 保存）は 1 スライド 1 ページ．
   ========================================================================== */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var deck, frames = [], current = 0;

  function $(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---- 数式 ---- */
  function renderMath() {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false,
      strict: false
    });
  }

  /* ---- 枠を作る ---- */
  function build() {
    deck = document.querySelector('.deck');
    var slides = $('.deck > section.slide');
    var section = '';
    slides.forEach(function (s, i) {
      if (s.classList.contains('divider')) {
        var h = s.querySelector('h2');
        section = h ? h.textContent.trim() : '';
      } else if (section && !s.hasAttribute('data-section') && !s.classList.contains('title')) {
        s.setAttribute('data-section', section);
      }
      s.setAttribute('data-page', (i + 1) + ' / ' + slides.length);
      var f = document.createElement('div');
      f.className = 'frame';
      s.parentNode.insertBefore(f, s);
      f.appendChild(s);
      f.addEventListener('click', function () {
        if (document.body.classList.contains('overview')) { go(i); setMode('present'); }
      });
      frames.push(f);
    });
    var p = document.createElement('div'); p.id = 'progress'; document.body.appendChild(p);
    var help = document.createElement('div'); help.id = 'help';
    help.textContent = '← → 移動　O 一覧　F 全画面　[ ] 証明ステップ　コードの上で「コピー」　H この案内';
    document.body.appendChild(help);
    showHelp(4000);
  }

  /* ---- 操作案内（読み込み直後と H キーで数秒だけ出す） ---- */
  var helpTimer = null;
  function showHelp(ms) {
    var h = document.getElementById('help');
    if (!h) return;
    h.classList.add('show');
    clearTimeout(helpTimer);
    helpTimer = setTimeout(function () { h.classList.remove('show'); }, ms);
  }

  /* ---- 拡大縮小 ---- */
  function fit() {
    var s = Math.min(window.innerWidth / W, window.innerHeight / H);
    document.documentElement.style.setProperty('--scale', s.toFixed(5));
    var cols = Math.max(1, Math.floor((window.innerWidth - 48 + 18) / (320 + 18)));
    var t = Math.min(0.5, (window.innerWidth - 48 - 18 * (cols - 1)) / cols / W);
    document.documentElement.style.setProperty('--thumb', t.toFixed(5));
  }

  /* ---- 移動 ---- */
  function go(i, keepHash) {
    current = Math.max(0, Math.min(frames.length - 1, i));
    frames.forEach(function (f, k) { f.classList.toggle('current', k === current); });
    var p = document.getElementById('progress');
    if (p) p.style.width = (100 * (current + 1) / frames.length) + '%';
    if (!keepHash) history.replaceState(null, '', '#' + (current + 1));
    if (document.body.classList.contains('overview')) {
      frames[current].scrollIntoView({ block: 'nearest' });
    }
  }
  function fromHash() {
    var h = location.hash.replace('#', '');
    if (/^\d+$/.test(h)) return parseInt(h, 10) - 1;
    if (h) {
      var el = document.getElementById(h);
      if (el) { var f = el.closest('.frame'); var k = frames.indexOf(f); if (k >= 0) return k; }
    }
    return 0;
  }
  function setMode(m) {
    document.body.classList.toggle('present', m === 'present');
    document.body.classList.toggle('overview', m === 'overview');
    if (m === 'overview') frames[current].scrollIntoView({ block: 'center' });
  }
  function toggleOverview() {
    setMode(document.body.classList.contains('overview') ? 'present' : 'overview');
  }

  /* ---- はみ出しの検出（編集時の確認用．一覧表示で赤い印が付く） ---- */
  function checkOverflow() {
    var bad = [];
    frames.forEach(function (f, i) {
      var s = f.firstElementChild;
      var over = false;
      var limit = s.getBoundingClientRect();
      var scale = limit.height / H;
      var bottom = limit.top + (H - 30) * scale;
      var right = limit.left + (W - 20) * scale;
      var why = '';
      function describe(el, what) {
        return what + ': <' + el.tagName.toLowerCase() + (el.className && el.className.baseVal === undefined ? ' class="' + el.className + '"' : '') + '> ' +
          (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      }
      $('*', s).forEach(function (el) {
        if (over || el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return;
        if (el.classList.contains('copy-btn') || el.closest('.katex-mathml')) return;
        var r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.bottom > bottom + 1) { over = true; why = describe(el, '下にはみ出し'); }
        else if (r.right > right + 1) { over = true; why = describe(el, '右にはみ出し'); }
      });
      $('pre', s).forEach(function (el) {
        if (!over && el.scrollWidth > el.clientWidth + 1) { over = true; why = describe(el, 'コードが右にはみ出し'); }
      });
      f.classList.toggle('overflow', over);
      if (over) { f.setAttribute('data-overflow-by', why); bad.push(i + 1); }
      else f.removeAttribute('data-overflow-by');
    });
    if (bad.length) {
      console.warn('[deck] はみ出しているスライド:', bad.join(', '));
      bad.forEach(function (n) { console.warn('  ' + n + ': ' + frames[n - 1].getAttribute('data-overflow-by')); });
    }
    return bad;
  }
  window.deckCheckOverflow = function () {
    var was = document.body.className;
    document.body.classList.remove('present'); document.body.classList.add('overview');
    var bad = checkOverflow();
    document.body.classList.add('measuring');   // 一覧モードでは隠しているボタンを，測る間だけ出す
    placeCopy();
    document.body.className = was;
    return bad;
  };

  /* ---- 証明ステップ（Infoview もどき） ----
     <div class="stepper">
       <pre><code class="language-lean">…</code></pre>
       <div class="infoview">
         <div class="state" data-line="7" data-cap="…"> <pre><code class="language-goal">…</code></pre> <p>…</p> </div>
       </div>
     </div>
     data-line は「その行を実行した後の状態」を表す（1 始まり）．
  */
  function initSteppers() {
    $('.stepper').forEach(function (st) {
      var states = $('.state', st);
      var view = st.querySelector('.infoview');
      var lines = $('pre .ln', st.querySelector('pre'));
      var idx = 0;
      var bar = document.createElement('div');
      bar.className = 'bar';
      bar.innerHTML = '<b>Lean Infoview</b><span class="pos"></span><span class="sp"></span>' +
        '<button type="button" data-d="-1" title="前のステップ（[）">◀</button>' +
        '<button type="button" data-d="1" title="次のステップ（]）">▶</button>';
      view.insertBefore(bar, view.firstChild);
      function show(i) {
        idx = Math.max(0, Math.min(states.length - 1, i));
        states.forEach(function (s, k) { s.classList.toggle('on', k === idx); });
        var ln = parseInt(states[idx].getAttribute('data-line'), 10);
        lines.forEach(function (l, k) { l.classList.toggle('hl', k + 1 === ln); });
        bar.querySelector('.pos').textContent = '　' + (idx + 1) + ' / ' + states.length;
      }
      $('button', bar).forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          show(idx + parseInt(b.getAttribute('data-d'), 10));
        });
      });
      states.forEach(function (s, k) {
        var ln = parseInt(s.getAttribute('data-line'), 10);
        var cap = s.getAttribute('data-cap');
        if (cap) {
          var c = document.createElement('div'); c.className = 'cap'; c.textContent = cap;
          s.insertBefore(c, s.firstChild);
        }
        if (lines[ln - 1]) {
          lines[ln - 1].classList.add('pick');
          lines[ln - 1].addEventListener('click', function (e) { e.stopPropagation(); show(k); });
        }
      });
      st._step = function (d) { show(idx + d); };
      show(parseInt(st.getAttribute('data-start') || '0', 10));
    });
  }
  function stepCurrent(d) {
    var st = frames[current].querySelector('.stepper');
    if (st && st._step) { st._step(d); return true; }
    return false;
  }

  /* ---- コードブロックの「コピー」ボタン ----
     ゴール表示（language-goal）以外のコードブロックに付ける．
     コピーされるのは色付け前のソース（highlight.js が code._src に保存したもの）． */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }
  function initCopy() {
    $('.slide pre').forEach(function (pre) {
      var code = pre.querySelector('code');
      if (!code || /language-goal/.test(code.className) || pre.hasAttribute('data-nocopy')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'copy-btn';
      b.textContent = 'コピー';
      b.title = 'このコードをクリップボードにコピー';
      var timer = null;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var src = code._src !== undefined ? code._src : code.textContent;
        copyText(src + '\n').then(function () {
          b.textContent = 'コピーしました'; b.classList.add('done');
        }, function () {
          b.textContent = 'コピーできません'; b.classList.add('fail');
        }).then(function () {
          clearTimeout(timer);
          timer = setTimeout(function () {
            b.textContent = 'コピー'; b.classList.remove('done'); b.classList.remove('fail');
          }, 1600);
        });
      });
      pre.appendChild(b);
    });
  }

  // ボタンを常に薄く見せるか，マウスを置いたときだけ見せるかを決める．
  // 1〜2 行目の文字がボタンの位置まで届くブロックと，ファイル名の帯があるブロックでは，
  // 文字を隠さないように「マウスを置いたときだけ」にする．
  // （全スライドが表示されている状態＝一覧モードで呼ぶこと）
  function placeCopy() {
    $('.slide pre > .copy-btn').forEach(function (b) {
      var pre = b.parentNode;
      var lines = $('.ln', pre).slice(0, 2);
      var tight = pre.hasAttribute('data-file') || !lines.length;
      var br = b.getBoundingClientRect();
      if (!tight && br.width > 0) {
        var margin = 8 * br.width / b.offsetWidth;
        lines.forEach(function (ln) {
          var r = document.createRange(); r.selectNodeContents(ln);
          var tr = r.getBoundingClientRect();
          if (tr.width > 0 && tr.right > br.left - margin && tr.top < br.bottom) tight = true;
        });
      }
      b.classList.toggle('always', !tight);
    });
  }

  /* ---- 折れ線グラフのツールチップ ---- */
  function initViz() {
    $('.viz').forEach(function (v) {
      var tip = v.querySelector('.tip');
      if (!tip) return;
      $('[data-tip]', v).forEach(function (pt) {
        pt.addEventListener('mouseenter', function () {
          var r = pt.getBoundingClientRect(), b = v.getBoundingClientRect();
          var sc = b.width / v.offsetWidth;
          tip.textContent = pt.getAttribute('data-tip');
          tip.style.left = ((r.left + r.width / 2 - b.left) / sc) + 'px';
          tip.style.top = ((r.top - b.top) / sc) + 'px';
          tip.style.display = 'block';
        });
        pt.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
      });
    });
  }

  /* ---- 入力 ---- */
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA') return;
    // ボタンにフォーカスがあるときの Space / Enter は，ボタンの操作として扱う
    if (t === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
        go(current + 1); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
        go(current - 1); break;
      case 'Home': go(0); break;
      case 'End': go(frames.length - 1); break;
      case 'o': case 'O': case 'Escape': toggleOverview(); break;
      case 'f': case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
        break;
      case 'h': case 'H': case '?': showHelp(5000); break;
      case ']': stepCurrent(1); break;
      case '[': stepCurrent(-1); break;
      default: return;
    }
    e.preventDefault();
  }
  var touchX = null;
  function onTouchStart(e) { touchX = e.changedTouches[0].clientX; }
  function onTouchEnd(e) {
    if (touchX === null || !document.body.classList.contains('present')) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
    touchX = null;
  }

  function init() {
    if (window.DeckHighlight) window.DeckHighlight.run();
    renderMath();
    build();
    initSteppers();
    initCopy();
    initViz();
    fit();
    setMode(/[?&]overview\b/.test(location.search) ? 'overview' : 'present');
    go(fromHash(), true);
    window.addEventListener('resize', fit);
    window.addEventListener('hashchange', function () { go(fromHash(), true); });
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { window.deckCheckOverflow(); });
    else setTimeout(window.deckCheckOverflow, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
