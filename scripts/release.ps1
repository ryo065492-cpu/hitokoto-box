param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Message
)

# Keep this script compatible with Windows PowerShell 5.1.
# User-facing messages are intentionally ASCII-heavy to avoid quote/encoding issues.

$ErrorActionPreference = "Stop"

try {
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
} catch {
  # Output encoding is best-effort for older PowerShell hosts.
}

function Stop-WithMessage {
  param([string]$Text)

  Write-Error $Text
  exit 1
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [string[]]$Arguments = @()
  )

  Write-Host ""
  Write-Host ("==> " + $Label)

  & $FilePath @Arguments

  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage ($Label + " failed.")
  }
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  Stop-WithMessage 'Commit message is required. Example: .\scripts\release.ps1 "v0.10 arsenal"'
}

$trackedEnv = git ls-files -- .env.local
if ($trackedEnv) {
  Stop-WithMessage ".env.local is tracked by git. Stop before release."
}

$ignoredEnv = git check-ignore .env.local
if (-not $ignoredEnv -and (Test-Path ".env.local")) {
  $untrackedEnv = git ls-files --others --exclude-standard -- .env.local
  if ($untrackedEnv) {
    Stop-WithMessage ".env.local is not ignored and would be added by git add. Stop before release."
  }
}

Invoke-Checked -Label "npm run lint" -FilePath "npm.cmd" -Arguments @("run", "lint")
Invoke-Checked -Label "npm run build" -FilePath "npm.cmd" -Arguments @("run", "build")
Invoke-Checked -Label "npm run test" -FilePath "npm.cmd" -Arguments @("run", "test")

Write-Host ""
Write-Host "==> git status"
git status --short

Invoke-Checked -Label "git add" -FilePath "git" -Arguments @("add", ".")

$staged = git diff --cached --name-only
if (-not $staged) {
  Write-Host "No staged changes. Nothing to commit."
  exit 0
}

Invoke-Checked -Label "git commit" -FilePath "git" -Arguments @("commit", "-m", $Message)

$answer = Read-Host "Push to the current upstream branch? y/N"
if ($answer -match "^(y|yes)$") {
  Invoke-Checked -Label "git push" -FilePath "git" -Arguments @("push")
} else {
  Write-Host "Skipped git push. Run git push manually when ready."
}
