// ============================================================
// サブページ（プライバシーポリシー・免責事項）共通スクリプト
// フッターが画面内に入ったら「トップに戻る」ボタンを隠す
// ============================================================
const backToTop = document.getElementById("backToTop");
const footer = document.querySelector(".footer");

const footerObserver = new IntersectionObserver(([entry]) => {
    backToTop.classList.toggle("is-hidden", entry.isIntersecting);
});

footerObserver.observe(footer);
