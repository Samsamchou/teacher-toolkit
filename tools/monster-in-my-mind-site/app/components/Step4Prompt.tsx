import { useState } from 'react'
import {
  ACTIONS,
  BODY_SHAPES,
  EYE_OPTIONS,
  EXPRESSIONS,
  FEATURE_OPTIONS,
  MAIN_COLORS,
  MONSTER_SIZES,
  MONSTER_TYPES,
  PERSONALITIES,
  SPECIAL_POWERS,
} from '../data/content'
import type { FormState } from '../types'
import { copyText } from '../utils/clipboard'
import {
  getCategory,
  getChoice,
  getEmotion,
  getPhrase,
  getSelectedBackground,
  getStyle,
  getSentencePreview,
} from '../utils/content'
import { buildPrompt } from '../utils/prompt'

interface Step4PromptProps {
  state: FormState
  onBackToEdit: () => void
  onStartAgain: () => void
  onPrint: () => void
}

interface ProfileRowProps {
  label: string
  zh: string
  value: string
}

function ProfileRow({ label, zh, value }: ProfileRowProps) {
  return (
    <div className="profile-row">
      <dt>{label}<small>{zh}</small></dt>
      <dd>{value}</dd>
    </div>
  )
}

export function Step4Prompt({ state, onBackToEdit, onStartAgain, onPrint }: Step4PromptProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const sentence = getSentencePreview(state)
  const category = getCategory(state.categoryId)
  const phrase = getPhrase(state)
  const emotion = getEmotion(state.emotionId)
  const background = getSelectedBackground(state)
  const style = getStyle(state.styleId)
  const prompt = buildPrompt(state)
  const monster = state.monster

  const featureText = monster.featureIds.length
    ? monster.featureIds.map((id) => getChoice(FEATURE_OPTIONS, id).label).join(', ')
    : 'none / 無'

  async function handleCopy() {
    const copied = await copyText(prompt)
    setCopyStatus(copied ? 'copied' : 'failed')
    window.setTimeout(() => setCopyStatus('idle'), 2400)
  }

  return (
    <section className="step-page result-page" aria-labelledby="step-four-title">
      <div className="step-intro result-intro">
        <span className="step-kicker">STEP 4 · MY AI PROMPT</span>
        <h1 id="step-four-title">Your Monster Profile</h1>
        <p>Meet your worry monster! / 看看你的煩惱怪獸！</p>
      </div>

      <div className="result-grid">
        <section className="summary-card" aria-labelledby="summary-title">
          <div className="card-title-row">
            <div>
              <span className="eyebrow">MY CREATION</span>
              <h2 id="summary-title">A quick look</h2>
              <p>成果摘要</p>
            </div>
            <span className="result-star" aria-hidden="true">✦</span>
          </div>

          <div className="sentence-result">
            <span className="mini-label">MY SENTENCE · 我的句子</span>
            <p>{sentence.english}</p>
            <small>{sentence.chinese}</small>
          </div>

          <dl className="profile-list">
            <ProfileRow label="My Feeling" zh="我的感受" value={`${emotion?.label ?? '—'} · ${emotion?.zh ?? '—'}`} />
            <ProfileRow label="My Worry" zh="我的煩惱" value={`${category?.label ?? '—'} · ${phrase?.text ?? '—'}`} />
            <ProfileRow label="Type" zh="類型／性別" value={`${getChoice(MONSTER_TYPES, monster.typeId).label} · ${getChoice(MONSTER_TYPES, monster.typeId).zh}`} />
            <ProfileRow label="Size & Shape" zh="大小與形狀" value={`${getChoice(MONSTER_SIZES, monster.sizeId).label}, ${getChoice(BODY_SHAPES, monster.bodyShapeId).label}`} />
            <ProfileRow label="Color & Eyes" zh="顏色與眼睛" value={`${getChoice(MAIN_COLORS, monster.colorId).label}, ${getChoice(EYE_OPTIONS, monster.eyesId).label}`} />
            <ProfileRow label="Features" zh="特徵" value={featureText} />
            <ProfileRow label="Expression & Action" zh="表情與動作" value={`${getChoice(EXPRESSIONS, monster.expressionId).label}, ${getChoice(ACTIONS, monster.actionId).label}`} />
            <ProfileRow label="Personality & Power" zh="個性與能力" value={`${getChoice(PERSONALITIES, monster.personalityId).label}, ${getChoice(SPECIAL_POWERS, monster.powerId).label}`} />
            <ProfileRow label="Art Style" zh="畫風" value={`${style?.label ?? '—'} · ${style?.zh ?? '—'}`} />
            <ProfileRow label="Background" zh="背景" value={`${state.backgroundId === 'auto' ? 'Auto → ' : ''}${background.label} · ${background.zh}`} />
          </dl>
        </section>

        <section className="prompt-card" aria-labelledby="prompt-title">
          <div className="card-title-row">
            <div>
              <span className="eyebrow">READY TO USE</span>
              <h2 id="prompt-title">Your AI Image Prompt</h2>
              <p>你的 AI 圖像提示詞</p>
            </div>
            <span className="ratio-badge">16:9</span>
          </div>
          <p className="prompt-help">Copy this into an image tool. / 複製到圖像工具。</p>
          <label className="sr-only" htmlFor="generated-prompt">Generated AI image prompt</label>
          <textarea id="generated-prompt" className="prompt-textarea" readOnly value={prompt} spellCheck={false} />
          <div className="prompt-actions">
            <button type="button" className="primary-button copy-button" onClick={handleCopy}>
              <span aria-hidden="true">{copyStatus === 'copied' ? '✓' : '⧉'}</span>
              {copyStatus === 'copied' ? 'Copied! / 已複製' : 'Copy Prompt / 複製提示詞'}
            </button>
            {copyStatus === 'failed' ? <span className="copy-status" role="status">Select the text and copy. / 選取文字再複製。</span> : null}
          </div>
        </section>
      </div>

      <div className="privacy-note result-privacy">
        <span aria-hidden="true">🔒</span>
        <div>
          <strong>Your monster can stay private.</strong>
          <span>Share only if you want. / 想分享再分享。</span>
        </div>
      </div>

      <div className="result-actions">
        <button type="button" className="secondary-button" onClick={onBackToEdit}>← Back to Edit / 回去修改</button>
        <button type="button" className="ghost-button" onClick={onPrint}>🖨 Print / 列印</button>
        <button type="button" className="secondary-button warm-button" onClick={onStartAgain}>↻ Start Again / 重新開始</button>
      </div>
    </section>
  )
}
