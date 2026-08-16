import type { ChoiceOption } from '../types'

interface OptionGridProps {
  legend: string
  hint?: string
  options: ChoiceOption[]
  selectedId?: string
  selectedIds?: string[]
  onSelect: (id: string) => void
  multiple?: boolean
  max?: number
  className?: string
  showSwatch?: boolean
}

export function OptionGrid({
  legend,
  hint,
  options,
  selectedId,
  selectedIds = [],
  onSelect,
  multiple = false,
  max,
  className = '',
  showSwatch = false,
}: OptionGridProps) {
  return (
    <fieldset className={`selection-group ${className}`}>
      <legend>{legend}</legend>
      {hint ? <p className="field-hint">{hint}</p> : null}
      <div className="choice-grid">
        {options.map((option) => {
          const isSelected = multiple ? selectedIds.includes(option.id) : selectedId === option.id
          const isAtLimit = Boolean(max && selectedIds.length >= max && !isSelected)
          return (
            <button
              className={`choice-card ${isSelected ? 'is-selected' : ''} ${showSwatch ? 'has-swatch' : ''}`}
              disabled={isAtLimit}
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.id)}
            >
              {showSwatch ? (
                <span
                  className="color-swatch"
                  aria-hidden="true"
                  style={{ background: option.swatch ?? '#8d79d8' }}
                />
              ) : (
                <span className="choice-emoji" aria-hidden="true">
                  {option.emoji ?? '•'}
                </span>
              )}
              <span className="choice-copy">
                <span className="choice-label">{option.label}</span>
                <span className="choice-zh">{option.zh}</span>
              </span>
              <span className="choice-check" aria-hidden="true">
                {isSelected ? '✓' : ''}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
