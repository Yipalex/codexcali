param(
  [string]$RepoUrl = "https://github.com/Yipalex/codexcali.git",
  [string]$PluginDir = "$HOME\plugins\codexcali",
  [string]$MarketplacePath = "$HOME\.agents\plugins\marketplace.json",
  [switch]$SkipCodexAdd
)

$ErrorActionPreference = "Stop"

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found. Install it and run this script again."
  }
}

function Invoke-Checked($Command, $Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
  }
}

function Test-CodexCli {
  $cmd = Get-Command codex -ErrorAction SilentlyContinue
  if (-not $cmd) {
    return $false
  }
  try {
    & codex --version *> $null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

Require-Command git
Require-Command npm

$parent = Split-Path -Parent $PluginDir
New-Item -ItemType Directory -Force $parent | Out-Null

if (Test-Path $PluginDir) {
  Write-Host "Updating existing Codexcali checkout at $PluginDir"
  Invoke-Checked git @("-C", $PluginDir, "pull", "--ff-only")
} else {
  Write-Host "Cloning Codexcali into $PluginDir"
  Invoke-Checked git @("clone", $RepoUrl, $PluginDir)
}

Push-Location $PluginDir
try {
  Invoke-Checked npm @("install")
  Invoke-Checked npm @("run", "build")
} finally {
  Pop-Location
}

$marketplaceDir = Split-Path -Parent $MarketplacePath
New-Item -ItemType Directory -Force $marketplaceDir | Out-Null

$entry = [ordered]@{
  name = "codexcali"
  source = [ordered]@{
    source = "local"
    path = "./plugins/codexcali"
  }
  policy = [ordered]@{
    installation = "AVAILABLE"
    authentication = "ON_INSTALL"
  }
  category = "Productivity"
}

if (Test-Path $MarketplacePath) {
  $json = Get-Content -Raw -Encoding UTF8 $MarketplacePath | ConvertFrom-Json
  if (-not $json.name) {
    $json | Add-Member -NotePropertyName name -NotePropertyValue "personal"
  }
  if (-not $json.interface) {
    $json | Add-Member -NotePropertyName interface -NotePropertyValue ([ordered]@{ displayName = "Personal" })
  }
  if (-not $json.plugins) {
    $json | Add-Member -NotePropertyName plugins -NotePropertyValue @()
  }
  $plugins = @($json.plugins | Where-Object { $_.name -ne "codexcali" })
  $plugins += $entry
  $json.plugins = $plugins
} else {
  $json = [ordered]@{
    name = "personal"
    interface = [ordered]@{ displayName = "Personal" }
    plugins = @($entry)
  }
}

$marketplaceText = ($json | ConvertTo-Json -Depth 20) + [Environment]::NewLine
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($MarketplacePath, $marketplaceText, $utf8NoBom)
Write-Host "Registered Codexcali in $MarketplacePath"

if ($SkipCodexAdd) {
  Write-Host "Skipped: codex plugin add codexcali@personal"
  exit 0
}

if (-not (Test-CodexCli)) {
  Write-Warning "Codex CLI is not runnable from this terminal. Install or enable the Codex CLI, then run: codex plugin add codexcali@personal"
  exit 2
}

Invoke-Checked codex @("plugin", "add", "codexcali@personal")
Write-Host "Codexcali installed. Open a new Codex thread to load the plugin."
