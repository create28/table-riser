# Deploying FPL Dashboard to Vercel

## Prerequisites

1. **GitHub Account**: You'll need a GitHub account to connect with Vercel
2. **Vercel Account**: Sign up at https://vercel.com (free tier is perfect)
3. **Git Repository**: Your code needs to be in a Git repository

## Step 1: Prepare Your Project

Your project is already ready for deployment! Here's what's configured:

- ✅ Next.js 16 (Vercel's native framework)
- ✅ All dependencies in package.json
- ✅ Build command: `npm run build`
- ✅ Public folder for historical data
- ✅ Environment variables: None needed! (uses public FPL API)

## Step 2: Push to GitHub

If you haven't already, push your code to GitHub:

```bash
cd "/Users/chrismilne/Documents/21 FPL Dashboard/fpl-dashboard"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - FPL Dashboard"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/fpl-dashboard.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Using Vercel Website (Recommended for first time)

1. **Go to Vercel**: https://vercel.com/login
2. **Sign up/Login** with GitHub
3. **Click "Add New Project"**
4. **Import your GitHub repository**:
   - Select "Import Git Repository"
   - Choose your `fpl-dashboard` repository
   - Click "Import"

5. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

6. **Environment Variables**: 
   - None needed! Skip this step.

7. **Click "Deploy"**

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project directory)
cd "/Users/chrismilne/Documents/21 FPL Dashboard/fpl-dashboard"
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? fpl-dashboard
# - Directory? ./
# - Override settings? No

# For production deployment:
vercel --prod
```

## Step 4: Deployment Details

### What Vercel Will Do:
1. ✅ Install dependencies (`npm install`)
2. ✅ Run build (`npm run build`)
3. ✅ Deploy to global CDN
4. ✅ Assign a URL (e.g., `fpl-dashboard-xxx.vercel.app`)
5. ✅ Enable automatic deployments on git push

### Build Time Expectations:
- First deployment: ~2-3 minutes
- Historical data files: ~13MB (uploaded to CDN)
- Server functions: Dynamic routes for team ID switching

## Step 5: After Deployment

Once deployed, you'll get a URL like:
```
https://fpl-dashboard-abc123.vercel.app
```

### Test Your Deployment:
1. **Main Dashboard**: `https://your-app.vercel.app/`
2. **With Team ID**: `https://your-app.vercel.app/?teamId=3992229`
3. **Strategy Page**: `https://your-app.vercel.app/strategy`
4. **Strategy with Team**: `https://your-app.vercel.app/strategy?teamId=3992229`

## Step 6: Custom Domain (Optional)

Want a custom domain like `fpl.yourdomain.com`?

1. Go to your project in Vercel
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS instructions
5. Done! (Usually takes 5-30 minutes)

## Sharing with Friends

Once deployed, share these links:

### View Your Team:
```
https://your-app.vercel.app/?teamId=3992229
```

### View Their Team:
```
https://your-app.vercel.app/?teamId=THEIR_TEAM_ID
```

### Transfer Strategy:
```
https://your-app.vercel.app/strategy?teamId=THEIR_TEAM_ID
```

## Automatic Deployments

Every time you push to GitHub:
- ✅ Vercel automatically rebuilds
- ✅ Deploys to production
- ✅ No manual steps needed!

To push updates:
```bash
git add .
git commit -m "Update feature"
git push
```

## Performance Optimization

Your app is already optimized for Vercel:

- ✅ **Static Generation**: Main page pre-rendered
- ✅ **Dynamic Routes**: Team ID switching works server-side
- ✅ **Edge Functions**: Fast API responses
- ✅ **Image Optimization**: Player images cached
- ✅ **CDN Distribution**: Global delivery

## Troubleshooting

### Build Fails?
Check the build logs in Vercel dashboard. Common issues:
- Missing dependencies (add to package.json)
- TypeScript errors (run `npm run build` locally first)

### Historical Data Not Loading?
The CSV files in `public/historical-data/` should deploy automatically. Check:
- Files are committed to git
- Files are in the `public/` directory
- Total size is under Vercel's limits (100MB, you're at ~13MB)

### Team ID Not Working?
- Ensure `searchParams` is awaited (already fixed)
- Check URL format: `?teamId=123456`

### Slow Loading?
First load might be slower (cold start). Subsequent loads are fast:
- Main dashboard: ~1-2s
- Strategy page: ~3-5s (fetches 348 player histories)
- Player modals: Instant (data already loaded)

## Monitoring

In Vercel dashboard you can see:
- 📊 Deployment history
- 🚀 Performance metrics
- 📈 Bandwidth usage
- 🌍 Geographic distribution
- 🐛 Error logs

## Cost

**Free Tier Includes**:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Analytics

Your app should easily fit in the free tier!

## Security Notes

- ✅ No API keys needed (public FPL API)
- ✅ No authentication required
- ✅ All data is public FPL data
- ✅ Team IDs are public information
- ⚠️ Anyone with the URL can view any team

## Next Steps

After deploying:

1. **Share with Friends**: Send them the URL
2. **Create Bookmarks**: For your team and rivals
3. **Pin to Home Screen**: On mobile devices
4. **Set Up Analytics**: Add Vercel Analytics (optional)
5. **Custom Domain**: If you want a branded URL

## Support

If you run into issues:
1. Check Vercel build logs
2. Test locally first: `npm run build && npm start`
3. Check GitHub repository is up to date
4. Vercel support: https://vercel.com/support

---

**You're ready to deploy!** 🚀

Follow Step 2 to push to GitHub, then Step 3 to deploy to Vercel.

Your friends will be able to access the dashboard at your Vercel URL within minutes!



