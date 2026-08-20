const MAX_PENDING_IMAGE_DELETES = 500;
const TEACHER_IMAGE_PATH_PATTERN = /^teacher-image-slides\/[a-z0-9-]{3,96}\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

function validTeacherImagePath(value) {
  const candidate = typeof value === "string" ? value : "";
  return TEACHER_IMAGE_PATH_PATTERN.test(candidate) ? candidate : "";
}

function collectTeacherImagePaths(lessons) {
  const paths = new Set();
  if (!Array.isArray(lessons)) return paths;
  for (const lesson of lessons) {
    if (!Array.isArray(lesson?.steps)) continue;
    for (const step of lesson.steps) {
      const assets = Array.isArray(step?.content?.slideAssets) ? step.content.slideAssets : [];
      for (const asset of assets) {
        if (asset?.kind !== "image") continue;
        const path = validTeacherImagePath(asset.path);
        if (path) paths.add(path);
      }
    }
  }
  return paths;
}

function addPendingPath(pending, path) {
  if (!path || pending.has(path)) return;
  if (pending.size >= MAX_PENDING_IMAGE_DELETES) {
    throw new RangeError("Too many pending Image Slides deletions.");
  }
  pending.add(path);
}

function buildPendingImageDeletes({
  previousLessons,
  nextLessons,
  existingPending = []
}) {
  const previousPaths = collectTeacherImagePaths(previousLessons);
  const nextPaths = collectTeacherImagePaths(nextLessons);
  const pending = new Set();

  for (const value of Array.isArray(existingPending) ? existingPending : []) {
    const path = validTeacherImagePath(value);
    if (path && !nextPaths.has(path)) addPendingPath(pending, path);
  }
  for (const path of previousPaths) {
    if (!nextPaths.has(path)) addPendingPath(pending, path);
  }
  return [...pending];
}

function isStorageNotFound(error) {
  const code = String(error?.code || "");
  return code === "404" || code === "storage/object-not-found";
}

async function deletePendingTeacherImages(paths, deletePath) {
  const candidates = [];
  const seen = new Set();
  for (const value of Array.isArray(paths) ? paths : []) {
    const path = validTeacherImagePath(value);
    if (path && !seen.has(path)) {
      seen.add(path);
      candidates.push(path);
    }
  }

  const deletedPaths = [];
  const failedPaths = [];
  for (let index = 0; index < candidates.length; index += 20) {
    const batch = candidates.slice(index, index + 20);
    const outcomes = await Promise.all(batch.map(async (path) => {
      try {
        await deletePath(path);
        return { path, deleted: true };
      } catch (error) {
        return { path, deleted: isStorageNotFound(error) };
      }
    }));
    for (const outcome of outcomes) {
      (outcome.deleted ? deletedPaths : failedPaths).push(outcome.path);
    }
  }
  return { deletedPaths, failedPaths };
}

module.exports = {
  MAX_PENDING_IMAGE_DELETES,
  TEACHER_IMAGE_PATH_PATTERN,
  buildPendingImageDeletes,
  collectTeacherImagePaths,
  deletePendingTeacherImages,
  validTeacherImagePath
};
