import { ART_STYLES, BACKGROUNDS } from '../data/content'
import type { FormState } from '../types'
import { getSelectedBackground } from '../utils/content'
import { OptionGrid } from './OptionGrid'

interface Step3ArtStyleProps {
  state: FormState
  onStyleChange: (styleId: string) => void
  onBackgroundChange: (backgroundId: string) => void
}

export function Step3ArtStyle({ state, onStyleChange, onBackgroundChange }: Step3ArtStyleProps) {
  const resolvedBackground = getSelectedBackground(state)
  const selectedStyle = ART_STYLES.find((style) => style.id === state.styleId) ?? ART_STYLES[0]

  return (
    <section className="step-page" aria-labelledby="step-three-title">
      <div className="step-intro">
        <span className="step-kicker">STEP 3 · MY ART STYLE</span>
        <h1 id="step-three-title">Choose Your World</h1>
        <p>Choose a style and scene. / 選畫風和場景。</p>
      </div>

      <div className="section-block art-section">
        <OptionGrid
          legend="Art style · 繪圖風格"
          hint="Uses a general art style. / 使用通用畫風。"
          options={ART_STYLES}
          selectedId={state.styleId}
          onSelect={onStyleChange}
          className="style-grid"
        />
        <div className="selection-explainer">
          <span aria-hidden="true">🎨</span>
          <div>
            <strong>{selectedStyle.label} · {selectedStyle.zh}</strong>
            <p>{selectedStyle.prompt}</p>
          </div>
        </div>
      </div>

      <div className="section-block art-section">
        <OptionGrid
          legend="Background · 背景場景"
          hint="Auto picks a scene. / 自動選場景。"
          options={BACKGROUNDS}
          selectedId={state.backgroundId}
          onSelect={onBackgroundChange}
          className="background-grid"
        />
        <div className="auto-result" aria-live="polite">
          <span className="auto-result-icon" aria-hidden="true">✨</span>
          <div>
            <strong>{state.backgroundId === 'auto' ? 'Auto picked' : 'Scene ready'} · {resolvedBackground.label}</strong>
            <p>{resolvedBackground.zh} · {resolvedBackground.prompt}</p>
          </div>
        </div>
      </div>

      <div className="ratio-callout">
        <span className="ratio-icon" aria-hidden="true">▭</span>
        <div>
          <strong>Always 16:9</strong>
          <span>固定 16:9 圖片比例。</span>
        </div>
      </div>
    </section>
  )
}
