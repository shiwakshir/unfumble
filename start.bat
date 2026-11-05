@echo off
title Unfumble — Your files. Your tools. Unfumbled.
cd /d "%~dp0"

echo ===================================================
echo   Unfumble - 100% Private File Toolkit
echo   Starting server at http://localhost:3000 ...
echo ===================================================

set NODE_PATH=C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules
start http://localhost:3000
"C:\Users\HP\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe" server\server.mjs
pause
