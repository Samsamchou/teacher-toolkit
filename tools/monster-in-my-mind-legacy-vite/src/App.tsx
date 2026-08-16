import { useEffect, useState } from 'react'
import type { FormState, Step, WorryCategoryId } from './types'
import { isStepOneComplete, createInitialState } from './utils/state'
import { Step1Worry } from './components/Step1Worry'
import { Step2Monster } from './components/Step2Monster'
import { Step3ArtStyle } from './components/Step3ArtStyle'
import { Step4Prompt } from './components/Step4Prompt'
import { StepProgress } from './components/StepProgress'

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main id="main-content" className="welcome-page">
      <section className="hero-panel" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <span className="hero-kicker">ENGLISH × SEL × ART × AI</span>
          <h1 id="welcome-title">Monster <span>in My</span> Mind</h1>
          <p className="hero-question">What&apos;s bothering you?</p>
          <p className="hero-lead">Everyone worries about something sometimes.<br /><strong>Turn your worry into a monster!</strong></p>
          <p className="hero-zh">每個人有時候都會煩惱。<br />把你的煩惱變成一隻怪獸吧！</p>
          <button type="button" className="start-button" onClick={onStart}>
            <span>START</span>
            <span className="start-zh">開始創作</span>
            <span className="start-arrow" aria-hidden="true">→</span>
          </button>
          <p className="no-login-note">No name. No score. Just your ideas. / 不用姓名、不評分，只分享你的想法。</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-monster">
            <span className="hero-horn horn-left">✦</span>
            <span className="hero-horn horn-right">✦</span>
            <span className="hero-eye">◕ ◕</span>
            <span className="hero-mouth">⌣</span>
            <span className="hero-arm arm-left">⌁</span>
            <span className="hero-arm arm-right">⌁</span>
            <span className="hero-feet">• •</span>
          </div>
          <span className="art-spark spark-one">✦</span>
          <span className="art-spark spark-two">✧</span>
          <span className="art-spark spark-three">✦</span>
          <div className="thought-bubble">
            <span>💭</span>
            <small>My worry<br />我的煩惱</small>
          </div>
        </div>
      </section>

      <section className="concept-strip" aria-label="Activity ideas / 活動概念">
        <div className="concept-card concept-feel">
          <span className="concept-icon" aria-hidden="true">💛</span>
          <div><strong>Feel it</strong><small>感受它</small><p>Name your feeling.</p></div>
        </div>
        <div className="concept-card concept-say">
          <span className="concept-icon" aria-hidden="true">💬</span>
          <div><strong>Say it</strong><small>說出來</small><p>Build an English sentence.</p></div>
        </div>
        <div className="concept-card concept-create">
          <span className="concept-icon" aria-hidden="true">🎨</span>
          <div><strong>Create it</strong><small>創作它</small><p>Design your own monster.</p></div>
        </div>
      </section>

      <div className="privacy-note welcome-privacy">
        <span aria-hidden="true">🔒</span>
        <span>Your feelings are yours. You can create privately. / 你的感受屬於你自己，你可以安心創作。</span>
      </div>
    </main>
  )
}

function WizardActions({ step, canNext, onBack, onNext }: {
  step: Step
  canNext: boolean
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="wizard-actions">
      <button type="button" className="secondary-button" onClick={onBack}>
        {step === 1 ? '← Home / 首頁' : '← Back / 上一步'}
      </button>
      {step < 4 ? (
        <button type="button" className="primary-button next-button" disabled={!canNext} onClick={onNext}>
          Next / 下一步 <span aria-hidden="true">→</span>
        </button>
      ) : null}
    </div>
  )
}

export default function App() {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [state, setState] = useState<FormState>(() => createInitialState())

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [started, step])

  function startActivity() {
    setStarted(true)
    setStep(1)
  }

  function handleCategoryChange(categoryId: WorryCategoryId) {
    setState((previous) => ({ ...previous, categoryId, phraseId: '' }))
  }

  function handleEmotionChange(emotionId: string) {
    setState((previous) => ({
      ...previous,
      emotionId,
      monster: previous.monster.expressionManuallyChanged
        ? previous.monster
        : { ...previous.monster, expressionId: emotionId || 'worried' },
    }))
  }

  function updateMonster(changes: Partial<FormState['monster']>) {
    setState((previous) => ({ ...previous, monster: { ...previous.monster, ...changes } }))
  }

  function goNext() {
    if (step === 1 && !isStepOneComplete(state)) return
    if (step < 4) setStep((step + 1) as Step)
  }

  function goBack() {
    if (step === 1) {
      setStarted(false)
      return
    }
    setStep((step - 1) as Step)
  }

  function handleProgressClick(nextStep: Step) {
    if (nextStep <= step) setStep(nextStep)
  }

  function startAgain() {
    setState(createInitialState())
    setStep(1)
    setStarted(true)
  }

  if (!started) {
    return (
      <div className="app-shell">
        <header className="site-header">
          <div className="brand-lockup"><span className="brand-mark" aria-hidden="true">👾</span><span>Monster in My Mind</span></div>
          <span className="header-pill">For upper elementary · 國小高年級</span>
        </header>
        <WelcomeScreen onStart={startActivity} />
        <footer className="site-footer">A gentle English × SEL creation space · 一個溫柔的英語與情緒創作空間</footer>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button type="button" className="brand-lockup brand-button" onClick={() => setStarted(false)} aria-label="Return to home / 回到首頁">
          <span className="brand-mark" aria-hidden="true">👾</span><span>Monster in My Mind</span>
        </button>
        <span className="header-pill">English × SEL × Art × AI</span>
      </header>
      <StepProgress currentStep={step} onStepClick={handleProgressClick} />
      <main id="main-content" className="wizard-page">
        {step === 1 ? (
          <Step1Worry
            state={state}
            onCategoryChange={handleCategoryChange}
            onEmotionChange={handleEmotionChange}
            onPhraseChange={(phraseId) => setState((previous) => ({ ...previous, phraseId }))}
          />
        ) : null}
        {step === 2 ? <Step2Monster monster={state.monster} onMonsterChange={updateMonster} /> : null}
        {step === 3 ? (
          <Step3ArtStyle
            state={state}
            onStyleChange={(styleId) => setState((previous) => ({ ...previous, styleId }))}
            onBackgroundChange={(backgroundId) => setState((previous) => ({ ...previous, backgroundId }))}
          />
        ) : null}
        {step === 4 ? (
          <Step4Prompt
            state={state}
            onBackToEdit={() => setStep(3)}
            onStartAgain={startAgain}
            onPrint={() => window.print()}
          />
        ) : null}
        {step < 4 ? (
          <WizardActions step={step} canNext={step === 1 ? isStepOneComplete(state) : true} onBack={goBack} onNext={goNext} />
        ) : null}
      </main>
      <footer className="site-footer">No login · No personal data · No image API · 不登入、不儲存個資、不串接圖像 API</footer>
    </div>
  )
}
