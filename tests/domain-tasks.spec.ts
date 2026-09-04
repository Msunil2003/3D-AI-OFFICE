import { test, expect } from "@playwright/test";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories } from "../apps/server/src/repositories";
import { TaskService } from "../apps/server/src/services/task-service";

test.describe("Phase 2C: Task State Machine & Dependencies", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let taskService: TaskService;

  test.beforeEach(() => {
    db = createInMemoryDb();
    runMigrations(db);
    repos = createRepositories(db);
    taskService = new TaskService(repos.tasks, repos.events, repos.audit);

    repos.projects.create({
      id: "proj-1",
      name: "Test Project",
      localPath: "/repos/test",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  test.afterEach(() => {
    db.close();
  });

  test("enforces valid state machine transitions", () => {
    const task = taskService.createTask({
      projectId: "proj-1",
      title: "Feature Development",
      type: "FEATURE"
    });
    expect(task.status).toBe("READY");

    // READY -> ASSIGNED
    const assigned = taskService.transitionTask(task.id, "ASSIGNED");
    expect(assigned.status).toBe("ASSIGNED");

    // ASSIGNED -> IN_PROGRESS
    const inProgress = taskService.transitionTask(task.id, "IN_PROGRESS");
    expect(inProgress.status).toBe("IN_PROGRESS");
    expect(inProgress.startedAt).toBeDefined();

    // IN_PROGRESS -> TESTING
    const testing = taskService.transitionTask(task.id, "TESTING");
    expect(testing.status).toBe("TESTING");

    // TESTING -> READY_FOR_REVIEW
    const readyReview = taskService.transitionTask(task.id, "READY_FOR_REVIEW");
    expect(readyReview.status).toBe("READY_FOR_REVIEW");

    // READY_FOR_REVIEW -> IN_REVIEW
    const inReview = taskService.transitionTask(task.id, "IN_REVIEW");
    expect(inReview.status).toBe("IN_REVIEW");

    // IN_REVIEW -> APPROVAL
    const approval = taskService.transitionTask(task.id, "APPROVAL");
    expect(approval.status).toBe("APPROVAL");

    // APPROVAL -> READY_FOR_MERGE
    const readyMerge = taskService.transitionTask(task.id, "READY_FOR_MERGE");
    expect(readyMerge.status).toBe("READY_FOR_MERGE");

    // READY_FOR_MERGE -> DONE
    const done = taskService.transitionTask(task.id, "DONE");
    expect(done.status).toBe("DONE");
    expect(done.completedAt).toBeDefined();
  });

  test("rejects invalid state transitions", () => {
    const task = taskService.createTask({
      projectId: "proj-1",
      title: "Direct Jump Attempt"
    });
    expect(task.status).toBe("READY");

    // Attempt invalid jump directly to DONE
    expect(() => {
      taskService.transitionTask(task.id, "DONE");
    }).toThrow(/Invalid task state transition from 'READY' to 'DONE'/);

    // Attempt invalid jump directly to IN_REVIEW
    expect(() => {
      taskService.transitionTask(task.id, "IN_REVIEW");
    }).toThrow(/Invalid task state transition/);
  });

  test("enforces dependency DAG: blocks starting task until dependencies are DONE", () => {
    const taskA = taskService.createTask({
      projectId: "proj-1",
      title: "Database Migration"
    });

    const taskB = taskService.createTask({
      projectId: "proj-1",
      title: "API Implementation",
      dependencies: [taskA.id]
    });

    taskService.transitionTask(taskB.id, "ASSIGNED");

    // Attempt to start taskB while taskA is still READY
    expect(() => {
      taskService.transitionTask(taskB.id, "IN_PROGRESS");
    }).toThrow(/blocked by prerequisite task/);

    // Complete taskA through its lifecycle
    taskService.transitionTask(taskA.id, "ASSIGNED");
    taskService.transitionTask(taskA.id, "IN_PROGRESS");
    taskService.transitionTask(taskA.id, "TESTING");
    taskService.transitionTask(taskA.id, "READY_FOR_REVIEW");
    taskService.transitionTask(taskA.id, "IN_REVIEW");
    taskService.transitionTask(taskA.id, "APPROVAL");
    taskService.transitionTask(taskA.id, "READY_FOR_MERGE");
    taskService.transitionTask(taskA.id, "DONE");

    // Now taskB can successfully transition to IN_PROGRESS
    const startedB = taskService.transitionTask(taskB.id, "IN_PROGRESS");
    expect(startedB.status).toBe("IN_PROGRESS");
  });

  test("handles non-sequential blocked condition without losing lifecycle state", () => {
    const task = taskService.createTask({
      projectId: "proj-1",
      title: "Payment Gateway Integration"
    });

    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");

    // Set blocked condition
    const blockedTask = taskService.setBlocked(
      task.id,
      "Stripe webhook API keys missing",
      "Billing Team"
    );

    expect(blockedTask.status).toBe("IN_PROGRESS"); // Still IN_PROGRESS!
    expect(blockedTask.blocked).toBe(true);
    expect(blockedTask.blockedReason).toBe("Stripe webhook API keys missing");
    expect(blockedTask.blockedBy).toBe("Billing Team");

    // Clear blocked condition
    const unblockedTask = taskService.clearBlocked(task.id);
    expect(unblockedTask.status).toBe("IN_PROGRESS");
    expect(unblockedTask.blocked).toBe(false);
    expect(unblockedTask.blockedReason).toBeUndefined();

    // Can proceed normally to testing
    const testingTask = taskService.transitionTask(task.id, "TESTING");
    expect(testingTask.status).toBe("TESTING");
  });
});
