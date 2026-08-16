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
import type { MonsterState } from '../types'
import { MonsterPreview } from './MonsterPreview'
import { OptionGrid } from './OptionGrid'

interface Step2MonsterProps {
  monster: MonsterState
  onMonsterChange: (changes: Partial<MonsterState>) => void
}

export function Step2Monster({ monster, onMonsterChange }: Step2MonsterProps) {
  return (
    <section className="step-page" aria-labelledby="step-two-title">
      <div className="step-intro">
        <span className="step-kicker">STEP 2 · MY MONSTER</span>
        <h1 id="step-two-title">Build Your Monster!</h1>
        <p>What does your worry look like? / 你的煩惱看起來像什麼？</p>
      </div>

      <div className="builder-layout">
        <div className="monster-options">
          <OptionGrid
            legend="Type / Gender · 類型／性別"
            hint="No gender is the default. / 預設為不設定性別。"
            options={MONSTER_TYPES}
            selectedId={monster.typeId}
            onSelect={(typeId) => onMonsterChange({ typeId })}
            className="compact-grid"
          />
          <OptionGrid
            legend="Size · 大小"
            options={MONSTER_SIZES}
            selectedId={monster.sizeId}
            onSelect={(sizeId) => onMonsterChange({ sizeId })}
            className="compact-grid"
          />
          <OptionGrid
            legend="Body shape · 身體形狀"
            options={BODY_SHAPES}
            selectedId={monster.bodyShapeId}
            onSelect={(bodyShapeId) => onMonsterChange({ bodyShapeId })}
            className="compact-grid"
          />
          <OptionGrid
            legend="Main color · 主要顏色"
            options={MAIN_COLORS}
            selectedId={monster.colorId}
            onSelect={(colorId) => onMonsterChange({ colorId })}
            className="compact-grid color-grid"
            showSwatch
          />
          <OptionGrid
            legend="Eyes · 眼睛"
            options={EYE_OPTIONS}
            selectedId={monster.eyesId}
            onSelect={(eyesId) => onMonsterChange({ eyesId })}
            className="compact-grid"
          />
          <OptionGrid
            legend="Features · 特徵（最多 3 個）"
            hint={`${monster.featureIds.length}/3 selected · 已選 ${monster.featureIds.length}/3`}
            options={FEATURE_OPTIONS}
            selectedIds={monster.featureIds}
            onSelect={(featureId) => {
              const nextFeatures = monster.featureIds.includes(featureId)
                ? monster.featureIds.filter((id) => id !== featureId)
                : [...monster.featureIds, featureId]
              onMonsterChange({ featureIds: nextFeatures })
            }}
            multiple
            max={3}
            className="compact-grid"
          />
          <OptionGrid
            legend="Expression · 表情"
            hint="It starts with your feeling, but you can change it. / 會先跟著你的感受，也可以更改。"
            options={EXPRESSIONS}
            selectedId={monster.expressionId}
            onSelect={(expressionId) => onMonsterChange({ expressionId, expressionManuallyChanged: true })}
            className="compact-grid"
          />
          <OptionGrid
            legend="Action · 動作"
            options={ACTIONS}
            selectedId={monster.actionId}
            onSelect={(actionId) => onMonsterChange({ actionId })}
            className="compact-grid"
          />
          <OptionGrid
            legend="Personality · 個性"
            options={PERSONALITIES}
            selectedId={monster.personalityId}
            onSelect={(personalityId) => onMonsterChange({ personalityId })}
            className="compact-grid"
          />
          <OptionGrid
            legend="Special power · 特殊能力"
            options={SPECIAL_POWERS}
            selectedId={monster.powerId}
            onSelect={(powerId) => onMonsterChange({ powerId })}
            className="compact-grid"
          />
        </div>
        <MonsterPreview monster={monster} />
      </div>
    </section>
  )
}
