#!/bin/bash
# Production Checklist Status Script

CHECKLIST="docs/production_checklist.v1.json"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 Production Checklist Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo ""
printf "  🔴 Critical: "
jq -r '"  \(.summary.critical.completed)/\(.summary.critical.total) complete"' "$CHECKLIST"
printf "  🟠 High:     "
jq -r '"  \(.summary.high.completed)/\(.summary.high.total) complete"' "$CHECKLIST"
printf "  🟡 Medium:   "
jq -r '"  \(.summary.medium.completed)/\(.summary.medium.total) complete"' "$CHECKLIST"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 All Sections:"
echo ""
jq -r '.sections[] | 
  if .status == "completed" then
    "  ✅ \(.title) (\(.priority | ascii_upcase))"
  elif .status == "in_progress" then
    "  🔄 \(.title) (\(.priority | ascii_upcase)) - In Progress"
  else
    "  ⏳ \(.title) (\(.priority | ascii_upcase)) - Not Started"
  end' "$CHECKLIST"
echo ""
