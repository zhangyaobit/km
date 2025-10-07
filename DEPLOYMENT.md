# Deploying to Render 🚀

Complete guide to deploy your Knowledge Map to Render.

---

## Prerequisites

- ✅ Render account (you have this!)
- GitHub account
- Google API Key for Gemini

---

## Step 1: Test Locally First

Before deploying, make sure everything works:

```bash
# Terminal 1 - Start Backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 - Start Frontend  
cd frontend
npm start

# Browser: Open http://localhost:3000
# Test: Generate a knowledge map to verify it works
```

**Make sure:**
- ✅ Backend starts without errors
- ✅ Frontend loads at localhost:3000
- ✅ You can generate knowledge maps
- ✅ No errors in browser console (F12)

---

## Step 2: Push Code to GitHub

```bash
# In your project root
cd /home/yao/s/km

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Render deployment"

# Create a new repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy Backend

### 3.1 Create Web Service

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select your repository

### 3.2 Configure Settings

| Setting | Value |
|---------|-------|
| **Name** | `km-backend` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Environment** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

### 3.3 Add Environment Variable

1. Click **"Environment Variables"** section
2. Click **"Add Environment Variable"**
3. Add:
   - **Key**: `GOOGLE_API_KEY`
   - **Value**: Your Google Gemini API key

### 3.4 Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for build & deployment
3. **Copy your backend URL** (e.g., `https://km-backend.onrender.com`)

---

## Step 4: Deploy Frontend

### 4.1 Create Static Site

1. Go back to Render dashboard
2. Click **"New +"** → **"Static Site"**
3. Select the same repository

### 4.2 Configure Settings

| Setting | Value |
|---------|-------|
| **Name** | `km-frontend` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `build` |

### 4.3 Add Environment Variable

1. Click **"Advanced"** → **"Add Environment Variable"**
2. Add:
   - **Key**: `REACT_APP_API_URL`
   - **Value**: Your backend URL from Step 3.4 (no trailing slash!)
   
   Example: `https://km-backend.onrender.com`

### 4.4 Deploy

1. Click **"Create Static Site"**
2. Wait 5-10 minutes
3. Your site is now live! 🎉

---

## Step 5: Test Your Live Site

1. Visit your frontend URL (e.g., `https://km-frontend.onrender.com`)
2. Enter a concept (e.g., "React")
3. Generate knowledge map
4. Should work perfectly!

---

## Troubleshooting

### Backend won't start
- Check logs in Render dashboard
- Verify `GOOGLE_API_KEY` is set correctly

### Frontend shows "Connection Error"
- Check `REACT_APP_API_URL` is correct
- Must be set BEFORE build
- No trailing slash
- If you change it, you must **manually redeploy** the frontend

### CORS errors
- Backend already configured for CORS
- If you get errors, update backend URL in CORS settings

---

## Auto-Deploy

Render automatically redeploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Both services will auto-redeploy!
```

---

## Important Notes

**Free Tier Limitations:**
- Services sleep after 15 min of inactivity
- First request after sleep takes ~30 seconds to wake up
- Good for testing, upgrade for production

**Security:**
- `.env` file is NOT pushed to GitHub (in .gitignore)
- Environment variables are secure on Render
- Frontend code is visible (normal for all websites)
- Backend code stays private on Render servers

**Docker:**
- Your local Dockerfile is for development only
- Render uses native Python runtime (simpler & faster)
- This is normal and recommended!

---

## Summary

✅ Test locally  
✅ Push to GitHub  
✅ Deploy backend (Web Service, Python 3)  
✅ Deploy frontend (Static Site)  
✅ Add environment variables  
✅ Done!

Your Knowledge Map is now live on the web! 🚀