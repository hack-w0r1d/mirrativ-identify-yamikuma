// ============================================================
// ヤミクマ判別ゲーム
//
// 各モンスターの通常状態／異変状態の画像をランダムに出題し、
// 「通常状態（左スワイプ）」か「異変状態（右スワイプ）」かを当てるゲーム。
//
// script.js で定義済みの MONSTERS / renderThumb / bindThumbFallbacks /
// prefersReducedMotion と、モーダル関連（modal / modalNavState /
// modalPreviousState / renderModalTrack / openModal）を利用するため、
// script.js より後に読み込むこと。
//
// トップページの入口は data-game-open 属性を付けた要素なら何でもよい
// （ボタンを別の場所へ移しても、このファイルの変更は不要）。
// ============================================================
(() => {
  // ------------------------------------------------------------
  // 設定
  // ------------------------------------------------------------
  const QUESTION_COUNTS = [5, 10];  // 開始時に選べる問題数（先頭がデフォルト。index.html のラジオボタンと揃える）
  const SHOW_MONSTER_NAME = true;   // 出題中にモンスター名を表示するか
  const ANOMALY_RATE = 0.5;         // 1問ごとに「異変状態」を出題する確率（0〜1）。残りは通常状態

  const SAVE_KEY = "yamikuma-game-progress";
  const SAVE_VERSION = 1;
  const SAVE_TTL_MS = 24 * 60 * 60 * 1000; // 最終保存から24時間以内なら続きから再開できる

  // スワイプ判定（指の移動ベクトル dx, dy から決める）
  const SWIPE_DISTANCE = 100;    // これ以上横へ動かせば確定（px）
  const SWIPE_FLICK_MIN = 40;    // フリック（素早い動き）でも最低限必要な横移動量（px）
  const SWIPE_FLICK_SPEED = 0.6; // フリックとみなす横方向の速さ（px/ms）
  const SWIPE_ANGLE_RATIO = 0.5; // |dx| が |dy| のこの割合に満たない（ほぼ縦の動き）場合は無効

  const FLY_OUT_MS = prefersReducedMotion ? 0 : 260;
  const SNAP_BACK_MS = prefersReducedMotion ? 0 : 200;

  // ------------------------------------------------------------
  // 要素・状態
  // ------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const root = $("game");
  const screens = { start: $("gameStart"), play: $("gamePlay"), result: $("gameResult") };
  const resumePanel = $("gameResume");
  const resumeMeta = $("gameResumeMeta");
  const setupPanel = $("gameSetup");
  const stage = $("gameStage");
  const hudCount = $("gameCount");
  const hudBar = $("gameProgressBar");
  const scoreEl = $("gameScore");
  const resultList = $("gameResultList");
  const cardA = $("gameCardA");
  const cardB = $("gameCardB");

  let opener = null;     // 入口ボタン（閉じたときにフォーカスを戻す）
  let session = null;    // 進行中／結果表示中のゲーム { total, questions, answers, locked }
  let savedData = null;  // 再開できる前回データ
  let cardFront = cardA; // 手前（操作対象）のカード
  let cardBack = cardB;  // 奥（次の問題）のカード
  let drag = null;       // ドラッグ中の情報

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const findMonster = (id) => MONSTERS.find((m) => m.id === id);

  // ------------------------------------------------------------
  // 出題
  //   ・1問ごとに ANOMALY_RATE で「通常／異変」のどちらを出すか決め、
  //     その状態の全画像（シャッフル済み）から先頭を1枚取り出す
  //   ・取り出した画像は山から無くなるので、同じ問題（同じ画像）は出ない
  //     （同じモンスターが複数回出るのはOK）
  //   ・question = { monsterId, kind: "normal" | "anomaly", index: 画像の連番（1始まり） }
  // ------------------------------------------------------------
  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // 通常／異変それぞれの「全画像」をシャッフルした山（画像1枚 = 問題の候補1件）
  function buildPile(kind) {
    const pile = [];
    MONSTERS.forEach((monster) => {
      const count = kind === "normal" ? monster.normal.length : monster.anomalies.length;
      for (let index = 1; index <= count; index++) {
        pile.push({ monsterId: monster.id, kind, index });
      }
    });
    return shuffle(pile);
  }

  function buildQuestions(total) {
    const piles = { normal: buildPile("normal"), anomaly: buildPile("anomaly") };
    const questions = [];
    while (questions.length < total && (piles.normal.length || piles.anomaly.length)) {
      let kind = Math.random() < ANOMALY_RATE ? "anomaly" : "normal";
      if (piles[kind].length === 0) kind = kind === "anomaly" ? "normal" : "anomaly"; // 片方を使い切った場合の保険
      questions.push(piles[kind].pop());
    }
    return questions;
  }

  // ------------------------------------------------------------
  // 保存・復元（localStorage）
  //   1問答えるごとに保存し、最終保存から24時間以内なら再開を案内する
  // ------------------------------------------------------------
  function saveProgress(s) {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: SAVE_VERSION,
          savedAt: Date.now(),
          total: s.total,
          questions: s.questions,
          answers: s.answers
        })
      );
    } catch {
      // 保存できない環境（プライベートモード等）でもゲーム自体は続行する
    }
  }

  function clearProgress() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // 何もしない
    }
  }

  function isValidQuestion(q) {
    const monster = q && findMonster(q.monsterId);
    if (!monster) return false;
    const count = q.kind === "normal" ? monster.normal.length : q.kind === "anomaly" ? monster.anomalies.length : 0;
    return Number.isInteger(q.index) && q.index >= 1 && q.index <= count;
  }

  // データ更新（画像の削除など）で出題内容と食い違った保存データは使わない
  function isValidSave(data) {
    if (!data || data.version !== SAVE_VERSION) return false;
    if (!Number.isFinite(data.savedAt) || Date.now() - data.savedAt > SAVE_TTL_MS) return false;
    if (!QUESTION_COUNTS.includes(data.total)) return false;
    if (!Array.isArray(data.questions) || data.questions.length !== data.total) return false;
    if (!Array.isArray(data.answers) || data.answers.length < 1 || data.answers.length >= data.total) return false;
    if (!data.answers.every((a) => a === "normal" || a === "anomaly")) return false;
    return data.questions.every(isValidQuestion);
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (isValidSave(data)) return data;
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // 壊れたデータ等は無かったものとして扱う
    }
    return null;
  }

  // ------------------------------------------------------------
  // 画面の開閉・切替
  // ------------------------------------------------------------
  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.hidden = key !== name;
    });
    root.scrollTop = 0;
  }

  // スタート画面：前回データがあれば再開の確認、なければ問題数の選択を表示する
  function showStart() {
    savedData = loadProgress();
    resumePanel.hidden = !savedData;
    setupPanel.hidden = !!savedData;
    if (savedData) {
      resumeMeta.textContent = `${savedData.total}問中 ${savedData.answers.length}問回答済み`;
    }
    showScreen("start");
    (savedData ? $("gameResumeBtn") : $("gameStartBtn")).focus({ preventScroll: true });
  }

  function openGame(trigger) {
    opener = trigger;
    session = null;
    root.hidden = false;
    document.documentElement.classList.add("is-game-open");
    showStart();
  }

  function closeGame() {
    root.hidden = true;
    document.documentElement.classList.remove("is-game-open");
    session = null;
    drag = null;
    if (opener) opener.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------
  // カード（手前 cardFront ／ 奥 cardBack の2枚を入れ替えながら使う）
  //   入れ替え時に画像を作り直さないので、次の問題へ移る瞬間にちらつかない
  // ------------------------------------------------------------
  const stampOf = (card, choice) =>
    card.querySelector(choice === "anomaly" ? ".game-stamp--anomaly" : ".game-stamp--normal");

  const transitionFor = (ms) => `transform ${ms}ms ease-out, opacity ${ms}ms ease-out`;

  function setRole(card, role) {
    card.style.cssText = "";
    card.classList.toggle("is-front", role === "front");
    card.classList.toggle("is-back", role === "back");
    card.querySelectorAll(".game-stamp").forEach((stamp) => {
      stamp.style.opacity = "";
    });
  }

  // 実画像の縦横比（幅/高さ）を CSS 変数 --img-ratio に渡す。
  // 画像は contain 表示で上下に余白ができるので、モンスター名をその余白の中央に置く計算（CSS側）に使う
  function trackImageRatio(box) {
    const img = box.querySelector("img");
    if (!img) return;
    const apply = () => {
      if (img.naturalWidth && img.naturalHeight) {
        box.style.setProperty("--img-ratio", String(img.naturalWidth / img.naturalHeight));
      }
    };
    if (img.complete) apply();
    img.addEventListener("load", apply);
  }

  function fillCard(card, question) {
    const figure = card.querySelector(".game-card__figure");
    if (!question) {
      figure.innerHTML = "";
      card.classList.add("is-empty");
      return;
    }
    const monster = findMonster(question.monsterId);
    // 図枠の中に「画像」と、その下に「モンスター名」を並べる
    figure.innerHTML = `
      <div class="game-card__image">
        ${renderThumb({
          kind: question.kind,
          monsterId: monster.id,
          index: question.index,
          color: monster.color,
          alt: `${monster.name}（判別対象）`
        })}
        <p class="game-card__name">${SHOW_MONSTER_NAME ? monster.name : ""}</p>
      </div>
    `;
    bindThumbFallbacks(figure);
    trackImageRatio(figure.querySelector(".game-card__image"));
    card.classList.remove("is-empty");
  }

  // 奥のカードを、手前のカードの動きに合わせて少しずつ手前へ寄せる（p: 0〜1）
  function setBackProgress(p, ms = 0) {
    cardBack.style.transition = transitionFor(ms);
    cardBack.style.transform = `translateY(${14 * (1 - p)}px) scale(${0.94 + 0.06 * p})`;
    cardBack.style.opacity = String(0.55 + 0.45 * p);
  }

  function updateHud() {
    const done = session.answers.length;
    hudCount.textContent = `${Math.min(done + 1, session.total)} / ${session.total}`;
    hudBar.style.width = `${(done / session.total) * 100}%`;
  }

  function beginPlay() {
    cardFront = cardA;
    cardBack = cardB;
    setRole(cardFront, "front");
    setRole(cardBack, "back");
    fillCard(cardFront, session.questions[session.answers.length]);
    fillCard(cardBack, session.questions[session.answers.length + 1]);
    updateHud();
    showScreen("play");
  }

  function startNewGame() {
    const checked = document.querySelector('input[name="gameCount"]:checked');
    const total = Number(checked && checked.value);
    const count = QUESTION_COUNTS.includes(total) ? total : QUESTION_COUNTS[0];
    clearProgress(); // 前回の中断データは新規開始で破棄する
    session = { total: count, questions: buildQuestions(count), answers: [], locked: false };
    beginPlay();
  }

  function resumeGame() {
    if (!savedData) return;
    session = {
      total: savedData.total,
      questions: savedData.questions,
      answers: savedData.answers.slice(),
      locked: false
    };
    beginPlay();
  }

  // ------------------------------------------------------------
  // 回答
  // ------------------------------------------------------------
  // 指の移動ベクトル(dx, dy)と経過時間から選択を判定する。確定しなければ null
  function judgeSwipe(dx, dy, elapsed) {
    const absX = Math.abs(dx);
    if (absX < Math.abs(dy) * SWIPE_ANGLE_RATIO) return null; // ほぼ縦方向の動きは無効
    const isFlick = absX >= SWIPE_FLICK_MIN && absX / Math.max(elapsed, 1) >= SWIPE_FLICK_SPEED;
    if (absX < SWIPE_DISTANCE && !isFlick) return null;
    return dx < 0 ? "normal" : "anomaly"; // 左＝通常状態、右＝異変状態
  }

  // 選択したほうへカードを飛ばす。スワイプ操作なら指の動きの向きへ、ボタン操作なら真横へ
  function flyOut(choice, dx, dy) {
    const sign = choice === "anomaly" ? 1 : -1;
    let outX = sign * window.innerWidth * 1.2;
    let outY = 0;
    if (Math.sign(dx) === sign && Math.abs(dx) > 1) {
      outY = clamp(dy * Math.abs(outX / dx), -window.innerHeight, window.innerHeight);
    }
    cardFront.style.transition = transitionFor(FLY_OUT_MS);
    cardFront.style.transform = `translate(${outX}px, ${outY}px) rotate(${sign * 24}deg)`;
    stampOf(cardFront, choice).style.opacity = "1";
    setBackProgress(1, FLY_OUT_MS);
  }

  function advanceCards() {
    const flown = cardFront;
    cardFront = cardBack;
    cardBack = flown;
    setRole(cardFront, "front");
    setRole(cardBack, "back");
    fillCard(cardBack, session.questions[session.answers.length + 1]);
    updateHud();
  }

  function answer(choice, dx = 0, dy = 0) {
    if (!session || session.locked || screens.play.hidden) return;
    const current = session;
    current.locked = true;
    current.answers.push(choice);
    saveProgress(current); // 1問ごとに保存
    flyOut(choice, dx, dy);
    setTimeout(() => {
      if (session !== current) return; // アニメーション中に閉じられた場合
      if (current.answers.length >= current.total) {
        finishGame();
        return;
      }
      advanceCards();
      current.locked = false;
    }, FLY_OUT_MS + 30);
  }

  // ------------------------------------------------------------
  // スワイプ操作（pointerdown → pointermove → pointerup）
  //   ドラッグ中はカードが指に追従し、離した時の移動量・速さ・向きで判定する。
  //   stage には touch-action: none を指定しているので、縦横どちらへも
  //   ブラウザのスクロールに奪われずに斜めのスワイプができる。
  // ------------------------------------------------------------
  function moveCard(dx, dy) {
    cardFront.style.transform = `translate(${dx}px, ${dy}px) rotate(${clamp(dx * 0.06, -18, 18)}deg)`;
    const p = clamp(Math.abs(dx) / SWIPE_DISTANCE, 0, 1);
    stampOf(cardFront, "anomaly").style.opacity = dx > 0 ? p : 0;
    stampOf(cardFront, "normal").style.opacity = dx < 0 ? p : 0;
    setBackProgress(p);
  }

  function snapBack() {
    cardFront.style.transition = transitionFor(SNAP_BACK_MS);
    cardFront.style.transform = "";
    stampOf(cardFront, "anomaly").style.opacity = "0";
    stampOf(cardFront, "normal").style.opacity = "0";
    setBackProgress(0, SNAP_BACK_MS);
  }

  stage.addEventListener("pointerdown", (e) => {
    if (!session || session.locked || drag) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, startTime: e.timeStamp };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add("is-dragging");
    cardFront.style.transition = "none";
  });

  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    moveCard(e.clientX - drag.startX, e.clientY - drag.startY);
  });

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    // 始点と「離した位置（終点）」から移動ベクトルを取る
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const startTime = drag.startTime;
    drag = null;
    stage.classList.remove("is-dragging");
    const choice = cancelled ? null : judgeSwipe(dx, dy, e.timeStamp - startTime);
    if (choice) {
      answer(choice, dx, dy);
    } else {
      snapBack();
    }
  }

  stage.addEventListener("pointerup", (e) => endDrag(e, false));
  stage.addEventListener("pointercancel", (e) => endDrag(e, true));

  // ------------------------------------------------------------
  // 成績画面
  // ------------------------------------------------------------
  function buildResultRow(question, choice, i) {
    const monster = findMonster(question.monsterId);
    const label =
      question.kind === "normal"
        ? `${monster.name} （異変なし）`
        : `${monster.name}の${monster.anomalies[question.index - 1].note}`;
    const ok = choice === question.kind;
    return `
      <li class="game-result__item">
        <span class="game-result__no">Q${i + 1}</span>
        <span class="game-result__label">${label}</span>
        <span class="game-result__mark game-result__mark--${ok ? "ok" : "ng"}" aria-label="${ok ? "正解" : "不正解"}">${ok ? "○" : "×"}</span>
        <button type="button" class="game-result__explain" data-question="${i}">解説</button>
      </li>
    `;
  }

  function showResult() {
    const { total, questions, answers } = session;
    const correct = questions.filter((q, i) => answers[i] === q.kind).length;
    const rate = ((correct / total) * 100).toFixed(1);
    scoreEl.innerHTML = `正解数 <strong>${correct}</strong> / ${total} 問中　正答率 <strong>${rate}</strong> %`;
    resultList.innerHTML = questions.map((q, i) => buildResultRow(q, answers[i], i)).join("");
    showScreen("result");
  }

  function finishGame() {
    clearProgress(); // 最後まで終えたデータは再開対象にしない
    showResult();
  }

  // 「解説」→ 詳細ページの画像タップと同じモーダルを、その1枚だけ表示する
  // （kind: "pair" に1件だけ入れると、左右ナビ・スワイプの無い単独表示になる）
  function openExplanation(question) {
    const monster = findMonster(question.monsterId);
    modalPreviousState = null;
    const wasOpen = !modal.hidden;
    modalNavState = {
      monster,
      kind: "pair",
      index: 1,
      total: 1,
      items: [{ kind: question.kind, index: question.index }]
    };
    renderModalTrack();
    if (!wasOpen) openModal();
  }

  resultList.addEventListener("click", (e) => {
    const btn = e.target.closest(".game-result__explain");
    if (!btn || !session) return;
    openExplanation(session.questions[Number(btn.dataset.question)]);
  });

  // ------------------------------------------------------------
  // ボタン・キーボード
  // ------------------------------------------------------------
  document.querySelectorAll("[data-game-open]").forEach((btn) => {
    btn.addEventListener("click", () => openGame(btn));
  });

  $("gameStartClose").addEventListener("click", closeGame);
  $("gamePlayClose").addEventListener("click", closeGame);
  $("gameResultClose").addEventListener("click", closeGame);
  $("gameStartBtn").addEventListener("click", startNewGame);
  $("gameResumeBtn").addEventListener("click", resumeGame);
  $("gameNewBtn").addEventListener("click", () => {
    resumePanel.hidden = true;
    setupPanel.hidden = false;
    $("gameStartBtn").focus({ preventScroll: true });
  });
  $("gameRetryBtn").addEventListener("click", () => {
    session = null;
    showStart();
  });
  $("answerNormal").addEventListener("click", () => answer("normal"));
  $("answerAnomaly").addEventListener("click", () => answer("anomaly"));

  document.addEventListener("keydown", (e) => {
    if (root.hidden || !modal.hidden) return; // モーダル表示中はモーダル側のキー操作を優先
    if (e.key === "Escape") {
      closeGame();
    } else if (e.key === "ArrowLeft") {
      answer("normal");
    } else if (e.key === "ArrowRight") {
      answer("anomaly");
    }
  });
})();
