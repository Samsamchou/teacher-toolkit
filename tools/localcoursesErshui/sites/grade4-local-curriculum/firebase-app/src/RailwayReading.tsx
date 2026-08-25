import { useMemo, useState, type DragEvent } from "react";

type ZoneId = "mountain" | "both" | "coast";

type ReadingCard = {
  id: string;
  text: string;
  translation: string;
  answer: ZoneId;
};

type Placements = Record<string, ZoneId | null>;

const CARDS: ReadingCard[] = [
  {
    id: "mountain-inland",
    text: "Closer to hills and mountains",
    translation: "較靠內陸丘陵與山地",
    answer: "mountain",
  },
  {
    id: "mountain-scenery",
    text: "Scenery: mountains, tunnels, and valleys",
    translation: "景觀：山、隧道、河谷",
    answer: "mountain",
  },
  {
    id: "mountain-stations",
    text: "Example stations: Shengxing and Taichung",
    translation: "代表站：勝興、臺中",
    answer: "mountain",
  },
  {
    id: "mountain-towns",
    text: "Connects inland towns",
    translation: "連結內陸城鎮",
    answer: "mountain",
  },
  {
    id: "both-west",
    text: "Both are in western Taiwan",
    translation: "都在臺灣西部",
    answer: "both",
  },
  {
    id: "both-station",
    text: "Both have stations, tracks, and trains",
    translation: "都有車站、鋼軌與列車",
    answer: "both",
  },
  {
    id: "both-passengers",
    text: "Both can carry passengers",
    translation: "都能運送旅客",
    answer: "both",
  },
  {
    id: "both-life",
    text: "Both affect local life",
    translation: "都會影響地方生活",
    answer: "both",
  },
  {
    id: "coast-shore",
    text: "Closer to the west coast and plains",
    translation: "較靠西部海岸與平原",
    answer: "coast",
  },
  {
    id: "coast-scenery",
    text: "Scenery: coast, wind, and plains",
    translation: "景觀：海岸、風、平原",
    answer: "coast",
  },
  {
    id: "coast-stations",
    text: "Example stations: Qingshui and Shalu",
    translation: "代表站：清水、沙鹿",
    answer: "coast",
  },
  {
    id: "coast-towns",
    text: "Connects coastal towns",
    translation: "連結海線城鎮",
    answer: "coast",
  },
];

const ZONES: Array<{
  id: ZoneId;
  title: string;
  english: string;
  hint: string;
  emoji: string;
}> = [
  {
    id: "mountain",
    title: "山線",
    english: "Mountain Line",
    hint: "山、隧道、河谷與內陸城鎮",
    emoji: "⛰️",
  },
  {
    id: "both",
    title: "共同點",
    english: "Both",
    hint: "兩條鐵路都有的特色",
    emoji: "🚉",
  },
  {
    id: "coast",
    title: "海線",
    english: "Coast Line",
    hint: "海岸、平原與海線城鎮",
    emoji: "🌊",
  },
];

function createEmptyPlacements(): Placements {
  return Object.fromEntries(CARDS.map((card) => [card.id, null])) as Placements;
}

