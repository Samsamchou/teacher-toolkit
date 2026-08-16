import type {
  BackgroundOption,
  ChoiceOption,
  EmotionOption,
  StyleOption,
  WorryCategory,
} from '../types'

export const EMOTIONS: EmotionOption[] = [
  { id: 'worried', label: 'worried', zh: '擔心的', zhSentence: '很擔心', emoji: '😟' },
  { id: 'sad', label: 'sad', zh: '難過的', zhSentence: '很難過', emoji: '😢' },
  { id: 'angry', label: 'angry', zh: '生氣的', zhSentence: '很生氣', emoji: '😠' },
  { id: 'nervous', label: 'nervous', zh: '緊張的', zhSentence: '很緊張', emoji: '😬' },
  { id: 'scared', label: 'scared', zh: '害怕的', zhSentence: '很害怕', emoji: '😨' },
  { id: 'tired', label: 'tired', zh: '疲累的', zhSentence: '很疲累', emoji: '😴' },
  { id: 'lonely', label: 'lonely', zh: '孤單的', zhSentence: '很孤單', emoji: '🥺' },
  { id: 'shy', label: 'shy', zh: '害羞的', zhSentence: '很害羞', emoji: '🫣' },
  { id: 'upset', label: 'upset', zh: '心情不好的', zhSentence: '心情不好', emoji: '😣' },
  { id: 'embarrassed', label: 'embarrassed', zh: '尷尬的', zhSentence: '很尷尬', emoji: '😳' },
]

export const WORRY_CATEGORIES: WorryCategory[] = [
  {
    id: 'schoolwork',
    label: 'Schoolwork & Tests',
    zh: '課業與考試',
    emoji: '📚',
    phrases: [
      { id: 'big-test', text: 'have a big test', zh: '有一場大考試' },
      { id: 'low-score', text: 'get a low score', zh: '考得很低分' },
      { id: 'dont-know-answer', text: "don't know the answer", zh: '不知道答案' },
      { id: 'too-much-homework', text: 'have too much homework', zh: '作業太多' },
      { id: 'dont-understand-lessons', text: "don't understand my lessons", zh: '不懂課堂內容' },
    ],
  },
  {
    id: 'friends',
    label: 'Friends',
    zh: '朋友與同學',
    emoji: '🧑‍🤝‍🧑',
    phrases: [
      { id: 'no-one-to-play', text: 'have no one to play with', zh: '沒有朋友可以一起玩' },
      { id: 'argue-with-friend', text: 'argue with my friend', zh: '和朋友吵架' },
      { id: 'feel-left-out', text: 'feel left out', zh: '覺得被排擠' },
      { id: 'cant-make-friends', text: "can't make new friends", zh: '交不到新朋友' },
      {
        id: 'friends-dont-listen',
        text: "think my friends don't listen to me",
        zh: '覺得朋友不聽我說話',
      },
    ],
  },
  {
    id: 'looks',
    label: 'Looks & Body',
    zh: '外表與身體',
    emoji: '🪞',
    phrases: [
      { id: 'too-short', text: 'think I am too short', zh: '覺得自己太矮' },
      { id: 'dont-like-looks', text: "don't like my looks", zh: '不喜歡自己的外表' },
      { id: 'dont-like-photos', text: "don't like my photos", zh: '不喜歡自己的照片' },
      { id: 'people-talk-looks', text: 'hear people talk about my looks', zh: '聽到別人談論我的外表' },
      { id: 'compare-looks', text: 'compare my looks with others', zh: '把自己的外表和別人比較' },
    ],
  },
  {
    id: 'comparing',
    label: 'Comparing with Others',
    zh: '和別人比較',
    emoji: '🏆',
    phrases: [
      { id: 'compare-scores', text: 'compare my scores with others', zh: '把自己的分數和別人比較' },
      { id: 'others-run-faster', text: 'see others run faster than me', zh: '看到別人跑得比我快' },
      { id: 'others-better-sports', text: 'see others do better at sports', zh: '看到別人的運動表現比較好' },
      { id: 'friends-more-things', text: 'see my friends have more things', zh: '看到朋友擁有比較多東西' },
      {
        id: 'others-do-better',
        text: 'think others can do things better than me',
        zh: '覺得別人做事情比我好',
      },
    ],
  },
  {
    id: 'family',
    label: 'Family',
    zh: '家庭',
    emoji: '🏠',
    phrases: [
      { id: 'parents-busy', text: 'think my parents are too busy', zh: '覺得爸爸媽媽太忙' },
      { id: 'little-family-time', text: 'have little time with my family', zh: '和家人相處的時間很少' },
      { id: 'make-parents-angry', text: 'make my parents angry', zh: '讓爸爸媽媽生氣' },
      { id: 'compared-with-others', text: 'get compared with others', zh: '被拿來和別人比較' },
      { id: 'family-problem', text: 'think my family has a problem', zh: '覺得我的家庭有問題' },
    ],
  },
  {
    id: 'sleep',
    label: 'Sleep & Daily Life',
    zh: '睡眠與生活',
    emoji: '🌙',
    phrases: [
      { id: 'dont-sleep-well', text: "don't sleep well", zh: '睡不好' },
      { id: 'bed-too-late', text: 'go to bed too late', zh: '太晚睡覺' },
      { id: 'cant-sleep', text: "can't sleep", zh: '睡不著' },
      { id: 'too-many-things', text: 'have too many things to do', zh: '有太多事情要做' },
      { id: 'think-about-tomorrow', text: 'think too much about tomorrow', zh: '太常想著明天的事' },
    ],
  },
  {
    id: 'future',
    label: 'Future',
    zh: '未來',
    emoji: '🌈',
    phrases: [
      { id: 'junior-high', text: 'think about junior high school', zh: '想到國中' },
      { id: 'my-future', text: 'think about my future', zh: '想到自己的未來' },
      { id: 'dont-know-job', text: "don't know what I want to be", zh: '不知道未來想做什麼' },
      { id: 'big-choice', text: 'have to make a big choice', zh: '必須做一個重要的選擇' },
      { id: 'cant-reach-dream', text: "think I can't reach my dream", zh: '覺得自己無法實現夢想' },
    ],
  },
]

