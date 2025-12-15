
@echo off
setlocal enableextensions enabledelayedexpansion

:: Parse command-line arguments
set BUILD_TARGET=%1
if "%BUILD_TARGET%"=="" set BUILD_TARGET=win

echo ===================================================
echo Building Grok Desktop - Target: %BUILD_TARGET%
echo ===================================================

:: Validate build target
if /i not "%BUILD_TARGET%"=="win" if /i not "%BUILD_TARGET%"=="linux" if /i not "%BUILD_TARGET%"=="all" (
  echo ERROR: Invalid build target "%BUILD_TARGET%"
  echo Usage: build.bat [win^|linux^|all]
  echo.
  echo   win    - Build Windows packages only ^(default^)
  echo   linux  - Build Linux packages ^(RPM + DEB^)
  echo   all    - Build all platforms
  goto :error
)

:: Extract version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"\"version\"" package.json') do (
  set VERSION=%%a
)
set VERSION=%VERSION:"=%
echo Version: %VERSION%
echo.

:: Clean previous build files
echo Cleaning previous build files...
rem Try to stop any running instances that may lock files
echo Stopping running Grok Desktop instances ^(if any^)...
taskkill /IM "Grok Desktop.exe" /F >nul 2>&1
taskkill /IM "Grok Desktop.exe" /T /F >nul 2>&1
taskkill /IM "electron.exe" /F >nul 2>&1
taskkill /IM "electron.exe" /T /F >nul 2>&1

rem Retry removing build directory if locked
set tries=0
:retry_rmdir_build
if exist build (
  rmdir build /s /q
  if exist build (
    set /a tries=!tries!+1
    if !tries! LSS 5 (
      echo Build directory is in use, retrying removal ^(!tries!/5^)...
      timeout /t 2 /nobreak >nul
      goto :retry_rmdir_build
    ) else (
      echo WARNING: Could not fully remove build directory; continuing.
    )
  )
)
if exist node_modules rmdir node_modules /s /q

:: Create build directory if it doesn't exist
if not exist build mkdir build

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: npm is not installed or not in PATH.
  echo Please install Node.js and npm before running this script.
  goto :error
)

:: Set npm configuration for better reliability
echo Setting npm configuration for better reliability...
call npm config set fetch-retry-mintimeout 20000
call npm config set fetch-retry-maxtimeout 120000
call npm config set fetch-retries 5
call npm config set registry https://registry.npmjs.org/

:: Clean npm cache to prevent integrity issues
echo Cleaning npm cache to prevent integrity checksum errors...
call npm cache clean --force

:: Install project dependencies (prefer reproducible installs)
echo Installing project dependencies...
if exist package-lock.json (
  echo Using npm ci with package-lock.json...
  call npm ci --no-fund --no-audit --loglevel=http
) else (
  echo package-lock.json not found, falling back to npm install...
  call npm install --prefer-offline --no-fund --no-audit --loglevel=http
)

if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Failed to install project dependencies, but continuing with build...
)

:: Build based on target selection
if /i "%BUILD_TARGET%"=="win" goto :build_windows
if /i "%BUILD_TARGET%"=="linux" goto :build_linux
if /i "%BUILD_TARGET%"=="all" goto :build_all

:build_windows
echo ===================================================
echo Building Windows targets...
echo ===================================================
echo Building: NSIS, MSI, Portable
echo Archives (ZIP, 7z) will be created after build
echo.
call npx --yes electron-builder@latest --win --x64

