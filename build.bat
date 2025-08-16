
 @echo off
echo ===================================================
echo Building Grok Desktop Installer
echo ===================================================

:: Clean previous build files
echo Cleaning previous build files...
if exist build rmdir build /s /q
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

:: Build the installer application (no global installs)
echo Building installer application...
call npx --yes electron-builder@latest --win nsis

:: Check if build was successful
if %ERRORLEVEL% EQU 0 (
  echo ===================================================
  echo Build completed successfully!
  echo Installer executable can be found in the build directory.
  echo ===================================================
) else (
  echo ===================================================
  echo Build failed with error code %ERRORLEVEL%
  echo Please check the error messages above.
  echo ===================================================
  goto :error
)

goto :end

:error
echo Build process terminated with errors.
exit /b 1

:end
pause 