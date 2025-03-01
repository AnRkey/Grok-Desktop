; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

[Setup]
; General settings
AppName=Grok-Desktop
AppVersion=1.0.0-pre
AppPublisher=an R key
AppPublisherURL=https://github.com/AnRkey
AppSupportURL=https://github.com/AnRkey/Grok-Desktop/issues
AppUpdatesURL=https://github.com/AnRkey/Grok-Desktop/releases
DefaultDirName={autopf}\Grok-Desktop
DefaultGroupName=Grok-Desktop
AllowNoIcons=yes
LicenseFile=LICENSE
OutputDir=Grok-Desktop_Installer
OutputBaseFilename=Grok-Desktop_Installer
SetupIconFile=grok.ico
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
UninstallIconFile=grok.ico


[Files]
; Source: Path to your app files (e.g., the Grok_Desktop-windows-64 folder)
Source: "build\Grok-Desktop-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "grok.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Create a desktop shortcut
Name: "{autodesktop}\Grok-Desktop"; Filename: "{app}\Grok-Desktop.exe"; IconFilename: "{app}\grok.ico"
; Create a Start menu shortcut
Name: "{group}\Grok-Desktop"; Filename: "{app}\Grok-Desktop.exe"; IconFilename: "{app}\grok.ico"

[Run]
; Optional: Run the app after installation
Filename: "{app}\Grok-Desktop.exe"; Description: "Launch Grok-Desktop"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Optional: Clean up files on uninstall
Type: filesandordirs; Name: "{app}"