param([string]$BuildDirectory = (Join-Path $PSScriptRoot '../build'))

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json).version
$buildRoot = (Resolve-Path -LiteralPath $BuildDirectory).Path
$unpacked = Join-Path $buildRoot 'win-unpacked'
if (-not (Test-Path -LiteralPath (Join-Path $unpacked 'resources/app.asar'))) {
    throw 'Package the Windows application first (npm run build or npm run build-dir).'
}
$sevenZipCommand = Get-Command 7z.exe -ErrorAction SilentlyContinue | Select-Object -First 1
$sevenZip = if ($sevenZipCommand) { $sevenZipCommand.Source } else { Join-Path $env:ProgramFiles '7-Zip/7z.exe' }
if (-not (Test-Path -LiteralPath $sevenZip)) { throw 'Install 7-Zip and add 7z.exe to PATH.' }

$zipFile = Join-Path $buildRoot "Grok-Desktop_Windows-v$version.zip"
$sevenZipFile = Join-Path $buildRoot "Grok-Desktop_Windows-v$version.7z"
$temporaryArchive = Join-Path $buildRoot ("Grok-Desktop_Windows-v{0}.{1}.7z" -f $version, [guid]::NewGuid())
Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath $unpacked -Force).FullName -DestinationPath $zipFile -Force
Push-Location -LiteralPath $unpacked
try {
    & $sevenZip a -t7z $temporaryArchive '.\*' '-mx=9' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Windows 7z creation failed.' }
    & $sevenZip t $temporaryArchive | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Windows 7z validation failed.' }
    Move-Item -LiteralPath $temporaryArchive -Destination $sevenZipFile -Force
} finally { Pop-Location }
Write-Output "Created Windows ZIP and 7z archives for $version. Publishing is disabled."
