import type { AgentEntity, AgentRole, Task, TaskType } from "@office/shared";

export interface ScoreBreakdown {
  roleScore: number;
  skillScore: number;
  availabilityScore: number;
  workloadScore: number;
}

export interface CandidateScore {
  agent: AgentEntity;
  overallScore: number;
  breakdown: ScoreBreakdown;
}

export class AgentCandidateScorer {
  private static readonly ROLE_COMPATIBILITY: Record<TaskType, Record<AgentRole, number>> = {
    FEATURE: { FULLSTACK: 100, BACKEND: 95, FRONTEND: 95, LEAD: 80, ARCHITECT: 75, QA: 50, DEVOPS: 40, SECURITY: 40 },
    BUG: { FULLSTACK: 100, BACKEND: 95, FRONTEND: 95, QA: 85, LEAD: 75, ARCHITECT: 60, DEVOPS: 50, SECURITY: 50 },
    TECHNICAL_TASK: { BACKEND: 100, DEVOPS: 95, FULLSTACK: 90, ARCHITECT: 85, LEAD: 80, FRONTEND: 70, SECURITY: 60, QA: 40 },
    REFACTOR: { ARCHITECT: 100, LEAD: 95, FULLSTACK: 90, BACKEND: 90, FRONTEND: 85, QA: 60, DEVOPS: 50, SECURITY: 50 },
    TEST: { QA: 100, FULLSTACK: 85, BACKEND: 80, FRONTEND: 80, LEAD: 60, ARCHITECT: 50, DEVOPS: 50, SECURITY: 60 },
    SECURITY: { SECURITY: 100, BACKEND: 85, DEVOPS: 80, FULLSTACK: 75, ARCHITECT: 75, LEAD: 70, QA: 50, FRONTEND: 40 },
    PERFORMANCE: { BACKEND: 100, ARCHITECT: 95, DEVOPS: 90, FULLSTACK: 85, LEAD: 80, FRONTEND: 75, QA: 50, SECURITY: 50 },
    RESEARCH: { ARCHITECT: 100, LEAD: 95, FULLSTACK: 85, BACKEND: 80, FRONTEND: 80, SECURITY: 80, QA: 60, DEVOPS: 60 },
    EPIC: { LEAD: 100, ARCHITECT: 95, FULLSTACK: 80, BACKEND: 70, FRONTEND: 70, DEVOPS: 60, SECURITY: 60, QA: 50 },
    DOCUMENTATION: { FULLSTACK: 90, LEAD: 90, QA: 85, BACKEND: 80, FRONTEND: 80, ARCHITECT: 80, DEVOPS: 70, SECURITY: 70 }
  };

  /**
   * Scores and ranks agent candidates for a given task.
   */
  public scoreCandidates(task: Task, agents: AgentEntity[], activeTasks: Task[]): CandidateScore[] {
    const scored: CandidateScore[] = [];

    for (const agent of agents) {
      // 1. Role Score
      const taskType = task.type || "FEATURE";
      const role = agent.role || "FULLSTACK";
      const roleScore = AgentCandidateScorer.ROLE_COMPATIBILITY[taskType]?.[role] ?? 60;

      // 2. Skill Score
      let skillScore = 75; // baseline
      if (agent.skills && Object.keys(agent.skills).length > 0) {
        const text = `${task.title} ${task.description || ""}`.toLowerCase();
        let matchedCount = 0;
        let proficiencySum = 0;

        for (const [skill, level] of Object.entries(agent.skills)) {
          if (text.includes(skill.toLowerCase())) {
            matchedCount++;
            proficiencySum += level * 20; // 1-5 scale -> 20-100
          }
        }

        if (matchedCount > 0) {
          skillScore = Math.min(100, Math.round(proficiencySum / matchedCount));
        } else {
          // Average proficiency of all skills as fallback
          const allSkills = Object.values(agent.skills);
          const avg = allSkills.reduce((sum, v) => sum + v, 0) / allSkills.length;
          skillScore = Math.round(avg * 18);
        }
      }

      // 3. Availability Score
      let availabilityScore = 30;
      switch (agent.status) {
        case "available":
          availabilityScore = 100;
          break;
        case "idle":
          availabilityScore = 85;
          break;
        case "thinking":
          availabilityScore = 40;
          break;
        case "working":
          availabilityScore = 25;
          break;
        case "error":
          availabilityScore = 0;
          break;
        default:
          availabilityScore = 50;
      }

      // 4. Workload Score (fewer active tasks = higher score)
      const currentLoad = activeTasks.filter(
        (t) => t.assigneeId === agent.id && t.status !== "DONE" && t.status !== "CANCELLED"
      ).length;

      let workloadScore = 100;
      if (currentLoad === 1) workloadScore = 70;
      else if (currentLoad === 2) workloadScore = 35;
      else if (currentLoad >= 3) workloadScore = 10;

      // Weighted overall calculation
      const overallScore = Math.round(
        roleScore * 0.35 +
        skillScore * 0.35 +
        availabilityScore * 0.15 +
        workloadScore * 0.15
      );

      scored.push({
        agent,
        overallScore,
        breakdown: {
          roleScore,
          skillScore,
          availabilityScore,
          workloadScore
        }
      });
    }

    // Sort descending by overall score
    return scored.sort((a, b) => b.overallScore - a.overallScore);
  }
}
