import { Request } from 'express';
import { run, queryAll } from '../db/index.js';
import logger from '../logger.js';

export interface AuditEntry {
  action: 'delete' | 'bulk_delete' | 'cascade_delete';
  entity_type: 'topic' | 'set' | 'card' | 'media' | 'batch_cards';
  entity_id?: string | null;
  entity_name?: string | null;
  cards_affected?: number;
  metadata?: Record<string, unknown>;
  req?: Request;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  cards_affected: number;
  metadata: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function logAudit(entry: AuditEntry): void {
  try {
    const ip = entry.req
      ? (entry.req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || entry.req.ip || null)
      : null;
    const ua = entry.req ? entry.req.headers['user-agent']?.toString() ?? null : null;

    run(
      `INSERT INTO audit_log (action, entity_type, entity_id, entity_name, cards_affected, metadata, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.action,
        entry.entity_type,
        entry.entity_id ?? null,
        entry.entity_name ?? null,
        entry.cards_affected ?? 0,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        ip,
        ua,
      ]
    );

    logger.warn(
      {
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        entity_name: entry.entity_name,
        cards_affected: entry.cards_affected,
        ip,
      },
      'Destructive operation'
    );
  } catch (err) {
    logger.error({ err, entry }, 'Failed to write audit log');
  }
}

export function listAudit(limit = 100): AuditLogRow[] {
  return queryAll<AuditLogRow>(
    `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?`,
    [Math.max(1, Math.min(limit, 1000))]
  );
}
