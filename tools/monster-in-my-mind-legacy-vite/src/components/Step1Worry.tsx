import { EMOTIONS, WORRY_CATEGORIES } from '../data/content'
import type { FormState, WorryCategoryId } from '../types'
import { getSentencePreview } from '../utils/content'

interface Step1WorryProps {
  state: FormState
  onCategoryChange: (categoryId: WorryCategoryId) => void
  onEmotionChange: (emotionId: string) => void
  onPhraseChange: (phraseId: string) => void
}

export function Step1Worry({ state, onCategoryChange, onEmotionChange, onPhraseChange }: Step1WorryProps) {
  const selectedCategory = WORRY_CATEGORIES.find((category) => category.id === state.categoryId)
  const sentence = getSentencePreview(state)

  return (
    <section className="step-page" aria-labelledby="step-one-title">
      <div className="step-intro">
        <span className="step-kicker">STEP 1 · MY WORRY</span>
        <h1 id="step-one-title">What&apos;s bothering you?</h1>
        <p>先選一個煩惱面向，再用英文說出你的感受。</p>
        <div className="privacy-note compact-note">
          <span aria-hidden="true">🔒</span>
          <span>Your feelings are yours. / 你的感受屬於你自己。</span>
        </div>
      </div>

      <div className="section-block">
        <div className="section-heading">
          <div>
            <span className="section-number">01</span>
            <h2>Choose a worry topic.</h2>
            <p>選一個煩惱面向</p>
          </div>
          <span className="required-tag">Choose 1 / 選 1 個</span>
        </div>
        <div className="category-grid">
          {WORRY_CATEGORIES.map((category) => {
            const isSelected = state.categoryId === category.id
            return (
              <button
                className={`category-card ${isSelected ? 'is-selected' : ''}`}
                type="button"
                key={category.id}
                aria-pressed={isSelected}
                onClick={() => onCategoryChange(category.id)}
              >
                <span className="category-icon" aria-hidden="true">{category.emoji}</span>
                <span className="category-copy">
                  <strong>{category.label}</strong>
                  <small>{category.zh}</small>
                </span>
                <span className="category-check" aria-hidden="true">{isSelected ? '✓' : '＋'}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="section-block sentence-builder">
        <div className="section-heading">
          <div>
            <span className="section-number">02</span>
            <h2>Build your sentence.</h2>
            <p>完成句子：I feel ... when I ...</p>
          </div>
          <span className="required-tag">Choose 2 / 選 2 個</span>
        </div>

        <div className="sentence-controls">
          <label className="select-field" htmlFor="emotion-select">
            <span className="select-label">I feel ... <small>我的感受</small></span>
            <select
              id="emotion-select"
              value={state.emotionId}
              onChange={(event) => onEmotionChange(event.target.value)}
            >
              <option value="">Choose an emotion / 選擇情緒</option>
              {EMOTIONS.map((emotion) => (
                <option value={emotion.id} key={emotion.id}>
                  {emotion.emoji} {emotion.label} · {emotion.zh}
                </option>
              ))}
            </select>
          </label>

          <div className="phrase-field">
            <div className="select-label">when I ... <small>當我發生這件事</small></div>
            {selectedCategory ? (
              <div className="phrase-list" role="group" aria-label="Choose a worry phrase / 選擇煩惱句">
                {selectedCategory.phrases.map((phrase) => {
                  const isSelected = phrase.id === state.phraseId
                  return (
                    <button
                      type="button"
                      className={`phrase-card ${isSelected ? 'is-selected' : ''}`}
                      aria-pressed={isSelected}
                      key={phrase.id}
                      onClick={() => onPhraseChange(phrase.id)}
                    >
                      <span className="phrase-check" aria-hidden="true">{isSelected ? '✓' : '○'}</span>
                      <span>
                        <strong>{phrase.text}</strong>
                        <small>{phrase.zh}</small>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="empty-choice">
                <span aria-hidden="true">👈</span>
                <span>Choose a topic first. / 請先選擇煩惱面向。</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`sentence-preview ${sentence.isComplete ? 'is-complete' : ''}`} aria-live="polite">
        <div className="preview-label">
          <span className="preview-label-icon" aria-hidden="true">💬</span>
          <span>Sentence Preview / 句子預覽</span>
          {sentence.isComplete ? <span className="ready-badge">Ready! / 完成</span> : null}
        </div>
        <p className="sentence-english">{sentence.english}</p>
        <p className="sentence-chinese">{sentence.chinese}</p>
      </div>
    </section>
  )
}
