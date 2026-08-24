const LEGACY_EBOOK_URL_PATTERN = /^https:\/\/h5\.hle\.com\.tw\/toolbar\/release\/index\.html\?key=/i;
const LEGACY_FLAT_LESSON_PATTERN = /^(hwg[57])-(u0[1-4])$/i;
const REMOVED_STARTER_LESSON_PATTERN = /^hwg[57]-starter-l0[45]$/i;
const TARGET_POWERPOINT_LESSON_ID = "hwg5-starter-l01";

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

export function isRemovedStarterLessonId(id) {
  return REMOVED_STARTER_LESSON_PATTERN.test(String(id || ""));
}

function withMissingPresentationStep(seed, storedSteps) {
  const existingSteps = Array.isArray(storedSteps) ? clone(storedSteps) : clone(seed.steps || []);
  const presentation = (seed.steps || []).find((step) => step.type === "presentation");
  if (!presentation || existingSteps.some((step) => step?.type === "presentation")) return existingSteps;
  const videoIndex = existingSteps.findIndex((step) => step?.type === "video");
  const insertAt = videoIndex >= 0 ? videoIndex + 1 : existingSteps.length;
  existingSteps.splice(insertAt, 0, clone(presentation));
  return existingSteps;
}

function withTargetPowerPointStep(seed, storedSteps) {
  const existingSteps = Array.isArray(storedSteps) ? clone(storedSteps) : [];
  const targetStep = seed?.steps?.[0];
  if (seed?.id !== TARGET_POWERPOINT_LESSON_ID || targetStep?.type !== "powerpoint") return existingSteps;
  if (existingSteps[0]?.type === "powerpoint") {
    const current = existingSteps[0];
    const currentContent = current.content || {};
    const legacyTitle = !String(current.title || "").trim() || current.title === "PowerPoint（動畫）";
    const legacyDisplayName = !String(currentContent.displayName || "").trim() || ["課堂 PowerPoint", "課堂線上簡報"].includes(currentContent.displayName);
    const legacyDefaults = legacyTitle && legacyDisplayName;
    existingSteps[0] = {
      ...current,
      title: legacyTitle ? targetStep.title : current.title,
      content: {
        ...clone(targetStep.content || {}),
        ...currentContent,
        displayName: legacyDisplayName ? targetStep.content?.displayName : currentContent.displayName,
        embedUrl: legacyDefaults || !String(currentContent.embedUrl || "").trim()
          ? targetStep.content?.embedUrl || ""
          : currentContent.embedUrl
      }
    };
    return existingSteps;
  }
  if (existingSteps.length === 0) return [clone(targetStep)];
  existingSteps[0] = clone(targetStep);
  return existingSteps;
}

function withOfficialMediaDefaults(seedSteps, storedSteps) {
  const seedsByType = new Map((Array.isArray(seedSteps) ? seedSteps : []).map((step) => [step?.type, step]));
  return (Array.isArray(storedSteps) ? storedSteps : []).map((step) => {
    if (step?.type !== "video" && step?.type !== "presentation") return step;
    const officialMedia = seedsByType.get(step.type)?.content?.uploadedMedia;
    const existingContent = step.content || {};
    const hasCustomSource = Boolean(existingContent.uploadedMedia?.path || String(existingContent.url || "").trim());
    if (!officialMedia?.path || hasCustomSource) return step;
    return {
      ...step,
      content: {
        ...existingContent,
        uploadedMedia: clone(officialMedia)
      }
    };
  });
}

function withoutStoredDownloadTokens(steps) {
  return (Array.isArray(steps) ? steps : []).map((step) => {
    const uploadedMedia = step?.content?.uploadedMedia;
    if (!uploadedMedia?.path || !("downloadUrl" in uploadedMedia)) return step;
    const { downloadUrl, ...safeMedia } = uploadedMedia;
    return {
      ...step,
      content: {
        ...step.content,
        uploadedMedia: safeMedia
      }
    };
  });
}

function mergeCanonicalLesson(seed, stored, originalId) {
  const storedCopy = clone(stored);
  const merged = {
    ...clone(seed),
    ...storedCopy,
    id: seed.id,
    bookId: seed.bookId,
    unitId: seed.unitId,
    unitKey: seed.unitKey,
    lessonNumber: seed.lessonNumber,
    theme: clone(seed.theme)
  };
  const stepsWithPresentation = withMissingPresentationStep(seed, storedCopy.steps);
  const stepsWithTargetPowerPoint = withTargetPowerPointStep(seed, stepsWithPresentation);
  merged.steps = withoutStoredDownloadTokens(withOfficialMediaDefaults(seed.steps, stepsWithTargetPowerPoint));
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
    if (isRemovedStarterLessonId(normalizedId)) continue;
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