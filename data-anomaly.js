// ============================================================
// 異変状態：パターンデータ（1体につき1〜3件）
//
// 書き方：
//   MONSTER_ID: [
//     {
//       label: "パターンA",       // 省略可（省略時は自動でパターンA/B/C）
//       note: "異変箇所の説明文",  // カード・モーダル両方に表示
//       point: "判別ポイントの詳しい解説文", // モーダルのみに表示
//       compareIndex: 1          // モーダルで並べる通常状態画像の番号（省略時は1）
//     }
//   ]
//
// 画像ファイルは images/anomaly/{ID}-1.png, {ID}-2.png ... のように
// 配列の順番どおりに連番で配置してください。
//
// compareIndex は、そのモンスターの通常状態画像（1〜3）のうち、
// このパターンとの比較にいちばん向いているものを選んで指定します。
//
// 例）スラポン(m01)にパターンA・パターンBを追加する場合
//   m01: [
//     { note: "瞳の色が紫に変化している。", point: "…", compareIndex: 1 },
//     { note: "背中の模様が変わっている。", point: "…", compareIndex: 2 }
//   ],
// ============================================================
const ANOMALY_DATA = {
  m01: [
    {
      note: "頭の毛",
      point: "頭の毛が通常時と比べて少し大きい。<br>ヒントの枠線に重なるかどうかで判別可能。",
      compareIndex: 1
    },
    {
      note: "尻尾",
      point: "尻尾が通常時と比べて少し長い。<br>単体での判別は難しいので消去法がおすすめ。",
      compareIndex: 1
    },
    {
      note: "色",
      point: "体が変色している。",
      compareIndex: 1
    },
    {
      note: "色",
      point: "体が変色している。",
      compareIndex: 1
    },
  ],
  m02: [
    {
      note: "耳",
      point: "耳が通常時と比べて垂れている。",
      compareIndex: 3
    },
    {
      note: "サイズ",
      point: "サイズが通常時と比べて小さい。",
      compareIndex: 1
    },
    {
      note: "サイズ",
      point: "サイズが通常時と比べて小さい。",
      compareIndex: 2
    },
    {
      note: "サイズ",
      point: "サイズが通常時と比べて小さい。",
      compareIndex: 3
    },
  ],
  m03: [
    {
      note: "羽",
      point: "羽がなくなっている。",
      compareIndex: 1
    },
    {
      note: "羽",
      point: "羽がなくなっている。",
      compareIndex: 2
    },
    {
      note: "サイズ",
      point: "サイズが通常時と比べて小さい。",
      compareIndex: 1
    },
  ],
  m04: [
    {
      note: "髪の毛",
      point: "髪の毛が通常時と比べて長い。",
      compareIndex: 1
    },
    {
      note: "リボン",
      point: "リボンが通常時と比べて大きい。",
      compareIndex: 1
    },
  ],
  m05: [
    {
      note: "マフラー",
      point: "マフラーが通常時と比べて長い。",
      compareIndex: 1
    },
    {
      note: "マフラー",
      point: "マフラーが通常時と比べて長い。",
      compareIndex: 3
    },
    {
      note: "尻尾",
      point: "尻尾が通常時と比べて大きい。",
      compareIndex: 3
    },
  ],
  m06: [
    {
      note: "尻尾",
      point: "尻尾がない。",
      compareIndex: 1
    },
    {
      note: "耳",
      point: "耳が通常時と比べて長い。",
      compareIndex: 3
    },
    {
      note: "耳",
      point: "耳が通常時と比べて長い。",
      compareIndex: 4
    },
    {
      note: "尻尾",
      point: "尻尾がない。",
      compareIndex: 4
    },
  ],
  m07: [
    {
      note: "翼",
      point: "翼が通常時と比べて長い。",
      compareIndex: 2
    },
    {
      note: "翼",
      point: "翼が通常時と比べて長い。",
      compareIndex: 2
    },
    {
      note: "シマエナガ",
      point: "背中のシマエナガが通常時と比べて大きい。",
      compareIndex: 2
    },
  ],
  m08: [
    {
      note: "耳",
      point: "耳が通常時と比べて平行。",
      compareIndex: 1
    },
  ],
  m09: [
    {
      note: "武器",
      point: "武器が棍棒から剣になっている。",
      compareIndex: 2
    },
    {
      note: "武器",
      point: "武器が棍棒から剣になっている。",
      compareIndex: 3
    },
  ],
  m10: [
    {
      note: "尻尾",
      point: "尻尾が通常時と比べて長い。<br>画面下に尻尾がはみ出るかどうかで判別可能。",
      compareIndex: 1
    },
  ],
  m11: [
    {
      note: "杖",
      point: "杖の形が通常時と異なる。",
      compareIndex: 1
    },
    {
      note: "杖",
      point: "杖の形が通常時と異なる。",
      compareIndex: 3
    },
    {
      note: "ズボン",
      point: "ズボンが赤くなっている。",
      compareIndex: 2
    },
  ],
  m12: [
    {
      note: "ボム",
      point: "頭の上のボムがない。",
      compareIndex: 1
    },
    {
      note: "耳",
      point: "プルドッグの耳がぺしゃんこになっている。",
      compareIndex: 1
    },
  ],
  m13: [
    {
      note: "尻尾",
      point: "尻尾の数が通常時と比べて1つ少ない。",
      compareIndex: 1
    },
    {
      note: "サイズ",
      point: "サイズが通常時と比べて大きい。",
      compareIndex: 1
    },
  ],
  m14: [
    {
      note: "槍",
      point: "槍の形が骨になっている。",
      compareIndex: 2
    },
    {
      note: "サイズ",
      point: "通常時と比べてわずかにスリム。<br>単体での判別は難しいので消去法がおすすめ。",
      compareIndex: 1
    },
    {
      note: "サイズ",
      point: "通常時と比べてわずかにスリム。<br>単体での判別は難しいので消去法がおすすめ。",
      compareIndex: 1
    },
  ],
  m15: [
    {
      note: "尻尾",
      point: "尻尾の数が通常時と比べて1つ少ない。",
      compareIndex: 2
    },
    {
      note: "サイズ",
      point: "サイズが通常時と比べて大きい。",
      compareIndex: 1
    },
    {
      note: "サイズ",
      point: "サイズが通常時と比べて大きい。",
      compareIndex: 3
    },
  ],
  m16: [
    {
      note: "耳",
      point: "耳が通常時と比べて傾いている。",
      compareIndex: 1
    },
    {
      note: "尻尾",
      point: "尻尾が通常時と比べて長い。",
      compareIndex: 1
    },
    {
      note: "尻尾",
      point: "尻尾が通常時と比べて長い。",
      compareIndex: 3
    },
  ],
  m17: [
    {
      note: "目",
      point: "目が > < になっている。",
      compareIndex: 1
    },
    {
      note: "弓",
      point: "弓の向きが通常時と比べて逆向きになっている。",
      compareIndex: 1
    },
    {
      note: "弓",
      point: "弓の向きが通常時と比べて逆向きになっている。",
      compareIndex: 1
    },
  ],
  m18: [
    {
      note: "帽子",
      point: "帽子が通常時と比べて小さい。",
      compareIndex: 1
    },
  ],
  m19: [
    {
      note: "槍",
      point: "槍が通常時と比べて短い。",
      compareIndex: 1
    },
        {
      note: "武装",
      point: "武装が折り紙になっている。",
      compareIndex: 1
    },
  ],
  m20: [
    {
      note: "イノシシ",
      point: "イノシシが反対側を向いている。",
      compareIndex: 1
    },
    {
      note: "イノシシの耳",
      point: "イノシシの耳が片耳倒れている。",
      compareIndex: 2
    },
  ],
  m21: [
    {
      note: "槍",
      point: "槍が通常時と比べて大きい。",
      compareIndex: 2
    },
    {
      note: "槍",
      point: "槍を持っていない。",
      compareIndex: 2
    },
  ],
  m22: [
    {
      note: "ドレス",
      point: "ドレスが通常時と比べて長い。",
      compareIndex: 2
    },
    {
      note: "ドレス",
      point: "ドレスが通常時と比べて長い。",
      compareIndex: 3
    },
    {
      note: "クジラ",
      point: "クジラのサイズが通常時と比べて小さい。",
      compareIndex: 1
    },
  ],
  m23: [
    {
      note: "砲口",
      point: "砲口がなくなっている。",
      compareIndex: 1
    },
    {
      note: "サイズ",
      point: "砲口がなくなっている。",
      compareIndex: 1
    },
  ],
};
