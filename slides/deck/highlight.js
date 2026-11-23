/* ==========================================================================
   highlight.js — 小さなシンタックスハイライタ（外部ライブラリなし）
   <pre><code class="language-XXX"> を読み込み時に色付けする．
     language-lean  : Lean 4
     language-goal  : Infoview のゴール表示（仮定 : 型 / ⊢ ゴール）
     language-bash  : シェル
     language-toml / language-json / language-latex
     language-text  : 色付けしない（行の強調だけ）
   <pre data-hl="2,5-7"> で行を強調できる．
   <pre> の外の <code class="language-bash"> など（見出しや文中）にも色が付く．
   HTML の中では < と & を &lt; &amp; と書くこと．
   ========================================================================== */
(function () {
  'use strict';

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function span(cls, s) { return cls ? '<span class="tk-' + cls + '">' + esc(s) + '</span>' : esc(s); }
  function set(words) { var o = Object.create(null); words.split(/\s+/).forEach(function (w) { if (w) o[w] = 1; }); return o; }

  /* ---------------- Lean 4 ---------------- */
  var KW = set('import open namespace end section variable variables universe def theorem lemma example abbrev ' +
    'structure class instance inductive axiom noncomputable private protected local scoped notation macro syntax ' +
    'set_option attribute deriving where extends mutual opaque in export public module meta ' +
    'informal_lemma informal_definition');
  var DECL = set('def theorem lemma abbrev structure class inductive axiom instance opaque informal_lemma informal_definition');
  var TERM = set('fun λ by have show from let if then else match with do return at using calc suffices ' +
    'obtain intro forall exists');
  var TAC = set('exact apply intros rfl simp simpa rw rewrite ring linarith nlinarith norm_num positivity omega decide ' +
    'use constructor cases rcases induction ext funext unfold specialize exfalso by_contra left right refine convert ' +
    'aesop grind fun_prop measurability field_simp gcongr trivial assumption contradiction conv change symm ' +
    'fin_cases native_decide push_neg tauto exact? apply? rw? simp? nth_rewrite subst rintro refine\' ' +
    'simp_all norm_cast push_cast calc induction\' case next all_goals any_goals repeat first try');
  var TYPES = set('Prop Type Sort');
  var OPS = set(':= → ← ↔ ∀ ∃ ⊢ ↦ => ¬ ∧ ∨ ≠ ⟨ ⟩ |');

  var ID_START = /[\p{L}_]/u;
  var ID_CHAR = /[\p{L}\p{N}_'!?]/u;

  function lean(src) {
    var out = '', i = 0, n = src.length, expectDecl = false;
    function isIdStart(c) { return c !== undefined && ID_START.test(c); }
    while (i < n) {
      var c = src[i], c2 = src.substr(i, 2);
      // コメント
      if (c2 === '--') {
        var e = src.indexOf('\n', i); if (e < 0) e = n;
        out += span('com', src.slice(i, e)); i = e; continue;
      }
      if (c2 === '/-') {
        var depth = 0, j = i;
        while (j < n) {
          if (src.substr(j, 2) === '/-') { depth++; j += 2; }
          else if (src.substr(j, 2) === '-/') { depth--; j += 2; if (depth === 0) break; }
          else j++;
        }
        var body = src.slice(i, j);
        out += span(body.substr(0, 3) === '/--' || body.substr(0, 3) === '/-!' ? 'doc' : 'com', body);
        i = j; continue;
      }
      // 文字列
      if (c === '"') {
        var k = i + 1;
        while (k < n && src[k] !== '"') { if (src[k] === '\\') k++; k++; }
        out += span('str', src.slice(i, Math.min(n, k + 1))); i = Math.min(n, k + 1); continue;
      }
      // 属性 @[...]
      if (c2 === '@[') {
        var d = 0, m = i + 1;
        while (m < n) {
          if (src[m] === '"') { m++; while (m < n && src[m] !== '"') m++; }
          else if (src.substr(m, 3) === '/--') { var ce = src.indexOf('-/', m); m = ce < 0 ? n : ce + 1; }
          else if (src[m] === '[') d++;
          else if (src[m] === ']') { d--; if (d === 0) { m++; break; } }
          m++;
        }
        // 属性の中の docstring と文字列だけ色を変える
        var inner = src.slice(i, m);
        out += inner.replace(/(\/--[\s\S]*?-\/)|("[^"]*")|([^"\/]+|\/)/g, function (_, doc, str, rest) {
          if (doc) return span('doc', doc);
          if (str) return span('str', str);
          return span('attr', rest);
        });
        i = m; continue;
      }
      // コマンド #check など
      if (c === '#' && /[a-z]/.test(src[i + 1] || '')) {
        var p = i + 1; while (p < n && /[a-z_]/.test(src[p])) p++;
        out += span('cmd', src.slice(i, p)); i = p; continue;
      }
      // 数
      if (/[0-9]/.test(c) && !(i > 0 && ID_CHAR.test(src[i - 1]))) {
        var q = i; while (q < n && /[0-9]/.test(src[q])) q++;
        if (src[q] === '.' && /[0-9]/.test(src[q + 1] || '')) { q++; while (q < n && /[0-9]/.test(src[q])) q++; }
        out += span('num', src.slice(i, q)); i = q; continue;
      }
      // 識別子（ドット区切りを 1 つにまとめる）
      if (isIdStart(c)) {
        var r = i;
        for (;;) {
          while (r < n && ID_CHAR.test(src[r])) r++;
          if (src[r] === '.' && isIdStart(src[r + 1])) { r++; continue; }
          break;
        }
        var w = src.slice(i, r);
        var afterDot = i > 0 && src[i - 1] === '.';
        var last = w.slice(w.lastIndexOf('.') + 1);
        var cls = '';
        if (w === 'sorry') cls = 'sorry';
        else if (expectDecl && !KW[w]) { cls = 'decl'; }
        else if (afterDot) cls = '';
        else if (KW[w]) cls = 'kw';
        else if (TERM[w]) cls = 'term';
        else if (TAC[w]) cls = 'tac';
        else if (TYPES[w]) cls = 'type';
        else if (/^\p{Lu}/u.test(last)) cls = 'type';
        if (cls === 'decl' || !KW[w]) expectDecl = false;
        if (DECL[w] && !afterDot) expectDecl = true;
        if (w === 'instance' || w === 'example') expectDecl = false;
        out += span(cls, w); i = r; continue;
      }
      // 記号
      if (c2 === ':=' || c2 === '=>') { out += span('op', c2); i += 2; expectDecl = false; continue; }
      if (OPS[c]) { out += span('op', c); i++; continue; }
      if (c === ':' || c === '(' || c === '{' || c === '[') expectDecl = false;
      out += esc(c); i++;
    }
    return out;
  }

  /* ---------------- ゴール表示 ---------------- */
  function goal(src) {
    return src.split('\n').map(function (line) {
      if (/^\s*⊢/.test(line)) return line.replace(/^(\s*)⊢(.*)$/, function (_, a, b) { return a + span('goal', '⊢') + lean(b); });
      var m = /^(\s*)([^:]+?)(\s*:\s)(.*)$/.exec(line);
      if (m && !/^(No goals|case |\d+ goals?)/.test(line.trim())) return m[1] + span('hyp', m[2]) + esc(m[3]) + lean(m[4]);
      if (/^\s*(No goals|\d+ goals?)/.test(line)) return span('com', line);
      if (/^\s*case /.test(line)) return span('com', line);
      return lean(line);
    }).join('\n');
  }

  /* ---------------- シェル ---------------- */
  function bash(src) {
    return src.split('\n').map(function (line) {
      var m = /^(\s*)(#.*)$/.exec(line);
      if (m) return m[1] + span('com', m[2]);
      var code = line, com = '';
      var h = line.search(/\s#\s/);
      if (h >= 0) { code = line.slice(0, h); com = line.slice(h); }
      var first = true;
      var s = code.replace(/("[^"]*"|'[^']*')|(\s--?[A-Za-z][\w-]*)|(\$\([^)]*\)|\$\{?\w+\}?)|([^\s"'$]+)|(\s+|.)/g,
        function (_, str, flag, v, word, other) {
          if (str) return span('str', str);
          if (flag) return span('flag', flag);
          if (v) return span('type', v);
          if (word) {
            if (first) { first = false; return span(word === '$' ? 'prompt' : 'kw', word); }
            if (word === '|' || word === '&&' || word === ';') { first = true; return esc(word); }
            return esc(word);
          }
          return esc(other);
        });
      return s + (com ? span('com', com) : '');
    }).join('\n');
  }

  /* ---------------- TOML / JSON / LaTeX ---------------- */
  function toml(src) {
    return src.split('\n').map(function (line) {
      if (/^\s*#/.test(line)) return span('com', line);
      if (/^\s*\[/.test(line)) return span('sec', line);
      var m = /^(\s*)([\w.-]+)(\s*=\s*)(.*)$/.exec(line);
      if (!m) return esc(line);
      var v = m[4].replace(/("[^"]*")|(#.*$)|(\b\d[\d.]*\b|\btrue\b|\bfalse\b)|([^"#\d]+|\d)/g, function (_, s, c, num, rest) {
        if (s) return span('str', s);
        if (c) return span('com', c);
        if (num) return span('num', num);
        return esc(rest);
      });
      return m[1] + span('key', m[2]) + esc(m[3]) + v;
    }).join('\n');
  }
  function json(src) {
    return src.replace(/("(?:[^"\\]|\\.)*")(\s*:)?|(\b-?\d[\d.eE+-]*\b|\btrue\b|\bfalse\b|\bnull\b)|([^"\d\w]+|\w)/g,
      function (_, s, colon, lit, rest) {
        if (s) return span(colon ? 'key' : 'str', s) + (colon ? esc(colon) : '');
        if (lit) return span('num', lit);
        return esc(rest);
      });
  }
  function latex(src) {
    return src.replace(/(%.*$)|(\\[A-Za-z]+)|(\{[^{}]*\})|([^%\\{]+|.)/gm, function (_, c, cmd, arg, rest) {
      if (c) return span('com', c);
      if (cmd) return span('kw', cmd);
      if (arg) return span('str', arg);
      return esc(rest);
    });
  }

  var LANG = { lean: lean, lean4: lean, goal: goal, bash: bash, sh: bash, toml: toml, json: json, latex: latex, text: esc };

  /* ---------------- 行に分ける（強調用） ---------------- */
  function parseRanges(s) {
    var o = {};
    (s || '').split(',').forEach(function (part) {
      var m = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
      if (!m) return;
      var a = +m[1], b = m[2] ? +m[2] : a;
      for (var k = a; k <= b; k++) o[k] = 1;
    });
    return o;
  }
  // ハイライト済み HTML を行ごとの <span class="ln"> に包む（span をまたぐ改行にも対応）
  function wrapLines(html, hl) {
    var open = [], lines = [], cur = '';
    var re = /(<span [^>]*>)|(<\/span>)|(\n)|([^<\n]+)/g, m;
    while ((m = re.exec(html))) {
      if (m[1]) { open.push(m[1]); cur += m[1]; }
      else if (m[2]) { open.pop(); cur += m[2]; }
      else if (m[3]) {
        cur += open.map(function () { return '</span>'; }).join('');
        lines.push(cur);
        cur = open.join('');
      } else cur += m[4];
    }
    lines.push(cur);
    // .ln は display:block なので，行の間に改行文字は入れない
    return lines.map(function (l, k) {
      return '<span class="ln' + (hl[k + 1] ? ' hl' : '') + '">' + (l === '' ? ' ' : l) + '</span>';
    }).join('');
  }

  function run(root) {
    var blocks = (root || document).querySelectorAll('code[class*="language-"]');
    Array.prototype.forEach.call(blocks, function (code) {
      if (code.getAttribute('data-done')) return;
      var m = /language-([\w-]+)/.exec(code.className);
      var fn = LANG[m ? m[1] : 'text'] || esc;
      var src = code.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      var pre = code.parentNode;
      if (pre.tagName === 'PRE') {
        // コードブロック．元のソースは「コピー」ボタン用に取っておく（deck.js が使う）
        code._src = src;
        code.innerHTML = wrapLines(fn(src), parseRanges(pre.getAttribute('data-hl')));
      } else {
        // 文中・見出しの中の <code class="language-…">：色付けだけ
        code.innerHTML = fn(src);
      }
      code.setAttribute('data-done', '1');
    });
  }

  window.DeckHighlight = { run: run, lean: lean, goal: goal };
})();