export const MONSTER_TYPES: ChoiceOption[] = [
  { id: 'no-gender', label: 'no gender', zh: '不設定性別', emoji: '✨', prompt: 'a gender-neutral monster' },
  { id: 'boy', label: 'boy monster', zh: '男孩怪獸', emoji: '🧢', prompt: 'a boy monster' },
  { id: 'girl', label: 'girl monster', zh: '女孩怪獸', emoji: '🎀', prompt: 'a girl monster' },
]

export const MONSTER_SIZES: ChoiceOption[] = [
  { id: 'tiny', label: 'tiny', zh: '迷你', emoji: '▫️', prompt: 'tiny in size' },
  { id: 'small', label: 'small', zh: '小', emoji: '◽', prompt: 'small in size' },
  { id: 'medium', label: 'medium', zh: '中等', emoji: '◻️', prompt: 'medium in size' },
  { id: 'big', label: 'big', zh: '大', emoji: '⬜', prompt: 'big in size' },
  { id: 'giant', label: 'giant', zh: '巨大', emoji: '⬛', prompt: 'giant in size' },
]

export const BODY_SHAPES: ChoiceOption[] = [
  { id: 'round', label: 'round', zh: '圓圓的', emoji: '🔵', prompt: 'round-bodied' },
  { id: 'tall', label: 'tall', zh: '高高的', emoji: '↕️', prompt: 'tall and upright' },
  { id: 'short', label: 'short', zh: '矮矮的', emoji: '↔️', prompt: 'short and compact' },
  { id: 'fluffy', label: 'fluffy', zh: '毛茸茸的', emoji: '☁️', prompt: 'fluffy and soft' },
  { id: 'skinny', label: 'skinny', zh: '瘦長的', emoji: '〰️', prompt: 'skinny and slim' },
  { id: 'chubby', label: 'chubby', zh: '胖嘟嘟的', emoji: '🫧', prompt: 'chubby and round' },
  { id: 'spiky', label: 'spiky', zh: '尖刺的', emoji: '✳️', prompt: 'covered with soft-looking spikes' },
  { id: 'blob', label: 'blob-shaped', zh: '果凍團狀', emoji: '🫠', prompt: 'blob-shaped and squishy' },
]

