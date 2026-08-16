import type { CSSProperties } from 'react'
import {
  BODY_SHAPES,
  EYE_OPTIONS,
  EXPRESSIONS,
  MAIN_COLORS,
  MONSTER_SIZES,
  PERSONALITIES,
} from '../data/content'
import type { MonsterState } from '../types'
import { getChoice } from '../utils/content'

interface MonsterPreviewProps {
  monster: MonsterState
}

export function MonsterPreview({ monster }: MonsterPreviewProps) {
  const color = getChoice(MAIN_COLORS, monster.colorId)
  const size = getChoice(MONSTER_SIZES, monster.sizeId)
  const shape = getChoice(BODY_SHAPES, monster.bodyShapeId)
  const eyes = getChoice(EYE_OPTIONS, monster.eyesId)
  const expression = getChoice(EXPRESSIONS, monster.expressionId)
  const personality = getChoice(PERSONALITIES, monster.personalityId)
  const previewStyle = {
    '--monster-color': color.swatch ?? '#8d79d8',
  } as CSSProperties

  return (
    <aside className="preview-card" aria-label="Live monster preview / 即時怪獸預覽">
      <div className="preview-card-heading">
        <div>
          <span className="eyebrow">LIVE PREVIEW</span>
          <h2>Your Monster</h2>
          <p>你的怪獸</p>
        </div>
        <span className="preview-sparkle" aria-hidden="true">✦</span>
      </div>
      <div
        className={`monster-preview-art size-${monster.sizeId} shape-${monster.bodyShapeId}`}
        style={previewStyle}
        role="img"
        aria-label={`${size.label} ${shape.label} ${color.label} monster with ${eyes.label}, ${expression.label} expression`}
      >
        <span className="monster-shadow" aria-hidden="true" />
        <span className="monster-horns" aria-hidden="true">{monster.featureIds.includes('horns') ? '♢' : ''}</span>
        <span className="monster-eye" aria-hidden="true">{eyes.emoji ?? '👀'}</span>
        <span className="monster-face" aria-hidden="true">{expression.emoji ?? '🙂'}</span>
        <span className="monster-features" aria-hidden="true">
          {monster.featureIds.slice(0, 3).map((featureId) => (
            <span key={featureId}>{featureId === 'wings' ? '🪽' : featureId === 'antennae' ? '📡' : '✦'}</span>
          ))}
        </span>
      </div>
      <div className="preview-caption">
        <strong>{personality.label} monster</strong>
        <span>{personality.zh}・{expression.zh}・{size.zh}</span>
      </div>
      <p className="preview-tip">Change the choices to help your worry take shape. / 用選項讓你的煩惱變成一隻怪獸。</p>
    </aside>
  )
}
