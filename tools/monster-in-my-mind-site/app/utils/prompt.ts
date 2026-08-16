import {
  ACTIONS,
  ART_STYLES,
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
import {
  getCategory,
  getChoice,
  getEmotion,
  getPhrase,
  getSelectedBackground,
  getSentencePreview,
} from './content'

function promptText(options: typeof MONSTER_TYPES, id: string): string {
  return getChoice(options, id).prompt ?? getChoice(options, id).label
}

export function buildPrompt(state: FormState): string {
  const sentence = getSentencePreview(state)
  const category = getCategory(state.categoryId)
  const emotion = getEmotion(state.emotionId)
  const phrase = getPhrase(state)
  const style = ART_STYLES.find((item) => item.id === state.styleId) ?? ART_STYLES[0]
  const background = getSelectedBackground(state)
  const monster = state.monster

  const features = monster.featureIds.length
    ? monster.featureIds.map((id) => promptText(FEATURE_OPTIONS, id)).join(', ')
    : 'no extra features'

  return [
    'Create a child-friendly 16:9 educational illustration for an upper elementary SEL activity called "Monster in My Mind."',
    `The student's sentence is: "${sentence.english}"`,
    `The worry topic is ${category?.label ?? 'a personal worry'} (${category?.zh ?? '個人煩惱'}).`,
    `The feeling is ${emotion?.label ?? 'not specified'} (${emotion?.zh ?? '尚未指定'}), connected to ${phrase?.text ?? 'the selected worry'}.`,
    'Create a monster that visually represents this feeling and worry.',
    `Monster design: type ${promptText(MONSTER_TYPES, monster.typeId)}; size ${promptText(MONSTER_SIZES, monster.sizeId)}; body shape ${promptText(BODY_SHAPES, monster.bodyShapeId)}; main color ${promptText(MAIN_COLORS, monster.colorId)}; eyes ${promptText(EYE_OPTIONS, monster.eyesId)}; features ${features}; facial expression ${promptText(EXPRESSIONS, monster.expressionId)}; action ${promptText(ACTIONS, monster.actionId)}; personality ${promptText(PERSONALITIES, monster.personalityId)}; special power ${promptText(SPECIAL_POWERS, monster.powerId)}.`,
    `Scene: ${background.prompt}.`,
    `Art direction: ${style.prompt}.`,
    "The monster should clearly express the student's emotion through its face, pose, body language, colors, and visual details.",
    'Make the monster imaginative, expressive, memorable, and appropriate for children ages 10–12.',
    'Do not make the image violent, disturbing, bloody, or overly frightening.',
    'No text, captions, letters, logos, watermarks, or speech bubbles inside the image.',
    'Aspect ratio: 16:9.',
  ].join('\n')
}
