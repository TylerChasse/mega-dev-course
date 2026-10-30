// What #4471 actually holds, problem by problem. Counted the desk's way: causes.ts places every
// report by tenant and channel (parser or hint), and a report the desk read differently
// (desk-notes.json) stays counted where it is filed. The one-day moves are a third problem, but
// they sit inside `parser` in the desk's view, so here they are a part of it, not a separate row.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift' | 'unplaced';

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

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  // Intake's guess disagrees with the cause the report is filed under: tag → count.
  mistagged: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  // Set on a part of a larger group: the problem it is counted inside.
  within?: Problem;
};

function group(problem: Problem, rs: Report[], filedAs: Problem, within?: Problem): ProblemGroup {
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
    mistagged: count((r) => (r.meta.intakeTag === filedAs ? null : r.meta.intakeTag)),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    within,
  };
}

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { rows: number; merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<Problem, Report[]>();
  for (const r of merged) {
    const p: Problem = causeOf(r, tenantOf(r)) ?? 'unplaced';
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = [...by.entries()]
    .map(([p, rs]) => group(p, rs, p))
    .sort((a, b) => b.reports.length - a.reports.length);
  // The one-day moves: shown under the group they are filed in.
  const out: ProblemGroup[] = [];
  for (const g of groups) {
    out.push(g);
    const moved = g.reports.filter((r) => oneDayMove.includes(r.id));
    if (moved.length) out.push(group('shift', moved, g.problem, g.problem));
  }
  return { rows: all.filter((r) => r.mergedInto === ticket).length, merged, groups: out };
}
