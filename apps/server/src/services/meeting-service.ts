import { randomUUID } from "crypto";
import {
  Meeting,
  MeetingStatus
} from "@office/shared";
import {
  AgentRepository,
  AuditRepository,
  ConcurrencyConflictError,
  EventRepository,
  MeetingRepository,
  NotFoundError,
  ProjectRepository
} from "../repositories";

export class MeetingStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeetingStateError";
  }
}

export interface ScheduleMeetingParams {
  projectId: string;
  title: string;
  purpose: string;
  participants: string[];
  agenda: string[];
}

export interface ConcludeMeetingParams {
  outcomes: string[];
  expectedRevision?: number;
}

export class MeetingService {
  constructor(
    private meetingRepo: MeetingRepository,
    private projectRepo: ProjectRepository,
    private agentRepo: AgentRepository,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository
  ) {}

  /**
   * Schedules a new virtual organization meeting with participant agents.
   */
  public scheduleMeeting(params: ScheduleMeetingParams): Meeting {
    const project = this.projectRepo.findById(params.projectId);
    if (!project) {
      throw new NotFoundError("Project", params.projectId);
    }

    // Verify participant agents
    for (const agentId of params.participants) {
      const agent = this.agentRepo.findById(agentId);
      if (!agent) {
        throw new NotFoundError("Agent", agentId);
      }
    }

    const meetingId = `meet-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const meeting = this.meetingRepo.create({
      id: meetingId,
      projectId: params.projectId,
      title: params.title,
      purpose: params.purpose,
      status: "SCHEDULED",
      participants: params.participants,
      agenda: params.agenda,
      outcomes: [],
      createdAt: now,
      updatedAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: meeting.id,
      correlationId: params.projectId,
      producer: "meeting-service",
      schemaVersion: "1.0",
      type: "meeting.scheduled",
      payload: {
        meetingId: meeting.id,
        projectId: params.projectId,
        title: meeting.title,
        participants: meeting.participants,
        agenda: meeting.agenda
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "meeting.scheduled",
      actorId: "manager",
      entityType: "MEETING",
      entityId: meeting.id,
      details: {
        title: meeting.title,
        participants: meeting.participants
      },
      timestamp: now
    });

    return meeting;
  }

  /**
   * Starts a scheduled meeting.
   */
  public startMeeting(meetingId: string, params?: { expectedRevision?: number }): Meeting {
    const meeting = this.meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting", meetingId);
    }

    if (meeting.status !== "SCHEDULED") {
      throw new MeetingStateError(
        `Cannot start meeting '${meetingId}' with status '${meeting.status}'. Expected 'SCHEDULED'.`
      );
    }

    const now = new Date().toISOString();
    const updated = this.meetingRepo.update(
      meetingId,
      {
        status: "IN_PROGRESS",
        startedAt: now,
        updatedAt: now
      },
      params?.expectedRevision
    );

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: meeting.id,
      correlationId: meeting.projectId,
      producer: "meeting-service",
      schemaVersion: "1.0",
      type: "meeting.started",
      payload: {
        meetingId: meeting.id,
        startedAt: now
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "meeting.started",
      actorId: "manager",
      entityType: "MEETING",
      entityId: meeting.id,
      details: {
        startedAt: now
      },
      timestamp: now
    });

    return updated;
  }

  /**
   * Concludes an in-progress meeting with recorded outcomes.
   */
  public concludeMeeting(meetingId: string, params: ConcludeMeetingParams): Meeting {
    const meeting = this.meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting", meetingId);
    }

    if (meeting.status !== "IN_PROGRESS") {
      throw new MeetingStateError(
        `Cannot conclude meeting '${meetingId}' with status '${meeting.status}'. Expected 'IN_PROGRESS'.`
      );
    }

    const now = new Date().toISOString();
    const updated = this.meetingRepo.update(
      meetingId,
      {
        status: "COMPLETED",
        outcomes: params.outcomes,
        completedAt: now,
        updatedAt: now
      },
      params.expectedRevision
    );

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: meeting.id,
      correlationId: meeting.projectId,
      producer: "meeting-service",
      schemaVersion: "1.0",
      type: "meeting.completed",
      payload: {
        meetingId: meeting.id,
        outcomes: params.outcomes,
        completedAt: now
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "meeting.completed",
      actorId: "manager",
      entityType: "MEETING",
      entityId: meeting.id,
      details: {
        outcomes: params.outcomes
      },
      timestamp: now
    });

    return updated;
  }

  /**
   * Cancels a scheduled or in-progress meeting.
   */
  public cancelMeeting(meetingId: string, params?: { reason?: string; expectedRevision?: number }): Meeting {
    const meeting = this.meetingRepo.findById(meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting", meetingId);
    }

    if (meeting.status !== "SCHEDULED" && meeting.status !== "IN_PROGRESS") {
      throw new MeetingStateError(
        `Cannot cancel meeting '${meetingId}' with status '${meeting.status}'.`
      );
    }

    const now = new Date().toISOString();
    const updated = this.meetingRepo.update(
      meetingId,
      {
        status: "CANCELLED",
        completedAt: now,
        updatedAt: now
      },
      params?.expectedRevision
    );

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: meeting.id,
      correlationId: meeting.projectId,
      producer: "meeting-service",
      schemaVersion: "1.0",
      type: "meeting.cancelled",
      payload: {
        meetingId: meeting.id,
        reason: params?.reason
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "meeting.cancelled",
      actorId: "manager",
      entityType: "MEETING",
      entityId: meeting.id,
      details: {
        reason: params?.reason
      },
      timestamp: now
    });

    return updated;
  }

  public getMeeting(id: string): Meeting {
    const meeting = this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundError("Meeting", id);
    }
    return meeting;
  }

  public getMeetingsForProject(projectId: string): Meeting[] {
    return this.meetingRepo.findByProjectId(projectId);
  }

  public getAllMeetings(): Meeting[] {
    return this.meetingRepo.findAll();
  }
}
