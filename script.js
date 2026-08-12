// ============================================================
// モンスターデータ
// 名称は渡された順番どおりに反映。id は m01〜m23（画像ファイル名に使用）。
// 画像は下記の命名規則でファイルを配置するだけで自動的に読み込まれます
// （コード側の編集は不要）。読み込めない場合は自動でプレースホルダー
// 画像にフォールバックします。拡張子はpng/jpg/webpのいずれもOK。
//
//   images/main/{id}.png              … 一覧画面カード用サムネイル（1体につき1枚）
//   images/normal/{id}-{連番}.png     … 通常状態の参考画像（1〜3枚）
//   images/anomaly/{id}-{連番}.png    … 異変状態の画像（1〜3枚）
//
//   例）スラポン(m01) → images/main/m01.png
//       スラポン(m01)の通常状態1枚目 → images/normal/m01-1.png
//       スラポン(m01)の異変パターン1枚目 → images/anomaly/m01-1.png
//
// 通常状態の2枚目以降・異変パターンの中身は、このファイルではなく
// data-normal.js / data-anomaly.js で管理します（詳しい書き方は各ファイル参照）。
// ============================================================
const MONSTER_NAMES = [
  "スラポン", "アトラン", "グラゴン", "スノードロップ", "モケマル",
  "ドラニャン", "ルトペン", "ベルチャ", "オーク", "フレクー",
  "マホビット", "プルドッグ", "ガーディアン", "チューヘイさん", "ゴーレム",
  "ガーゴイ", "アチャガラ", "ユーベェ", "ミラナイト", "ぶる太ライダー",
  "ワルビット", "ライアード", "Cpt.ワル太"
];

// プレースホルダーSVGの配色（実画像が用意されるまでの仮の彩色。意味は無い）
const PALETTE = ["#ff8a5b", "#5bc0ff", "#ffd25b", "#7dffb0", "#ff6bcb", "#b98cff"];

const MONSTERS = MONSTER_NAMES.map((name, i) => {
  const id = `m${String(i + 1).padStart(2, "0")}`;
  return {
    id,
    name,
    color: PALETTE[i % PALETTE.length],
    normal: [{ id: `${id}-n1`, label: "参考A" }],
    anomalies: []
  };
});

// data-normal.js / data-anomaly.js の内容をMONSTERSへ取り込む
// （両ファイルが読み込まれていなくても空データとして動作する）
const PATTERN_LETTERS = ["B", "C"];

MONSTERS.forEach((monster) => {
  const extraNormal = (typeof NORMAL_EXTRA !== "undefined" && NORMAL_EXTRA[monster.id]) || [];
  extraNormal.forEach((entry, i) => {
    monster.normal.push({
      id: `${monster.id}-n${i + 2}`,
      label: entry.label || `参考${PATTERN_LETTERS[i]}`
    });
  });

  const anomalyList = (typeof ANOMALY_DATA !== "undefined" && ANOMALY_DATA[monster.id]) || [];
  anomalyList.forEach((entry, i) => {
    monster.anomalies.push({
      id: `${monster.id}-a${i + 1}`,
      label: entry.label || `パターン${String.fromCharCode(65 + i)}`,
      note: entry.note || "（未設定）",
      point: entry.point || "（未設定）",
      compareIndex: entry.compareIndex || 1
    });
  });
});

