#!/usr/bin/env node
/**
 * create_issues_from_reassessment.js
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx node create_issues_from_reassessment.js --repo=owner/repo --max=50 --dry
 *
 * Options:
 *   --repo    owner/repo (required)
 *   --max     max issues to create (default: 50)
 *   --minscore  minimal overall_score to consider (default: 0)
 *   --categories comma-separated e.g. "Needs Major Fixes,Needs Minor Fixes" (default both)
 *   --dry     dry-run mode (no API calls)
 */

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

const argv = require('minimist')(process.argv.slice(2));
const REASSESS_PATH = path.resolve(process.cwd(), 'cursor_reports/shared_files_reassessment.json');

if (!argv.repo) {
  console.error('ERROR: --repo=owner/repo is required');
  process.exit(2);
}

if (!fs.existsSync(REASSESS_PATH)) {
  console.error('ERROR: file not found:', REASSESS_PATH);
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(REASSESS_PATH, 'utf8'));
const files = data.files || [];

const categories = (argv.categories || 'Needs Major Fixes,Needs Minor Fixes,Deprecated or Blocked').split(',').map(s => s.trim());
const maxCreate = Number(argv.max || 50);
const minScore = Number(argv.minscore || 0);
const dryRun = Boolean(argv.dry || argv.d);

const labelMapping = {
  'Critical': 'P0-critical',
  'High': 'P1-high',
  'Medium': 'P2-medium',
  'Low': 'P3-low',
  // fallback labels based on category:
  'Needs Major Fixes': 'needs-major-fix',
  'Needs Minor Fixes': 'needs-minor-fix',
  'Production-Ready': 'production-ready',
  'Deprecated or Blocked': 'deprecated'
};

// helper: build issue body
function buildBody(item) {
  const md = [];
  md.push(`**File:** \`${item.path}\``);
  md.push(`**Component:** ${item.name || '-'}`);
  md.push(`**Overall Score:** ${item.scores?.overall_score ?? 'N/A'}`);
  md.push(`**Category:** ${item.category}`);
  md.push('');
  md.push(`**One-line summary:** ${item.one_line_summary || '-'}`);
  md.push('');
  md.push(`**Missing features:**\n${(item.missing_features && item.missing_features.length) ? item.missing_features.map(x => `- ${x}`).join('\n') : '- none listed'}`);
  md.push('');
  md.push(`**Common errors:**\n${(item.common_errors && item.common_errors.length) ? item.common_errors.map(x => `- ${x}`).join('\n') : '- none listed'}`);
  md.push('');
  if (item.visual_issues && item.visual_issues.length) {
    md.push(`**Visual issues:**\n${item.visual_issues.map(x => `- ${x}`).join('\n')}`);
    md.push('');
  }
  if (item.remediation && item.remediation.length) {
    md.push(`**Suggested remediation (top items):**`);
    item.remediation.slice(0,5).forEach(r => {
      md.push(`- [${r.priority || 'Medium'}] ${r.action} (${r.estimate || 'no estimate'})`);
    });
    md.push('');
  }
  md.push(`**Related views:** ${(item.related_views || []).join(', ') || '-'}`);
  md.push('');
  md.push(`---`);
  md.push(`*(Auto-generated from cursor_reports/shared_files_reassessment.json)*`);
  return md.join('\n');
}

// filter items
const candidates = files
  .filter(f => categories.includes(f.category))
  .filter(f => (f.scores?.overall_score ?? 0) >= minScore)
  .sort((a,b) => (a.scores?.overall_score ?? 0) - (b.scores?.overall_score ?? 0)) // ascending: worst first
  .slice(0, maxCreate);

console.log(`Found ${candidates.length} candidate(s) for issue creation (categories: ${categories.join(', ')})`);
if (candidates.length === 0) process.exit(0);

if (dryRun) {
  console.log('DRY RUN — no issues will be created. Preview:');
  candidates.forEach((c, idx) => {
    const title = `[${c.category}] ${c.name || c.path} — score ${c.scores?.overall_score ?? 'N/A'}`;
    const labels = [
      labelMapping[c.remediation?.[0]?.priority] || labelMapping[c.category] || 'triage'
    ].filter(Boolean);
    console.log(`\n#${idx+1} Title: ${title}\nLabels: ${labels.join(', ')}\nBody preview:\n${buildBody(c).slice(0,500)}\n---`);
  });
  process.exit(0);
}

// live mode
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('ERROR: set env GITHUB_TOKEN with repo scope');
  process.exit(2);
}

const octokit = new Octokit({ auth: token });

(async () => {
  const [owner, repo] = argv.repo.split('/');
  let created = 0;
  for (const item of candidates) {
    const title = `[${item.category}] ${item.name || item.path} — score ${item.scores?.overall_score ?? 'N/A'}`;
    const labels = [
      labelMapping[item.remediation?.[0]?.priority] || labelMapping[item.category] || 'triage'
    ].filter(Boolean);

    const body = buildBody(item);

    try {
      // check if similar issue exists (by title)
      const search = await octokit.search.issuesAndPullRequests({
        q: `${title} repo:${owner}/${repo} in:title`,
      });
      if ((search.data.total_count || 0) > 0) {
        console.log(`Skipping (already exists): ${title}`);
        continue;
      }

      const res = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
      });
      console.log(`Created issue #${res.data.number} -> ${title}`);
      created += 1;

      // rate-limit safety: small delay
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error('Failed to create issue for', item.path, err.message || err);
    }
  }
  console.log(`Done. Created ${created} issue(s).`);
})();
