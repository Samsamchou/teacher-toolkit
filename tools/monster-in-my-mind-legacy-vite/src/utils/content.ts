import {
  ACTIONS,
  ART_STYLES,
  BACKGROUNDS,
  BODY_SHAPES,
  EMOTIONS,
  EYE_OPTIONS,
  EXPRESSIONS,
  FEATURE_OPTIONS,
  MAIN_COLORS,
  MONSTER_SIZES,
  MONSTER_TYPES,
  PERSONALITIES,
  SPECIAL_POWERS,
  WORRY_CATEGORIES,
} from '../data/content'
import type {
  BackgroundOption,
  ChoiceOption,
  EmotionOption,
  FormState,
  PhraseOption,
  SentencePreview,
  StyleOption,
  WorryCategory,
} from '../types'

export function getCategory(categoryId: FormState['categoryId']): WorryCategory | undefined {
  return WORRY_CATEGORIES.find((category) => category.id === categoryId)
}

export function getPhrase(state: FormState): PhraseOption | undefined {
  return getCategory(state.categoryId)?.phrases.find((phrase) => phrase.id === state.phraseId)
}

export function getEmotion(emotionId: string): EmotionOption | undefined {
  return EMOTIONS.find((emotion) => emotion.id === emotionId)
}

export function getStyle(styleId: string): StyleOption | undefined {
  return ART_STYLES.find((style) => style.id === styleId)
}

export function getChoice(options: ChoiceOption[], id: string): ChoiceOption {
  return (
    options.find((option) => option.id === id) ?? {
      id: '',
      label: 'not selected',
      zh: '尚未選擇',
      prompt: 'not selected',
    }
  )
}

export function getMonsterChoiceLists() {
  return {
    type: MONSTER_TYPES,
    size: MONSTER_SIZES,
    bodyShape: BODY_SHAPES,
    color: MAIN_COLORS,
    eyes: EYE_OPTIONS,
    features: FEATURE_OPTIONS,
    expression: EXPRESSIONS,
    action: ACTIONS,
    personality: PERSONALITIES,
    power: SPECIAL_POWERS,
  }
}

export function getSentencePreview(state: FormState): SentencePreview {
  const emotion = getEmotion(state.emotionId)
  const phrase = getPhrase(state)

  const englishEmotion = emotion?.label ?? '______'
  const englishPhrase = phrase?.text ?? '______'
  const chinese = emotion && phrase ? `我覺得${emotion.zhSentence}，當我${phrase.zh}。` : '請完成上方選項，看看你的句子。'

  return {
    english: `I feel ${englishEmotion} when I ${englishPhrase}.`,
    chinese,
    isComplete: Boolean(state.categoryId && state.emotionId && state.phraseId),
  }
}

export function resolveBackground(
  backgroundId: string,
  categoryId: FormState['categoryId'],
  phraseText: string,
): BackgroundOption {
  const selected = BACKGROUNDS.find((background) => background.id === backgroundId)
  if (selected && selected.id !== 'auto') return selected

  const phrase = phraseText.toLowerCase()
  let autoId: string = 'simple'

  if (categoryId === 'sleep' || /sleep|bed|tomorrow/.test(phrase)) {
    autoId = 'bedroom'
  } else if (categoryId === 'schoolwork' || /test|score|homework|lesson|answer/.test(phrase)) {
    autoId = 'classroom'
  } else if (categoryId === 'friends' || /friend|play|left out/.test(phrase)) {
    autoId = 'playground'
  } else if (categoryId === 'future' || /future|dream|junior high|choice/.test(phrase)) {
    autoId = 'dream-world'
  } else if (categoryId === 'comparing' || categoryId === 'looks') {
    autoId = 'simple'
  }

  return BACKGROUNDS.find((background) => background.id === autoId) ?? BACKGROUNDS[0]
}

export function getSelectedBackground(state: FormState): BackgroundOption {
  const phrase = getPhrase(state)
  return resolveBackground(state.backgroundId, state.categoryId, phrase?.text ?? '')
}
