import source from "../../config/site-source.json" with { type: "json" };
import questionBank from "../../config/hwg7-u01-l1-vocabulary-quiz.json" with { type: "json" };

const dateStamp = () => new Date().toISOString().slice(0, 10);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergedContent(baseContent, profileContent) {
  return {
    ...clone(baseContent || {}),
    ...clone(profileContent || {})
  };
}

function slidesFromQuestionBank() {
  return Object.values(questionBank.assets.images.items).map(
    (item) => item.plannedWebsitePath
  );
}

export function lessonId(bookId, unitId, lessonNumber) {
  return `${bookId}-${unitId}-l${String(lessonNumber).padStart(2, "0")}`;
}

export function unitKey(bookId, unitId) {
  return `${bookId}-${unitId}`;
}

export function lessonCountForUnit(unit) {
  const configured = Number(unit?.lessonCount);
  if (Number.isSafeInteger(configured) && configured > 0) return configured;
  const fallback = Number(source.lessonTemplate?.lessonsPerUnit || 5);
  return Number.isSafeInteger(fallback) && fallback > 0 ? fallback : 5;
}

export function lessonCountForBook(book) {
  return (book?.units || []).reduce((total, unit) => total + lessonCountForUnit(unit), 0);
}

export function standardLessonCount() {
  return (source.books || []).reduce((total, book) => total + lessonCountForBook(book), 0);
}

export function themeForLesson(lesson) {
  const fallback = {
    name: "Electric Blue",
    primary: "#2358e5",
    secondary: "#2fbcff",
    soft: "#e8efff",
    ink: "#182f8e"
  };
  return clone(source.unitThemes?.[lesson.unitKey || unitKey(lesson.bookId, lesson.unitId)] || fallback);
}

function contentProfileFor(bookId, unitId, lessonNumber) {
  const override = (source.contentOverrides || []).find((item) => (
    item.bookId === bookId && item.unitId === unitId && Number(item.lessonNumber) === Number(lessonNumber)
  ));
  return override?.contentProfile || "placeholder";
}

export function buildSteps(profileName) {
  const profile = source.contentProfiles[profileName] || {};
  return source.defaultFlow.map((template, index) => {
    const content = mergedContent(template.content, profile[template.type]);
    if (template.type === "imageSlides" && content.slidesFromQuestionBank) {
      content.slides = slidesFromQuestionBank();
    }
    return {
      ...clone(template),
      id: `${template.id}-${index + 1}`,
      content
    };
  });
}

function titleFor(book, unit, lessonNumber) {
  const template = source.lessonTemplate?.titleTemplate || "{book} {unit} · Lesson {lesson}";
  return template
    .replace("{book}", book.label)
    .replace("{unit}", unit.title)
    .replace("{lesson}", String(lessonNumber));
}

export function createSeedLessons() {

  return (source.books || []).flatMap((book) => (
    (book.units || []).flatMap((unit) => (
      Array.from({ length: lessonCountForUnit(unit) }, (_, index) => {
        const lessonNumber = index + 1;
        const contentProfile = contentProfileFor(book.id, unit.id, lessonNumber);
        const base = {
          id: lessonId(book.id, unit.id, lessonNumber),
          title: titleFor(book, unit, lessonNumber),
          grade: book.grade,
          book: book.label,
          bookId: book.id,
          unit: unit.title,
          unitId: unit.id,
          unitKey: unitKey(book.id, unit.id),
          lessonNumber,
          contentProfile,
          lastModified: dateStamp()
        };
        return {
          ...base,
          theme: themeForLesson(base),
          steps: buildSteps(contentProfile)
        };
      })
    ))
  ));
}

export function findLessonByStudentEntry(lessons, entry) {
  if (!entry) return null;
  return lessons.find((lesson) => (
    lesson.bookId === entry.bookId
    && lesson.unitId === entry.unitId
    && Number(lesson.lessonNumber) === Number(entry.lessonNumber)
  )) || null;
}

export function createLesson() {
  const base = {
    id: `lesson-${Date.now()}`,
    title: "New Lesson",
    grade: "Grade 5",
    book: "HWG5",
    bookId: "custom",
    unit: "New Unit",
    unitId: "custom",
    unitKey: "custom",
    lessonNumber: 1,
    contentProfile: "placeholder",
    lastModified: dateStamp()
  };
  return {
    ...base,
    theme: themeForLesson(base),
    steps: buildSteps("placeholder")
  };
}

export function createStep(type, position) {
  const template = source.defaultFlow.find((step) => step.type === type) || source.defaultFlow[0];
  return {
    ...clone(template),
    id: `${type}-${Date.now()}-${position}`,
    title: template.title,
    content: clone(template.content)
  };
}

export const stepTypes = [
  { value: "warmup", label: "Warm-up" },
  { value: "ebook", label: "E-book / Web Embed" },
  { value: "video", label: "Teaching Video" },
  { value: "presentation", label: "簡報（PDF）" },
  { value: "imageSlides", label: "Image Slides" },
  { value: "webPractice", label: "Live Interactive Practice" },
  { value: "vocabularyQuiz", label: "Vocabulary Quiz" }
];

export { questionBank, source };