export const MAIN_COLORS: ChoiceOption[] = [
  { id: 'red', label: 'red', zh: '紅色', swatch: '#f06a6a', prompt: 'red' },
  { id: 'orange', label: 'orange', zh: '橘色', swatch: '#f7a54a', prompt: 'orange' },
  { id: 'yellow', label: 'yellow', zh: '黃色', swatch: '#f5d35e', prompt: 'yellow' },
  { id: 'green', label: 'green', zh: '綠色', swatch: '#67bd8a', prompt: 'green' },
  { id: 'blue', label: 'blue', zh: '藍色', swatch: '#6fa9e8', prompt: 'blue' },
  { id: 'purple', label: 'purple', zh: '紫色', swatch: '#8d79d8', prompt: 'purple' },
  { id: 'pink', label: 'pink', zh: '粉紅色', swatch: '#e990b6', prompt: 'pink' },
  { id: 'black', label: 'black', zh: '黑色', swatch: '#30354a', prompt: 'black' },
  { id: 'white', label: 'white', zh: '白色', swatch: '#fffaf4', prompt: 'white' },
  { id: 'gray', label: 'gray', zh: '灰色', swatch: '#9aa5b1', prompt: 'gray' },
  {
    id: 'rainbow',
    label: 'rainbow',
    zh: '彩虹色',
    swatch: 'linear-gradient(135deg, #f06a6a, #f5d35e, #67bd8a, #6fa9e8, #8d79d8)',
    prompt: 'rainbow-colored',
  },
]

export const EYE_OPTIONS: ChoiceOption[] = [
  { id: 'one-big', label: 'one big eye', zh: '一隻大眼睛', emoji: '👁️', prompt: 'one big eye' },
  { id: 'two-big', label: 'two big eyes', zh: '兩隻大眼睛', emoji: '👀', prompt: 'two big friendly eyes' },
  { id: 'three', label: 'three eyes', zh: '三隻眼睛', emoji: '👁️', prompt: 'three expressive eyes' },
  { id: 'many', label: 'many eyes', zh: '很多眼睛', emoji: '🪩', prompt: 'many small expressive eyes' },
  { id: 'sleepy', label: 'sleepy eyes', zh: '想睡的眼睛', emoji: '😪', prompt: 'sleepy half-closed eyes' },
  { id: 'tiny', label: 'tiny eyes', zh: '小小的眼睛', emoji: '• •', prompt: 'tiny eyes' },
  { id: 'glowing', label: 'glowing eyes', zh: '發光的眼睛', emoji: '✨', prompt: 'softly glowing eyes' },
]

export const FEATURE_OPTIONS: ChoiceOption[] = [
  { id: 'horns', label: 'horns', zh: '角', emoji: '🦄', prompt: 'small horns' },
  { id: 'wings', label: 'wings', zh: '翅膀', emoji: '🪽', prompt: 'wings' },
  { id: 'long-ears', label: 'long ears', zh: '長耳朵', emoji: '🐰', prompt: 'long ears' },
  { id: 'sharp-teeth', label: 'sharp teeth', zh: '尖尖的牙齒', emoji: '😁', prompt: 'small rounded sharp teeth, not scary' },
  { id: 'long-tail', label: 'long tail', zh: '長尾巴', emoji: '〰️', prompt: 'a long tail' },
  { id: 'short-legs', label: 'short legs', zh: '短腿', emoji: '🦵', prompt: 'short legs' },
  { id: 'long-arms', label: 'long arms', zh: '長手臂', emoji: '🙌', prompt: 'long arms' },
  { id: 'fluffy-fur', label: 'fluffy fur', zh: '蓬鬆毛毛', emoji: '🧶', prompt: 'fluffy fur' },
  { id: 'spikes', label: 'spikes', zh: '尖刺', emoji: '🔸', prompt: 'soft-looking spikes' },
  { id: 'antennae', label: 'antennae', zh: '觸角', emoji: '📡', prompt: 'antennae' },
]

