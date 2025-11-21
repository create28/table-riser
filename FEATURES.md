# FPL Dashboard Features Guide

## 📊 Dashboard Overview

This dashboard provides comprehensive analytics for your Fantasy Premier League team with real-time data from the official FPL API.

## Feature Breakdown

### 1. Manager Overview Card
**Location**: Top of dashboard

**What it shows**:
- Manager name and team name
- Overall rank (updated in real-time)
- Total points accumulated this season
- Current gameweek points
- Team value in millions

**Why it's useful**: Quick snapshot of your overall performance and standings.

---

### 2. Player Form Table
**Location**: Top-left grid

**Metrics**:
- **Form**: Average points over last games (color-coded)
  - 🟢 Green (6+): Excellent form
  - 🟡 Yellow (4-5.9): Good form
  - 🔴 Red (<4): Poor form
- **PPG**: Points per game average
- **Total Points**: Season total
- **Minutes**: Playing time (indicates regular starter)

**Why it's useful**: Identify which players are performing well and which might need replacing.

---

### 3. Value Efficiency Table
**Location**: Top-right grid

**Metrics**:
- **Cost**: Current player price
- **Total Points**: Season points
- **Points/£M**: Value metric (points divided by cost)
- **Status**: Quick visual indicator
  - ⭐ Excellent (30+ points per million)
  - ✅ Good (20-29.9 points per million)
  - ⚠️ Poor (<20 points per million)

**Why it's useful**: Find budget-friendly players delivering great value. Essential for transfer planning when you're tight on budget.

---

### 4. Recent Team Form
**Location**: Middle-left grid

**What it shows**:
- Last 5 match results for each team in your squad
- Win/Draw/Loss record
- Visual W/D/L indicators (color-coded)
  - 🟢 Green: Win
  - 🟡 Yellow: Draw
  - 🔴 Red: Loss

**Why it's useful**: Team form affects player performance. Teams on winning streaks often have multiple players in form.

---

### 5. Upcoming Fixture Difficulty
**Location**: Middle-right grid

**What it shows**:
- Next 5 fixtures for each team
- Difficulty rating (1-5 scale)
  - 1-2 (Green/Lime): Easy fixtures
  - 3 (Yellow): Medium difficulty
  - 4-5 (Orange/Red): Difficult fixtures
- Home (H) or Away (A) indicator
- Opponent team name
- Gameweek number

**Average Difficulty**: Calculated across next 5 fixtures

**Why it's useful**: 
- Plan transfers based on upcoming fixtures
- Captain choice (pick players with easy fixtures)
- Identify good times to bench/play certain players
- Long-term transfer strategy

---

### 6. Transfer Pressure Analysis
**Location**: Bottom full-width section

**Two Tabs**:

#### Transfers In Tab
Shows players being heavily brought into teams:
- **Ownership %**: How many managers own this player
- **Transfers In**: Number of managers transferring player in this gameweek
- **Coefficient**: Weighted metric considering both transfers and ownership
  - Higher coefficient = more popular pick
  - 🟢 Green (10+): Extremely popular
  - 🔵 Blue (5-9.9): Popular
  - Gray (<5): Normal activity

#### Transfers Out Tab
Shows players being sold by managers:
- **Ownership %**: Current ownership level
- **Transfers Out**: Number of managers removing this player
- **Coefficient**: Weighted metric for transfer-out pressure
  - 🔴 Red (10+): Mass exodus (major concern)
  - 🟠 Orange (5-9.9): Significant selling
  - Gray (<5): Normal activity

**Why it's useful**:
- **Transfers In**: Identify template picks and popular differentials. High transfer activity might indicate an injury return, form improvement, or favorable fixtures.
- **Transfers Out**: Warning signs for your players. Mass transfers out often indicate injury, suspension, poor form, or difficult fixtures ahead.
- **Ownership Context**: A player with 50% ownership and 100k transfers out is more concerning than a 5% owned player with the same transfer numbers.

---

## How to Use This Dashboard for FPL Success

### Weekly Routine
1. **Check Player Form** first thing - identify who's performing
2. **Review Upcoming Fixtures** - plan next 3-4 gameweeks
3. **Monitor Transfer Activity** - see what the community is doing
4. **Assess Value Efficiency** - find budget enables for your premium picks

### Transfer Planning
1. Check **Fixture Difficulty** for both current and target players
2. Review **Value Efficiency** to ensure you're getting good value
3. Monitor **Transfer Coefficients** to avoid kneejerk moves
4. Check **Player Form** to confirm recent performance backs up the stats

### Captain Selection
1. Check **Upcoming Fixtures** - pick players with easiest opponents
2. Review **Recent Player Form** - ensure they're in good form
3. Check **Team Form** - teams on winning runs have confident players

### Differential Strategy
- Use **Transfer Coefficients** to find low-owned players with high transfer-in activity
- Check **Value Efficiency** for under-the-radar performers
- Monitor **Fixture Difficulty** for teams with good runs ahead

## Tips & Tricks

1. **Don't panic over single gameweek form** - look at trends over 3-5 weeks
2. **Fixture swings matter** - teams often have runs of easy or hard fixtures
3. **Value efficiency matters more early season** - team value grows exponentially
4. **Ownership context is key** - a 50% owned player dropping 10 points hurts more than a 5% owned differential gaining 10
5. **Transfer coefficients show momentum** - rapid rises often indicate injury news or fixture awareness

## Data Freshness

- All data is fetched directly from the official FPL API
- Dashboard rebuilds show current gameweek data
- Fixture difficulty ratings are set by FPL
- Transfer numbers update after each gameweek deadline

## Color Coding Reference

### Form & Performance
- 🟢 **Green**: Excellent/Easy
- 🟡 **Yellow**: Good/Medium  
- 🔴 **Red**: Poor/Difficult

### Transfer Activity
- 🟢 **Green**: High transfers in
- 🔵 **Blue**: Moderate transfers in
- 🟠 **Orange**: Moderate transfers out
- 🔴 **Red**: High transfers out

### Value Status
- ⭐ **Excellent**: 30+ points per million
- ✅ **Good**: 20-30 points per million
- ⚠️ **Poor**: <20 points per million


