import { test, expect } from "@playwright/test";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories, ConcurrencyConflictError, NotFoundError } from "../apps/server/src/repositories";
import {
  MeetingService,
  MeetingStateError
} from "../apps/server/src/services/meeting-service";

test.describe("Phase 2I: Meeting Service & Virtual Conferences", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let meetingService: MeetingService;
  let projectId: string;
  let agent1Id: string;
  let agent2Id: string;

  test.beforeEach(() => {
    db = createInMemoryDb();
    runMigrations(db);
    repos = createRepositories(db);
    meetingService = new MeetingService(
      repos.meetings,
      repos.projects,
      repos.agents,
      repos.events,
      repos.audit
    );

    projectId = "proj-meeting-1";
    const now = new Date().toISOString();
    repos.projects.create({
      id: projectId,
      name: "Meeting Test Project",
      localPath: "C:/fake/repo",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: now,
      updatedAt: now
    });

    agent1Id = "agent-arch-sarah";
    repos.agents.create({
      id: agent1Id,
      name: "Sarah Architect",
      role: "ARCHITECT",
      department: "Engineering",
      skills: { architecture: 5 },
      status: "available",
      summary: "Leading tech roadmap",
      desk: { x: 1, y: 1 },
      provider: "mock",
      lastSeen: now
    });

    agent2Id = "agent-dev-tom";
    repos.agents.create({
      id: agent2Id,
      name: "Tom Developer",
      role: "DEVELOPER",
      department: "Engineering",
      skills: { typescript: 4 },
      status: "available",
      summary: "Working on core API",
      desk: { x: 2, y: 2 },
      provider: "mock",
      lastSeen: now
    });
  });

  test("schedules meeting with participant validation and emits ledgers", () => {
    const meeting = meetingService.scheduleMeeting({
      projectId,
      title: "Sprint 4 Architecture Alignment",
      purpose: "Align on domain model and event sourcing store",
      participants: [agent1Id, agent2Id],
      agenda: ["Review PR #42", "Discuss migration strategy", "Action items"]
    });

    expect(meeting.id).toMatch(/^meet-/);
    expect(meeting.status).toBe("SCHEDULED");
    expect(meeting.revision).toBe(1);
    expect(meeting.participants).toEqual([agent1Id, agent2Id]);

    const events = repos.events.getByStreamId(meeting.id);
    expect(events.some((e) => e.type === "meeting.scheduled")).toBe(true);

    const audits = repos.audit.findByEntity("MEETING", meeting.id);
    expect(audits.some((a) => a.action === "meeting.scheduled")).toBe(true);
  });

  test("rejects scheduling when participant agent does not exist", () => {
    expect(() => {
      meetingService.scheduleMeeting({
        projectId,
        title: "Ghost Meeting",
        purpose: "Testing missing participant",
        participants: ["agent-nonexistent"],
        agenda: ["Ghost agenda"]
      });
    }).toThrow(NotFoundError);
  });

  test("runs full meeting lifecycle: scheduled -> in_progress -> completed with OCC", () => {
    const meeting = meetingService.scheduleMeeting({
      projectId,
      title: "Design Review",
      purpose: "Review UI mockups",
      participants: [agent1Id],
      agenda: ["Look at 3D canvas"]
    });

    // Start meeting
    const started = meetingService.startMeeting(meeting.id, {
      expectedRevision: meeting.revision
    });
    expect(started.status).toBe("IN_PROGRESS");
    expect(started.revision).toBe(2);
    expect(started.startedAt).toBeDefined();

    // Conclude meeting
    const concluded = meetingService.concludeMeeting(meeting.id, {
      outcomes: ["Approved 3D canvas layout", "Proceed with implementation"],
      expectedRevision: started.revision
    });
    expect(concluded.status).toBe("COMPLETED");
    expect(concluded.revision).toBe(3);
    expect(concluded.outcomes).toHaveLength(2);
    expect(concluded.completedAt).toBeDefined();
  });

  test("enforces OCC: rejects concurrent update with stale revision", () => {
    const meeting = meetingService.scheduleMeeting({
      projectId,
      title: "Standup",
      purpose: "Daily status sync",
      participants: [agent1Id],
      agenda: ["Yesterday, Today, Blockers"]
    });

    // Start advances revision to 2
    meetingService.startMeeting(meeting.id, { expectedRevision: 1 });

    // Attempting another mutation expecting revision 1 fails
    expect(() => {
      meetingService.concludeMeeting(meeting.id, {
        outcomes: ["Done"],
        expectedRevision: 1
      });
    }).toThrow(ConcurrencyConflictError);
  });

  test("cancels meeting from scheduled state", () => {
    const meeting = meetingService.scheduleMeeting({
      projectId,
      title: "Cancelled Standup",
      purpose: "No updates needed",
      participants: [agent1Id],
      agenda: []
    });

    const cancelled = meetingService.cancelMeeting(meeting.id, {
      reason: "Postponed to next week"
    });
    expect(cancelled.status).toBe("CANCELLED");

    // Cannot start a cancelled meeting
    expect(() => {
      meetingService.startMeeting(meeting.id);
    }).toThrow(MeetingStateError);
  });
});
