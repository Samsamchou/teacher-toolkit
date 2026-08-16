import type { FormState } from '../types'

export function createInitialState(): FormState {
  return {
    categoryId: '',
    emotionId: '',
    phraseId: '',
    monster: {
      typeId: 'no-gender',
      sizeId: 'medium',
      bodyShapeId: 'round',
      colorId: 'purple',
      eyesId: 'two-big',
      featureIds: [],
      expressionId: 'worried',
      expressionManuallyChanged: false,
      actionId: 'thinking',
      personalityId: 'friendly',
      powerId: 'none',
    },
    styleId: '3d-animation',
    backgroundId: 'auto',
  }
}

export function isStepOneComplete(state: FormState): boolean {
  return Boolean(state.categoryId && state.emotionId && state.phraseId)
}
