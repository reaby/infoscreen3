# BUILD

## Prerequisites

1. Install build tool globally (choose one):
   - **pkg**: `npm i pkg -g` (Node 18 max, deprecated)
   - **nexe**: `npm i nexe -g` (Node 20+, actively maintained)
2. Install dependencies: `npm install`

## Build Executable

### Using Nexe (Recommended - Node 20 support)

**Quick Build (Current Platform):**
```bash
npm run build:nexe
```

**Cross-Platform Build (Windows + Linux):**
```bash
npm run build:nexe
```

This will create platform-specific packages in `dist/` with all necessary files:
- `dist/windows-x64/` - Windows executable and runtime files
- `dist/linux-x64/` - Linux executable and runtime files

### Using pkg (Legacy - Node 18 max)

**Quick Build (Current Platform):**
```bash
npm run build
```

**Cross-Platform Build (Windows + Linux):**
```bash
npm run build:cross
```

### Platform-Specific Builds

Build only for Windows:
```bash
npm run build:windows
```

Build only for Linux:
```bash
npm run build:linux
```

## SQLite3 Native Module

If you encounter issues with SQLite3 bindings:

1. Rebuild for current platform:
```bash
npm run rebuild:sqlite
```

2. For cross-platform builds, you may need to:
   - Build on the target platform, OR
   - Manually copy the appropriate `.node` bindings to `node_modules/sqlite3/build/Release/`

## Troubleshooting

### Missing native bindings
If the executable fails with "Cannot find module", ensure sqlite3 native bindings are included:
```bash
npm rebuild sqlite3 --build-from-source
npm run build:cross
```

### Windows Defender / Antivirus
Packaged executables may be flagged. Add an exception for the dist folder.

## Distribution

Each platform package in `dist/` is self-contained and includes:
- Executable binary
- Data directories (data, locales, templates, tmp, trash)
- Sample .env configuration
- README with platform-specific instructions
