import { copy } from './domain.mjs';
import { courseName } from './course-name.mjs';

// Course and room storage are separate. Keep block IDs within the new course
// so conversionSourceId, canvas asset references and internal links stay valid.
export function duplicateDeck(source, title, id = crypto.randomUUID()) {
  if (!id || id === source.id) throw new Error('副本需要獨立的課程 ID。');
  const result = { id, schemaVersion: source.schemaVersion || 2, title: courseName(title), blocks: copy(source.blocks), version: 0 };
  for (const key of ['rewardGame', 'legacyLessonId', 'cardColor']) if (source[key] !== undefined) result[key] = copy(source[key]);
  return result;
}
