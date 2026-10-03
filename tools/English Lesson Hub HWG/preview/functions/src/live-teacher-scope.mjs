// One verified teacher passcode protects this site's private teacher workspace.
// Never accept workspace IDs from browser input, or replace a student's identity.
const teacherActions = new Set(['decks','saveDeck','previousDeck','create','control','report','reports']);
export function createTeacherScope({db, requireTeacher}) {
  return async (request, service) => {
    const action = request.data?.action;
    const teacherRequest = service === 'live'
      ? teacherActions.has(action) || (action === 'snapshot' && Boolean(request.data?.sessionToken))
      : service === 'media'
        ? action !== 'read' || Boolean(request.data?.sessionToken)
        : service === 'image';
    if (!teacherRequest) return {request, requireTeacher};
    // Validate the real browser session BEFORE resolving its stable workspace.
    const session = await requireTeacher(request);
    const config = (await db.collection('liveTeacherWorkspacesV2').doc('primary').get()).data();
    if (config?.schemaVersion !== 1 || config?.enabled !== true ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(config?.ownerUid || ''))
      throw new Error('教師課程庫尚未完成設定，請聯絡管理者；請勿重新建立課程。');
    const scoped = {...request, auth:{...request.auth,uid:config.ownerUid},
      teacherUploadUid:request.auth.uid};
    return {request:scoped, requireTeacher:async candidate=>{
      if(candidate !== scoped) throw new Error('教師工作階段不符。');
      return session;
    }};
  };
}