export function RailwayReading({ onHome }: { onHome: () => void }) {
  const [placements, setPlacements] = useState<Placements>(createEmptyPlacements);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState(
    "先讀每張卡片，再拖曳到山線、共同點或海線。也可以先點卡片，再按放入這一區。",
  );

  const placedCount = useMemo(
    () => Object.values(placements).filter(Boolean).length,
    [placements],
  );
  const correctCount = useMemo(
    () =>
      CARDS.filter((card) => placements[card.id] === card.answer).length,
    [placements],
  );

  function placeCard(cardId: string, zone: ZoneId | null) {
    const card = CARDS.find((item) => item.id === cardId);
    if (!card) return;
    setPlacements((current) => ({ ...current, [cardId]: zone }));
    setSelectedCardId(null);
    setDraggedCardId(null);
    setChecked(false);
    setFeedback(
      zone
        ? `已將「${card.translation}」放到${ZONES.find((item) => item.id === zone)?.title}。`
        : `已將「${card.translation}」放回待分類卡片。`,
    );
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, cardId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", cardId);
    setDraggedCardId(cardId);
    setSelectedCardId(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, zone: ZoneId | null) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain") || draggedCardId;
    if (cardId) placeCard(cardId, zone);
  }

  function handleZoneAction(zone: ZoneId) {
    if (selectedCardId) placeCard(selectedCardId, zone);
  }

  function checkAnswers() {
    setChecked(true);
    if (placedCount < CARDS.length) {
      setFeedback(`還有 ${CARDS.length - placedCount} 張卡片尚未分類，先完成所有位置再檢查。`);
      return;
    }
    if (correctCount === CARDS.length) {
      setFeedback("太棒了！12 張卡片全部分類正確。You found the railway story! 🚆");
      return;
    }
    setFeedback(
      `目前答對 ${correctCount}/${CARDS.length} 張。看看紅色卡片的線索，再移動它們試試看。`,
    );
  }

  function resetActivity() {
    setPlacements(createEmptyPlacements());
    setSelectedCardId(null);
    setDraggedCardId(null);
    setChecked(false);
    setFeedback("已清空答案。重新讀一讀卡片，再開始分類吧！");
  }

  function cardStatus(card: ReadingCard) {
    if (!checked || placements[card.id] === null) return "";
    return placements[card.id] === card.answer ? "is-correct" : "is-wrong";
  }

  function renderCard(card: ReadingCard) {
    const isSelected = selectedCardId === card.id;
    return (
      <button
        type="button"
        className={`reading-card ${cardStatus(card)}${isSelected ? " is-selected" : ""}`}
        draggable
        onClick={() => {
          setSelectedCardId((current) => (current === card.id ? null : card.id));
          setFeedback(
            isSelected
              ? "已取消選取。"
              : `已選取「${card.translation}」，請按一個區域的「放入這一區」。`,
          );
        }}
        onDragStart={(event) => handleDragStart(event, card.id)}
        onDragEnd={() => setDraggedCardId(null)}
        aria-pressed={isSelected}
        aria-label={`${card.text}，${card.translation}${isSelected ? "，已選取" : ""}`}
      >
        <span className="reading-card-english">{card.text}</span>
        <span className="reading-card-chinese">{card.translation}</span>
        {checked && placements[card.id] !== null && (
          <span className="reading-card-mark" aria-hidden="true">
            {placements[card.id] === card.answer ? "✓" : "再想想"}
          </span>
        )}
      </button>
    );
  }

  return (
    <main className="reading-shell">
      <header className="reading-header">
        <button type="button" className="ghost-button" onClick={onHome}>
          ← 回課程首頁
        </button>
        <div className="reading-title-block">
          <span className="eyebrow">UNIT 03 · READ & FIND</span>
          <h1>
            閱覽鐵道風華 <span>Railway Reading</span>
          </h1>
          <p>讀一讀每張卡片，再把答案拖進正確的雙圈圖位置。</p>
        </div>
        <div className="reading-progress" aria-label={`已放置 ${placedCount} 張，共 ${CARDS.length} 張`}>
          <strong>{placedCount}/{CARDS.length}</strong>
          <span>cards placed</span>
        </div>
      </header>

      <section className="reading-guide" aria-labelledby="reading-guide-title">
        <div className="reading-guide-icon" aria-hidden="true">📖</div>
        <div>
          <h2 id="reading-guide-title">Read and drag｜閱讀與分類</h2>
          <p>
            桌機可以直接拖曳；平板或鍵盤請先點一張卡，再按目標區的「放入這一區」。
          </p>
        </div>
        <button
          type="button"
          className="compact-button"
          onClick={() => setShowHint((current) => !current)}
          aria-expanded={showHint}
        >
          {showHint ? "收起提示" : "看一點提示"}
        </button>
      </section>

      {showHint && (
        <section className="reading-hint" aria-label="分類提示">
          <span>💡</span>
          <p>
            想想看：山線常和山地、隧道、河谷及內陸相連；海線常和海岸、風、平原及海線城鎮有關；兩線都和車站、鋼軌、列車及旅客有關。
          </p>
        </section>
      )}

      <section className="reading-card-bank" aria-labelledby="card-bank-title">
        <div className="reading-section-heading">
          <div>
            <span className="eyebrow">STEP 1 · READ</span>
            <h2 id="card-bank-title">待分類卡片</h2>
          </div>
          <span>{CARDS.filter((card) => placements[card.id] === null).length} 張還在這裡</span>
        </div>
        <div
          className="reading-card-grid reading-card-grid--bank"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, null)}
          aria-label="待分類卡片區"
        >
          {CARDS.filter((card) => placements[card.id] === null).map(renderCard)}
          {placedCount === CARDS.length && (
            <p className="reading-bank-empty">所有卡片都已放入雙圈圖，請按下檢查答案。</p>
          )}
        </div>
      </section>

      <section className="reading-board" aria-labelledby="board-title">
        <div className="reading-section-heading">
          <div>
            <span className="eyebrow">STEP 2 · SORT</span>
            <h2 id="board-title">把卡片放進雙圈圖</h2>
          </div>
          <span>拖曳或使用按鈕放入</span>
        </div>
        <div className="reading-zones">
          {ZONES.map((zone) => {
            const zoneCards = CARDS.filter((card) => placements[card.id] === zone.id);
            return (
              <section
                key={zone.id}
                className={`reading-zone reading-zone--${zone.id}`}
                aria-labelledby={`${zone.id}-zone-title`}
              >
                <div className="reading-zone-heading">
                  <div>
                    <span className="reading-zone-emoji" aria-hidden="true">{zone.emoji}</span>
                    <h3 id={`${zone.id}-zone-title`}>{zone.title}</h3>
                    <strong>{zone.english}</strong>
                  </div>
                  <span>{zoneCards.length}</span>
                </div>
                <p className="reading-zone-hint">{zone.hint}</p>
                <button
                  type="button"
                  className="zone-action"
                  onClick={() => handleZoneAction(zone.id)}
                  disabled={!selectedCardId}
                >
                  {selectedCardId ? "放入這一區" : "先點選一張卡片"}
                </button>
                <div
                  className="reading-zone-dropzone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, zone.id)}
                  aria-label={`${zone.title}放置區`}
                >
                  {zoneCards.length > 0 ? (
                    zoneCards.map(renderCard)
                  ) : (
                    <span className="reading-drop-placeholder">把卡片放在這裡</span>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="reading-check-panel" aria-labelledby="check-title">
        <div>
          <span className="eyebrow">STEP 3 · CHECK</span>
          <h2 id="check-title">完成後檢查答案</h2>
          <p>放好 12 張卡片後，按下檢查答案；答錯的卡片可以再移動。</p>
        </div>
        <div className="reading-actions">
          <button type="button" className="ghost-button" onClick={resetActivity}>
            清空重來
          </button>
          <button type="button" className="primary-button" onClick={checkAnswers}>
            檢查答案 Check
          </button>
        </div>
        <p className={`reading-feedback ${checked && correctCount === CARDS.length ? "is-success" : ""}`} role="status" aria-live="polite">
          {feedback}
        </p>
      </section>

      <footer className="reading-footer">
        <p>學習重點：比較山線與海線的景觀、位置、車站與地方生活。</p>
        <p>Railways connect places and people.</p>
      </footer>
    </main>
  );
}
