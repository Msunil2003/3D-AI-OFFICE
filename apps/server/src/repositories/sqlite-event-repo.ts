import type { EventRecord } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { EventRepository } from "./types";

export class SqliteEventRepository implements EventRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): EventRecord {
    return {
      id: row.id,
      eventId: row.event_id,
      sequenceNumber: row.sequence_number,
      streamId: row.stream_id,
      causationId: row.causation_id || undefined,
      correlationId: row.correlation_id || undefined,
      producer: row.producer,
      schemaVersion: row.schema_version,
      type: row.type,
      payload: JSON.parse(row.payload || "{}"),
      timestamp: row.timestamp
    };
  }

  append(data: Omit<EventRecord, "id" | "sequenceNumber">): EventRecord {
    const stmt = this.db.prepare(`
      INSERT INTO events (
        event_id, sequence_number, stream_id, causation_id, correlation_id,
        producer, schema_version, type, payload, timestamp
      ) VALUES (
        ?,
        COALESCE((SELECT MAX(sequence_number) FROM events WHERE stream_id = ?), 0) + 1,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      data.eventId,
      data.streamId,
      data.streamId,
      data.causationId || null,
      data.correlationId || null,
      data.producer,
      data.schemaVersion || "1.0",
      data.type,
      JSON.stringify(data.payload || {}),
      data.timestamp
    );

    const row = this.db.prepare("SELECT * FROM events WHERE event_id = ?").get(data.eventId);
    return this.mapRow(row);
  }

  getByStreamId(streamId: string, afterSequence: number = 0): EventRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM events
      WHERE stream_id = ? AND sequence_number > ?
      ORDER BY sequence_number ASC
    `).all(streamId, afterSequence);
    return rows.map((r: any) => this.mapRow(r));
  }

  getByCorrelationId(correlationId: string): EventRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM events
      WHERE correlation_id = ?
      ORDER BY id ASC
    `).all(correlationId);
    return rows.map((r: any) => this.mapRow(r));
  }

  getLatest(limit: number = 100): EventRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM events
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r: any) => this.mapRow(r));
  }
}
