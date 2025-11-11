# Historical Data Integration Guide

## Overview

The FPL Dashboard now includes **3 years of historical data** (2021/22, 2022/23, 2023/24) for the "Player vs Team Analysis" component, thanks to the comprehensive dataset maintained by [vaastav's Fantasy-Premier-League repository](https://github.com/vaastav/Fantasy-Premier-League).

## Features

### Two-Tab View
1. **Current Season (24/25)**: Live data from the FPL API
2. **Historical (21/22 - 23/24)**: Aggregated data from 3 previous seasons

### Historical Data Shows:
- Total matches played against each opponent (across 3 seasons)
- Average points per match against each team
- Goals, assists, and clean sheets
- Home/Away split
- Which seasons the player faced each opponent
- Performance ratings (Elite, Excellent, Good, Average, Poor)

## Data Source

### CSV Files Location
Historical data is stored in `/public/historical-data/`:
- `2021-22_gw.csv` (3.6 MB)
- `2022-23_gw.csv` (4.5 MB)
- `2023-24_gw.csv` (4.9 MB)

### Data Processing
The `lib/historical-data.ts` utility:
1. Loads CSV files from the public directory
2. Parses player performance data (goals, assists, points vs each opponent)
3. Matches current FPL players to historical data by name
4. Aggregates stats across multiple seasons

## Player Matching

Players are matched by **normalized name** comparison:
```typescript
// Example: "Mohamed Salah" matches "Mohamed_Salah" or "M. Salah"
normalizePlayerName(name)
  .toLowerCase()
  .replace(/[^a-z\s]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
```

### Limitations
- Players who changed leagues (e.g., joined PL in 2022) won't have data for earlier seasons
- Name matching isn't perfect for players with special characters or nicknames
- Historical data only includes matches where the player actually played (minutes > 0)

## How It Works

### 1. Data Loading (Client-Side)
When you open the Player vs Team component, it:
1. Fetches all 3 CSV files from `/historical-data/`
2. Parses ~13 MB of match data
3. Caches it in component state

```typescript
const historicalData = await loadHistoricalData();
// Returns: [
//   { season: '2021/22', matches: [...] },
//   { season: '2022/23', matches: [...] },
//   { season: '2023/24', matches: [...] }
// ]
```

### 2. Player Analysis
When you select a player:
1. Finds all historical matches for that player by name
2. Groups matches by opponent team
3. Calculates aggregated stats (avg points, total goals, etc.)
4. Displays in the "Historical" tab

### 3. Display
The component shows:
- **Current Season Tab**: Live FPL API data (2024/25)
- **Historical Tab**: Aggregated data (2021/22 - 2023/24)

## Example Use Cases

### 1. Fixture Analysis
"Mohamed Salah averages 8.5 points against Bournemouth over 6 historical matches (2021-2024)"
→ **Great captain pick when Liverpool plays Bournemouth!**

### 2. Differential Picks
"Mbeumo has scored in 4/5 matches against Spurs historically"
→ **Hidden gem for the fixture!**

### 3. Avoid Bad Fixtures
"Gabriel Jesus averages 2.1 points vs Newcastle in 8 historical matches"
→ **Bench him for this fixture**

## Performance

### File Sizes
- Total: ~13 MB of CSV data
- Loads asynchronously (doesn't block initial page render)
- Cached after first load

### Load Times
- Initial load: ~2-3 seconds (fetching + parsing CSVs)
- Subsequent player switches: Instant (data already loaded)

## Updating Data

To add new historical seasons:

1. Download the latest CSV from vaastav's repo:
```bash
curl -o "public/historical-data/2024-25_gw.csv" \
  "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/gws/merged_gw.csv"
```

2. Update `lib/historical-data.ts` to include the new season:
```typescript
const seasons = [
  { file: '2021-22_gw.csv', season: '2021/22' },
  { file: '2022-23_gw.csv', season: '2022/23' },
  { file: '2023-24_gw.csv', season: '2023/24' },
  { file: '2024-25_gw.csv', season: '2024/25' }, // NEW
];
```

## Technical Architecture

### Components
- `components/player-vs-team.tsx`: Main UI component with tabs
- `lib/historical-data.ts`: Data parsing and aggregation logic

### Data Flow
```
CSV Files (public/historical-data/)
  ↓
loadHistoricalData() → Parse CSV → HistoricalSeasonData[]
  ↓
findHistoricalMatches(playerName) → Filter by player → HistoricalMatch[]
  ↓
aggregatePlayerVsTeam() → Group by opponent → Map<teamId, PlayerVsTeamHistorical>
  ↓
Display in Historical Tab
```

## Credits

All historical data is sourced from:
**[vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)**

This repository is a fantastic community resource that maintains comprehensive FPL data going back to 2016/17. Thank you to vaastav and all contributors! 🙏

## Future Enhancements

Possible improvements:
1. **More seasons**: Add 2020/21, 2019/20, etc.
2. **Better player matching**: Use FPL player codes instead of names
3. **Caching**: Store parsed data in localStorage to avoid re-parsing
4. **Visualization**: Add charts showing performance trends over seasons
5. **Export**: Allow downloading historical analysis as CSV/PDF

---

**Last Updated**: November 2025

