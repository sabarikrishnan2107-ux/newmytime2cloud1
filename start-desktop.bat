@echo off
REM ===========================================================================
REM  Launch MyTime2Cloud as an Electron desktop window.
REM  Electron spawns the bundled-PHP API (:8000) and the Next frontend (:3001),
REM  then loads the UI. Closing the window stops both services.
REM
REM  NOTE: this machine has ELECTRON_RUN_AS_NODE=1 set globally (VSCode/Claude
REM  run on Electron). That makes electron.exe behave like plain node, so we
REM  clear it here before launching the app.
REM ===========================================================================
setlocal
set "ROOT=%~dp0"
set "ELECTRON_RUN_AS_NODE="
cd /d "%ROOT%electron"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron not installed. Run:  cd electron ^&^& npm install
  pause
  exit /b 1
)
node_modules\electron\dist\electron.exe .
endlocal
