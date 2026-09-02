import { describe, expect, it } from "vitest";
import { activeAssignments, EMPTY_SNAPSHOT } from "../domain/logic";
import type {
  AppSnapshot,
  Assignment,
  ClassroomIncident,
  SubmissionEvent,
} from "../types";
import { applyLocalDeletion, normalizeSnapshot, stripUndefined } from "./repository";

const assignment: Assignment = {
  id: "assignment-1",
  classId: "四乙",
  subjectId: "english",
  assignedDate: "2026-09-01",
  period: 3,
  homeworkType: "textbook",
  content: "課本 p.4",
  createdAt: "2026-09-01T03:30:00.000Z",
};

const submission: SubmissionEvent = {
  id: "submission-1",
  assignmentId: assignment.id,
  classId: "四乙",
  seatNumber: 10,
  outcome: "still-missing",
  reason: "unexcused",
  occurredOn: "2026-09-01",
  recordedAt: "2026-09-01T08:00:00.000Z",
};

const incident: ClassroomIncident = {
  id: "incident-1",
  classId: "四乙",
  subjectId: "english",
  date: "2026-09-01",
  period: 3,
  category: "late",
  seatNumber: 10,
  weight: 1,
  recordedAt: "2026-09-01T01:00:00.000Z",
};

const snapshot = (): AppSnapshot => ({
  ...structuredClone(EMPTY_SNAPSHOT),
  assignments: [assignment],
  submissionEvents: [submission],
  classroomIncidents: [incident],
});

describe("snapshot compatibility / 備份相容", () => {
  it("adds empty deletion collections to a legacy schemaVersion 1 backup", () => {
    const normalized = normalizeSnapshot({
      schemaVersion: 1,
      assignments: [assignment],
      submissionEvents: [],
      classroomIncidents: [],
      timetableExceptions: [],
      attentionWeights: { ...EMPTY_SNAPSHOT.attentionWeights },
    });

    expect(normalized.assignmentRevocations).toEqual([]);
    expect(normalized.deletedRecords).toEqual([]);
    expect(normalized.deletionAudits).toEqual([]);
  });

  it("removes an undefined optional incident note before Firestore writes", () => {
    expect(stripUndefined({ ...incident, note: undefined })).toEqual(incident);
  });

  it("drops recycle payloads after their purge time", () => {
    const normalized = normalizeSnapshot({
      ...snapshot(),
      deletedRecords: [
        {
          id: "expired-incident",
          recordType: "classroom-incident",
          originalId: incident.id,
          payload: incident,
          deletedAt: "2026-07-01T00:00:00.000Z",
          purgeAt: "2026-07-31T00:00:00.000Z",
        },
      ],
    });

    expect(normalized.deletedRecords).toEqual([]);
  });
});

describe("local deletion contract / 本機刪除契約", () => {
  it("revokes an assignment, cascades submissions, and stays idempotent", () => {
    const value = snapshot();
    const now = new Date("2026-09-02T02:00:00.000Z");

    expect(applyLocalDeletion(value, "assignment", assignment.id, now)).toEqual({
      status: "deleted",
      deletedCount: 1,
    });
    expect(value.assignments).toEqual([assignment]);
    expect(activeAssignments(value)).toEqual([]);
    expect(value.submissionEvents).toEqual([]);
    expect(value.deletedRecords).toMatchObject([
      {
        recordType: "submission-event",
        originalId: submission.id,
        parentAssignmentId: assignment.id,
        payload: submission,
        deletedAt: "2026-09-02T02:00:00.000Z",
        purgeAt: "2026-10-02T02:00:00.000Z",
      },
    ]);
    expect(value.deletionAudits).toEqual([
      {
        id: `assignment_${assignment.id}`,
        recordType: "assignment",
        originalId: assignment.id,
        deletedAt: "2026-09-02T02:00:00.000Z",
        deletedCount: 1,
      },
    ]);

    expect(applyLocalDeletion(value, "assignment", assignment.id, now)).toEqual({
      status: "already-deleted",
      deletedCount: 1,
    });
    expect(value.assignmentRevocations).toHaveLength(1);
    expect(value.deletedRecords).toHaveLength(1);
  });

  it("moves a classroom incident to the 30-day recycle bin", () => {
    const value = snapshot();
    const now = new Date("2026-09-02T02:00:00.000Z");

    expect(
      applyLocalDeletion(value, "classroom-incident", incident.id, now),
    ).toEqual({ status: "deleted", deletedCount: 1 });
    expect(value.classroomIncidents).toEqual([]);
    expect(value.deletedRecords).toMatchObject([
      {
        recordType: "classroom-incident",
        originalId: incident.id,
        payload: incident,
        deletedAt: "2026-09-02T02:00:00.000Z",
        purgeAt: "2026-10-02T02:00:00.000Z",
      },
    ]);
    expect(value.deletionAudits[0]).toEqual({
      id: `classroom-incident_${incident.id}`,
      recordType: "classroom-incident",
      originalId: incident.id,
      deletedAt: "2026-09-02T02:00:00.000Z",
      deletedCount: 1,
    });
  });
});