if %ERRORLEVEL% EQU 0 (
  echo ===================================================
  echo Windows build completed successfully!
  echo.
  echo Creating archive files from unpacked directory...
  echo.
  
  if exist "build\win-unpacked" (
    echo Creating ZIP archive...
    powershell -Command "Compress-Archive -Path 'build\win-unpacked\*' -DestinationPath 'build\Grok-Desktop_Windows-v%VERSION%.zip' -Force"
    if %ERRORLEVEL% EQU 0 (
      echo   Created: Grok-Desktop_Windows-v%VERSION%.zip
    ) else (
      echo   WARNING: Failed to create ZIP archive
    )
    
    echo Creating 7z archive...
    where 7z >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
      7z a -t7z "build\Grok-Desktop_Windows-v%VERSION%.7z" "build\win-unpacked\*" -mx=9 >nul
      if %ERRORLEVEL% EQU 0 (
        echo   Created: Grok-Desktop_Windows-v%VERSION%.7z
      ) else (
        echo   WARNING: Failed to create 7z archive
      )
    ) else (
      echo   NOTE: 7-Zip not found. Skipping 7z archive.
      echo   Install from https://www.7-zip.org/ to enable 7z archives.
    )
  ) else (
    echo   WARNING: win-unpacked directory not found
  )
  
  echo.
  echo All files can be found in the build directory:
  dir /b build\Grok-Desktop_Installer*.exe build\Grok-Desktop_Installer*.msi build\Grok-Desktop_Portable*.exe build\Grok-Desktop_Windows*.zip build\Grok-Desktop_Windows*.7z 2>nul
  echo ===================================================
) else (
  echo ===================================================
  echo Windows build failed with error code %ERRORLEVEL%
  echo Please check the error messages above.
  echo ===================================================
  goto :error
)
goto :end

:build_linux
echo ===================================================
echo Building Linux targets with Docker...
echo ===================================================
echo Building: RPM, DEB
echo Archives (tar.gz, 7z) will be created after build
echo Using Docker to ensure RPM compatibility on Windows
echo.

:: Check if Docker is installed and running
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Docker is not installed or not in PATH.
  echo Please install Docker Desktop for Windows from:
  echo https://www.docker.com/products/docker-desktop
  goto :error
)

:: Check if Docker daemon is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Docker daemon is not running.
  echo Please start Docker Desktop and try again.
  goto :error
)

echo Pulling electron-builder Docker image...
docker pull electronuserland/builder:wine

if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Failed to pull Docker image.
  goto :error
)

echo.
echo Building Linux packages in Docker container...
echo This may take several minutes...
echo.

:: Run build in Docker with volume mounts
docker run --rm ^
  -v "%CD%:/project" ^
  -w /project ^
  electronuserland/builder:wine ^
  /bin/bash -c "npm install && npx electron-builder --linux"

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ===================================================
  echo Linux build completed successfully!
  echo.
  echo Creating archive files from unpacked directory...
  echo.
  
  if exist "build\linux-unpacked" (
    echo Creating tar.gz archive using Docker...
    docker run --rm -v "%CD%\build:/build" -w /build alpine tar -czf "Grok-Desktop_Linux-v%VERSION%.tar.gz" -C linux-unpacked . 2>nul
    if %ERRORLEVEL% EQU 0 (
      echo   Created: Grok-Desktop_Linux-v%VERSION%.tar.gz
    ) else (
      echo   WARNING: Failed to create tar.gz archive
    )
    
    echo Creating 7z archive using Docker...
    docker run --rm -v "%CD%\build:/build" -w /build alpine sh -c "apk add --no-cache p7zip >nul 2>&1 && 7z a -t7z Grok-Desktop_Linux-v%VERSION%.7z ./linux-unpacked/* -mx=9" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
      echo   Created: Grok-Desktop_Linux-v%VERSION%.7z
    ) else (
      echo   WARNING: Failed to create 7z archive
    )
  ) else (
    echo   WARNING: linux-unpacked directory not found
  )
  
  echo.
  echo All files can be found in the build directory:
  dir /b build\Grok-Desktop-v*.rpm build\Grok-Desktop-v*.deb build\Grok-Desktop_Linux*.tar.gz build\Grok-Desktop_Linux*.7z 2>nul
  echo ===================================================
  
  echo.
  echo Cleaning up Docker image...
  docker rmi electronuserland/builder:wine
  
  if %ERRORLEVEL% EQU 0 (
    echo Docker image removed successfully.
  ) else (
    echo WARNING: Failed to remove Docker image. You can remove it manually with:
    echo docker rmi electronuserland/builder:wine
  )
) else (
  echo.
  echo ===================================================
  echo Linux build failed with error code %ERRORLEVEL%
  echo ===================================================
  
  echo Cleaning up Docker image...
  docker rmi electronuserland/builder:wine >nul 2>&1
  goto :error
)
goto :end

:build_all
echo ===================================================
echo Building ALL platforms ^(Windows + Linux^)...
echo ===================================================
echo Building: Windows ^(NSIS, MSI, Portable^) + Linux ^(RPM, DEB^)
echo Archives ^(ZIP, 7z, tar.gz^) will be created after builds complete
echo Windows will build natively, Linux will build in Docker
echo.

