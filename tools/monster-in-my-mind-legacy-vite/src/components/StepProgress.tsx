import type { Step } from '../types'

const STEPS: Array<{ number: Step; label: string; zh: string }> = [
  { number: 1, label: 'My Worry', zh: '我的煩惱' },
  { number: 2, label: 'My Monster', zh: '我的怪獸' },
  { number: 3, label: 'My Art Style', zh: '我的畫風' },
  { number: 4, label: 'My Prompt', zh: '我的提示詞' },
]

interface StepProgressProps {
  currentStep: Step
  onStepClick: (step: Step) => void
}

export function StepProgress({ currentStep, onStepClick }: StepProgressProps) {
  return (
    <nav className="progress-shell" aria-label="Activity progress / 活動進度">
      <div className="progress-inner">
        <div className="progress-heading">
          <span className="eyebrow">YOUR CREATIVE JOURNEY</span>
          <span className="progress-count">Step {currentStep} of 4</span>
        </div>
        <ol className="progress-list">
          {STEPS.map((step) => {
            const isCurrent = currentStep === step.number
            const isComplete = currentStep > step.number
            const canNavigate = isComplete || isCurrent
            return (
              <li className={`progress-item ${isCurrent ? 'is-current' : ''} ${isComplete ? 'is-complete' : ''}`} key={step.number}>
                <button
                  type="button"
                  className="progress-button"
                  disabled={!canNavigate}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => onStepClick(step.number)}
                >
                  <span className="progress-number" aria-hidden="true">
                    {isComplete ? '✓' : step.number}
                  </span>
                  <span className="progress-label">
                    <strong>{step.label}</strong>
                    <small>{step.zh}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
