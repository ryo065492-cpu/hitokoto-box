param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Message
)

$ErrorActionPreference = "Stop"

function Stop-WithMessage {
  param([string]$Text)
  Write-Error $Text
  exit 1
}

function Run-Step {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Label"
  & $Command

  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "$Label failed."
  }
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  Stop-WithMessage "Commit message is required. Example: .\scripts\release.ps1 `"v0.10 弾薬庫追加`""
}

$trackedEnv = git ls-files -- .env.local
if ($trackedEnv) {
  Stop-WithMessage ".env.local is already tracked by git. Stop before release."
}

$ignoredEnv = git check-ignore .env.local
if (-not $ignoredEnv -and (Test-Path ".env.local")) {
  $untrackedEnv = git ls-files --others --exclude-standard -- .env.local
  if ($untrackedEnv) {
    Stop-WithMessage ".env.local is not ignored and would be added by git add. Stop before release."
  }
}

Run-Step "npm run lint" { npm run lint }
Run-Step "npm run build" { npm run build }
Run-Step "npm run test" { npm run test }

Write-Host ""
Write-Host "==> git status"
git status --short

Run-Step "git add ." { git add . }

$staged = git diff --cached --name-only
if (-not $staged) {
  Write-Host "No staged changes. Nothing to commit."
  exit 0
}

Run-Step "git commit" { git commit -m $Message }

$answer = Read-Host "git push しますか？ y/N"
if ($answer -match "^(y|yes|Y|YES)$") {
  Run-Step "git push" { git push }
} else {
  Write-Host "git push はスキップしました。必要になったら手動で git push してください。"
}
