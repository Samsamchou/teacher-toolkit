const LEGACY_EBOOK_URL_PATTERN = /^https:\/\/h5\.hle\.com\.tw\/toolbar\/release\/index\.html\?key=/i;
const LEGACY_FLAT_LESSON_PATTERN = /^(hwg[57])-(u0[1-4])$/i;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findEbookStep(lesson) {
  return lesson?.steps?.find((step) => step.type === "ebook") || null;
}

export function isLegacyEbookUrl(url) {
  return typeof url === "string" && LEGACY_EBOOK_URL_PATTERN.test(url.trim());
}

export function normalizeLegacyLessonId(id) {
  const match = String(id || "").match(LEGACY_FLAT_LESSON_PATTERN);
  if (!match) return String(id || "");
  return `${match[1].toLowerCase()}-${match[2].toLowerCase()}-l01`;
}

function mergeCanonicalLesson(seed, stored, originalId) {
  const merged = {
    ...clone(seed),
    ...clone(stored),
    id: seed.id,
    bookId: seed.bookId,
    unitId: seed.unitId,
    unitKey: seed.unitKey,
    lessonNumber: seed.lessonNumber,
    theme: clone(seed.theme)
  };
  if (originalId !== seed.id) {
    merged.migratedFromLessonId = originalId;
  }
  return merged;
}

export function migrateLessonsForStructure(lessons, seedLessons) {
  const seeds = Array.isArray(seedLessons) ? seedLessons : [];
  if (!Array.isArray(lessons)) return seeds;

  const seedById = new Map(seeds.map((lesson) => [lesson.id, lesson]));
  const migratedById = new Map();
  const customLessons = [];

  for (const lesson of lessons) {
    if (!lesson || typeof lesson !== "object") continue;
    const normalizedId = normalizeLegacyLessonId(lesson.id);
    const canonical = seedById.get(normalizedId);
    if (canonical) {
      const existing = migratedById.get(normalizedId);
      // Prefer a current-structure edit if both an old flat and current lesson exist.
      if (!existing || lesson.id === normalizedId) {
        migratedById.set(normalizedId, mergeCanonicalLesson(canonical, lesson, lesson.id));
      }
      continue;
    }
    customLessons.push({ ...clone(lesson), migratedFromLessonId: lesson.id });
  }

  return [
    ...seeds.map((seed) => migratedById.get(seed.id) || clone(seed)),
    ...customLessons
  ];
}

export function migrateLegacyEbookUrls(lessons, seedLessons) {
  if (!Array.isArray(lessons)) return Array.isArray(seedLessons) ? seedLessons : [];
  const canonicalLesson = Array.isArray(seedLessons)
    ? seedLessons.find((lesson) => lesson.id === "hwg7-u01-l01")
    : null;
  const canonicalContent = findEbookStep(canonicalLesson)?.content;
  if (!canonicalContent?.url || isLegacyEbookUrl(canonicalContent.url)) return lessons;

  let changed = false;
  const migratedLessons = lessons.map((lesson) => {
    if (normalizeLegacyLessonId(lesson?.id) !== "hwg7-u01-l01" || !Array.isArray(lesson.steps)) return lesson;
    let lessonChanged = false;
    const steps = lesson.steps.map((step) => {
      if (step.type !== "ebook" || !isLegacyEbookUrl(step.content?.url)) return step;
      changed = true;
      lessonChanged = true;
      return {
        ...step,
        content: {
          ...step.content,
          displayName: canonicalContent.displayName,
          url: canonicalContent.url,
          teacherOnly: canonicalContent.teacherOnly,
          allowFullscreen: canonicalContent.allowFullscreen
        }
      };
    });
    return lessonChanged ? { ...lesson, steps } : lesson;
  });
  return changed ? migratedLessons : lessons;
}

export function migrateLessonState(lessons, seedLessons) {
  return migrateLegacyEbookUrls(migrateLessonsForStructure(lessons, seedLessons), seedLessons);
}

export function migrateResultsForStructure(results, lessons) {
  if (!Array.isArray(results)) return [];
  const lessonById = new Map((Array.isArray(lessons) ? lessons : []).map((lesson) => [lesson.id, lesson]));
  return results.map((result) => {
    const lessonId = normalizeLegacyLessonId(result?.lessonId);
    const lesson = lessonById.get(lessonId);
    return {
      ...result,
      lessonId,
      lessonTitle: lesson?.title || result?.lessonTitle || lessonId
    };
  });
}