// ============================================================
// ロゴマークSVG（通常状態の画像が無い場合のフォールバックに使用）
// ============================================================
function logoSvg() {
  return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <g transform="translate(0 10.6)">
        <path fill-rule="evenodd" fill="#8257e8" d="M73.8 50 A23.8 23.8 0 1 0 26.2 50 A23.8 23.8 0 1 0 73.8 50 Z M65.3 50 A15.3 15.3 0 1 0 34.7 50 A15.3 15.3 0 1 0 65.3 50 Z"/>
        <circle cx="50" cy="50" r="6.8" fill="#8257e8"/>
        <path fill="#8257e8" d="M50 5 L58.8 20 L41.3 20 Z"/>
        <path fill="#8257e8" d="M89 72.5 L71.6 72.6 L80.4 57.4 Z"/>
        <path fill="#8257e8" d="M11 72.5 L28.4 72.6 L19.7 57.4 Z"/>
      </g>
    </svg>
  `;
}

// ============================================================
// 画像の自動読み込み（png→jpg→webpの順に試し、すべて失敗したら
// プレースホルダーSVGに自動フォールバック）
// kind: "main"（一覧サムネイル・連番なし） / "normal" / "anomaly"（連番あり）
// ============================================================
const IMAGE_EXTENSIONS = ["png", "jpg", "webp"];

function imageCandidates(kind, monsterId, index) {
  const suffix = index ? `-${index}` : "";
  const base = `images/${kind}/${monsterId}${suffix}`;
  return IMAGE_EXTENSIONS.map((ext) => `${base}.${ext}`);
}

function renderThumb({ kind, monsterId, index = null, color, possessed = false, alt }) {
  const candidates = imageCandidates(kind, monsterId, index);
  return `
    <img
      class="state-thumb-img"
      src="${candidates[0]}"
      data-candidates="${candidates.join("|")}"
      data-step="0"
      alt="${alt}"
    >
  `;
}

function handleThumbError(img) {
  const candidates = img.dataset.candidates.split("|");
  const step = Number(img.dataset.step) + 1;
  if (step < candidates.length) {
    img.dataset.step = String(step);
    img.src = candidates[step];
  } else {
    img.outerHTML = logoSvg();
  }
}

function bindThumbFallbacks(root) {
  root.querySelectorAll(".state-thumb-img").forEach((img) => {
    img.addEventListener("error", () => handleThumbError(img));
  });
}

// ============================================================
// 一覧ビューの描画（images/main/{id}.png を使用）
// ============================================================
const monsterGrid = document.getElementById("monsterGrid");
const transitionOverlay = document.getElementById("transitionOverlay");
const transitionLogo = document.getElementById("transitionLogo");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// カード選択時、ロゴが縮小→時計回りに1回転→元の大きさに戻るアニメーションを
// 挟んでから詳細画面へ切り替える（画像読み込みの間の“つなぎ”として使用）。
// 1. is-active でオーバーレイを即座に表示（回転アニメーションが確実に見えるように
//    フェードインはさせない） 2. 回転が終わったら is-leaving でフェードアウトし、
//    詳細画面をなめらかに見せる。
function playCardTransition(monsterId) {
  if (prefersReducedMotion) {
    showDetail(monsterId);
    return;
  }
  transitionOverlay.classList.add("is-active");
  showDetail(monsterId);

  const startFadeOut = () => {
    transitionOverlay.classList.add("is-leaving");
    setTimeout(() => transitionOverlay.classList.remove("is-active", "is-leaving"), 320);
  };
  transitionLogo.addEventListener("animationend", startFadeOut, { once: true });
  setTimeout(startFadeOut, 500);
}

MONSTERS.forEach((monster) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "monster-card";
  card.dataset.id = monster.id;
  card.setAttribute("role", "listitem");
  card.innerHTML = `
    <span class="monster-card__tag">FILE</span>
    <span class="monster-card__thumb">
      ${renderThumb({ kind: "main", monsterId: monster.id, color: monster.color, alt: monster.name })}
    </span>
    <span class="monster-card__name">${monster.name}</span>
  `;
  card.addEventListener("click", () => playCardTransition(monster.id));
  monsterGrid.appendChild(card);
});

bindThumbFallbacks(monsterGrid);

// ============================================================
// ビュー切替（一覧 ⇔ 詳細）
// ============================================================
const gridView = document.getElementById("gridView");
const detailView = document.getElementById("detailView");
const detailName = document.getElementById("detailName");
const normalGrid = document.getElementById("normalGrid");
const anomalyGrid = document.getElementById("anomalyGrid");
const backBtn = document.getElementById("backBtn");
const tickerGroup = document.getElementById("tickerGroup");
const headerEl = document.querySelector(".header");

function showDetail(monsterId) {
  const monster = MONSTERS.find((m) => m.id === monsterId);
  if (!monster) return;

  detailName.textContent = monster.name;

  normalGrid.innerHTML = monster.normal
    .map(
      (entry, i) => `
      <button type="button" class="state-card" data-monster="${monster.id}" data-kind="normal" data-index="${i + 1}">
        <span class="state-card__thumb">${renderThumb({
          kind: "normal",
          monsterId: monster.id,
          index: i + 1,
          color: monster.color,
          alt: `${monster.name}（通常状態・${entry.label}）`
        })}</span>
      </button>
    `
    )
    .join("");

  anomalyGrid.innerHTML = monster.anomalies.length
    ? monster.anomalies
        .map(
          (entry, i) => `
      <button type="button" class="state-card state-card--anomaly" data-monster="${monster.id}" data-kind="anomaly" data-index="${i + 1}">
        <p class="state-card__note">${entry.note}</p>
        <span class="state-card__thumb">${renderThumb({
          kind: "anomaly",
          monsterId: monster.id,
          index: i + 1,
          color: monster.color,
          possessed: true,
          alt: `${monster.name}（異変状態・${entry.label}）`
        })}</span>
      </button>
    `
        )
        .join("")
    : `
      <div class="state-card state-card--anomaly state-card--empty">
        <span class="state-card__thumb">${logoSvg()}</span>
      </div>
    `;

  bindThumbFallbacks(normalGrid);
  bindThumbFallbacks(anomalyGrid);

  normalGrid.querySelectorAll(".state-card").forEach((btn) => {
    btn.addEventListener("click", () => openNormalModal(monster, Number(btn.dataset.index)));
  });
  anomalyGrid.querySelectorAll(".state-card").forEach((btn) => {
    btn.addEventListener("click", () => openAnomalyModal(monster, Number(btn.dataset.index)));
  });

  gridView.hidden = true;
  detailView.hidden = false;
  tickerGroup.hidden = true;
  backBtn.hidden = false;
  const headerBottom = headerEl.getBoundingClientRect().bottom + window.scrollY;
  window.scrollTo({ top: headerBottom, behavior: "smooth" });
}

function showGrid() {
  detailView.hidden = true;
  gridView.hidden = false;
  tickerGroup.hidden = false;
  backBtn.hidden = true;
  gridView.scrollIntoView({ behavior: "smooth", block: "start" });
}

backBtn.addEventListener("click", showGrid);

// ============================================================
// 拡大画像モーダル
// ============================================================
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
let lastFocusedEl = null;

function openModal() {
  lastFocusedEl = document.activeElement;
  modal.hidden = false;
  modalClose.focus();
  document.addEventListener("keydown", onModalKeydown);
}

function closeModal() {
  modal.hidden = true;
  document.removeEventListener("keydown", onModalKeydown);
  if (lastFocusedEl) lastFocusedEl.focus();
}

function onModalKeydown(e) {
  if (e.key === "Escape") closeModal();
}

modalClose.addEventListener("click", closeModal);
modal.querySelector("[data-modal-close]").addEventListener("click", closeModal);

// 通常状態カード → 画像のみの拡大表示
function openNormalModal(monster, index) {
  const entry = monster.normal[index - 1];
  modalBody.innerHTML = `
    <div class="modal__figure">
      ${renderThumb({
        kind: "normal",
        monsterId: monster.id,
        index,
        color: monster.color,
        alt: `${monster.name}（通常状態・${entry.label}）`
      })}
    </div>
    <p class="modal__caption">${monster.name}｜通常状態</p>
  `;
  bindThumbFallbacks(modalBody);
  openModal();
}

// 異変状態カード → 異変箇所＋通常/異変の比較画像＋判別ポイント
function openAnomalyModal(monster, index) {
  const entry = monster.anomalies[index - 1];
  const compareIndex = entry.compareIndex || 1;
  modalBody.innerHTML = `
    <p class="modal__eyebrow">異変箇所</p>
    <p class="modal__note">${entry.note}</p>
    <div class="modal__compare">
      <div class="modal__compare-item">
        <span class="modal__compare-label">通常状態</span>
        ${renderThumb({
          kind: "normal",
          monsterId: monster.id,
          index: compareIndex,
          color: monster.color,
          alt: `${monster.name}（通常状態）`
        })}
      </div>
      <div class="modal__compare-item">
        <span class="modal__compare-label">異変状態</span>
        ${renderThumb({
          kind: "anomaly",
          monsterId: monster.id,
          index,
          color: monster.color,
          possessed: true,
          alt: `${monster.name}（異変状態）`
        })}
      </div>
    </div>
    <p class="modal__eyebrow">判別ポイント</p>
    <p class="modal__point">${entry.point || "（未設定）"}</p>
  `;
  bindThumbFallbacks(modalBody);
  openModal();
}

// 情報提供する → お願い事項＋開発者Xリンク
const reportBtn = document.getElementById("reportBtn");

function openReportModal() {
  modalBody.innerHTML = `
    <p class="modal__eyebrow">情報提供に関する留意事項</p>
    <ul class="modal__list">
      <li>ヤミクマが変身しているモンスターの画像を送ってください。</li>
      <li>モンスターを拡大した時の画面全体が写っていることを確認してください。</li>
      <li>変異箇所を簡単に添えていただけると助かります。（比較画像は大丈夫です）</li>
      <li>すでに掲載されている情報かどうかの確認をお願いします。</li>
      <li>必ず掲載することを保証するものではありません。</li>
      <li>掲載後も画像を変更する可能性があります。</li>
      <li>提供方法はDMもしくは@メンションどちらでも可能です。</li>
    </ul>
    <a class="modal__cta" href="https://x.com/yu_cielkun" target="_blank" rel="noopener noreferrer">確認して開発者へ情報を送る</a>
  `;
  openModal();
}

reportBtn.addEventListener("click", openReportModal);
