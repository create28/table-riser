# Team ID Feature Guide

## Overview

The FPL Dashboard now supports viewing **any FPL manager's team** by entering their team ID. This feature works on both the main dashboard and the 5-week transfer strategy page.

## Features

### 🎯 What's Included

1. **Team ID Input Component**: Clean, user-friendly input with validation
2. **URL-Based Team ID**: Team ID is stored in the URL for easy sharing
3. **localStorage Persistence**: Remembers the last viewed team
4. **Cross-Page Consistency**: Team ID carries over between dashboard and strategy pages
5. **Validation**: Ensures team IDs are valid (1-10,000,000)

## How to Use

### Method 1: URL Parameter
Navigate directly to a team by adding `?teamId=XXXXXX` to the URL:
- Main Dashboard: `http://localhost:3000/?teamId=123456`
- Strategy Page: `http://localhost:3000/strategy?teamId=123456`

### Method 2: Input Field
1. On either the main dashboard or strategy page, you'll see a "FPL Team ID" input field
2. Enter any FPL team ID (e.g., `3992229`)
3. Click "Load Team"
4. The page will refresh with the new team's data

### Finding a Team ID

To find someone's FPL team ID:
1. Go to their FPL team page
2. Look at the URL: `https://fantasy.premierleague.com/entry/3992229/event/12`
3. The number after `/entry/` is their team ID (in this example: `3992229`)

## Features

### Input Validation
- ✅ Numbers only
- ✅ Team ID must be between 1 and 10,000,000
- ✅ Real-time error messages
- ✅ Prevents invalid submissions

### Data Persistence
- Team ID is saved to **localStorage** automatically
- When you return to the dashboard, it remembers the last team you viewed
- URL parameter always takes precedence over localStorage

### Navigation
- "Back to Dashboard" link on strategy page preserves the team ID
- "5-Week Transfer Strategy" button on dashboard includes the current team ID
- All navigation maintains the team context

## Components

### `TeamIdInput` Component
Location: `/components/team-id-input.tsx`

A reusable client component that handles:
- Input field with validation
- Submit button
- Error messages
- Currently viewing team display
- Help text with instructions

Props:
- `currentTeamId: number` - The team ID currently being viewed
- `onTeamIdChange: (teamId: number) => void` - Callback when team ID changes

### `DashboardWrapper` Component
Location: `/components/dashboard-wrapper.tsx`

Wraps the main dashboard with:
- Header with title
- Navigation buttons
- Team ID input
- Background gradient

### `StrategyWrapper` Component
Location: `/components/strategy-wrapper.tsx`

A client-side wrapper for the strategy page that handles team ID changes with Next.js router.

## Implementation Details

### Main Dashboard (`app/page.tsx`)
```typescript
export default async function Home({
  searchParams,
}: {
  searchParams: { teamId?: string };
}) {
  const teamId = searchParams.teamId ? parseInt(searchParams.teamId) : DEFAULT_TEAM_ID;
  const data = await getDashboardData(teamId);
  
  return (
    <DashboardWrapper initialTeamId={teamId}>
      {/* Dashboard content */}
    </DashboardWrapper>
  );
}
```

### Strategy Page (`app/strategy/page.tsx`)
```typescript
export default async function StrategyPage({
  searchParams,
}: {
  searchParams: { teamId?: string };
}) {
  const teamId = searchParams.teamId ? parseInt(searchParams.teamId) : DEFAULT_TEAM_ID;
  const data = await getStrategyData(teamId);
  
  return (
    <div>
      <StrategyWrapper currentTeamId={teamId} />
      {/* Strategy content */}
    </div>
  );
}
```

### localStorage Integration
When a team ID is submitted via the input field:
```typescript
localStorage.setItem('fpl_team_id', teamId.toString());
```

## Error Handling

### Invalid Team IDs
If you enter an invalid team ID (doesn't exist, private team, etc.), the FPL API will return an error. The dashboard will:
1. Show an error message
2. Allow you to try a different team ID
3. Fall back to the default team ID if needed

### Network Errors
If the FPL API is unavailable:
- The page will show an error state
- You can refresh to try again
- Recent data may be cached

## Examples

### View Your Friend's Team
```
http://localhost:3000/?teamId=987654
```

### Compare Transfer Strategies
1. Open your team: `http://localhost:3000/strategy?teamId=3992229`
2. Open in new tab with friend's ID: `http://localhost:3000/strategy?teamId=123456`
3. Compare side-by-side!

### Share Your Dashboard
Send this URL to share your team with friends:
```
http://your-domain.com/?teamId=3992229
```

## Shareable Links

### Main Dashboard
```
/?teamId=3992229
```

### Transfer Strategy
```
/strategy?teamId=3992229
```

## Technical Notes

### Server vs Client Components
- **Server Components**: Handle data fetching with the team ID
- **Client Components**: Handle team ID input and navigation
- This separation ensures optimal performance and SEO

### URL Priority
Team ID resolution order:
1. URL parameter (`?teamId=123456`)
2. localStorage (`fpl_team_id`)
3. Default team ID (`3992229`)

### Performance
- No additional API calls when switching teams
- Full page refresh ensures fresh data
- All historical data is re-fetched for the new team

## Default Team ID

The default team ID is set to `3992229` (your team). This is defined in:
- `app/page.tsx`: `const DEFAULT_TEAM_ID = 3992229;`
- `app/strategy/page.tsx`: `const DEFAULT_TEAM_ID = 3992229;`

To change the default, update these constants.

## Limitations

1. **Private Teams**: Cannot view private/hidden FPL teams
2. **Invalid IDs**: Must be a valid, active FPL team
3. **Rate Limiting**: FPL API may rate limit excessive requests
4. **Historical Data Matching**: Player historical data (for vs Team analysis) may not match perfectly for teams with less common player names

## Future Enhancements

Possible improvements:
1. **Team Search**: Search by manager name instead of ID
2. **Recent Teams**: Show a list of recently viewed teams
3. **Favorites**: Save favorite teams for quick access
4. **Comparison Mode**: View two teams side-by-side
5. **Team Validation**: Pre-validate team IDs before loading
6. **Auto-Complete**: Suggest team IDs as you type

---

**Last Updated**: November 2025