export const EXPRESSIONS: ChoiceOption[] = [
  { id: 'worried', label: 'worried', zh: '擔心的', emoji: '😟', prompt: 'a worried expression' },
  { id: 'sad', label: 'sad', zh: '難過的', emoji: '😢', prompt: 'a sad expression' },
  { id: 'angry', label: 'angry', zh: '生氣的', emoji: '😠', prompt: 'an angry expression' },
  { id: 'nervous', label: 'nervous', zh: '緊張的', emoji: '😬', prompt: 'a nervous expression' },
  { id: 'scared', label: 'scared', zh: '害怕的', emoji: '😨', prompt: 'a scared but child-friendly expression' },
  { id: 'tired', label: 'tired', zh: '疲累的', emoji: '😴', prompt: 'a tired expression' },
  { id: 'lonely', label: 'lonely', zh: '孤單的', emoji: '🥺', prompt: 'a lonely expression' },
  { id: 'shy', label: 'shy', zh: '害羞的', emoji: '🫣', prompt: 'a shy expression' },
  { id: 'cute', label: 'cute', zh: '可愛的', emoji: '🥰', prompt: 'a cute expression' },
  { id: 'silly', label: 'silly', zh: '搞怪的', emoji: '🤪', prompt: 'a silly expression' },
]

export const ACTIONS: ChoiceOption[] = [
  { id: 'sitting', label: 'sitting', zh: '坐著', emoji: '🪑', prompt: 'sitting' },
  { id: 'standing', label: 'standing', zh: '站著', emoji: '🧍', prompt: 'standing' },
  { id: 'crying', label: 'crying', zh: '哭泣', emoji: '💧', prompt: 'crying gently' },
  { id: 'hiding', label: 'hiding', zh: '躲起來', emoji: '🙈', prompt: 'hiding shyly' },
  { id: 'sleeping', label: 'sleeping', zh: '睡覺', emoji: '💤', prompt: 'sleeping' },
  { id: 'yawning', label: 'yawning', zh: '打哈欠', emoji: '🥱', prompt: 'yawning' },
  { id: 'running', label: 'running', zh: '跑步', emoji: '🏃', prompt: 'running' },
  { id: 'shouting', label: 'shouting', zh: '大叫', emoji: '📣', prompt: 'shouting with an exaggerated pose' },
  { id: 'thinking', label: 'thinking', zh: '思考', emoji: '💭', prompt: 'thinking deeply' },
  { id: 'walking', label: 'walking', zh: '走路', emoji: '🚶', prompt: 'walking' },
  { id: 'flying', label: 'flying', zh: '飛行', emoji: '🛫', prompt: 'flying' },
  { id: 'hugging', label: 'hugging itself', zh: '抱住自己', emoji: '🫂', prompt: 'hugging itself for comfort' },
]

export const PERSONALITIES: ChoiceOption[] = [
  { id: 'cute', label: 'cute', zh: '可愛', emoji: '🥰', prompt: 'cute' },
  { id: 'funny', label: 'funny', zh: '有趣', emoji: '😄', prompt: 'funny and playful' },
  { id: 'strange', label: 'strange', zh: '奇怪', emoji: '🌀', prompt: 'strange in an imaginative way' },
  { id: 'scary', label: 'scary', zh: '有點嚇人', emoji: '👻', prompt: 'a little scary but still child-friendly' },
  { id: 'friendly', label: 'friendly', zh: '友善', emoji: '🤗', prompt: 'friendly and comforting' },
  { id: 'mysterious', label: 'mysterious', zh: '神秘', emoji: '🔮', prompt: 'mysterious and dreamy' },
]

