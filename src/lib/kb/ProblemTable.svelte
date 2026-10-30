<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { PROBLEMS, splitTicket, type Problem } from '#lib/kb/problems';

  // issues: problem → URL of the ticket filed for it.
  let { ticket, issues = {} }: { ticket: number; issues?: Partial<Record<Problem, string>> } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ') || '—';
  const issueNo = (url: string) => '#' + url.split('/').pop();
  const problems = $derived(split.groups.filter((g) => !g.within).length);
</script>

<p class="sum">
  <strong>{split.rows}</strong> rows in the export · <strong>{split.merged.length}</strong> unique reports merged into
  #{ticket} · <strong>{problems}</strong>
  {problems === 1 ? 'cause' : 'causes'}, <strong>{split.groups.length}</strong>
  {split.groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>channels</th><th>intake tagged otherwise</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      <tr class:part={g.within}>
        <td>{#if g.within}<span class="what">part of <code>{g.within}</code>:</span> {/if}<code>{g.problem}</code><br /><b>{PROBLEMS[g.problem].title}</b><br /><span class="what">{PROBLEMS[g.problem].what}</span></td>
        <td class="n">{g.within ? `(${g.reports.length})` : g.reports.length}</td>
        <td>{g.tenants.length}{g.tenants.length <= 5 ? `: ${g.tenants.join(', ')}` : ''}</td>
        <td class="tags">{list(g.channels)}</td>
        <td class="tags">{list(g.mistagged)}</td>
        <td class="tags">{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if issues[g.problem]}<a href={issues[g.problem]}>{issueNo(issues[g.problem]!)}</a>{:else}<span class="none">none yet</span>{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .n { font-weight: 600; font-size: 1.05rem; }
  .what, .tags { color: var(--muted); font-size: 0.85em; }
  .none { color: var(--warn); font-weight: 600; }
  .part td { background: var(--note-bg); }
  .part td:first-child { padding-left: 1.5rem; }
</style>
