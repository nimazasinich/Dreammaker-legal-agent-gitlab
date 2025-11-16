# GitHub Issue Templates

This directory contains pre-configured issue templates for production readiness tasks.

## Available Templates

### High Priority
1. **HF Adapter Scope Clarification** (`01-hf-adapter-scope.md`)
   - Ensures HuggingFace adapters are clearly documented as market-data-only
   - Prevents misuse for SMC/Elliott/signal storage

2. **Auto-refresh with User Control** (`02-auto-refresh-user-control.md`)
   - Adds user-configurable auto-refresh for data contexts
   - Balances real-time updates with provider load

### Medium Priority
3. **Hash-based Navigation** (`03-hash-based-navigation.md`)
   - Enables deep linking and browser history
   - No React Router migration required

4. **Minimal Tests** (`04-minimal-tests.md`)
   - Critical test coverage for RiskGuard and TradeEngine
   - Small but high-leverage test set

5. **Exchange Selector Cleanup** (`05-exchange-selector-cleanup.md`)
   - Makes exchange capabilities clear in the UI
   - Distinguishes between trading-capable and data-only exchanges

## How to Use

### On GitHub
When creating a new issue, select from the template list. The issue will be pre-populated with:
- Structured task checklist
- Acceptance criteria
- Appropriate labels
- Link to machine-readable checklist

### Locally / Via CLI
```bash
# Using GitHub CLI
gh issue create --template 01-hf-adapter-scope.md

# Or manually copy template content
cat .github/ISSUE_TEMPLATE/01-hf-adapter-scope.md
```

## Integration with JSON Checklist

Each issue template references the corresponding section in:
```
docs/production_checklist.v1.json
```

This enables:
- Automated tracking with scripts
- Progress monitoring
- Integration with Cursor agents / automation tools

## Customization

To customize labels or assignees:
1. Edit the YAML frontmatter in each template
2. Update `config.yml` for global settings
3. Commit changes

## Related Documentation
- [Production Checklist (JSON)](../../docs/production_checklist.v1.json)
- [HF Engine Scope](../../docs/hf-engine-scope.md)
- [Data Policy](../../docs/DATA_POLICY.md)
