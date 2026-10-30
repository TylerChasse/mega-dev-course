// What #4471 actually holds, problem by problem. causes.ts tells parser from hint by tenant and
// channel; it has no place for the reports the desk itself read as a one-day move (desk-notes.json),
// so it files them under `parser`. Their dates are not swapped: they move by one day, or differ by
// where the reader sits. That is a third problem, and it gets its own row here.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'shift' | 'unplaced';

export const PROBLEMS: Record<Problem, { title: string; what: string }> = {
  parser: {
    title: 'Shared parser reads day-first dates month first',
    what: 'Day and month swap: 7 April arrives as 4 July. Every day-first tenant, every channel.',
  },
  hint: {
    title: 'booking-v3 hint says MM/DD/YYYY, the form reads the date day first',
    what: 'People type what the hint tells them; the form reads it the other way. Form channel, booking-v3 tenants only.',
  },
  shift: {
    title: 'Invites land one day off (timezone)',
    what: 'Not a swap: the day moves by one, or differs by where the reader is. The desk noted these itself.',
  },
  unplaced: {
    title: 'No cause on file',
    what: 'No tenant on file, or a tenant that writes the month first. Needs reading.',
  },
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  // Intake's guess disagrees with the problem: tag → count.
  mistagged: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { rows: number; merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<Problem, Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      const count = (key: (r: Report) => string | null) =>
        rs.reduce<Record<string, number>>((n, r) => {
          const k = key(r);
          return k === null ? n : { ...n, [k]: (n[k] ?? 0) + 1 };
        }, {});
      return {
        problem,
        reports: rs,
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: count((r) => r.channel),
        mistagged: count((r) => (r.meta.intakeTag === problem ? null : r.meta.intakeTag)),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { rows: all.filter((r) => r.mergedInto === ticket).length, merged, groups };
}