:: Check if Docker is installed and running
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Docker is not installed. Skipping Linux builds.
  echo Building Windows only...
  goto :build_windows_only_all
)

docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Docker daemon is not running. Skipping Linux builds.
  echo Building Windows only...
  goto :build_windows_only_all
)

echo [1/3] Building Windows packages natively...
echo ===================================================
call npx --yes electron-builder@latest --win --x64

if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Windows build failed, but continuing with Linux...
)

echo.
echo [2/3] Pulling Docker image for Linux build...
echo ===================================================
docker pull electronuserland/builder:wine

if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Failed to pull Docker image.
  goto :show_all_results
)

echo.
echo [3/3] Building Linux packages in Docker...
echo ===================================================
docker run --rm ^
  -v "%CD%:/project" ^
  -w /project ^
  electronuserland/builder:wine ^
  /bin/bash -c "npm install && npx electron-builder --linux"

if %ERRORLEVEL% NEQ 0 (
  echo WARNING: Linux build failed.
)

:show_all_results
echo.
echo Creating archive files from unpacked directories...
echo.

if exist "build\win-unpacked" (
  echo Creating Windows archives...
  powershell -Command "Compress-Archive -Path 'build\win-unpacked\*' -DestinationPath 'build\Grok-Desktop_Windows-v%VERSION%.zip' -Force" 2>nul
  where 7z >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    7z a -t7z "build\Grok-Desktop_Windows-v%VERSION%.7z" "build\win-unpacked\*" -mx=9 >nul
  )
)

if exist "build\linux-unpacked" (
  echo Creating Linux archives...
  docker run --rm -v "%CD%\build:/build" -w /build alpine tar -czf "Grok-Desktop_Linux-v%VERSION%.tar.gz" -C linux-unpacked . 2>nul
  docker run --rm -v "%CD%\build:/build" -w /build alpine sh -c "apk add --no-cache p7zip >nul 2>&1 && 7z a -t7z Grok-Desktop_Linux-v%VERSION%.7z ./linux-unpacked/* -mx=9" >nul 2>&1
)

echo.
echo ===================================================
echo Multi-platform build completed!
echo All files can be found in the build directory:
echo.
echo Windows files:
dir /b build\Grok-Desktop_Installer*.exe build\Grok-Desktop_Installer*.msi build\Grok-Desktop_Portable*.exe build\Grok-Desktop_Windows*.zip build\Grok-Desktop_Windows*.7z 2>nul
echo.
echo Linux files:
dir /b build\Grok-Desktop-v*.rpm build\Grok-Desktop-v*.deb build\Grok-Desktop_Linux*.tar.gz build\Grok-Desktop_Linux*.7z 2>nul
echo ===================================================

echo.
echo Cleaning up Docker image...
docker rmi electronuserland/builder:wine

if %ERRORLEVEL% EQU 0 (
  echo Docker image removed successfully.
) else (
  echo WARNING: Failed to remove Docker image.
)
goto :end

:build_windows_only_all
call npx --yes electron-builder@latest --win --x64

if %ERRORLEVEL% EQU 0 (
  echo ===================================================
  echo Windows build completed successfully!
  echo.
  echo Creating archive files...
  if exist "build\win-unpacked" (
    powershell -Command "Compress-Archive -Path 'build\win-unpacked\*' -DestinationPath 'build\Grok-Desktop_Windows-v%VERSION%.zip' -Force" 2>nul
    where 7z >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
      7z a -t7z "build\Grok-Desktop_Windows-v%VERSION%.7z" "build\win-unpacked\*" -mx=9 >nul
    )
  )
  echo.
  echo All files can be found in the build directory:
  dir /b build\Grok-Desktop_Installer*.exe build\Grok-Desktop_Installer*.msi build\Grok-Desktop_Portable*.exe build\Grok-Desktop_Windows*.zip build\Grok-Desktop_Windows*.7z 2>nul
  echo ===================================================
) else (
  echo ===================================================
  echo Windows build failed with error code %ERRORLEVEL%
  echo ===================================================
  goto :error
)
goto :end

:error
echo Build process terminated with errors.
exit /b 1

:end
pause 