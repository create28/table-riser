# Quick Vercel Deployment Guide

## 🚀 5-Minute Deployment

### Step 1: Push to GitHub (2 minutes)

1. **Create a new repository on GitHub**:
   - Go to https://github.com/new
   - Name: `fpl-dashboard`
   - Description: `Fantasy Premier League Analytics Dashboard`
   - **Keep it Public** (or Private if you have a paid GitHub account)
   - **DON'T** initialize with README (we already have one)
   - Click "Create repository"

2. **Push your code**:
   ```bash
   cd "/Users/chrismilne/Documents/21 FPL Dashboard/fpl-dashboard"
   
   # Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
   git remote add origin https://github.com/YOUR_USERNAME/fpl-dashboard.git
   
   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel (3 minutes)

1. **Go to Vercel**: https://vercel.com/signup
2. **Sign up with GitHub** (click "Continue with GitHub")
3. **Authorize Vercel** to access your repositories
4. **Click "Add New Project"**
5. **Select your `fpl-dashboard` repository**
6. **Click "Import"**
7. **Leave all settings as default** (Vercel auto-detects Next.js)
8. **Click "Deploy"**

That's it! ✅

### Step 3: Get Your URL

After deployment (2-3 minutes), you'll get a URL like:
```
https://fpl-dashboard-abc123.vercel.app
```

## 🎉 Share with Friends

Send them:
- **Your Team**: `https://your-app.vercel.app/?teamId=3992229`
- **Their Team**: `https://your-app.vercel.app/?teamId=THEIR_ID`
- **Strategy**: `https://your-app.vercel.app/strategy?teamId=THEIR_ID`

## 🔄 Making Updates

After deployment, any changes you push will auto-deploy:

```bash
cd "/Users/chrismilne/Documents/21 FPL Dashboard/fpl-dashboard"

# Make your changes, then:
git add .
git commit -m "Your update message"
git push

# Vercel automatically rebuilds! ✨
```

## 💡 Pro Tips

1. **Custom Domain**: Add in Vercel Settings → Domains
2. **Analytics**: Enable in Vercel Settings → Analytics (free)
3. **Preview Deployments**: Every git push creates a preview URL
4. **Rollback**: Easy rollback to previous versions in Vercel dashboard

## ⚡ That's It!

Your dashboard is now live and shareable!

**Deployment Time**: ~5 minutes  
**Cost**: $0 (Free tier)  
**Updates**: Automatic on git push  

---

**Need Help?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting.

