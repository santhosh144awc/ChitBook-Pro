# How to Install Node.js (includes npm)

## Step 1: Download Node.js

1. Go to the official Node.js website:
   - **Website:** https://nodejs.org/
   - Or directly: https://nodejs.org/en/download/

2. You'll see two download options:
   - **LTS (Recommended)** - Long Term Support version (most stable)
   - **Current** - Latest features

   **Choose: LTS (Recommended)** version

3. Click the download button for Windows:
   - It will download an `.msi` installer file (e.g., `node-v20.x.x-x64.msi`)

## Step 2: Install Node.js

1. **Locate the downloaded file** (usually in your Downloads folder)

2. **Double-click the `.msi` installer** to start installation

3. **Follow the installation wizard:**
   - Click "Next" on the welcome screen
   - Accept the license agreement
   - Choose installation location (default is fine: `C:\Program Files\nodejs\`)
   - Click "Next" through the setup options
   - **Important:** Make sure "Automatically install the necessary tools" is checked (if shown)
   - Click "Install"
   - Enter administrator password if prompted
   - Wait for installation to complete
   - Click "Finish"

## Step 3: Verify Installation

1. **Close ALL terminal/PowerShell windows** (important for PATH to update)

2. **Open a NEW PowerShell or Command Prompt:**
   - Press `Win + X` and select "Windows PowerShell" or "Terminal"
   - Or press `Win + R`, type `cmd`, press Enter

3. **Check if Node.js is installed:**
   ```
   node --version
   ```
   You should see something like: `v20.11.0`

4. **Check if npm is installed:**
   ```
   npm --version
   ```
   You should see something like: `10.2.4`

## Step 4: Navigate to Your Project

After verifying installation:

1. Open a new terminal/PowerShell
2. Navigate to your project:
   ```
   cd "E:\Software\Cursor\ChitBook Pro"
   ```

3. Install project dependencies:
   ```
   npm install
   ```

4. Run the development server:
   ```
   npm run dev
   ```

## Troubleshooting

### If `node` or `npm` command is not recognized:

1. **Restart your computer** (this ensures PATH is updated)

2. **Or manually add to PATH:**
   - Open "System Properties" > "Environment Variables"
   - Under "System Variables", find "Path"
   - Click "Edit"
   - Add: `C:\Program Files\nodejs\`
   - Click "OK" on all windows
   - Restart terminal

### If you get permission errors:

- Run PowerShell/CMD as Administrator
- Or use a different installation location (user directory)

## Alternative: Using Chocolatey (for developers)

If you have Chocolatey package manager installed:

```powershell
choco install nodejs-lts
```

## Download Links

- **Direct Download (Windows 64-bit LTS):**
  https://nodejs.org/dist/lts-v20.x.x/node-v20.x.x-x64.msi

  (Replace x.x.x with the latest version number)

## Need Help?

- Node.js Official Docs: https://nodejs.org/en/docs/
- Node.js Downloads: https://nodejs.org/en/download/
