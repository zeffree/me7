# Deploys dist/ to the Static Web App fallback host.
#
# The SWA CLI prompts for a target when it cannot infer one, which makes
# `npm run deploy:swa` hang in CI or a non-interactive shell. Fetching the
# deployment token from Azure at run time keeps it non-interactive without
# ever writing the secret into the repo.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path 'dist/index.html')) {
    throw "dist/ is missing or empty. Run 'npm run build' first."
}

Write-Host 'Fetching Static Web App deployment token...'
$token = az staticwebapp secrets list --name swa-me7 --resource-group rg-me7 `
    --query 'properties.apiKey' -o tsv

if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Could not read the deployment token. Run 'az login' and confirm swa-me7 exists in rg-me7."
}

npx --yes @azure/static-web-apps-cli@latest deploy ./dist `
    --env production --deployment-token $token

if ($LASTEXITCODE -ne 0) { throw "SWA deploy failed with exit code $LASTEXITCODE." }
Write-Host 'Deployed to https://kind-stone-0a2a72000.3.azurestaticapps.net'
