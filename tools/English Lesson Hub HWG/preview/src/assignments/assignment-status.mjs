// Teacher-side display status only; the server still enforces closed/due checks.
export const assignmentEnded = (a, now = Date.now()) => Boolean(a?.closed) || a?.dueAt <= now;

// Open assignments first; each group keeps the server's newest-first order.
export const sortAssignments = (list, now = Date.now()) =>
  list.map((a, i) => ({ a, i, ended: assignmentEnded(a, now) }))
    .sort((x, y) => x.ended - y.ended || x.i - y.i)
    .map(x => x.a);

export const assignmentLabel = (a, now = Date.now()) =>
  `${a.title} · ${a.code}${assignmentEnded(a, now) ? '（已結束）' : ''}`;
