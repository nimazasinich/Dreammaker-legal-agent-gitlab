# Production Checklist Usage Guide

This document explains how to use the production checklist system for the DreammakerCryptoSignalAndTrader project.

## Overview

The production checklist system provides two complementary views:

1. **Machine-readable JSON** (`production_checklist.v1.json`) - For automation, scripts, and agents
2. **GitHub Issue Templates** (`.github/ISSUE_TEMPLATE/`) - For human-friendly task tracking

## Quick Start

### For Project Managers / Developers

**Create issues from templates:**
```bash
# Via GitHub web interface
Go to: Issues → New Issue → Choose template

# Via GitHub CLI
gh issue create --template 01-hf-adapter-scope.md
gh issue create --template 02-auto-refresh-user-control.md
gh issue create --template 03-hash-based-navigation.md
gh issue create --template 04-minimal-tests.md
gh issue create --template 05-exchange-selector-cleanup.md
```

### For Automation / CI/CD

**Parse the JSON checklist:**
```javascript
// Example: Node.js script
const checklist = require('./docs/production_checklist.v1.json');

// Filter by priority
const highPriority = checklist.sections.filter(s => s.priority === 'high');

// Get incomplete tasks
const incomplete = checklist.sections
  .filter(s => s.status !== 'completed')
  .flatMap(s => s.items.filter(i => i.status === 'todo'));

// Progress summary
console.log(checklist.summary);
```

**Use with Cursor agents:**
```typescript
// Cursor agent can read and update status
import checklist from './docs/production_checklist.v1.json';

// Agent processes task
const task = checklist.sections
  .find(s => s.id === 'hf-adapter-scope')
  .items.find(i => i.id === 'hf-inline-doc-links');

// Agent marks complete
task.status = 'done';
```

## File Structure

```
/workspace/
├── docs/
│   ├── production_checklist.v1.json    # ← Machine-readable source of truth
│   └── CHECKLIST_USAGE.md             # ← This file
└── .github/
    └── ISSUE_TEMPLATE/
        ├── config.yml                  # GitHub issue template config
        ├── README.md                   # Template usage guide
        ├── 01-hf-adapter-scope.md
        ├── 02-auto-refresh-user-control.md
        ├── 03-hash-based-navigation.md
        ├── 04-minimal-tests.md
        └── 05-exchange-selector-cleanup.md
```

## JSON Schema

```json
{
  "meta": {
    "project": "string",
    "version": "string",
    "generated": "date",
    "philosophy": ["string"]
  },
  "summary": {
    "priority_level": {
      "total": "number",
      "completed": "number",
      "inProgress": "number",
      "notStarted": "number"
    }
  },
  "sections": [
    {
      "priority": "critical|high|medium",
      "id": "string",
      "title": "string",
      "status": "completed|in_progress|todo",
      "items": [
        {
          "id": "string",
          "status": "done|todo",
          "text": "string"
        }
      ]
    }
  ]
}
```

## Task Status Lifecycle

```
todo → (work begins) → in_progress → (work complete) → done
```

**Section status:**
- `completed` - All items are `done`
- `in_progress` - At least one item is `todo`, at least one is `done`
- `todo` - All items are `todo`

## Integration Examples

### Example 1: Generate Progress Report

```bash
#!/bin/bash
# scripts/checklist-report.sh

jq '.summary' docs/production_checklist.v1.json
```

### Example 2: Find Next Task

```bash
#!/bin/bash
# scripts/next-task.sh

jq -r '.sections[] 
  | select(.status != "completed") 
  | .items[] 
  | select(.status == "todo") 
  | "\(.id): \(.text)"' \
  docs/production_checklist.v1.json | head -1
```

### Example 3: Validate All Critical Tasks Done

```javascript
// scripts/validate-critical.js
const checklist = require('../docs/production_checklist.v1.json');

const criticalIncomplete = checklist.sections
  .filter(s => s.priority === 'critical' && s.status !== 'completed');

if (criticalIncomplete.length > 0) {
  console.error('Critical tasks incomplete:', criticalIncomplete.map(s => s.id));
  process.exit(1);
}
console.log('✅ All critical tasks complete');
```

## Updating the Checklist

### Manual Update
1. Edit `docs/production_checklist.v1.json`
2. Change relevant `status` fields
3. Update `summary` counts
4. Commit changes

### Via Script
```bash
# Example: Mark task as done
jq '(.sections[] | select(.id == "hf-adapter-scope") 
  | .items[] | select(.id == "hf-inline-doc-links") 
  | .status) = "done"' \
  docs/production_checklist.v1.json > tmp.json
mv tmp.json docs/production_checklist.v1.json
```

### Via Cursor Agent
```typescript
// Agent can read, modify, and write the JSON
const fs = require('fs');
const checklist = JSON.parse(
  fs.readFileSync('docs/production_checklist.v1.json', 'utf8')
);

// Make changes
const section = checklist.sections.find(s => s.id === 'minimal-tests');
section.items.find(i => i.id === 'riskguard-test-file').status = 'done';

// Write back
fs.writeFileSync(
  'docs/production_checklist.v1.json',
  JSON.stringify(checklist, null, 2)
);
```

## Best Practices

1. **Keep JSON as source of truth** - Update JSON first, then sync GitHub issues
2. **Use semantic IDs** - IDs should be stable and meaningful
3. **Update summary counts** - Keep summary section in sync with item statuses
4. **Version appropriately** - Increment `meta.version` for major changes
5. **Document philosophy** - Keep `meta.philosophy` current with project direction

## GitHub Integration

### Creating Issues in Bulk

```bash
#!/bin/bash
# scripts/create-all-issues.sh

for template in .github/ISSUE_TEMPLATE/[0-9]*.md; do
  gh issue create --template "$(basename "$template")"
done
```

### Syncing Issue Status to JSON

```bash
#!/bin/bash
# scripts/sync-issue-status.sh

# Get open issues with label
issues=$(gh issue list --label "high-priority" --state open --json number,title)

# Parse and update JSON
# (Implementation depends on your workflow)
```

## Related Documentation

- [GitHub Issue Templates README](../.github/ISSUE_TEMPLATE/README.md)
- [HF Engine Scope](./hf-engine-scope.md)
- [Data Policy](./DATA_POLICY.md)
- [Production Environment Config](./production-env-config.md)

## Support

For questions or issues with the checklist system:
1. Check the examples in this document
2. Review [GitHub Issue Templates README](../.github/ISSUE_TEMPLATE/README.md)
3. Create an issue using the appropriate template
