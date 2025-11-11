# FPL Dashboard

A comprehensive Fantasy Premier League analytics dashboard built with Next.js, featuring advanced player statistics, transfer strategy planning, and historical data analysis.

![FPL Dashboard](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)

## 🚀 Live Demo

Visit: [Your Vercel URL]

## ✨ Features

### 📊 Dashboard Analytics
- **Player Form**: Recent performance metrics with interactive charts
- **Value Efficiency**: Points per million analysis
- **Team Form**: Recent team performance tracking
- **Fixture Difficulty**: Upcoming opponent analysis with color-coded ratings
- **Transfer Coefficients**: Track popular player transfers in/out
- **Points Volatility**: Identify consistent vs high-risk players

### 🎯 5-Week Transfer Strategy
- Smart AI-powered transfer recommendations
- Position-specific suggestions (GK→GK, DEF→DEF, etc.)
- Budget-aware planning (tracks your bank balance)
- Risk appetite slider (stable vs volatile picks)
- 3 alternative options for each gameweek
- Detailed written explanations for each transfer

### 📈 Historical Data (2021-2024)
- Player vs Team analysis across 3 seasons
- 350+ player historical records
- Performance trends and patterns
- Home/Away splits

### 🔍 Advanced Player Stats
- **xG & xA**: Expected goals and assists
- **Form Charts**: Last 5 games + full season
- **Defensive Stats**: Saves, clean sheets, BPS
- **Availability**: Injury status and news
- **Player Images**: Official Premier League photos

### 👥 Multi-Team Support
- View ANY FPL manager's team by ID
- URL-based sharing
- localStorage persistence
- Works on both dashboard and strategy pages

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Charts**: Recharts
- **Data Source**: Official FPL API + Historical CSV data

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/fpl-dashboard.git

# Navigate to project directory
cd fpl-dashboard

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🌐 Usage

### View Your Team
```
http://localhost:3000/?teamId=YOUR_TEAM_ID
```

### View Transfer Strategy
```
http://localhost:3000/strategy?teamId=YOUR_TEAM_ID
```

### Finding Your Team ID
1. Go to fantasy.premierleague.com
2. Navigate to your team
3. Look at the URL: `fantasy.premierleague.com/entry/3992229/event/12`
4. Your team ID is `3992229`

## 🚀 Deployment

This project is optimized for Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/fpl-dashboard)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 📊 Data Sources

- **Live Data**: [Official FPL API](https://fantasy.premierleague.com/api/)
- **Historical Data**: [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)

## 🎨 Features in Detail

### Dashboard Components

1. **Player Form**
   - Squad tab: Your players sorted by form
   - Top in Game tab: Best 20 players league-wide
   - Click any player for detailed stats

2. **Value Efficiency**
   - Points per £1M analysis
   - Identifies value picks and underperformers
   - Compare squad vs top players

3. **Transfer Strategy**
   - 5-week forward planning
   - Risk appetite slider (0-100)
   - Position-specific recommendations
   - Budget-aware suggestions
   - Written explanations

4. **Player vs Team**
   - Current season + 3 historical seasons
   - Home/Away performance splits
   - Average points vs each opponent

5. **Points Volatility**
   - Standard deviation analysis
   - Coefficient of variation
   - Identify boom-or-bust players

## 🔧 Configuration

### Default Team ID
Edit `app/page.tsx` and `app/strategy/page.tsx`:
```typescript
const DEFAULT_TEAM_ID = 3992229; // Change to your team ID
```

### Historical Data
Historical CSV files are stored in `/public/historical-data/`:
- `2021-22_gw.csv` (3.6 MB)
- `2022-23_gw.csv` (4.5 MB)
- `2023-24_gw.csv` (4.9 MB)

To update:
1. Download latest data from [vaastav's repo](https://github.com/vaastav/Fantasy-Premier-League)
2. Replace files in `/public/historical-data/`
3. Update `lib/historical-data.ts` if adding new seasons

## 📱 Mobile Support

Fully responsive design:
- ✅ Mobile-first approach
- ✅ Touch-friendly interactions
- ✅ Optimized layouts for all screen sizes
- ✅ PWA-ready (can be added to home screen)

## 🐛 Known Limitations

1. **Historical Data**: Player matching by name (not perfect for players who changed teams)
2. **xG/xA Data**: Limited to FPL API data (not as detailed as Understat)
3. **Multi-Season Analysis**: Only available in "Player vs Team" component
4. **Private Teams**: Cannot view private/hidden FPL teams
5. **Rate Limiting**: FPL API may throttle excessive requests

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Official FPL API](https://fantasy.premierleague.com/)
- [vaastav's FPL Historical Data](https://github.com/vaastav/Fantasy-Premier-League)
- [shadcn/ui](https://ui.shadcn.com/)
- [Next.js](https://nextjs.org/)

## 📧 Contact

Created by Chris Milne - [GitHub](https://github.com/YOUR_USERNAME)

## 🔗 Related Docs

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Vercel deployment guide
- [HISTORICAL-DATA-INTEGRATION.md](./HISTORICAL-DATA-INTEGRATION.md) - Historical data setup
- [TEAM-ID-FEATURE.md](./TEAM-ID-FEATURE.md) - Multi-team feature guide
- [TRANSFER-STRATEGY-GUIDE.md](./TRANSFER-STRATEGY-GUIDE.md) - Strategy algorithm details

---

**Star ⭐ this repo if you find it helpful!**
