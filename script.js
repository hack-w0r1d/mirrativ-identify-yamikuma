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
// プレースホルダーSVG生成
// possessed=false: 通常状態 / possessed=true: 異変（ヤミクマ憑依）状態
// ============================================================
function monsterSvg(color, possessed) {
  const eyeColor = possessed ? "#c9a6ff" : "#ffffff";
  const glow = possessed
    ? `<circle cx="50" cy="52" r="34" fill="none" stroke="#8257e8" stroke-width="2" opacity="0.55"/>
       <circle cx="50" cy="52" r="10" fill="none" stroke="#8257e8" stroke-width="2" opacity="0.85"/>
       <circle cx="50" cy="52" r="3" fill="#8257e8"/>`
    : "";
  return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <ellipse cx="28" cy="26" rx="13" ry="13" fill="${color}"/>
      <ellipse cx="72" cy="26" rx="13" ry="13" fill="${color}"/>
      <ellipse cx="28" cy="26" rx="6" ry="6" fill="#1b1526"/>
      <ellipse cx="72" cy="26" rx="6" ry="6" fill="#1b1526"/>
      <rect x="14" y="30" width="72" height="58" rx="26" fill="${color}"/>
      <circle cx="38" cy="54" r="4.5" fill="${eyeColor}"/>
      <circle cx="62" cy="54" r="4.5" fill="${eyeColor}"/>
      <ellipse cx="50" cy="66" rx="10" ry="8" fill="#1b1526" opacity="0.18"/>
      ${glow}
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
      data-fallback-color="${color}"
      data-possessed="${possessed}"
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
    img.outerHTML = monsterSvg(img.dataset.fallbackColor, img.dataset.possessed === "true");
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
  card.addEventListener("click", () => showDetail(monster.id));
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

  anomalyGrid.innerHTML = monster.anomalies
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
    .join("");

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
  detailView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showGrid() {
  detailView.hidden = true;
  gridView.hidden = false;
  tickerGroup.hidden = false;
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
      <li>モンスターを拡大した時の画面全体が写っていることを確認してください。</li>
      <li>変異箇所を簡単に添えていただけると助かります（比較画像は大丈夫です）。</li>
      <li>すでに掲載されている情報かどうかの確認をお願いします。</li>
      <li>必ず掲載することを保証するものではありません。</li>
      <li>掲載後も画像を変更する可能性があります。</li>
    </ul>
    <a class="modal__cta" href="https://x.com/yu_cielkun" target="_blank" rel="noopener noreferrer">確認して開発者へ情報を送る</a>
  `;
  openModal();
}

reportBtn.addEventListener("click", openReportModal);