export const SPECIAL_POWERS: ChoiceOption[] = [
  { id: 'fly', label: 'fly', zh: '飛行', emoji: '🪽', prompt: 'the power to fly' },
  { id: 'invisible', label: 'become invisible', zh: '隱形', emoji: '🫥', prompt: 'the power to become invisible' },
  { id: 'teleport', label: 'teleport', zh: '瞬間移動', emoji: '🌀', prompt: 'the power to teleport' },
  { id: 'loud-noises', label: 'make loud noises', zh: '發出大聲音', emoji: '📯', prompt: 'the power to make loud noises' },
  { id: 'clouds', label: 'make clouds', zh: '製造雲朵', emoji: '☁️', prompt: 'the power to make clouds' },
  { id: 'bad-dreams', label: 'make bad dreams', zh: '製造惡夢', emoji: '🌧️', prompt: 'the power to make bad dreams, shown gently and symbolically' },
  { id: 'grow-bigger', label: 'grow bigger', zh: '變大', emoji: '⬆️', prompt: 'the power to grow bigger' },
  { id: 'become-smaller', label: 'become smaller', zh: '變小', emoji: '⬇️', prompt: 'the power to become smaller' },
  { id: 'change-colors', label: 'change colors', zh: '變換顏色', emoji: '🌈', prompt: 'the power to change colors' },
  { id: 'glow', label: 'glow in the dark', zh: '在黑暗中發光', emoji: '🌟', prompt: 'the power to glow in the dark' },
  { id: 'none', label: 'no special power', zh: '沒有特殊能力', emoji: '🫶', prompt: 'no special power' },
]

export const ART_STYLES: StyleOption[] = [
  {
    id: '3d-animation',
    label: '3D Animation',
    zh: '3D 動畫',
    emoji: '🧊',
    prompt: 'polished 3D animated movie illustration with soft shapes and expressive lighting',
  },
  {
    id: 'fantasy-storybook',
    label: 'Fantasy Storybook',
    zh: '奇幻故事書',
    emoji: '📖',
    prompt: 'warm hand-painted fantasy storybook animation with gentle textures',
  },
  {
    id: 'hand-drawn',
    label: 'Hand-drawn',
    zh: '手繪插畫',
    emoji: '🖍️',
    prompt: "cute hand-drawn children's illustration with friendly lines and soft colors",
  },
  {
    id: 'anime',
    label: 'Anime',
    zh: '日式動畫',
    emoji: '🌸',
    prompt: 'colorful Japanese anime illustration with expressive eyes and clear shapes',
  },
  {
    id: 'watercolor',
    label: 'Watercolor',
    zh: '水彩畫',
    emoji: '🎨',
    prompt: "soft watercolor children's illustration with airy washes and paper texture",
  },
  {
    id: 'comic',
    label: 'Comic',
    zh: '漫畫風',
    emoji: '💥',
    prompt: 'dynamic colorful comic illustration with playful shapes and clear visual action',
  },
  {
    id: 'realistic-movie',
    label: 'Realistic Movie',
    zh: '寫實電影感',
    emoji: '🎬',
    prompt: 'cinematic realistic fantasy creature illustration with child-friendly lighting and detail',
  },
]

export const BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'auto',
    label: 'Auto',
    zh: '自動配對',
    emoji: '✨',
    prompt: 'a simple, context-matched background selected locally from the worry topic',
  },
  { id: 'bedroom', label: 'bedroom', zh: '臥室', emoji: '🛏️', prompt: 'a cozy bedroom at night' },
  { id: 'classroom', label: 'classroom', zh: '教室', emoji: '🏫', prompt: 'a bright elementary school classroom' },
  { id: 'school', label: 'school', zh: '校園', emoji: '🎒', prompt: 'a welcoming school campus' },
  { id: 'playground', label: 'playground', zh: '遊樂場', emoji: '🛝', prompt: 'a friendly school playground' },
  { id: 'dark-room', label: 'dark room', zh: '昏暗房間', emoji: '🌘', prompt: 'a softly lit dark room, gentle rather than frightening' },
  { id: 'dream-world', label: 'dream world', zh: '夢境世界', emoji: '💭', prompt: 'a magical dream world with floating shapes' },
  { id: 'cloudy-sky', label: 'cloudy sky', zh: '多雲天空', emoji: '☁️', prompt: 'a wide cloudy sky with soft light' },
  { id: 'fantasy-world', label: 'fantasy world', zh: '奇幻世界', emoji: '🪐', prompt: 'a colorful fantasy world' },
  { id: 'simple', label: 'simple background', zh: '簡單背景', emoji: '⚪', prompt: 'a clean simple background with gentle color blocks' },
]
