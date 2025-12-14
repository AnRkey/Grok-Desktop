# Linux Build Guide for Grok-Desktop

This guide provides detailed instructions for building and deploying Grok-Desktop on Red Hat Enterprise Linux 9 and Rocky Linux 10.

## Supported Linux Distributions

- **Red Hat Enterprise Linux 9 (RHEL 9)**
- **Rocky Linux 10**
- Other RPM-based distributions (Fedora, AlmaLinux, etc.)
- Any modern Linux distribution via AppImage

## Build Targets

Grok-Desktop for Linux provides two package formats:

1. **RPM Package** (`.rpm`)
   - Native package format for RHEL 9 and Rocky Linux 10
   - Integrates with system package manager (dnf/yum)
   - Creates desktop entries and file associations
   - Recommended for production deployments

2. **AppImage** (`.AppImage`)
   - Universal Linux package format
   - No installation required
   - Runs on any modern Linux distribution
   - Ideal for testing or portable deployments

## Prerequisites

### System Requirements
- 64-bit x86_64 architecture
- 4 GB RAM (minimum)
- 500 MB free disk space
- Internet connection for downloading dependencies

### Software Requirements

#### RHEL 9 / Rocky Linux 10
```bash
# Install Node.js (version 20 LTS recommended)
sudo dnf module install nodejs:20

# Install build tools
sudo dnf groupinstall "Development Tools"

# Install additional dependencies (including legacy libcrypt for RPM building)
sudo dnf install git libxcrypt-compat
```

#### Other RPM-based distributions
```bash
# Fedora
sudo dnf install nodejs npm gcc-c++ make git

# AlmaLinux
sudo dnf install nodejs npm gcc-c++ make git
```

## Building from Source

### 1. Clone the Repository
```bash
git clone https://github.com/AnRkey/Grok-Desktop.git
cd Grok-Desktop
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build for Linux

#### Option A: Build Both RPM and AppImage (Recommended)
```bash
npm run build-linux
```
or
```bash
./build-linux.sh
```

#### Option B: Build RPM Only
```bash
npm run build-rhel
```

#### Option C: Build All Platforms (Windows + Linux)
```bash
npm run build-all
```

### 4. Locate Build Artifacts
After building, packages will be available in the `build/` directory:
- `Grok-Desktop-v1.2.3.x86_64.rpm` - RPM package
- `Grok-Desktop-v1.2.3.x86_64.AppImage` - AppImage package

## Installation

### Installing RPM Package

#### Using DNF (Recommended for RHEL 9 / Rocky Linux 10)
```bash
cd build
sudo dnf install ./Grok-Desktop-v1.2.3.x86_64.rpm
```

#### Using YUM (Older systems)
```bash
cd build
sudo yum localinstall ./Grok-Desktop-v1.2.3.x86_64.rpm
```

#### Using RPM directly
```bash
cd build
sudo rpm -ivh Grok-Desktop-v1.2.3.x86_64.rpm
```

### Using AppImage (No Installation Required)

```bash
cd build
chmod +x Grok-Desktop-v1.2.3.x86_64.AppImage
./Grok-Desktop-v1.2.3.x86_64.AppImage
```

## Running the Application

### After RPM Installation
```bash
# From terminal
grok-desktop

# Or launch from Applications menu
# Look for "Grok Desktop" in the Network category
```

### AppImage
```bash
./Grok-Desktop-v1.2.3.x86_64.AppImage
```

## Uninstallation

### RPM Package
```bash
sudo dnf remove Grok-Desktop
# or
sudo rpm -e Grok-Desktop
```

### AppImage
Simply delete the AppImage file - no uninstallation needed.

## Troubleshooting

### RPM Build Fails with "libcrypt.so.1: cannot open shared object file"
**Error message**: `error while loading shared libraries: libcrypt.so.1: cannot open shared object file: No such file or directory`

**Solution**: Install the legacy libcrypt compatibility library:
```bash
sudo dnf install libxcrypt-compat
```

This is a known issue on Rocky Linux 10 and RHEL 9+ systems. The FPM tool used by electron-builder requires the legacy `libcrypt.so.1` library which is provided by the `libxcrypt-compat` package.

**Note**: The AppImage will still build successfully even if this library is missing. Only RPM packaging is affected.

### Build Fails with "node-gyp" Errors
Install additional build dependencies:
```bash
sudo dnf install python3 gcc-c++ make
```

### Missing "electron-builder" Command
The project uses npx to automatically download electron-builder. Ensure you have:
```bash
npm --version  # Should show npm 8.x or higher
node --version  # Should show Node.js 18.x or 20.x
```

### RPM Installation Fails with Dependency Errors
Check for missing system libraries:
```bash
sudo dnf install gtk3 libXScrnSaver alsa-lib nss
```

### AppImage Won't Execute
1. Verify file is executable:
   ```bash
   chmod +x Grok-Desktop-v*.AppImage
   ```

2. If using FUSE2, install FUSE:
   ```bash
   sudo dnf install fuse-libs
   ```

3. Try extracting and running manually:
   ```bash
   ./Grok-Desktop-v*.AppImage --appimage-extract
   ./squashfs-root/AppRun
   ```

### Application Crashes on Startup
Check system requirements and try running from terminal to see error messages:
```bash
grok-desktop --verbose
```

## Distribution-Specific Notes

### Red Hat Enterprise Linux 9
- Uses dnf package manager
- Requires EPEL repository for some optional dependencies
- SELinux may require policy adjustments for some features

### Rocky Linux 10
- Drop-in replacement for RHEL
- Uses dnf package manager
- Fully compatible with RHEL 9 packages

### Fedora
- Uses latest packages by default
- May use newer Electron versions
- Building from source is recommended

## Advanced Configuration

### Custom Build Options

Edit `package.json` to customize build settings:

```json
"linux": {
  "target": ["rpm", "AppImage"],
  "category": "Network",
  "vendor": "Your Vendor Name"
}
```

### Build for Additional Architectures

Currently supports x64 (x86_64). To add ARM64 support:

```bash
npm run build-linux -- --arm64
```

## Security Considerations

1. **Package Verification**: Always verify package signatures in production
2. **Updates**: Keep Electron and dependencies updated for security patches
3. **Sandboxing**: Electron's sandbox is enabled by default for security
4. **SELinux**: On RHEL, configure SELinux policies if needed

## Support and Issues

- **GitHub Issues**: https://github.com/AnRkey/Grok-Desktop/issues
- **Email**: anrkey@gmail.com

## License

This project is licensed under the GNU General Public License version 2.0 (GPL-2.0).

---

**Last Updated**: November 2025  
**Version**: 1.2.3

