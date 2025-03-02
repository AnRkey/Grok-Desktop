@echo off
echo ===================================================
echo Building Grok Desktop Installer
echo ===================================================


:: Clean previous build files+
echo Cleaning previous build files...
if exist build rmdir build /s /q
:: if exist node_modules rmdir node_modules /s /q

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

:: Install project dependencies if needed
if not exist node_modules (
  echo Node modules not found. Installing project dependencies...
  
  :: Clean npm cache to prevent integrity issues
  echo Cleaning npm cache to prevent integrity checksum errors...
  call npm cache clean --force
  
  :: Install project dependencies
  echo Installing project dependencies...
  call npm install --prefer-offline --no-fund --no-audit --loglevel=http
  
  if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to install project dependencies, but continuing with build...
  )
)

:: Always install electron-builder globally
echo Installing electron-builder globally...
call npm install -g electron-builder --loglevel=http

if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Failed to install electron-builder globally.
  goto :error
)

:: Build the installer application
echo Building installer application...

:: Use globally installed electron-builder
set NPM_PREFIX=
for /f "tokens=*" %%i in ('npm config get prefix') do set NPM_PREFIX=%%i

if exist "%NPM_PREFIX%\electron-builder.cmd" (
  echo Using globally installed electron-builder...
  call "%NPM_PREFIX%\electron-builder.cmd" --win nsis
) else if exist "%NPM_PREFIX%\node_modules\.bin\electron-builder.cmd" (
  echo Using electron-builder from global node_modules...
  call "%NPM_PREFIX%\node_modules\.bin\electron-builder.cmd" --win nsis
) else if exist "%APPDATA%\npm\electron-builder.cmd" (
  echo Using electron-builder from AppData\npm...
  call "%APPDATA%\npm\electron-builder.cmd" --win nsis
) else (
  echo ERROR: electron-builder not found in global npm directories.
  goto :error
)

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