# MCPGRAM CLI installer (Windows PowerShell)
# Public:  irm https://mcpgram.vercel.app/install.ps1 | iex

$ErrorActionPreference = "Stop"
$InstallBase = if ($env:MCPGRAM_INSTALL_BASE) { $env:MCPGRAM_INSTALL_BASE } else { "https://mcpgram.vercel.app" }

Write-Host ""
Write-Host "  MCPGRAM" -ForegroundColor White
Write-Host "  Universal AI agent platform" -ForegroundColor DarkGray
Write-Host ""
Write-Host "→ Detecting system…" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "error: Node.js 18+ is required. Install from https://nodejs.org then re-run." -ForegroundColor Red
  exit 1
}

Write-Host "→ Installing MCPGRAM CLI…" -ForegroundColor Cyan
try {
  & npm install -g @mcpgram/cli --silent 2>$null
  if ($LASTEXITCODE -ne 0) { throw "npm failed" }
} catch {
  $tgz = Join-Path $env:TEMP "mcpgram-cli.tgz"
  try {
    Invoke-WebRequest -Uri "$InstallBase/cli/package.tgz" -OutFile $tgz -UseBasicParsing
    & npm install -g $tgz --silent
  } catch {
    Write-Host "error: Could not install MCPGRAM CLI." -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "✓ MCPGRAM CLI installed" -ForegroundColor Green
Write-Host "✓ PATH configured" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps" -ForegroundColor White
Write-Host "  mcpgram login" -ForegroundColor Cyan
Write-Host "  mcpgram onboard" -ForegroundColor Cyan
Write-Host ""
