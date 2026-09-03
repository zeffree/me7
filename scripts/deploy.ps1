<#
  Deploys the built app to Azure App Service (https://e7calc.azurewebsites.net).

  Usage:  npm run deploy          (builds first, then calls this script)
          pwsh scripts/deploy.ps1 (deploys whatever is already in dist/)

  The app runs on a Linux plan, so the deployment package is dist/ plus
  server/server.mjs, which serves the files and applies the SPA fallback,
  cache policy and security headers.   Linux Basic B1 costs about a quarter of
  the Windows equivalent, which is why this is not an IIS/web.config host.
#>
[CmdletBinding()]
param(
  [string] $ResourceGroup = 'rg-me7',
  [string] $AppName       = 'e7calc'
)

$ErrorActionPreference = 'Stop'
$root   = Split-Path $PSScriptRoot -Parent
$dist   = Join-Path $root 'dist'
$server = Join-Path $root 'server\server.mjs'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  throw "dist/index.html not found. Run 'npm run build' first."
}
if (-not (Test-Path $server)) {
  throw "server/server.mjs not found. It serves the app on Linux App Service."
}

# Stage dist/ + server.mjs together so the server sits alongside the files it serves.
$stage = Join-Path ([IO.Path]::GetTempPath()) "$AppName-stage"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item (Join-Path $dist '*') $stage -Recurse -Force
Copy-Item $server $stage -Force

$zip = Join-Path ([IO.Path]::GetTempPath()) "$AppName-dist.zip"
Remove-Item $zip -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip

Write-Host ("Deploying {0:N0} KB to {1}..." -f ((Get-Item $zip).Length / 1KB), $AppName)

# --clean wipes wwwroot before extracting. Without it a zip deploy only overlays
# the package, so a file dropped from the build lingers on disk and keeps being
# served -- which is how a deleted staticwebapp.config.json outlived its own
# removal. A static site has no state in wwwroot worth preserving.
az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path $zip `
  --type zip --clean true --restart true --only-show-errors | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Deployment failed with exit code $LASTEXITCODE." }

Remove-Item $zip -ErrorAction SilentlyContinue
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue

$deployedHost = az webapp show -g $ResourceGroup -n $AppName --query defaultHostName -o tsv
Write-Host "Deployed to https://$deployedHost"
