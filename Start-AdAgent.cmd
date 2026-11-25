@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv || goto failed
)
".venv\Scripts\python.exe" -c "import flask, flask_cors, sklearn, requests; from langgraph.graph import StateGraph" >nul 2>&1
if errorlevel 1 (
    ".venv\Scripts\python.exe" -m pip install -r backend\requirements-console.txt || goto failed
)
".venv\Scripts\python.exe" "frontend\scripts\check_build.py"
if errorlevel 2 goto failed
if errorlevel 1 (
    echo Building the updated Ad-Agent console...
    pushd "frontend"
    if not exist "node_modules" (
        call npm ci --include=dev || goto failed
    ) else if not exist "node_modules\.bin\vite.cmd" (
        call npm install --include=dev --no-save || goto failed
    )
    call npm run build || goto failed
    popd
)
".venv\Scripts\python.exe" backend\server.py --open
if errorlevel 1 goto failed
exit /b 0
:failed
echo Ad-Agent could not start. Review the error above.
pause
exit /b 1
