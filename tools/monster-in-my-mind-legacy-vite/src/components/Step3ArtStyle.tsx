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
        <p>Pick a visual style and a place for your monster. / 選擇畫風和場景。</p>
      </div>

      <div className="section-block art-section">
        <OptionGrid
          legend="Art style · 繪圖風格"
          hint="The prompt uses a general description, not a living artist's name. / 提示詞使用通用風格描述，不使用在世藝術家姓名。"
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
          hint="Auto chooses a simple local match from your topic and phrase. / 自動會依照煩惱面向與句子做本地配對。"
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
          <strong>Fixed 16:9 image prompt</strong>
          <span>固定 16:9 圖像提示詞，適合投影、簡報與數位作品。</span>
        </div>
      </div>
    </section>
  )
}
