import { Router, Request, Response } from "express";
import { getDefaultRepositories } from "./repositories/index";
import { GitWorktreeManager } from "@office/git-worktree";
import { defaultRuntimeRegistry } from "./runtimes/index";
import { WorkspaceManager } from "./services/workspace-manager";
import { TaskService } from "./services/task-service";
import { AssignmentService } from "./services/assignment-service";
import { AgentCandidateScorer } from "./services/agent-scorer";
import { PlanningService } from "./services/planning-service";
import { ProgressMonitor } from "./services/progress-monitor";
import { ManagerService } from "./services/manager-service";
import { AgentExecutionService } from "./services/agent-execution-service";
import { ReviewOrchestrator } from "./services/review-orchestrator";
import { ApprovalService } from "./services/approval-service";
import { MergeService } from "./services/merge-service";
import { MeetingService } from "./services/meeting-service";
import { ReconciliationService } from "./services/reconciliation-service";
import { randomUUID } from "crypto";
import { execSync } from "child_process";

export function createApiRouter(): Router {
  const router = Router();
  const repos = getDefaultRepositories();
  const gitManager = new GitWorktreeManager();

  const workspaceManager = new WorkspaceManager(
    repos.workspaces,
    repos.projects,
    gitManager,
    repos.events,
    repos.audit
  );

  const taskService = new TaskService(repos.tasks, repos.events, repos.audit);

  const assignmentService = new AssignmentService(
    repos.tasks,
    repos.agents,
    repos.assignments,
    workspaceManager,
    repos.events,
    repos.audit
  );

  const agentScorer = new AgentCandidateScorer();

  const planningService = new PlanningService(
    repos.projects,
    repos.artifacts,
    repos.approvals,
    repos.events,
    repos.audit,
    gitManager
  );

  const progressMonitor = new ProgressMonitor(
    repos.projects,
    repos.tasks,
    repos.assignments,
    repos.agents
  );

  const managerService = new ManagerService(
    planningService,
    taskService,
    assignmentService,
    agentScorer,
    progressMonitor,
    repos.projects,
    repos.tasks,
    repos.agents,
    repos.approvals,
    repos.artifacts,
    repos.events,
    repos.audit
  );

  const executionService = new AgentExecutionService(
    repos.tasks,
    repos.workspaces,
    repos.agents,
    repos.assignments,
    repos.projects,
    repos.events,
    repos.audit,
    repos.artifacts,
    gitManager,
    workspaceManager,
    taskService,
    defaultRuntimeRegistry
  );

  const approvalService = new ApprovalService(
    repos.approvals,
    repos.tasks,
    repos.projects,
    repos.workspaces,
    gitManager,
    repos.events,
    repos.audit
  );

  const reviewOrchestrator = new ReviewOrchestrator(
    repos.reviews,
    repos.tasks,
    taskService,
    repos.projects,
    repos.workspaces,
    gitManager,
    repos.events,
    repos.audit
  );

  const mergeService = new MergeService(
    approvalService,
    repos.tasks,
    taskService,
    repos.projects,
    repos.workspaces,
    workspaceManager,
    gitManager,
    repos.events,
    repos.audit
  );

  const meetingService = new MeetingService(
    repos.meetings,
    repos.projects,
    repos.agents,
    repos.events,
    repos.audit
  );

  const reconciliationService = new ReconciliationService(
    repos.workspaces,
    repos.tasks,
    repos.projects,
    repos.events,
    repos.audit,
    gitManager
  );

  // Execute system reconciliation on startup
  reconciliationService.reconcileAll().then((report) => {
    console.log(`[Reconciliation] Reconciled: ${report.reconciledWorkspaces} workspaces, ${report.reconciledTasks} tasks.`);
  }).catch((err) => {
    console.warn("[Reconciliation] Startup check notice:", err.message);
  });

  // ============ PROJECTS ============
  router.get("/projects", (_req: Request, res: Response) => {
    try {
      const projects = repos.projects.findAll();
      res.json({ projects });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/projects", (req: Request, res: Response) => {
    try {
      const { name, localPath, defaultBranch, description } = req.body;
      const now = new Date().toISOString();
      const project = repos.projects.create({
        id: `proj-${randomUUID().slice(0, 8)}`,
        name: name || "Default Project",
        description,
        localPath: localPath || process.cwd(),
        defaultBranch: defaultBranch || "main",
        status: "ACTIVE",
        settings: {},
        createdAt: now,
        updatedAt: now
      });
      res.json({ project });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch("/projects/:id", (req: Request, res: Response) => {
    try {
      const updated = repos.projects.update(req.params.id, req.body);
      res.json({ project: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============ RECONCILIATION & RECOVERY ============
  router.post("/reconcile", async (_req: Request, res: Response) => {
    try {
      const report = await reconciliationService.reconcileAll();
      res.json({ report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/workspaces/:id/recover", async (req: Request, res: Response) => {
    try {
      const recovered = await reconciliationService.recoverWorkspace(req.params.id);
      res.json({ workspace: recovered });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============ TASKS ============
  router.get("/tasks", (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      const tasksList = projectId
        ? repos.tasks.findByProjectId(String(projectId))
        : repos.tasks.findAll();
      res.json({ tasks: tasksList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/tasks/:id", (req: Request, res: Response) => {
    try {
      const task = taskService.getTask(req.params.id);
      res.json({ task });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  router.post("/tasks/:id/transition", (req: Request, res: Response) => {
    try {
      const { nextStatus, expectedRevision } = req.body;
      const updated = taskService.transitionTask(req.params.id, nextStatus, expectedRevision);
      res.json({ task: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/tasks/:id/block", (req: Request, res: Response) => {
    try {
      const { reason, blockedBy, expectedRevision } = req.body;
      const updated = taskService.setBlocked(req.params.id, reason || "Blocked due to test failure", blockedBy, expectedRevision);
      res.json({ task: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/tasks/:id/unblock", (req: Request, res: Response) => {
    try {
      const { expectedRevision } = req.body;
      const updated = taskService.clearBlocked(req.params.id, expectedRevision);
      res.json({ task: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/tasks/:id/assign", async (req: Request, res: Response) => {
    try {
      const { agentId, assignedBy } = req.body;
      const result = await assignmentService.assignTask({
        taskId: req.params.id,
        agentId,
        assignedBy: assignedBy || "human"
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/tasks/:id/execute", async (req: Request, res: Response) => {
    try {
      const { prompt, filesToGenerate, autoCommit, commitMessage } = req.body;
      const result = await executionService.startExecution(req.params.id, {
        prompt,
        filesToGenerate,
        autoCommit: autoCommit ?? true,
        commitMessage
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/tasks/:id/test", async (req: Request, res: Response) => {
    try {
      const { command } = req.body;
      const result = await executionService.executeTests(req.params.id, { command });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============ PLANNING & MANAGER ============
  router.post("/planning/propose", async (req: Request, res: Response) => {
    try {
      const { projectId, prompt, goal, architecturalSummary, tasks, risks, initiatorId } = req.body;
      const planResult = await managerService.createPlan({
        projectId,
        goal: goal || prompt || "Build feature",
        architecturalSummary,
        tasks,
        risks,
        requesterId: initiatorId || "human-user"
      });
      res.json(planResult);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/planning/approve", async (req: Request, res: Response) => {
    try {
      const { planId, approverId, autoAssign } = req.body;
      const result = await managerService.approvePlan(planId, {
        approverId: approverId || "human-user",
        autoAssign: autoAssign !== false
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============ APPROVALS ============
  router.get("/approvals", (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const approvals = status === "PENDING"
        ? repos.approvals.findPending()
        : repos.approvals.findAll();
      res.json({ approvals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/approvals", (req: Request, res: Response) => {
    try {
      const { type, targetId, targetRevision, targetCommit, targetDiffHash, requesterId, reason } = req.body;
      const approval = approvalService.createApproval({
        type: type || "MERGE",
        targetId,
        targetRevision: targetRevision ?? 1,
        targetCommit,
        targetDiffHash,
        requesterId: requesterId || "human-user",
        reason: reason || "Merge approval request"
      });
      res.json({ approval });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/approvals/:id/approve", async (req: Request, res: Response) => {
    try {
      const { approverId, decisionNotes, expectedRevision } = req.body;
      const approval = await approvalService.approve(req.params.id, {
        approverId: approverId || "human-user",
        decisionNotes,
        expectedRevision
      });
      res.json({ approval });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/approvals/:id/reject", async (req: Request, res: Response) => {
    try {
      const { approverId, reason, expectedRevision } = req.body;
      const approval = await approvalService.reject(req.params.id, {
        approverId: approverId || "human-user",
        reason: reason || "Rejected by human reviewer",
        expectedRevision
      });
      res.json({ approval });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============ MERGE SERVICE ============
  router.post("/merges", async (req: Request, res: Response) => {
    try {
      const { approvalId, taskId, targetBranch, commitMessage } = req.body;
      const result = await mergeService.executeMerge({
        approvalId,
        taskId,
        targetBranch,
        commitMessage
      });
      res.json({ result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============ REVIEWS ============
  router.get("/reviews", (req: Request, res: Response) => {
    try {
      const { taskId } = req.query;
      const reviews = taskId
        ? repos.reviews.findReviewsByTaskId(String(taskId))
        : [];
      res.json({ reviews });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/reviews/start", async (req: Request, res: Response) => {
    try {
      const { taskId, reviewerId } = req.body;
      const review = await reviewOrchestrator.startReview({
        taskId,
        reviewerId: reviewerId || "agent-arch-marcus"
      });
      res.json({ review });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/reviews/:id/submit", async (req: Request, res: Response) => {
    try {
      const { summary, findings } = req.body;
      const review = await reviewOrchestrator.submitReview({
        reviewId: req.params.id,
        summary,
        findings: findings || []
      });
      res.json({ review });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============ MEETINGS ============
  router.get("/meetings", (_req: Request, res: Response) => {
    try {
      const meetings = repos.meetings.findAll();
      res.json({ meetings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/meetings/schedule", (req: Request, res: Response) => {
    try {
      const { projectId, title, purpose, participants, agenda } = req.body;
      const meeting = meetingService.scheduleMeeting({
        projectId: projectId || "default",
        title: title || "Team Sync",
        purpose: purpose || "Engineering status review",
        participants: participants || [],
        agenda: agenda || []
      });
      res.json({ meeting });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/meetings/:id/start", (req: Request, res: Response) => {
    try {
      const meeting = meetingService.startMeeting(req.params.id);
      res.json({ meeting });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/meetings/:id/conclude", (req: Request, res: Response) => {
    try {
      const { outcomes } = req.body;
      const meeting = meetingService.concludeMeeting(req.params.id, {
        outcomes: outcomes || []
      });
      res.json({ meeting });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============ EVENTS & AUDIT ============
  router.get("/events", (req: Request, res: Response) => {
    try {
      const { streamId } = req.query;
      const events = streamId
        ? repos.events.getByStreamId(String(streamId))
        : repos.events.getLatest(100);
      res.json({ events });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/audit", (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.query;
      const logs = entityType && entityId
        ? repos.audit.findByEntity(String(entityType), String(entityId))
        : repos.audit.findLatest(100);
      res.json({ audit: logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============ HEALTH & READINESS ============
  router.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "pass",
      service: "aioffice-backend",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    });
  });

  router.get("/ready", (_req: Request, res: Response) => {
    const checks: Record<string, { status: "pass" | "fail"; details?: any }> = {};
    let isReady = true;

    // 1. Database readiness
    try {
      repos.projects.findAll();
      checks.database = { status: "pass", details: "SQLite accessible and queryable" };
    } catch (err: any) {
      checks.database = { status: "fail", details: err.message };
      isReady = false;
    }

    // 2. Git CLI readiness
    try {
      const gitOut = execSync("git --version", { encoding: "utf-8", timeout: 2000 }).trim();
      checks.git = { status: "pass", details: gitOut };
    } catch (err: any) {
      checks.git = { status: "fail", details: err.message };
      isReady = false;
    }

    // 3. Runtime registry readiness
    try {
      const providers = defaultRuntimeRegistry.getSupportedProviders();
      checks.runtimeRegistry = {
        status: "pass",
        details: { registeredProviders: providers }
      };
    } catch (err: any) {
      checks.runtimeRegistry = { status: "fail", details: err.message };
      isReady = false;
    }

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
      ready: isReady,
      service: "aioffice-backend",
      timestamp: new Date().toISOString(),
      checks
    });
  });

  return router;
}
