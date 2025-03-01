@echo off
REM By an R key at anrkey@gmail.com

REM Check if Node.js is installed 
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo npm is not installed. Please install Node.js which includes npm.
    exit /b 1
)

REM Check if nativefier is installed
where nativefier >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo nativefier is not installed. Installing now...
    npm install -g nativefier
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install nativefier
        exit /b 1
    )
)

echo Building Grok Desktop...

REM Set the app name, URL, icon, internal URLs, user agent, and single instance
set APP_NAME="Grok-Desktop"
set APP_URL="https://grok.com"
set APP_ICON=".\grok.ico"
set APP_INTERNAL_URLS=".*\.grok\.com.*|.*\.x\.ai.*|.*accounts\.google\.com.*|.*appleid\.apple\.com.*"
set OUTPUT_DIR="build"
REM Remove the REM from the line below to disable always on top
REM set ALWAYS_ON_TOP=--always-on-top

REM Create output directory if it doesn't exist
if not exist %OUTPUT_DIR% mkdir %OUTPUT_DIR%



REM Build the app
nativefier %APP_URL% %OUTPUT_DIR% ^
  --name %APP_NAME% ^
  --internal-urls %APP_INTERNAL_URLS% ^
  --single-instance ^
  --icon %APP_ICON% ^
  --conceal ^
  %ALWAYS_ON_TOP%

if %ERRORLEVEL%==0 (
  echo Grok Desktop build - Success
) else (
  echo Grok Desktop build - Failure
)