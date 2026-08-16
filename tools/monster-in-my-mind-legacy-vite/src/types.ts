export type Step = 1 | 2 | 3 | 4

export type WorryCategoryId =
  | 'schoolwork'
  | 'friends'
  | 'looks'
  | 'comparing'
  | 'family'
  | 'sleep'
  | 'future'

export interface ChoiceOption {
  id: string
  label: string
  zh: string
  emoji?: string
  prompt?: string
  swatch?: string
}

export interface PhraseOption {
  id: string
  text: string
  zh: string
}

export interface WorryCategory extends ChoiceOption {
  id: WorryCategoryId
  phrases: PhraseOption[]
}

export interface EmotionOption extends ChoiceOption {
  zhSentence: string
}

export interface StyleOption extends ChoiceOption {
  prompt: string
}

export interface BackgroundOption extends ChoiceOption {
  prompt: string
}

export interface MonsterState {
  typeId: string
  sizeId: string
  bodyShapeId: string
  colorId: string
  eyesId: string
  featureIds: string[]
  expressionId: string
  expressionManuallyChanged: boolean
  actionId: string
  personalityId: string
  powerId: string
}

export interface FormState {
  categoryId: WorryCategoryId | ''
  emotionId: string
  phraseId: string
  monster: MonsterState
  styleId: string
  backgroundId: string
}

export interface SentencePreview {
  english: string
  chinese: string
  isComplete: boolean
}
