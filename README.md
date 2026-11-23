# Leanによる形式数学入門

Lean による形式数学を，理論物理学や制御理論の研究者に向けて説明するスライドです（v2026.11.23）．

**スライドを見る：<https://shosonoda.github.io/arise202611/>**

主題は「他人が書いた Lean の証明を，なぜ・いつ信じられるか」．
形式証明の仕組み，Lean の仕組み，信頼の根拠と確かめ方，Lean の使い方（AI を使わない場合・使う場合），
物理数学と制御理論の例，Mathlib と実際の形式化事例を扱います．

スライドは HTML で直接書いています．ビルドは要りません．

## 見る

公開版は <https://shosonoda.github.io/arise202611/> です．手元では `slides/lean-overview-ja.html` を
ブラウザで開きます（リポジトリ直下の `index.html` からも転送されます）．
数式（KaTeX）とフォントは `slides/deck/katex/` に同梱しているので，ネットワークなしで表示できます．

| キー | 動作 |
|---|---|
| `→` `↓` `Space` `PageDown` / `←` `↑` `PageUp` | 次へ / 前へ |
| `Home` / `End` | 最初 / 最後 |
| `O` または `Esc` | 一覧表示（サムネイルをクリックするとそのスライドへ） |
| `F` | 全画面 |
| `[` / `]` | 「対話的に証明する」の証明ステップを前へ / 次へ |
| `H` | 操作案内を表示 |

コードブロックの右上に「コピー」ボタンがあります（1 行目が長いブロックでは，マウスを置くと現れます）．
押すと，そのブロックのソースがクリップボードに入ります．

URL の末尾に `#12` を付けると 12 枚目が開きます．`?overview` を付けると一覧表示で開きます．

PDF にするには，ブラウザの印刷から「PDF に保存」を選びます．用紙サイズは 16:9（1 スライド 1 ページ）に
自動で設定されます．Chrome では「背景のグラフィック」を有効にしてください．

## ファイル構成

| パス | 内容 |
|---|---|
| `slides/lean-overview-ja.html` | スライド本体（67 枚）．内容はすべてこの 1 ファイルにある |
| `slides/deck/deck.css` | レイアウト，配色，印刷用の設定 |
| `slides/deck/deck.js` | スライド送り，拡大縮小，一覧表示，証明ステップの表示，コードの「コピー」ボタン |
| `slides/deck/highlight.js` | Lean 4 などのシンタックスハイライト（外部ライブラリなし） |
| `slides/deck/katex/` | KaTeX 0.17.0（MIT ライセンス）と数式フォント |
| `assets/` | スライドで使う画像 |

## 編集する

`slides/lean-overview-ja.html` を直接編集し，ブラウザを再読み込みします．

- 1 枚のスライドは `<section class="slide"> … </section>`．見出しは `<h2>`．
- 章の扉は `<section class="slide divider">`．以降のスライドの左下に章名が出ます．
- 段組は `<div class="cols">`．`c32`，`c23`，`c21`，`c12`，`c43`，`c3` で比率を変えます．
- コードは `<pre><code class="language-lean"> … </code></pre>`．読み込み時に色が付きます．
  `language-bash`，`language-json`，`language-toml`，`language-latex`，`language-goal`（Infoview のゴール表示），
  `language-text`（色付けなし）も使えます．
  - コードの中の `<` と `&` は `&lt;` `&amp;` と書きます．
  - 文字の大きさは `<pre class="l">`（大），既定，`"s"`，`"xs"`，`"xxs"`（小）．
  - `<pre data-hl="2,4-6">` で行を強調，`<pre data-file="ファイル名">` で見出しを付けられます．
  - 「コピー」ボタンは自動で付きます．付けたくないブロックは `<pre data-nocopy>` とします．
  - 見出しや文中でも `<code class="language-bash">…</code>` のように書けば色が付きます．
- 証明図（Gentzen 式の横線）は `<div class="ptree">` の中に `<div class="pt">` を入れ子にして書きます．
  前提の `.pt` を先に，結論 `<span class="f">$…$</span>` と規則名 `<span class="r">…</span>` を後に置くと，
  式の幅に合わせて自動で配置されます（書き方は `deck.js` の `layoutProofTrees` のコメント）．
- 数式は `$…$` と `$$…$$`．数式の中の `<` は `\lt` と書きます．
- 箱は `<div class="box">`（`info`，`ok`，`ng`，`warn`，`trust`，`untrust`，`plain`，`key` で色を変える）．
- スライドは 1280×720 px の固定サイズです．内容がはみ出すと，一覧表示（`O`）でそのスライドに
  赤い「はみ出し」の印が付き，ブラウザのコンソールに番号と，はみ出した要素が出ます．

## 内容

1. **Lean で何ができるか** — Lean とは，例（6 は偶数），対話的な証明，形式化の利点，どこまで形式化できるか
2. **形式証明の仕組み** — 証明の行間を埋める，自然演繹の推論規則と数学での言い回し，
   推論規則だけで書いた証明図（計算機は要らない），型と項，Curry–Howard 対応，命題と証明＝集合と要素，
   タクティック，推論規則とタクティックの対応
3. **Lean の仕組み** — 定理と定義の書き方（`theorem 名前 仮定 : 結論 := 証明項`，`structure`，型クラス），
   Π 型と Σ 型，Lean の内部（構文解析・精密化・型検査），用語の整理，単一化，定義的等価と外延性
4. **なぜ・いつ信頼できるか** — カーネルと公理，型理論の無矛盾性（CIC と集合論），「コンパイルが通った」の意味，ジャンク値，
   `lake comparator`，確認の手順
5. **AI を使わない形式化** — 環境構築，`lake new my_project math`，日々の作業，Mathlib の読み方
6. **AI を使った形式化** — LeanArchitect と Comparator を使うように指示して待つ
7. **具体例** — 物理数学（正準交換関係，分配関数，Fourier 変換），制御理論（Lyapunov 関数，Mathlib にある道具）
8. **実際の形式化事例** — Mathlib と AI による開発（Tau Ceti，Lean Pool，Prove2Me），Lean Rademacher，
   Lean Ridgelet，Fermat の最終定理，Navier–Stokes と Euler，Physlib，Riemann 予想の Lean 証明の検証

## 動作確認したバージョン

スライド中の Lean コードのうち自作の例は，**Lean 4.36.0 / Mathlib v4.36.0** でコンパイルを確認しています
（最後に確認した日：2026-11-23）．エラーや `sorry` が出るのは，意図して見せている箇所だけです．

次のものは，このバージョンでは確認していません．

- 各プロジェクトから引用したコード（Lean Rademacher，Lean Ridgelet，Fermat の最終定理，Navier–Stokes，
  Physlib，Riemann 予想）．それぞれのリポジトリが固定している版のものです．
- LeanArchitect の例と，`MyProject` を使った Comparator の例（外部パッケージが必要）．
- `lake comparator` の実行そのもの（Linux のサンドボックスが必要）．説明は Lean 4.36 のヘルプに基づきます．

数値（Mathlib の統計，Lean Pool の規模，Riemann 予想の検証状況など）は 2026 年 11 月 22〜23 日時点のものです．
