@echo off
REM ============================================================================
REM Build the standalone face-service.exe (no Python needed on target PCs).
REM
REM   1. Resolves the per-user Python 3.12 (same one electron/main.js prefers).
REM   2. Installs the service deps + PyInstaller into it.
REM   3. Stages the InsightFace buffalo_l model pack into .\models (from
REM      %USERPROFILE%\.insightface\models) so the spec can bundle it.
REM   4. Runs PyInstaller -> dist\face-service\face-service.exe
REM
REM Run from desktop\services\face\:  build-face.bat
REM ============================================================================
setlocal

cd /d "%~dp0"

set "PY=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not exist "%PY%" set "PY=python"

echo [build-face] Using Python: %PY%
"%PY%" --version || (echo [build-face] Python 3.12 not found & exit /b 1)

echo [build-face] Installing dependencies...
"%PY%" -m pip install --disable-pip-version-check -r requirements.txt || exit /b 1
"%PY%" -m pip install --disable-pip-version-check "pyinstaller==6.11.1" pyinstaller-hooks-contrib || exit /b 1

REM --- Stage the InsightFace model pack so it gets frozen into the exe ---------
set "MODEL_SRC=%USERPROFILE%\.insightface\models\buffalo_l"
if not exist "models\buffalo_l\w600k_r50.onnx" (
  if not exist "%MODEL_SRC%\w600k_r50.onnx" (
    echo [build-face] ERROR: buffalo_l model not found at "%MODEL_SRC%".
    echo [build-face] Run the face service once with system Python so InsightFace
    echo [build-face] downloads buffalo_l, then re-run this script.
    exit /b 1
  )
  echo [build-face] Staging model pack from "%MODEL_SRC%"...
  robocopy "%MODEL_SRC%" "models\buffalo_l" /E /NFL /NDL /NJH /NJS /NP
)

echo [build-face] Running PyInstaller...
"%PY%" -m PyInstaller --noconfirm --clean face-service.spec || exit /b 1

echo.
echo [build-face] DONE -^> dist\face-service\face-service.exe
endlocal
