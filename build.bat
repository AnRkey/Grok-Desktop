@echo off
setlocal
cd /d "%~dp0"
set "BUILD_TARGET=%~1"
if "%BUILD_TARGET%"=="" set "BUILD_TARGET=win"
if /i not "%BUILD_TARGET%"=="win" if /i not "%BUILD_TARGET%"=="linux" if /i not "%BUILD_TARGET%"=="all" (
  echo Usage: build.bat [win^|linux^|all]
  exit /b 1
)
call npm ci
if errorlevel 1 exit /b 1
if /i "%BUILD_TARGET%"=="linux" goto linux
call npm run build
if errorlevel 1 exit /b 1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-windows-archives.ps1
if errorlevel 1 exit /b 1
if /i "%BUILD_TARGET%"=="win" goto done
:linux
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker is required for Linux packaging from Windows. Alternatively use the development GitHub workflow or run npm run build-linux on Linux.
  exit /b 1
)
rem Isolate Linux node_modules from the host. Do not modify global npm settings or remove shared images.
docker run --rm -v "%CD%:/project" -v /project/node_modules -w /project node:24-bookworm bash -c "apt-get update && apt-get install -y rpm p7zip-full && npm ci && npm run build-linux && bash scripts/build-linux-archives.sh"
if errorlevel 1 exit /b 1
:done
echo Build complete. Artifacts are in build. Publishing is disabled.
exit /b 0
