# Unfumble PowerShell Launcher
Set-Location -Path $PSScriptRoot

$env:NODE_PATH = "C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
$nodePath = "C:\Users\HP\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Unfumble - 100% Private File Toolkit & Custom Builder" -ForegroundColor Green
Write-Host "  Starting local server at http://localhost:3000" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan

Start-Process "http://localhost:3000"
& $nodePath "server/server.mjs"
