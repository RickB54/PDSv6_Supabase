# 📱 Testing on Your Phone - Quick Guide

## ✅ UPDATED: Vite Config Changed!
Your `vite.config.ts` has been updated to allow network access.

---

## 🚀 Option 1: Local WiFi (FREE - SAME NETWORK)

### Setup (One-Time):
1. **Restart your dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Find your computer's IP address:**
   ```powershell
   ipconfig
   ```
   Look for `IPv4 Address` under your WiFi adapter (e.g., `192.168.1.100`)

3. **On your phone:**
   - Connect to the **same WiFi** as your computer
   - Open browser
   - Go to: `http://YOUR_IP:6066`
   - Example: `http://192.168.1.100:6066`

### Benefits:
- ✅ **FREE**
- ✅ **Instant updates** (hot reload works!)
- ✅ **No commits needed**
- ✅ **Test camera, mic, everything**

### Limitations:
- ⚠️ Must be on same WiFi
- ⚠️ IP might change if you restart router

---

## ⚡ Option 2: ngrok (WORKS ANYWHERE)

### Setup:
1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start dev server** (if not running):
   ```bash
   npm run dev
   ```

3. **In NEW terminal, run:**
   ```bash
   ngrok http 6066
   ```

4. **Copy the HTTPS URL** (looks like `https://abc123.ngrok-free.app`)

5. **Open that URL on your phone!**

### Benefits:
- ✅ **Works on ANY network** (even cellular)
- ✅ **Instant updates**
- ✅ **No commits needed**
- ✅ **HTTPS** (required for camera/mic on some browsers)
- ✅ **Share with others** for testing

### Limitations:
- ⚠️ URL changes each restart (free tier)
- ⚠️ Requires ngrok running

---

## 🎯 Recommended Workflow:

### For Quick Testing (Same WiFi):
```bash
# 1. Find your IP once
ipconfig

# 2. Bookmark on phone: http://YOUR_IP:6066

# 3. Just refresh phone browser to see changes!
```

### For Testing Anywhere:
```bash
# Terminal 1:
npm run dev

# Terminal 2:
ngrok http 6066

# Copy URL to phone
```

---

## 🔧 Troubleshooting:

### Can't connect on phone?
1. **Check firewall:**
   - Windows Firewall might block port 6066
   - Allow Node.js through firewall

2. **Verify same WiFi:**
   - Phone and computer must be on same network

3. **Try ngrok instead:**
   - Bypasses all network issues

### Camera/Mic not working?
- **Use HTTPS** (ngrok provides this)
- Or use `http://YOUR_IP:6066` (works on most phones)

---

## 📊 Comparison:

| Method | Speed | Cost | Works Anywhere | Setup Time |
|--------|-------|------|----------------|------------|
| **Local WiFi** | ⚡⚡⚡ | FREE | ❌ Same WiFi only | 2 min |
| **ngrok** | ⚡⚡⚡ | FREE* | ✅ Yes | 5 min |
| **Netlify Deploy** | 🐌 | FREE | ✅ Yes | 5-10 min |

*ngrok free tier has some limits but is fine for development

---

## 🎉 You're All Set!

**Next time you want to test:**
1. Make sure `npm run dev` is running
2. Open `http://YOUR_IP:6066` on your phone
3. Test away! Changes appear instantly! 🚀

**No more waiting for Netlify deployments!** 🎊
