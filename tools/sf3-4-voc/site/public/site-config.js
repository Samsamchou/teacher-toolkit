(function initSiteConfig(root, factory) {
  "use strict";
  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) {
    root.SITE_CONFIG = config;
    root.SiteConfig = config;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function buildSiteConfig() {
  "use strict";
  const config = {
  "version": "20260810-sf3-sf4-secure-teacher-login",
  "siteTitle": "4年級（SF3／SF4）單字練習網站",
  "projectName": "SF3-SF4 GRADE 4 VOCABULARY PRACTICE",
  "appId": "sf3-sf4-vocabulary-practice",
  "grade": 4,
  "gradeLabel": "4年級",
  "studentIdPlaceholder": "例如：40101",
  "teacherAccess": {
    "mode": "firebase-custom-token-passcode",
    "claim": "teacher",
    "passcodePrompt": "請輸入教師通行碼"
  },
  "gradePrompt": "A 4年級 elementary-school student is practicing the English vocabulary word \"{word}\". Transcribe only the student's English speech.",
  "timezone": "Asia/Taipei",
  "speech": {
    "region": "asia-east1",
    "transcriptionModel": "gpt-4o-mini-transcribe",
    "ttsModel": "gpt-4o-mini-tts",
    "ttsVoice": "marin",
    "wordSpeed": 0.7,
    "sentenceSpeed": 0.6
  },
  "recording": {
    "voiceThreshold": 0.035,
    "silenceThreshold": 0.018,
    "silenceMs": 2000,
    "maxWaitForSpeechMs": 8000,
    "maxRecordingMs": 12000
  },
  "security": {
    "maxClassSize": 25,
    "imageMaxBytes": 320000,
    "teacherClaim": "teacher",
    "requireAppCheck": true,
    "appCheckProvider": "recaptcha-enterprise",
    "appCheckSiteKey": "6LeAzH0tAAAAAMntRKlUsUq_7oHWUAY3NN4EOjBW",
    "teacherLoginMode": "firebase-custom-token-passcode",
    "teacherPasscodeSecret": "teacher",
    "teacherLoginRateLimit": {
      "requests": 5,
      "windowMinutes": 10
    },
    "dryRun": false
  },
  "firebase": {
    "apiKey": "AIzaSyANv0ZAyRv_HP75c8b56s0NLWwMQyYlDqw",
    "appId": "1:351311660417:web:372546105037d5eb5e9480",
    "authDomain": "sf3sf4voc.firebaseapp.com",
    "messagingSenderId": "351311660417",
    "projectId": "sf3sf4voc",
    "storageBucket": "sf3sf4voc.firebasestorage.app"
  },
  "functionUrls": {
    "transcribeSpeech": "https://asia-east1-sf3sf4voc.cloudfunctions.net/transcribeSpeech",
    "synthesizeSpeech": "https://asia-east1-sf3sf4voc.cloudfunctions.net/synthesizeSpeech",
    "teacherLogin": "https://asia-east1-sf3sf4voc.cloudfunctions.net/teacherLogin"
  },
  "localStorageKeys": {
    "submissions": "sf3_sf4_vocabulary_practice_submissions",
    "stats": "sf3_sf4_vocabulary_practice_stats",
    "practiceResults": "sf3_sf4_vocabulary_practice_results"
  },
  "topicRows": {
    "top": [
      "SF3 L01",
      "SF3 L02",
      "SF3 L03",
      "SF3 L04"
    ],
    "bottom": [
      "SF4 L01",
      "SF4 L02",
      "SF4 L03",
      "SF4 L04"
    ]
  },
  "topics": [
    {
      "id": "SF3 L01",
      "label": "Lesson 1",
      "row": "top",
      "series": "SF3",
      "unit": "L01",
      "dir": "sf3-l01",
      "imageDir": "/images/vocabulary/sf3-l01",
      "audioDir": "/audio/words/sf3-l01",
      "sourceFile": "單字資料/SF3/Lesson 01.png",
      "display": {
        "classes": "bg-pink-500 border-pink-700",
        "background": "#ec4899",
        "border": "#be185d"
      },
      "words": [
        {
          "en": "father",
          "zh": "爸爸",
          "emoji": "👨",
          "question": "Who's he?",
          "answer": "He's my father.",
          "example": "Who's he? He's my father.",
          "image": "/images/vocabulary/sf3-l01/father.jpg",
          "audio": "/audio/words/sf3-l01/father.mp3"
        },
        {
          "en": "grandfather",
          "zh": "祖父；爺爺",
          "emoji": "👴",
          "question": "Who's he?",
          "answer": "He's my grandfather.",
          "example": "Who's he? He's my grandfather.",
          "image": "/images/vocabulary/sf3-l01/grandfather.jpg",
          "audio": "/audio/words/sf3-l01/grandfather.mp3"
        },
        {
          "en": "grandmother",
          "zh": "祖母；奶奶",
          "emoji": "👵",
          "question": "Who's she?",
          "answer": "She's my grandmother.",
          "example": "Who's she? She's my grandmother.",
          "image": "/images/vocabulary/sf3-l01/grandmother.jpg",
          "audio": "/audio/words/sf3-l01/grandmother.mp3"
        },
        {
          "en": "sister",
          "zh": "姐姐；妹妹",
          "emoji": "👧",
          "question": "Who's she?",
          "answer": "She's my sister.",
          "example": "Who's she? She's my sister.",
          "image": "/images/vocabulary/sf3-l01/sister.jpg",
          "audio": "/audio/words/sf3-l01/sister.mp3"
        },
        {
          "en": "mother",
          "zh": "媽媽",
          "emoji": "👩",
          "question": "Who's she?",
          "answer": "She's my mother.",
          "example": "Who's she? She's my mother.",
          "image": "/images/vocabulary/sf3-l01/mother.jpg",
          "audio": "/audio/words/sf3-l01/mother.mp3"
        },
        {
          "en": "brother",
          "zh": "哥哥；弟弟",
          "emoji": "👦",
          "question": "Who's he?",
          "answer": "He's my brother.",
          "example": "Who's he? He's my brother.",
          "image": "/images/vocabulary/sf3-l01/brother.jpg",
          "audio": "/audio/words/sf3-l01/brother.mp3"
        },
        {
          "en": "who",
          "zh": "誰",
          "emoji": "❓",
          "question": "Who's he?",
          "answer": "Dad is my father.",
          "example": "Who's he? Dad is my father.",
          "image": "/images/vocabulary/sf3-l01/who.jpg",
          "audio": null
        }
      ]
    },
    {
      "id": "SF3 L02",
      "label": "Lesson 2",
      "row": "top",
      "series": "SF3",
      "unit": "L02",
      "dir": "sf3-l02",
      "imageDir": "/images/vocabulary/sf3-l02",
      "audioDir": "/audio/words/sf3-l02",
      "sourceFile": "單字資料/SF3/Lesson 02.png",
      "display": {
        "classes": "bg-cyan-500 border-cyan-700",
        "background": "#06b6d4",
        "border": "#0e7490"
      },
      "words": [
        {
          "en": "teacher",
          "zh": "老師",
          "emoji": "👩‍🏫",
          "question": "Is she a teacher?",
          "answer": "Yes, she is. She's a teacher.",
          "example": "Is she a teacher? Yes, she is. She's a teacher.",
          "image": "/images/vocabulary/sf3-l02/teacher.jpg",
          "audio": "/audio/words/sf3-l02/teacher.mp3"
        },
        {
          "en": "student",
          "zh": "學生",
          "emoji": "🧑‍🎓",
          "question": "Is he a student?",
          "answer": "No, he isn't. He's a cook.",
          "example": "Is he a student? No, he isn't. He's a cook.",
          "image": "/images/vocabulary/sf3-l02/student.jpg",
          "audio": "/audio/words/sf3-l02/student.mp3"
        },
        {
          "en": "cook",
          "zh": "廚師",
          "emoji": "🧑‍🍳",
          "question": "Is she a cook?",
          "answer": "Yes, she is. She's a cook.",
          "example": "Is she a cook? Yes, she is. She's a cook.",
          "image": "/images/vocabulary/sf3-l02/cook.jpg",
          "audio": "/audio/words/sf3-l02/cook.mp3"
        },
        {
          "en": "doctor",
          "zh": "醫生",
          "emoji": "🧑‍⚕️",
          "question": "Is he a doctor?",
          "answer": "No, he isn't. He's a teacher.",
          "example": "Is he a doctor? No, he isn't. He's a teacher.",
          "image": "/images/vocabulary/sf3-l02/doctor.jpg",
          "audio": "/audio/words/sf3-l02/doctor.mp3"
        },
        {
          "en": "nurse",
          "zh": "護理師；護士",
          "emoji": "👩‍⚕️",
          "question": "Is she a nurse?",
          "answer": "No, she isn't. She's a doctor.",
          "example": "Is she a nurse? No, she isn't. She's a doctor.",
          "image": "/images/vocabulary/sf3-l02/nurse.jpg",
          "audio": "/audio/words/sf3-l02/nurse.mp3"
        },
        {
          "en": "farmer",
          "zh": "農夫",
          "emoji": "🧑‍🌾",
          "question": "Is he a farmer?",
          "answer": "Yes, he is. He's a farmer.",
          "example": "Is he a farmer? Yes, he is. He's a farmer.",
          "image": "/images/vocabulary/sf3-l02/farmer.jpg",
          "audio": "/audio/words/sf3-l02/farmer.mp3"
        },
        {
          "en": "driver",
          "zh": "司機",
          "emoji": "🚗",
          "question": "Is she a driver?",
          "answer": "No, she isn't. She's a nurse.",
          "example": "Is she a driver? No, she isn't. She's a nurse.",
          "image": "/images/vocabulary/sf3-l02/driver.jpg",
          "audio": "/audio/words/sf3-l02/driver.mp3"
        }
      ]
    },
    {
      "id": "SF3 L03",
      "label": "Lesson 3",
      "row": "top",
      "series": "SF3",
      "unit": "L03",
      "dir": "sf3-l03",
      "imageDir": "/images/vocabulary/sf3-l03",
      "audioDir": "/audio/words/sf3-l03",
      "sourceFile": "單字資料/SF3/Lesson 03.png",
      "display": {
        "classes": "bg-lime-500 border-lime-700",
        "background": "#84cc16",
        "border": "#4d7c0f"
      },
      "words": [
        {
          "en": "bathroom",
          "zh": "浴室；廁所",
          "emoji": "🚿",
          "question": "Where's Dad?",
          "answer": "He's in the bathroom.",
          "example": "Where's Dad? He's in the bathroom.",
          "image": "/images/vocabulary/sf3-l03/bathroom.jpg",
          "audio": "/audio/words/sf3-l03/bathroom.mp3"
        },
        {
          "en": "bedroom",
          "zh": "臥室",
          "emoji": "🛏️",
          "question": "Where's Mom?",
          "answer": "She's in the bedroom.",
          "example": "Where's Mom? She's in the bedroom.",
          "image": "/images/vocabulary/sf3-l03/bedroom.jpg",
          "audio": "/audio/words/sf3-l03/bedroom.mp3"
        },
        {
          "en": "kitchen",
          "zh": "廚房",
          "emoji": "🍳",
          "question": "Where's Grandpa?",
          "answer": "He's in the kitchen.",
          "example": "Where's Grandpa? He's in the kitchen.",
          "image": "/images/vocabulary/sf3-l03/kitchen.jpg",
          "audio": "/audio/words/sf3-l03/kitchen.mp3"
        },
        {
          "en": "dining room",
          "zh": "飯廳",
          "emoji": "🍽️",
          "question": "Where's Wendy?",
          "answer": "She's in the dining room.",
          "example": "Where's Wendy? She's in the dining room.",
          "image": "/images/vocabulary/sf3-l03/dining-room.jpg",
          "audio": "/audio/words/sf3-l03/dining-room.mp3"
        },
        {
          "en": "living room",
          "zh": "客廳",
          "emoji": "🛋️",
          "question": "Where's Ken?",
          "answer": "He's in the living room.",
          "example": "Where's Ken? He's in the living room.",
          "image": "/images/vocabulary/sf3-l03/living-room.jpg",
          "audio": "/audio/words/sf3-l03/living-room.mp3"
        },
        {
          "en": "yard",
          "zh": "庭院",
          "emoji": "🌳",
          "question": "Where are you?",
          "answer": "I'm in the yard.",
          "example": "Where are you? I'm in the yard.",
          "image": "/images/vocabulary/sf3-l03/yard.jpg",
          "audio": "/audio/words/sf3-l03/yard.mp3"
        },
        {
          "en": "study",
          "zh": "書房",
          "emoji": "📚",
          "question": "Where's the teacher?",
          "answer": "She's in the study.",
          "example": "Where's the teacher? She's in the study.",
          "image": "/images/vocabulary/sf3-l03/study.jpg",
          "audio": null
        },
        {
          "en": "where",
          "zh": "哪裡",
          "emoji": "📍",
          "question": "Where's the student?",
          "answer": "He's in the bedroom.",
          "example": "Where's the student? He's in the bedroom.",
          "image": "/images/vocabulary/sf3-l03/where.jpg",
          "audio": null
        }
      ]
    },
    {
      "id": "SF3 L04",
      "label": "Lesson 4",
      "row": "top",
      "series": "SF3",
      "unit": "L04",
      "dir": "sf3-l04",
      "imageDir": "/images/vocabulary/sf3-l04",
      "audioDir": "/audio/words/sf3-l04",
      "sourceFile": "單字資料/SF3/Lesson 04.png",
      "display": {
        "classes": "bg-violet-500 border-violet-700",
        "background": "#8b5cf6",
        "border": "#6d28d9"
      },
      "words": [
        {
          "en": "bird",
          "zh": "鳥",
          "emoji": "🐦",
          "question": "Do you have a bird?",
          "answer": "Yes, I do. I have a bird.",
          "example": "Do you have a bird? Yes, I do. I have a bird.",
          "image": "/images/vocabulary/sf3-l04/bird.jpg",
          "audio": "/audio/words/sf3-l04/bird.mp3"
        },
        {
          "en": "rabbit",
          "zh": "兔子",
          "emoji": "🐇",
          "question": "Do you have a rabbit?",
          "answer": "No, I don't. I have a turtle.",
          "example": "Do you have a rabbit? No, I don't. I have a turtle.",
          "image": "/images/vocabulary/sf3-l04/rabbit.jpg",
          "audio": "/audio/words/sf3-l04/rabbit.mp3"
        },
        {
          "en": "turtle",
          "zh": "烏龜",
          "emoji": "🐢",
          "question": "Do you have a turtle?",
          "answer": "Yes, I do. I have a turtle.",
          "example": "Do you have a turtle? Yes, I do. I have a turtle.",
          "image": "/images/vocabulary/sf3-l04/turtle.jpg",
          "audio": "/audio/words/sf3-l04/turtle.mp3"
        },
        {
          "en": "cat",
          "zh": "貓",
          "emoji": "🐈",
          "question": "Do you have a cat?",
          "answer": "No, I don't. I have a dog.",
          "example": "Do you have a cat? No, I don't. I have a dog.",
          "image": "/images/vocabulary/sf3-l04/cat.jpg",
          "audio": "/audio/words/sf3-l04/cat.mp3"
        },
        {
          "en": "frog",
          "zh": "青蛙",
          "emoji": "🐸",
          "question": "Do you have a frog?",
          "answer": "Yes, I do. I have a frog.",
          "example": "Do you have a frog? Yes, I do. I have a frog.",
          "image": "/images/vocabulary/sf3-l04/frog.jpg",
          "audio": "/audio/words/sf3-l04/frog.mp3"
        },
        {
          "en": "dog",
          "zh": "狗",
          "emoji": "🐕",
          "question": "Do you have a dog?",
          "answer": "No, I don't. I have a fish.",
          "example": "Do you have a dog? No, I don't. I have a fish.",
          "image": "/images/vocabulary/sf3-l04/dog.jpg",
          "audio": "/audio/words/sf3-l04/dog.mp3"
        },
        {
          "en": "fish",
          "zh": "魚",
          "emoji": "🐟",
          "question": "Do you have a fish?",
          "answer": "No, I don't. I have a bird.",
          "example": "Do you have a fish? No, I don't. I have a bird.",
          "image": "/images/vocabulary/sf3-l04/fish.jpg",
          "audio": "/audio/words/sf3-l04/fish.mp3"
        }
      ]
    },
    {
      "id": "SF4 L01",
      "label": "Lesson 1",
      "row": "bottom",
      "series": "SF4",
      "unit": "L01",
      "dir": "sf4-l01",
      "imageDir": "/images/vocabulary/sf4-l01",
      "audioDir": "/audio/words/sf4-l01",
      "sourceFile": "單字資料/SF4/SF4 Lesson 01.png",
      "display": {
        "classes": "bg-amber-500 border-amber-700",
        "background": "#f59e0b",
        "border": "#b45309"
      },
      "words": [
        {
          "en": "yo-yos",
          "zh": "溜溜球（複數）",
          "emoji": "🪀",
          "question": "What are those?",
          "answer": "They're yo-yos.",
          "example": "What are those? They're yo-yos.",
          "image": "/images/vocabulary/sf4-l01/yo-yos.jpg",
          "audio": "/audio/words/sf4-l01/yo-yos.mp3"
        },
        {
          "en": "kites",
          "zh": "風箏（複數）",
          "emoji": "🪁",
          "question": "What are these?",
          "answer": "They're kites.",
          "example": "What are these? They're kites.",
          "image": "/images/vocabulary/sf4-l01/kites.jpg",
          "audio": "/audio/words/sf4-l01/kites.mp3"
        },
        {
          "en": "dolls",
          "zh": "洋娃娃（複數）",
          "emoji": "🪆",
          "question": "What are those, Wendy?",
          "answer": "They're dolls.",
          "example": "What are those, Wendy? They're dolls.",
          "image": "/images/vocabulary/sf4-l01/dolls.jpg",
          "audio": "/audio/words/sf4-l01/dolls.mp3"
        },
        {
          "en": "balls",
          "zh": "球（複數）",
          "emoji": "⚽",
          "question": "What are these, Ken?",
          "answer": "They're balls.",
          "example": "What are these, Ken? They're balls.",
          "image": "/images/vocabulary/sf4-l01/balls.jpg",
          "audio": "/audio/words/sf4-l01/balls.mp3"
        },
        {
          "en": "robots",
          "zh": "機器人（複數）",
          "emoji": "🤖",
          "question": "What are those, Dad?",
          "answer": "They're robots.",
          "example": "What are those, Dad? They're robots.",
          "image": "/images/vocabulary/sf4-l01/robots.jpg",
          "audio": "/audio/words/sf4-l01/robots.mp3"
        },
        {
          "en": "these",
          "zh": "這些",
          "emoji": "👇",
          "question": "What are these, Mom?",
          "answer": "They're my yo-yos.",
          "example": "What are these, Mom? They're my yo-yos.",
          "image": "/images/vocabulary/sf4-l01/these.jpg",
          "audio": null
        },
        {
          "en": "those",
          "zh": "那些",
          "emoji": "👉",
          "question": "What are those, Grandpa?",
          "answer": "They're your kites.",
          "example": "What are those, Grandpa? They're your kites.",
          "image": "/images/vocabulary/sf4-l01/those.jpg",
          "audio": null
        }
      ]
    },
    {
      "id": "SF4 L02",
      "label": "Lesson 2",
      "row": "bottom",
      "series": "SF4",
      "unit": "L02",
      "dir": "sf4-l02",
      "imageDir": "/images/vocabulary/sf4-l02",
      "audioDir": "/audio/words/sf4-l02",
      "sourceFile": "單字資料/SF4/SF4 Lesson 02.png",
      "display": {
        "classes": "bg-fuchsia-500 border-fuchsia-700",
        "background": "#d946ef",
        "border": "#a21caf"
      },
      "words": [
        {
          "en": "box",
          "zh": "箱子；盒子",
          "emoji": "📦",
          "question": "Where's the ball?",
          "answer": "It's in the box.",
          "example": "Where's the ball? It's in the box.",
          "image": "/images/vocabulary/sf4-l02/box.jpg",
          "audio": "/audio/words/sf4-l02/box.mp3"
        },
        {
          "en": "desk",
          "zh": "書桌",
          "emoji": "🪑",
          "question": "Where's the yo-yo?",
          "answer": "It's on the desk.",
          "example": "Where's the yo-yo? It's on the desk.",
          "image": "/images/vocabulary/sf4-l02/desk.jpg",
          "audio": "/audio/words/sf4-l02/desk.mp3"
        },
        {
          "en": "chair",
          "zh": "椅子",
          "emoji": "💺",
          "question": "Where's the robot?",
          "answer": "It's under the chair.",
          "example": "Where's the robot? It's under the chair.",
          "image": "/images/vocabulary/sf4-l02/chair.jpg",
          "audio": "/audio/words/sf4-l02/chair.mp3"
        },
        {
          "en": "table",
          "zh": "桌子",
          "emoji": "🪑",
          "question": "Where's the kite?",
          "answer": "It's on the table.",
          "example": "Where's the kite? It's on the table.",
          "image": "/images/vocabulary/sf4-l02/table.jpg",
          "audio": null
        },
        {
          "en": "bag",
          "zh": "袋子",
          "emoji": "👜",
          "question": "Where's the doll?",
          "answer": "It's in the bag.",
          "example": "Where's the doll? It's in the bag.",
          "image": "/images/vocabulary/sf4-l02/bag.jpg",
          "audio": null
        },
        {
          "en": "in",
          "zh": "在……裡面",
          "emoji": "📥",
          "question": "Where are the yo-yos?",
          "answer": "They're in the box.",
          "example": "Where are the yo-yos? They're in the box.",
          "image": "/images/vocabulary/sf4-l02/in.jpg",
          "audio": "/audio/words/sf4-l02/in.mp3"
        },
        {
          "en": "on",
          "zh": "在……上面",
          "emoji": "⬆️",
          "question": "Where are the dolls?",
          "answer": "They're on the table.",
          "example": "Where are the dolls? They're on the table.",
          "image": "/images/vocabulary/sf4-l02/on.jpg",
          "audio": "/audio/words/sf4-l02/on.mp3"
        },
        {
          "en": "under",
          "zh": "在……下面",
          "emoji": "⬇️",
          "question": "Where are the balls?",
          "answer": "They're under the desk.",
          "example": "Where are the balls? They're under the desk.",
          "image": "/images/vocabulary/sf4-l02/under.jpg",
          "audio": "/audio/words/sf4-l02/under.mp3"
        }
      ]
    },
    {
      "id": "SF4 L03",
      "label": "Lesson 3",
      "row": "bottom",
      "series": "SF4",
      "unit": "L03",
      "dir": "sf4-l03",
      "imageDir": "/images/vocabulary/sf4-l03",
      "audioDir": "/audio/words/sf4-l03",
      "sourceFile": "單字資料/SF4/SF4 Lesson 03.png",
      "display": {
        "classes": "bg-sky-500 border-sky-700",
        "background": "#0ea5e9",
        "border": "#0369a1"
      },
      "words": [
        {
          "en": "eleven",
          "zh": "十一",
          "emoji": "🔢",
          "question": "What time is it?",
          "answer": "It's eleven o'clock.",
          "example": "What time is it? It's eleven o'clock.",
          "image": "/images/vocabulary/sf4-l03/eleven.jpg",
          "audio": "/audio/words/sf4-l03/eleven.mp3"
        },
        {
          "en": "twelve",
          "zh": "十二",
          "emoji": "🔢",
          "question": "What time is it, Mom?",
          "answer": "It's twelve o'clock.",
          "example": "What time is it, Mom? It's twelve o'clock.",
          "image": "/images/vocabulary/sf4-l03/twelve.jpg",
          "audio": "/audio/words/sf4-l03/twelve.mp3"
        },
        {
          "en": "twenty",
          "zh": "二十",
          "emoji": "🔢",
          "question": "What time is it, Ken?",
          "answer": "It's three twenty.",
          "example": "What time is it, Ken? It's three twenty.",
          "image": "/images/vocabulary/sf4-l03/twenty.jpg",
          "audio": "/audio/words/sf4-l03/twenty.mp3"
        },
        {
          "en": "thirty",
          "zh": "三十",
          "emoji": "🔢",
          "question": "What time is it now?",
          "answer": "It's seven thirty.",
          "example": "What time is it now? It's seven thirty.",
          "image": "/images/vocabulary/sf4-l03/thirty.jpg",
          "audio": "/audio/words/sf4-l03/thirty.mp3"
        },
        {
          "en": "forty",
          "zh": "四十",
          "emoji": "🔢",
          "question": "What time is it, Dad?",
          "answer": "It's six forty.",
          "example": "What time is it, Dad? It's six forty.",
          "image": "/images/vocabulary/sf4-l03/forty.jpg",
          "audio": "/audio/words/sf4-l03/forty.mp3"
        },
        {
          "en": "forty-five",
          "zh": "45",
          "emoji": "🕢",
          "question": "What time is it, Wendy?",
          "answer": "It's nine forty-five.",
          "example": "What time is it, Wendy? It's nine forty-five.",
          "image": "/images/vocabulary/sf4-l03/forty-five.jpg",
          "audio": null
        },
        {
          "en": "fifty",
          "zh": "50",
          "emoji": "🕗",
          "question": "What time is it, Grandpa?",
          "answer": "It's five fifty.",
          "example": "What time is it, Grandpa? It's five fifty.",
          "image": "/images/vocabulary/sf4-l03/fifty.jpg",
          "audio": null
        },
        {
          "en": "fifty-five",
          "zh": "五十五",
          "emoji": "🔢",
          "question": "What time is it, Grandma?",
          "answer": "It's two fifty-five.",
          "example": "What time is it, Grandma? It's two fifty-five.",
          "image": "/images/vocabulary/sf4-l03/fifty-five.jpg",
          "audio": "/audio/words/sf4-l03/fifty-five.mp3"
        },
        {
          "en": "what time",
          "zh": "幾點",
          "emoji": "⏰",
          "question": "What time is it, Ben?",
          "answer": "It's four o'clock.",
          "example": "What time is it, Ben? It's four o'clock.",
          "image": "/images/vocabulary/sf4-l03/what-time.jpg",
          "audio": null
        },
        {
          "en": "o'clock",
          "zh": "……點鐘",
          "emoji": "🕖",
          "question": "What time is it, Ann?",
          "answer": "It's eight o'clock.",
          "example": "What time is it, Ann? It's eight o'clock.",
          "image": "/images/vocabulary/sf4-l03/oclock.jpg",
          "audio": null
        }
      ]
    },
    {
      "id": "SF4 L04",
      "label": "Lesson 4",
      "row": "bottom",
      "series": "SF4",
      "unit": "L04",
      "dir": "sf4-l04",
      "imageDir": "/images/vocabulary/sf4-l04",
      "audioDir": "/audio/words/sf4-l04",
      "sourceFile": "單字資料/SF4/SF4 Lesson 04.png",
      "display": {
        "classes": "bg-emerald-500 border-emerald-700",
        "background": "#10b981",
        "border": "#047857"
      },
      "words": [
        {
          "en": "cake",
          "zh": "蛋糕",
          "emoji": "🍰",
          "question": "Do you like cake?",
          "answer": "No, I don't. I like ice cream.",
          "example": "Do you like cake? No, I don't. I like ice cream.",
          "image": "/images/vocabulary/sf4-l04/cake.jpg",
          "audio": "/audio/words/sf4-l04/cake.mp3"
        },
        {
          "en": "ice cream",
          "zh": "冰淇淋",
          "emoji": "🍨",
          "question": "Do you like ice cream?",
          "answer": "Yes, I do. I like ice cream.",
          "example": "Do you like ice cream? Yes, I do. I like ice cream.",
          "image": "/images/vocabulary/sf4-l04/ice-cream.jpg",
          "audio": "/audio/words/sf4-l04/ice-cream.mp3"
        },
        {
          "en": "rice",
          "zh": "米飯",
          "emoji": "🍚",
          "question": "Do you like rice?",
          "answer": "No, I don't. I like pizza.",
          "example": "Do you like rice? No, I don't. I like pizza.",
          "image": "/images/vocabulary/sf4-l04/rice.jpg",
          "audio": "/audio/words/sf4-l04/rice.mp3"
        },
        {
          "en": "milk",
          "zh": "牛奶",
          "emoji": "🥛",
          "question": "Do you like milk?",
          "answer": "Yes, I do. I like milk.",
          "example": "Do you like milk? Yes, I do. I like milk.",
          "image": "/images/vocabulary/sf4-l04/milk.jpg",
          "audio": "/audio/words/sf4-l04/milk.mp3"
        },
        {
          "en": "juice",
          "zh": "果汁",
          "emoji": "🧃",
          "question": "Do you like juice?",
          "answer": "No, I don't. I like tea.",
          "example": "Do you like juice? No, I don't. I like tea.",
          "image": "/images/vocabulary/sf4-l04/juice.jpg",
          "audio": "/audio/words/sf4-l04/juice.mp3"
        },
        {
          "en": "tea",
          "zh": "茶",
          "emoji": "🍵",
          "question": "Do you like tea?",
          "answer": "No, I don't. I like water.",
          "example": "Do you like tea? No, I don't. I like water.",
          "image": "/images/vocabulary/sf4-l04/tea.jpg",
          "audio": "/audio/words/sf4-l04/tea.mp3"
        },
        {
          "en": "water",
          "zh": "水",
          "emoji": "💧",
          "question": "Do you like water?",
          "answer": "Yes, I do. I like water.",
          "example": "Do you like water? Yes, I do. I like water.",
          "image": "/images/vocabulary/sf4-l04/water.jpg",
          "audio": "/audio/words/sf4-l04/water.mp3"
        },
        {
          "en": "pizza",
          "zh": "披薩",
          "emoji": "🍕",
          "question": "Do you like pizza?",
          "answer": "Yes, I do. I like pizza.",
          "example": "Do you like pizza? Yes, I do. I like pizza.",
          "image": "/images/vocabulary/sf4-l04/pizza.jpg",
          "audio": "/audio/words/sf4-l04/pizza.mp3"
        },
        {
          "en": "like",
          "zh": "喜歡",
          "emoji": "❤️",
          "question": "Do you like robots?",
          "answer": "Yes, I do. I like robots.",
          "example": "Do you like robots? Yes, I do. I like robots.",
          "image": "/images/vocabulary/sf4-l04/like.jpg",
          "audio": null
        }
      ]
    }
  ],
  "assetMappings": {
    "father": {
      "sourceImage": "單字資料/SF3/L1/01_father圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L1/01_father圖.mp3",
        "單字資料/SF3/L1/02_father字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l01/father.jpg",
      "audio": "/audio/words/sf3-l01/father.mp3"
    },
    "grandfather": {
      "sourceImage": "單字資料/SF3/L1/03_grandfather圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L1/03_grandfather圖.mp3",
        "單字資料/SF3/L1/04_grandfather字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l01/grandfather.jpg",
      "audio": "/audio/words/sf3-l01/grandfather.mp3"
    },
    "grandmother": {
      "sourceImage": "單字資料/SF3/L1/05_grandmother圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L1/05_grandmother圖.mp3",
        "單字資料/SF3/L1/06_grandmother字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l01/grandmother.jpg",
      "audio": "/audio/words/sf3-l01/grandmother.mp3"
    },
    "sister": {
      "sourceImage": "單字資料/SF3/L1/07_sister圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L1/07_sister圖.mp3",
        "單字資料/SF3/L1/08_sister字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l01/sister.jpg",
      "audio": "/audio/words/sf3-l01/sister.mp3"
    },
    "mother": {
      "sourceImage": "單字資料/SF3/L1/09_mother圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L1/09_mother圖.mp3",
        "單字資料/SF3/L1/10_mother字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l01/mother.jpg",
      "audio": "/audio/words/sf3-l01/mother.mp3"
    },
    "brother": {
      "sourceImage": "單字資料/SF3/L1/11_brother圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L1/11_brother圖.mp3",
        "單字資料/SF3/L1/12_brother字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l01/brother.jpg",
      "audio": "/audio/words/sf3-l01/brother.mp3"
    },
    "teacher": {
      "sourceImage": "單字資料/SF3/L2/01_ateacher圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L2/01_ateacher圖.mp3",
        "單字資料/SF3/L2/02_ateacher字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l02/teacher.jpg",
      "audio": "/audio/words/sf3-l02/teacher.mp3"
    },
    "student": {
      "sourceImage": "單字資料/SF3/L2/03_astudent圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L2/03_astudent圖.mp3",
        "單字資料/SF3/L2/04_astudent字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l02/student.jpg",
      "audio": "/audio/words/sf3-l02/student.mp3"
    },
    "cook": {
      "sourceImage": "單字資料/SF3/L2/05_acook圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L2/05_acook圖.mp3",
        "單字資料/SF3/L2/06_acook字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l02/cook.jpg",
      "audio": "/audio/words/sf3-l02/cook.mp3"
    },
    "doctor": {
      "sourceImage": "單字資料/SF3/L2/07_adoctor圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L2/07_adoctor圖.mp3",
        "單字資料/SF3/L2/08_adoctor字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l02/doctor.jpg",
      "audio": "/audio/words/sf3-l02/doctor.mp3"
    },
    "nurse": {
      "sourceImage": "單字資料/SF3/L2/09_anurse圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L2/09_anurse圖.mp3",
        "單字資料/SF3/L2/10_anurse字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l02/nurse.jpg",
      "audio": "/audio/words/sf3-l02/nurse.mp3"
    },
    "farmer": {
      "sourceImage": "單字資料/SF3/L2/11_afarmer圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L2/11_afarmer圖.mp3",
        "單字資料/SF3/L2/12_afarmer字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l02/farmer.jpg",
      "audio": "/audio/words/sf3-l02/farmer.mp3"
    },
    "driver": {
      "sourceImage": "單字資料/SF3/L2/11_adriver圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L2/11_adriver圖.mp3",
        "單字資料/SF3/L2/12_adriver字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l02/driver.jpg",
      "audio": "/audio/words/sf3-l02/driver.mp3"
    },
    "bathroom": {
      "sourceImage": "單字資料/SF3/L3/01_bathroom圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L3/01_bathroom圖.mp3",
        "單字資料/SF3/L3/02_bathroom字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l03/bathroom.jpg",
      "audio": "/audio/words/sf3-l03/bathroom.mp3"
    },
    "bedroom": {
      "sourceImage": "單字資料/SF3/L3/03_bedroom圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L3/03_bedroom圖.mp3",
        "單字資料/SF3/L3/04_bedroom字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l03/bedroom.jpg",
      "audio": "/audio/words/sf3-l03/bedroom.mp3"
    },
    "kitchen": {
      "sourceImage": "單字資料/SF3/L3/05_kitchen圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L3/05_kitchen圖.mp3",
        "單字資料/SF3/L3/06_kitchen字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l03/kitchen.jpg",
      "audio": "/audio/words/sf3-l03/kitchen.mp3"
    },
    "dining room": {
      "sourceImage": "單字資料/SF3/L3/07_diningroom圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L3/07_diningroom圖.mp3",
        "單字資料/SF3/L3/08_diningroom字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l03/dining-room.jpg",
      "audio": "/audio/words/sf3-l03/dining-room.mp3"
    },
    "living room": {
      "sourceImage": "單字資料/SF3/L3/09_livingroom圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L3/09_livingroom圖.mp3",
        "單字資料/SF3/L3/10_livingroom字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l03/living-room.jpg",
      "audio": "/audio/words/sf3-l03/living-room.mp3"
    },
    "yard": {
      "sourceImage": "單字資料/SF3/L3/07_ayard圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L3/07_ayard圖.mp3",
        "單字資料/SF3/L3/08_ayard字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l03/yard.jpg",
      "audio": "/audio/words/sf3-l03/yard.mp3"
    },
    "bird": {
      "sourceImage": "單字資料/SF3/L4/01_abird圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L4/01_abird圖.mp3",
        "單字資料/SF3/L4/02_abird字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l04/bird.jpg",
      "audio": "/audio/words/sf3-l04/bird.mp3"
    },
    "rabbit": {
      "sourceImage": "單字資料/SF3/L4/03_arabbit圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L4/03_arabbit圖.mp3",
        "單字資料/SF3/L4/04_arabbit字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l04/rabbit.jpg",
      "audio": "/audio/words/sf3-l04/rabbit.mp3"
    },
    "turtle": {
      "sourceImage": "單字資料/SF3/L4/05_aturtle圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L4/05_aturtle圖.mp3",
        "單字資料/SF3/L4/06_aturtle字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l04/turtle.jpg",
      "audio": "/audio/words/sf3-l04/turtle.mp3"
    },
    "cat": {
      "sourceImage": "單字資料/SF3/L4/07_acat圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L4/07_acat圖.mp3",
        "單字資料/SF3/L4/08_acat字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l04/cat.jpg",
      "audio": "/audio/words/sf3-l04/cat.mp3"
    },
    "frog": {
      "sourceImage": "單字資料/SF3/L4/07_afrog圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L4/07_afrog圖.mp3",
        "單字資料/SF3/L4/08_afrog字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l04/frog.jpg",
      "audio": "/audio/words/sf3-l04/frog.mp3"
    },
    "dog": {
      "sourceImage": "單字資料/SF3/L4/09_adog圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L4/09_adog圖.mp3",
        "單字資料/SF3/L4/10_adog字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l04/dog.jpg",
      "audio": "/audio/words/sf3-l04/dog.mp3"
    },
    "fish": {
      "sourceImage": "單字資料/SF3/L4/11_afish圖.jpg",
      "sourceAudio": [
        "單字資料/SF3/L4/11_afish圖.mp3",
        "單字資料/SF3/L4/12_afish字.mp3"
      ],
      "image": "/images/vocabulary/sf3-l04/fish.jpg",
      "audio": "/audio/words/sf3-l04/fish.mp3"
    },
    "yo-yos": {
      "sourceImage": "單字資料/SF4/L1/01_yoyos圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L1/01_yoyos圖.mp3",
        "單字資料/SF4/L1/01_yoyos字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l01/yo-yos.jpg",
      "audio": "/audio/words/sf4-l01/yo-yos.mp3"
    },
    "kites": {
      "sourceImage": "單字資料/SF4/L1/02_kites圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L1/02_kites圖.mp3",
        "單字資料/SF4/L1/02_kites字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l01/kites.jpg",
      "audio": "/audio/words/sf4-l01/kites.mp3"
    },
    "dolls": {
      "sourceImage": "單字資料/SF4/L1/03_dolls圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L1/03_dolls圖.mp3",
        "單字資料/SF4/L1/03_dolls字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l01/dolls.jpg",
      "audio": "/audio/words/sf4-l01/dolls.mp3"
    },
    "balls": {
      "sourceImage": "單字資料/SF4/L1/04_balls圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L1/04_balls圖.mp3",
        "單字資料/SF4/L1/04_balls字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l01/balls.jpg",
      "audio": "/audio/words/sf4-l01/balls.mp3"
    },
    "robots": {
      "sourceImage": "單字資料/SF4/L1/05_robots圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L1/05_robots圖.mp3",
        "單字資料/SF4/L1/05_robots字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l01/robots.jpg",
      "audio": "/audio/words/sf4-l01/robots.mp3"
    },
    "box": {
      "sourceImage": "單字資料/SF4/L2/01_box圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L2/01_box圖.mp3",
        "單字資料/SF4/L2/01_box字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l02/box.jpg",
      "audio": "/audio/words/sf4-l02/box.mp3"
    },
    "desk": {
      "sourceImage": "單字資料/SF4/L2/02_desk圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L2/02_desk圖.mp3",
        "單字資料/SF4/L2/02_desk字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l02/desk.jpg",
      "audio": "/audio/words/sf4-l02/desk.mp3"
    },
    "chair": {
      "sourceImage": "單字資料/SF4/L2/03_chair圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L2/03_chair圖.mp3",
        "單字資料/SF4/L2/03_chair字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l02/chair.jpg",
      "audio": "/audio/words/sf4-l02/chair.mp3"
    },
    "in": {
      "sourceImage": "單字資料/SF4/L2/04_in圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L2/04_in圖.mp3",
        "單字資料/SF4/L2/04_in字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l02/in.jpg",
      "audio": "/audio/words/sf4-l02/in.mp3"
    },
    "on": {
      "sourceImage": "單字資料/SF4/L2/05_on圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L2/05_on圖.mp3",
        "單字資料/SF4/L2/05_on字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l02/on.jpg",
      "audio": "/audio/words/sf4-l02/on.mp3"
    },
    "under": {
      "sourceImage": "單字資料/SF4/L2/06_under圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L2/06_under圖.mp3",
        "單字資料/SF4/L2/06_under字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l02/under.jpg",
      "audio": "/audio/words/sf4-l02/under.mp3"
    },
    "eleven": {
      "sourceImage": "單字資料/SF4/L3/01_eleven圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L3/01_eleven圖.mp3",
        "單字資料/SF4/L3/01_eleven字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l03/eleven.jpg",
      "audio": "/audio/words/sf4-l03/eleven.mp3"
    },
    "twelve": {
      "sourceImage": "單字資料/SF4/L3/02_twelve圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L3/02_twelve圖.mp3",
        "單字資料/SF4/L3/02_twelve字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l03/twelve.jpg",
      "audio": "/audio/words/sf4-l03/twelve.mp3"
    },
    "twenty": {
      "sourceImage": "單字資料/SF4/L3/03_twenty圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L3/03_twenty圖.mp3",
        "單字資料/SF4/L3/03_twenty字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l03/twenty.jpg",
      "audio": "/audio/words/sf4-l03/twenty.mp3"
    },
    "thirty": {
      "sourceImage": "單字資料/SF4/L3/04_thirty圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L3/04_thirty圖.mp3",
        "單字資料/SF4/L3/04_thirty字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l03/thirty.jpg",
      "audio": "/audio/words/sf4-l03/thirty.mp3"
    },
    "forty": {
      "sourceImage": "單字資料/SF4/L3/05_forty圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L3/05_forty圖.mp3",
        "單字資料/SF4/L3/05_forty字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l03/forty.jpg",
      "audio": "/audio/words/sf4-l03/forty.mp3"
    },
    "fifty-five": {
      "sourceImage": "單字資料/SF4/L3/06_fiftyfive圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L3/06_fiftyfive圖.mp3",
        "單字資料/SF4/L3/06_fiftyfive字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l03/fifty-five.jpg",
      "audio": "/audio/words/sf4-l03/fifty-five.mp3"
    },
    "cake": {
      "sourceImage": "單字資料/SF4/L4/01_cake圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L4/01_cake圖.mp3",
        "單字資料/SF4/L4/01_cake字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l04/cake.jpg",
      "audio": "/audio/words/sf4-l04/cake.mp3"
    },
    "ice cream": {
      "sourceImage": "單字資料/SF4/L4/02_icecream圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L4/02_icecream圖.mp3",
        "單字資料/SF4/L4/02_icecream字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l04/ice-cream.jpg",
      "audio": "/audio/words/sf4-l04/ice-cream.mp3"
    },
    "rice": {
      "sourceImage": "單字資料/SF4/L4/02_rice圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L4/02_rice圖.mp3",
        "單字資料/SF4/L4/02_rice字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l04/rice.jpg",
      "audio": "/audio/words/sf4-l04/rice.mp3"
    },
    "milk": {
      "sourceImage": "單字資料/SF4/L4/03_milk圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L4/03_milk圖.mp3",
        "單字資料/SF4/L4/03_milk字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l04/milk.jpg",
      "audio": "/audio/words/sf4-l04/milk.mp3"
    },
    "juice": {
      "sourceImage": "單字資料/SF4/L4/04_juice圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L4/04_juice圖.mp3",
        "單字資料/SF4/L4/04_juice字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l04/juice.jpg",
      "audio": "/audio/words/sf4-l04/juice.mp3"
    },
    "tea": {
      "sourceImage": "單字資料/SF4/L4/04_tea圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L4/04_tea圖.mp3",
        "單字資料/SF4/L4/04_tea字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l04/tea.jpg",
      "audio": "/audio/words/sf4-l04/tea.mp3"
    },
    "water": {
      "sourceImage": "單字資料/SF4/L4/05_water圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L4/05_water圖.mp3",
        "單字資料/SF4/L4/05_water字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l04/water.jpg",
      "audio": "/audio/words/sf4-l04/water.mp3"
    },
    "pizza": {
      "sourceImage": "單字資料/SF4/L4/06_pizza圖.jpg",
      "sourceAudio": [
        "單字資料/SF4/L4/06_pizza圖.mp3",
        "單字資料/SF4/L4/06_pizza字.mp3"
      ],
      "image": "/images/vocabulary/sf4-l04/pizza.jpg",
      "audio": "/audio/words/sf4-l04/pizza.mp3"
    }
  }
};
  config.topicsById = Object.fromEntries(config.topics.map((topic) => [topic.id, topic]));
  config.vocabulary = Object.fromEntries(config.topics.map((topic) => [topic.id, topic.words]));
  return config;
});
