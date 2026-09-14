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

$nodeMajor = [int]((node -p "process.versions.node.split('.')[0]" 2>$null))
if ($nodeMajor -lt 18) {
  Write-Host "error: Node.js 18+ required (found $(node -v))." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "error: npm is required." -ForegroundColor Red
  exit 1
}

Write-Host "  Node: $(node -v)" -ForegroundColor DarkGray
Write-Host "→ Installing MCPGRAM CLI (@mcpgram/cli@latest)…" -ForegroundColor Cyan

$installed = $false
try {
  & npm install -g "@mcpgram/cli@latest"
  if ($LASTEXITCODE -eq 0) { $installed = $true }
} catch {
  $installed = $false
}

if (-not $installed) {
  Write-Host "  npm registry failed; trying package mirror…" -ForegroundColor DarkGray
  $tgz = Join-Path $env:TEMP "mcpgram-cli.tgz"
  try {
    Invoke-WebRequest -Uri "$InstallBase/cli/package.tgz" -OutFile $tgz -UseBasicParsing
    & npm install -g $tgz
    if ($LASTEXITCODE -eq 0) { $installed = $true }
  } catch {
    $installed = $false
  }
}

if (-not $installed) {
  Write-Host "error: Could not install MCPGRAM CLI. Try: npm install -g @mcpgram/cli@latest" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "✓ MCPGRAM CLI installed" -ForegroundColor Green
if (Get-Command mcpgram -ErrorAction SilentlyContinue) {
  try {
    $ver = & mcpgram --version 2>$null
    Write-Host "  version: $ver" -ForegroundColor DarkGray
  } catch {}
}
Write-Host ""
Write-Host "Next steps" -ForegroundColor White
Write-Host "  mcpgram login" -ForegroundColor Cyan
Write-Host "  mcpgram onboard" -ForegroundColor Cyan
Write-Host "  mcpgram update" -ForegroundColor Cyan
Write-Host ""
