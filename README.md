# TradeMatrix AI — Quantitative Strategy & Trading Journal Terminal

A state-of-the-art, institutional-grade web terminal built for serious traders. Features mathematical position sizing, Gemini AI trade copilot & mentor, Google OAuth authentication, and instant registration alerts.

---

## 🌟 Key Features

1. **Pre-Trade Position Size & Capital Allocation Calculator**:
   - Accurately answers: *"On ₹10,000 capital and 2% risk (₹200), should I deploy ₹10k, ₹5k, or ₹2k?"*
   - Dynamic comparison matrix mapping Stop Loss distances (2% SL = ₹10k, 4% SL = ₹5k, 10% SL = ₹2k).
   - Multi-asset support: Indian Equities/Cash (₹), Crypto Spot/Futures, Gold (XAUUSD), Forex (EURUSD), and Nifty 50.
   - Quick currency selector (`₹ INR`, `$ USD`, `€ EUR`, `£ GBP`).

2. **Gemini AI Trading Copilot & Quantitative Mentor**:
   - **Voice & Text Quick-Log**: Dictate trades in English, Hindi, or Hinglish; parses instrument, entry, stop loss, take profit, lot size, and P&L into structured JSON.
   - **Conversational Mentor**: Ask real-time questions about risk management, trading psychology, Nifty/Gold setups, and institutional order blocks.
   - **Resilient Multi-Model Architecture**: Automatic failover chain (`gemini-3.8-flash` ➔ `gemini-3.5-flash` ➔ `gemini-3.7-flash`).

3. **Secure Google OAuth 2.0 & Email Authentication**:
   - One-click Google Sign-In with authentic Google Identity Services (GIS).
   - Strict credential validation (no insecure browser prompts or bypasses).

4. **Instant Admin Registration Alerts (Gmail & Nodemailer)**:
   - Dispatches a branded HTML notification to `utkarshdhakane2@gmail.com` the instant any new trader registers.
   - Includes user's name, email, initial capital, and registration timestamp.

5. **Luxury Dark Red & Rose Quartz Visual Theme**:
   - Deep Burgundy/Rose Quartz palette (`#17040a` sidebar, `#150812` workspace).
   - 3D interactive particle starfield background.
   - Lenis ultra-smooth scrolling with hidden custom scrollbars globally.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 8, GSAP, Lenis, Lucide React, Canvas Confetti.
- **Styling**: Tailored Modern Vanilla CSS (Rose Quartz / Dark Red Theme).
- **AI Engine**: Google Gemini API (`gemini-3.8-flash`, `gemini-3.5-flash`).
- **Auth**: Google Identity Services (OAuth 2.0).
- **Backend / Notifications**: Nodemailer serverless API handler (`/api/notify-signup`).

---

## 🚀 Environment Variables (`.env`)

```env
# Google Gemini AI API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth 2.0 Client ID
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Admin Email for Notifications
VITE_NOTIFICATION_ADMIN_EMAIL=utkarshdhakane2@gmail.com
VITE_NOTIFICATION_API_ENDPOINT=/api/notify-signup

# Gmail App Password (16 characters)
GMAIL_USER=utkarshdhakane2@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password
```

---

## 📦 How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Open in browser
http://localhost:5173/
```

---

## 🌐 1-Click Publishing Guide

### Deploying to Vercel (Recommended):
1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Under **"Environment Variables"**, paste:
   - `VITE_GEMINI_API_KEY`
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_NOTIFICATION_ADMIN_EMAIL`
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
5. Click **"Deploy"**!
6. Once deployed, add your live production URL (e.g. `https://your-app.vercel.app`) to **Authorized JavaScript origins** in Google Cloud Console.
