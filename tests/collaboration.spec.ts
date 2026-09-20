import { test, expect } from "@playwright/test";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories, NotFoundError } from "../apps/server/src/repositories";
import { TaskService } from "../apps/server/src/services/task-service";
import {
  CollaborationService,
  CollaborationValidationError,
  InvalidCollaborationStateError,
  CollaborationPermissionError
} from "../apps/server/src/services/collaboration-service";

test.describe("Phase 2G: Peer Collaboration & Assistance", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let taskService: TaskService;
  let collabService: CollaborationService;
  let projectId: string;
  let senderId: string;
  let recipientId: string;
  let taskId: string;

  test.beforeEach(() => {
    db = createInMemoryDb();
    runMigrations(db);
    repos = createRepositories(db);
    taskService = new TaskService(repos.tasks, repos.events, repos.audit);
    collabService = new CollaborationService(
      repos.collaborations,
      repos.agents,
      repos.tasks,
      repos.projects,
      repos.events,
      repos.audit
    );

    projectId = "proj-collab-1";
    const now = new Date().toISOString();
    repos.projects.create({
      id: projectId,
      name: "Collaboration Test Project",
      localPath: "C:/fake/repo",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: now,
      updatedAt: now
    });

    senderId = "agent-dev-alice";
    repos.agents.create({
      id: senderId,
      name: "Alice Developer",
      role: "DEVELOPER",
      department: "Engineering",
      skills: { typescript: 4 },
      status: "working",
      summary: "Working on auth",
      desk: { x: 1, y: 1 },
      provider: "mock",
      lastSeen: now
    });

    recipientId = "agent-sec-bob";
    repos.agents.create({
      id: recipientId,
      name: "Bob Security",
      role: "SECURITY_ENGINEER",
      department: "Security",
      skills: { security: 5, cryptography: 5 },
      status: "available",
      summary: "Available for consult",
      desk: { x: 2, y: 2 },
      provider: "mock",
      lastSeen: now
    });

    const task = taskService.createTask({
      projectId,
      title: "Implement OAuth2 Token Exchange"
    });
    taskId = task.id;
  });

  test("creates collaboration request and records audit trail", () => {
    const request = collabService.requestAssistance({
      taskId,
      senderId,
      recipientId,
      reason: "Security review on token signing implementation",
      message: "Hey Bob, can you review the RS256 token validation logic?"
    });

    expect(request.id).toMatch(/^collab-/);
    expect(request.status).toBe("REQUESTED");
    expect(request.taskId).toBe(taskId);
    expect(request.senderId).toBe(senderId);
    expect(request.recipientId).toBe(recipientId);

    // Event & audit records emitted
    const events = repos.events.getByStreamId(taskId);
    expect(events.some((e) => e.type === "collaboration.requested")).toBe(true);

    const audits = repos.audit.findByEntity("TASK", taskId);
    expect(audits.some((a) => a.action === "collaboration.requested")).toBe(true);
  });

  test("rejects self-collaboration request", () => {
    expect(() => {
      collabService.requestAssistance({
        taskId,
        senderId,
        recipientId: senderId,
        reason: "Need help",
        message: "Helping myself"
      });
    }).toThrow(CollaborationValidationError);
  });

  test("recipient accepts assistance and completes session", () => {
    const request = collabService.requestAssistance({
      taskId,
      senderId,
      recipientId,
      reason: "Crypto review",
      message: "Review requested"
    });

    // Recipient accepts
    const accepted = collabService.acceptAssistance(request.id, {
      actorId: recipientId,
      notes: "Sure, reviewing the token logic now."
    });
    expect(accepted.status).toBe("ACCEPTED");

    const events = repos.events.getByStreamId(taskId);
    expect(events.some((e) => e.type === "collaboration.accepted")).toBe(true);

    // Complete collaboration session
    const completed = collabService.completeAssistance(request.id, {
      actorId: recipientId,
      outcome: "Validated RS256 key rotation and verified PKCE support."
    });
    expect(completed.status).toBe("COMPLETED");

    const completeEvents = repos.events.getByStreamId(taskId);
    expect(completeEvents.some((e) => e.type === "collaboration.completed")).toBe(true);
  });

  test("permission guard: unauthorized agent cannot accept or decline request", () => {
    const request = collabService.requestAssistance({
      taskId,
      senderId,
      recipientId,
      reason: "Peer review",
      message: "Review needed"
    });

    const eavesdropperId = "agent-charlie";
    expect(() => {
      collabService.acceptAssistance(request.id, {
        actorId: eavesdropperId
      });
    }).toThrow(CollaborationPermissionError);

    expect(() => {
      collabService.declineAssistance(request.id, {
        actorId: eavesdropperId
      });
    }).toThrow(CollaborationPermissionError);
  });

  test("recipient declines assistance and emits event", () => {
    const request = collabService.requestAssistance({
      taskId,
      senderId,
      recipientId,
      reason: "Urgent assistance",
      message: "Can you pair now?"
    });

    const declined = collabService.declineAssistance(request.id, {
      actorId: recipientId,
      reason: "Currently engaged in high-priority incident triage"
    });
    expect(declined.status).toBe("DECLINED");

    const events = repos.events.getByStreamId(taskId);
    expect(events.some((e) => e.type === "collaboration.declined")).toBe(true);

    // Cannot accept after declined
    expect(() => {
      collabService.acceptAssistance(request.id, {
        actorId: recipientId
      });
    }).toThrow(InvalidCollaborationStateError);
  });

  test("sender can cancel pending or accepted collaboration", () => {
    const request = collabService.requestAssistance({
      taskId,
      senderId,
      recipientId,
      reason: "Help needed",
      message: "Help please"
    });

    const cancelled = collabService.cancelAssistance(request.id, {
      actorId: senderId,
      reason: "Solved the issue independently"
    });
    expect(cancelled.status).toBe("CANCELLED");

    // Cannot complete cancelled request
    expect(() => {
      collabService.completeAssistance(request.id, {
        actorId: recipientId
      });
    }).toThrow(InvalidCollaborationStateError);
  });
});
