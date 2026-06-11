# ⚡ AETHERIA - Quick Setup Guide

## Step 1: Extract Files
Extract all files to a folder on your computer.

Your folder structure should look like:
```
aetheria-hotel-management/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── README.md
├── SETUP.md (this file)
└── src/
    ├── main.js
    ├── style.css
    ├── db.js
    ├── dashboard.js
    ├── booking.js
    ├── restaurant.js
    └── laundry.js
```

## Step 2: Install Node.js (if not already installed)
Download from: https://nodejs.org/
- Choose **LTS version** (recommended)
- Install with default settings

## Step 3: Open Terminal/Command Prompt
1. Open terminal (Mac/Linux) or Command Prompt (Windows)
2. Navigate to your project folder:
   ```bash
   cd path/to/aetheria-hotel-management
   ```

## Step 4: Install Dependencies
Run this command to download required packages:
```bash
npm install
```

This will create a `node_modules` folder (don't edit or move this).

## Step 5: Start the Development Server
Run this command:
```bash
npm run dev
```

You should see output like:
```
  VITE v5.2.0  ready in 123 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h + enter to show help
```

## Step 6: Open in Browser
The app will automatically open at `http://localhost:3000/`

**If it doesn't open automatically:**
- Copy `http://localhost:3000` 
- Paste in your browser address bar
- Press Enter

## ✅ You're Done!
The hotel management system is now running!

### Try It Out:
1. Click **"Bookings & Rooms"** and check in a guest
2. Go to **"Dining & Orders"** and place a food order
3. Visit **"Laundry Service"** and register a laundry request
4. Click **"Billing & Checkout"** to see the invoice
5. Confirm checkout to finalize

## 🛑 Stopping the Server
Press `Ctrl + C` in the terminal (or `Cmd + C` on Mac)

## 🔄 Restarting the Server
Run `npm run dev` again

## 📦 Building for Production (Optional)
To create an optimized version for deployment:
```bash
npm run build
```

This creates a `dist/` folder with the compiled files.

## ❓ Common Issues

**Q: "npm: command not found"**
- Node.js might not be installed properly
- Restart your computer after installing Node.js
- Or download from https://nodejs.org/

**Q: "Port 3000 already in use"**
- Edit `vite.config.js` and change port to 3001:
  ```javascript
  server: {
    port: 3001,
    open: true
  }
  ```

**Q: "Module not found" error**
- Make sure all files are in `/src` folder
- Check file names match exactly (case-sensitive)
- Try: `npm install` again

**Q: Styles not loading / page looks broken**
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Close and reopen browser

---

**Need more help?** Check **README.md** for detailed documentation.
