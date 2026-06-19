@echo off
REM ============================================================================
REM Manual face-service fix for an ALREADY-INSTALLED MyTime2Desktop (old build).
REM
REM Old installs launch the face service with system Python (`python -m uvicorn`)
REM and fail with "No module named uvicorn" on PCs without the Python deps. This
REM patch swaps in the new app code + the standalone face exe so it needs no
REM Python at all.
REM
REM HOW TO USE (on the customer PC):
REM   1. Put this .bat in a folder together with:
REM        - app.asar                  (from new build win-unpacked\resources\)
REM        - face-dist\                (= win-unpacked\resources\services\face\dist\)
REM   2. Right-click -> Run as administrator (in case the app is in Program Files).
REM   3. Close MyTime2Desktop first; the script also force-stops it.
REM ============================================================================
setlocal
cd /d "%~dp0"

echo [face-fix] Locating MyTime2Desktop install...
set "INSTALL="
for %%P in (
  "%LOCALAPPDATA%\Programs\MyTime2Desktop"
  "%PROGRAMFILES%\MyTime2Desktop"
  "%PROGRAMFILES(X86)%\MyTime2Desktop"
) do if exist "%%~P\resources" set "INSTALL=%%~P"

if not defined INSTALL (
  echo [face-fix] ERROR: could not find MyTime2Desktop install folder.
  echo [face-fix] Edit this script and set INSTALL to the folder that contains "resources".
  pause & exit /b 1
)
echo [face-fix] Found install: %INSTALL%

if not exist "app.asar"  ( echo [face-fix] ERROR: app.asar not found next to this script. & pause & exit /b 1 )
if not exist "face-dist\face-service\face-service.exe" ( echo [face-fix] ERROR: face-dist\face-service\face-service.exe not found next to this script. & pause & exit /b 1 )

echo [face-fix] Stopping the app if running...
taskkill /F /IM MyTime2Desktop.exe /T >nul 2>&1
taskkill /F /IM face-service.exe  /T >nul 2>&1
taskkill /F /IM python.exe        /T >nul 2>&1

echo [face-fix] Backing up old app.asar...
if exist "%INSTALL%\resources\app.asar" copy /Y "%INSTALL%\resources\app.asar" "%INSTALL%\resources\app.asar.bak" >nul

echo [face-fix] Installing new app.asar...
copy /Y "app.asar" "%INSTALL%\resources\app.asar" >nul || ( echo [face-fix] copy app.asar FAILED ^(run as admin?^) & pause & exit /b 1 )

echo [face-fix] Installing standalone face service (this is ~1.1 GB, please wait)...
robocopy "face-dist" "%INSTALL%\resources\services\face\dist" /E /NFL /NDL /NJH /NJS /NP
if %ERRORLEVEL% GEQ 8 ( echo [face-fix] robocopy FAILED & pause & exit /b 1 )

echo.
echo [face-fix] DONE. Start MyTime2Desktop again — face upload/matching now uses
echo [face-fix] the bundled exe (no Python needed). Old app.asar saved as app.asar.bak.
pause
endlocal
