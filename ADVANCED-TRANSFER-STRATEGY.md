# Advanced Transfer Strategy Features

## 🚀 Overview

The transfer strategy planner now includes sophisticated features for multi-week planning, budget flexibility, and rolling transfer logic to help you make smarter FPL decisions.

## 🎯 New Features

### 1. **Editable Free Transfers Input** ✅

**Problem Solved:** The system was showing incorrect free transfer counts (displaying total season transfers instead of current available FTs).

**Solution:**
- Manual input field for your current free transfers (1-2)
- The algorithm tracks FT usage across gameweeks
- Shows when you'll have 2 FTs after banking

**Usage:**
- Enter your actual free transfers in the input field (check your FPL team page)
- Default is 1 FT
- Max is 2 FTs (FPL rule)

---

### 2. **Budget Flexibility Slider** 💰

**What it does:** Lets you specify how much extra you're willing to spend (or save) beyond your current bank balance.

**How it works:**
- Slider range: -£5m to +£5m
- **Negative values** (e.g., -£2m): Strategy will only suggest players who save you money, building your bank
- **Zero**: Neutral - uses only your current bank + selling price
- **Positive values** (e.g., +£3m): Allows strategy to recommend premium upgrades you can afford by selling multiple cheaper players over time

**Use Cases:**
- **Save money** (-£3m): Building funds for a big transfer next week
- **Neutral** (£0m): Standard approach
- **Spend more** (+£2m): You have value locked in players and want to cash out for premiums

**Formula:**
```
Available Funds = Bank Balance + Player Selling Price + Budget Flexibility
```

**Example:**
- Bank: £0.5m
- Player selling for: £8.0m
- Flexibility: +£2.0m
- **Total Available: £10.5m** (can buy up to £10.5m players)

---

### 3. **Rolling Transfer Logic** 🏦

**What is "Rolling a Transfer"?**
- Banking your free transfer to have 2 FTs next gameweek
- Allows multiple position swaps without point deductions
- Provides flexibility for injuries and price changes

**How it works:**
1. Enable "Consider banking free transfer" checkbox
2. If you have 1 FT and the best transfer has low improvement (<25 points), the algorithm recommends banking it
3. Next gameweek shows you have 2 FTs for more complex transfers

**When to Roll:**
- ✅ Squad is performing well
- ✅ Upcoming fixtures are decent
- ✅ Planning a bigger move next week
- ✅ Want flexibility for injuries
- ❌ Critical transfers needed (injuries, suspensions)
- ❌ Great transfer opportunity available now

**Algorithm Logic:**
```typescript
if (considerRolling && currentFreeTransfers === 1) {
  improvementThreshold = 25; // Higher bar to use the FT
  if (improvement < 25) {
    // Recommend banking the transfer
    currentFreeTransfers = 2 for next week;
  }
} else {
  improvementThreshold = 15; // Normal threshold
}
```

---

### 4. **Multi-Week Transfer Planning** 📅

**Enhancements:**
- **Virtual Squad Tracking**: Each gameweek's recommendation builds on previous transfers
- **Virtual Bank Tracking**: Tracks budget changes across weeks
- **FT Accumulation**: Shows when you'll have 2 FTs after rolling
- **Position-Specific**: All transfers respect FPL position rules (GK→GK, DEF→DEF, etc.)
- **No Duplicates**: Won't suggest the same transfer twice

**How It Works:**

**Week 1:**
- Start: 1 FT, £0.5m bank
- Best transfer: 18-point improvement (below 25 threshold with rolling enabled)
- **Decision: ROLL TRANSFER** 🏦
- End: 2 FTs, £0.5m bank

**Week 2:**
- Start: 2 FTs, £0.5m bank
- Two good transfers available (can make both!)
- Transfer 1: OUT Doughty £4.5m → IN Robertson £6.0m
- Transfer 2: OUT Onana £5.0m → IN Palmer £11.0m
- End: 0 FTs (used both), bank adjusted

**Week 3:**
- Start: 1 FT, adjusted bank
- Virtual squad now includes Robertson & Palmer (not Doughty & Onana)
- Recommends next best transfer based on updated squad

---

### 5. **Enhanced Transfer Explanations** 📝

Each transfer recommendation now includes:
- ✅ **Free Transfer Info**: How many FTs you have and what this uses
- ✅ **Budget Impact**: Whether you're spending or freeing up funds
- ✅ **Rolling Advice**: When to bank transfers
- ✅ **Position Details**: Clear GKP/DEF/MID/FWD labels
- ✅ **Multi-Week Context**: How this fits into your 5-week plan

**Example Explanation:**
```
For Gameweek 14, we recommend transferring out Doughty (BOU, DEF) 
and bringing in Robertson (LIV, DEF).

Why sell Doughty? 
Doughty faces a difficult run of fixtures (@ MCI, vs ARS, @ CHE) with 
an average difficulty that makes returns unlikely...

Why buy Robertson?
Robertson has an excellent fixture run (vs FUL, @ NEW, vs EVE) that 
presents strong opportunities for points...

Free Transfers: You currently have 2 free transfer(s). This transfer 
uses 1 of your 2 free transfers. You can make another transfer without 
a points hit.

This transfer costs an additional £1.5m.
```

---

## 🎮 How to Use

### Step 1: Set Your Context
1. **Free Transfers**: Enter your actual FT count (check FPL website)
2. **Budget Flexibility**: 
   - Slide left to save money
   - Slide right to allow bigger spends
3. **Rolling Checkbox**: Enable if you want smart FT banking

### Step 2: Adjust Risk Appetite
- Use the volatility slider (unchanged)
- Stable = consistent players
- Volatile = high-ceiling differentials

