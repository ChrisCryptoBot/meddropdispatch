# Documentation Organization Script
# Moves root-level documentation files to appropriate locations

Write-Host "Starting documentation organization..." -ForegroundColor Cyan

# Ensure directories exist
if (-not (Test-Path "docs\history")) { New-Item -ItemType Directory -Path "docs\history" -Force | Out-Null }
if (-not (Test-Path "docs\archive")) { New-Item -ItemType Directory -Path "docs\archive" -Force | Out-Null }

# Files to move to history
$historyFiles = @(
    "BRANCH_CLARIFICATION.md",
    "CLAUDE_EMAIL_DEBUG_MESSAGE.md",
    "CLAUDE_REVIEW_PACKAGE.md",
    "CODEBASE_QUALITY_ASSESSMENT.md",
    "DEVELOPMENT_GAPS.md",
    "DEVELOPMENT_RECOMMENDATIONS.md",
    "DEVELOPMENT_STATUS.md",
    "ENGINEERING_LEAD_PROGRESS.md",
    "FIX_PRISMA_NOW.md",
    "IMPLEMENTATION_BRIEF_EMAIL_NOTIFICATIONS.md",
    "IMPLEMENTATION_BRIEF_WORKFLOW_OPTIMIZATIONS.md",
    "LOAD_CREATION_AUDIT.md",
    "LOAD_CREATION_UPGRADE_SUMMARY.md",
    "RATE_CALCULATOR_UPGRADE.md",
    "REDUNDANCY_AUDIT_REPORT.md",
    "REGENERATE_PRISMA_INSTRUCTIONS.md",
    "REMAINING_DEVELOPMENT.md",
    "RESEND_DOMAIN_SETUP.md",
    "ROOT_DIRECTORY_CLEANUP.md",
    "TYPESCRIPT_FIXES_SUMMARY.md",
    "WORKFLOW_REINFORCEMENT_SUGGESTIONS.md",
    "PHASE1_COMPLETE.md",
    "PHASED_DEVELOPMENT_PLAN.md"
)

# Files to move from root to docs
$currentFiles = @(
    "CLEANUP_COMPLETE.md",
    "CODEBASE_AUDIT_REPORT.md",
    "NEXT_STEPS_ROADMAP.md"
)

# Files to archive from docs
$archiveFiles = @(
    "DEVELOPMENT_STATUS.md",
    "PHASE1_IMPLEMENTATION_SUMMARY.md",
    "PHASE2_IMPLEMENTATION_SUMMARY.md",
    "COMPLETE_FIXES_REPORT.md",
    "COMPREHENSIVE_AUDIT_REPORT.md",
    "ALL_FIXES_COMPLETE.md",
    "LINTER_FIXES_COMPLETE.md",
    "IMPLEMENTATION_COMPLETE.md",
    "LEVEL_5_6_IMPLEMENTATION.md"
)

$movedCount = 0

# Move history files
Write-Host "`nMoving historical files to docs/history/..." -ForegroundColor Yellow
foreach ($file in $historyFiles) {
    if (Test-Path $file) {
        try {
            Move-Item -Path $file -Destination "docs\history\$file" -Force
            Write-Host "  ✓ $file" -ForegroundColor Green
            $movedCount++
        } catch {
            Write-Host "  ✗ Failed to move $file : $_" -ForegroundColor Red
        }
    }
}

# Move current files to docs
Write-Host "`nMoving current files to docs/..." -ForegroundColor Yellow
foreach ($file in $currentFiles) {
    if (Test-Path $file) {
        try {
            Move-Item -Path $file -Destination "docs\$file" -Force
            Write-Host "  ✓ $file" -ForegroundColor Green
            $movedCount++
        } catch {
            Write-Host "  ✗ Failed to move $file : $_" -ForegroundColor Red
        }
    }
}

# Archive duplicate files
Write-Host "`nArchiving duplicate files to docs/archive/..." -ForegroundColor Yellow
foreach ($file in $archiveFiles) {
    $source = "docs\$file"
    if (Test-Path $source) {
        try {
            Move-Item -Path $source -Destination "docs\archive\$file" -Force
            Write-Host "  ✓ $file" -ForegroundColor Green
            $movedCount++
        } catch {
            Write-Host "  ✗ Failed to archive $file : $_" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Total files moved: $movedCount" -ForegroundColor Green
Write-Host "Root MD files (excluding README.md): $((Get-ChildItem -Path '.' -Filter '*.md' -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne 'README.md' }).Count)"
Write-Host "docs/history/: $((Get-ChildItem -Path 'docs\history' -Filter '*.md' -File -ErrorAction SilentlyContinue).Count) files"
Write-Host "docs/archive/: $((Get-ChildItem -Path 'docs\archive' -Filter '*.md' -File -ErrorAction SilentlyContinue).Count) files"
Write-Host "`n✅ Documentation organization complete!" -ForegroundColor Green