### Step 3: Review Strategy
- **Timeline View**: Quick overview of all 5 weeks
- **Detailed Analysis**: In-depth stats and comparisons
- Look for 🏦 "Rolling Transfer" recommendations

### Step 4: Execute
- Focus on the immediate gameweek first
- Check the 3 alternative options provided
- Monitor for injuries/news before deadline
- Adjust next week based on new information

---

## 💡 Strategy Examples

### Example 1: Conservative Builder
**Settings:**
- Free Transfers: 1
- Budget Flexibility: -£2.0m (save money)
- Rolling: ✅ Enabled
- Volatility: 20 (stable)

**Result:**
- Week 1-2: Rolls transfers to get 2 FTs
- Week 3: Makes 2 downgrades, banks £4m
- Week 4-5: Upgrades to premium with accumulated funds

---

### Example 2: Aggressive Chaser
**Settings:**
- Free Transfers: 2
- Budget Flexibility: +£3.0m (spend more)
- Rolling: ❌ Disabled
- Volatility: 85 (volatile)

**Result:**
- Week 1: Makes 2 immediate transfers (has 2 FTs)
- Weeks 2-5: Aggressive upgrades each week
- Focus on differentials with explosive potential

---

### Example 3: Balanced Approach
**Settings:**
- Free Transfers: 1
- Budget Flexibility: £0.0m (neutral)
- Rolling: ✅ Enabled
- Volatility: 50 (balanced)

**Result:**
- Rolls when no critical moves available
- Uses 2 FTs for position swaps when needed
- Mix of consistent performers and upside plays

---

## 🧮 Algorithm Improvements

### Consecutive Week Planning
```typescript
// Virtual squad evolves week by week
Week 1: Squad A → Make Transfer → Squad B
Week 2: Squad B → Make Transfer → Squad C
Week 3: Squad C → Make Transfer → Squad D
// etc.
```

### Rolling Transfer Logic
```typescript
if (considerRolling && currentFT === 1) {
  threshold = 25; // Higher bar
  if (improvement < 25) {
    recommendRoll();
    nextWeekFT = 2;
  }
} else {
  threshold = 15; // Standard bar
}
```

### Budget Tracking
```typescript
virtualBank = startingBank;
for each transfer {
  priceDiff = newPlayer.price - oldPlayer.price;
  virtualBank += priceDiff;
  availableFundsNextWeek = virtualBank + budgetFlexibility;
}
```

---

## 🔧 Technical Details

### State Management
- `freeTransfersInput`: User-controlled FT count (1-2)
- `budgetFlexibility`: User-controlled budget adjustment (-5 to +5)
- `considerRolling`: Boolean for FT banking logic
- `currentFreeTransfers`: Tracked across gameweeks in algorithm
- `virtualBank`: Budget simulation across weeks
- `virtualSquad`: Squad composition after each transfer

### Dependencies
All recommendations recalculate when:
- ✅ Free transfers input changes
- ✅ Budget flexibility changes
- ✅ Rolling checkbox toggles
- ✅ Volatility slider moves
- ✅ Team ID changes

### Performance
- ✅ Memoized with `useMemo`
- ✅ Only recalculates on relevant changes
- ✅ Handles 500+ players efficiently

---

## 📊 Understanding the Scores

### Fixture Score (0-100)
- Based on upcoming opponent difficulty
- 70+ = Excellent fixtures
- 40- = Difficult fixtures

### Form Score (0-100)
- Recent performance and PPG
- 70+ = Strong form
- 40- = Poor form

### Volatility Score (0-100)
- Standard deviation of points
- 60+ = Boom-or-bust (volatile)
- 30- = Consistent

### Overall Score
```
Score = (Fixture × 40%) + (Form × 35%) + (Volatility × 25%)
```

Adjusted for user's volatility preference

---

## ❓ FAQ

**Q: Why does it say "Roll Transfer" when I have a decent option?**
A: With rolling enabled and 1 FT, the algorithm uses a higher threshold (25 vs 15). This ensures you only use your FT for truly valuable moves, not marginal upgrades.

**Q: Can I make 3+ transfers in one week?**
A: The algorithm assumes you want to avoid point hits. It only recommends using your available free transfers. If you want to take hits, you can manually do that.

**Q: What if I disagree with a recommendation?**
A: The strategy provides 3 alternatives for the next gameweek. The algorithm is a guide - always use your own judgment!

**Q: Does it account for injuries?**
A: Yes - players with `chance_of_playing_next_round === 0` are excluded from targets.

**Q: How do I see more than 5 weeks?**
A: The FPL API only provides fixture data 5-6 weeks ahead. Beyond that, difficulty ratings aren't available.

---

## 🎯 Best Practices

1. **Update FT count weekly** - Always enter your actual free transfers
2. **Adjust for your goals** - Use budget flexibility based on your plan
3. **Consider rolling when stable** - Banking FTs provides future flexibility
4. **Watch for injuries** - Algorithm can't predict future injuries
5. **Review all 3 options** - The "best" transfer isn't always the right one
6. **Use Timeline + Detailed views** - Get both quick overview and deep analysis
7. **Don't be a slave to the algo** - It's a tool, not a crystal ball!

---

## 🚀 Future Enhancements (Potential)

- ⏳ Chip strategy integration (wildcard, bench boost, etc.)
- ⏳ Double gameweek optimization
- ⏳ Blank gameweek preparation
- ⏳ Captain pick recommendations
- ⏳ Differential prioritization mode
- ⏳ League-specific strategies (ML vs OR)

---

**Happy strategizing! May your transfers bring you green arrows! 📈🏆**




