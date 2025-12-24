'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Brain, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team, Fixture } from '@/lib/fpl-api';
import { usePlayerDetail } from '@/components/player-detail-provider';
import { LearningEngine, AlgorithmWeights } from '@/lib/ml-learning-engine';
import { AVAILABLE_METRICS } from '@/lib/metric-engine';

interface TransferStrategyClientProps {
  teams: Team[];
  squadPlayers: Player[];
  allPlayers: Player[];
  fixtures: Fixture[];
  currentGameweek: number;
  nextGameweeks: any[];
  playerHistories: { [key: number]: any };
  managerTeam: any;
  managerInfo: any;
}

interface PlayerScore {
  player: Player;
  score: number;
  fixtureScore: number;
  formScore: number;
  volatilityScore: number;
  upcomingFixtures: string[];
  reasoning: string[];
}

interface TransferRecommendation {
  gameweek: number;
  transferOut?: PlayerScore;
  transferIn?: PlayerScore;
  reasoning: string;
  detailedExplanation: string;
  priority: 'high' | 'medium' | 'low';
  alternatives?: Array<{
    transferOut: PlayerScore;
    transferIn: PlayerScore;
    reasoning: string;
    detailedExplanation: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// Helper: Generate detailed explanation
const generateTransferExplanation = (
  outPlayer: PlayerScore,
  inPlayer: PlayerScore,
  gameweek: number,
  volatilityPreference: number
): string => {
  const improvement = inPlayer.score - outPlayer.score;
  const priceDiff = (inPlayer.player.now_cost - outPlayer.player.now_cost) / 10;

  let reason = `Swapping **${outPlayer.player.web_name}** for **${inPlayer.player.web_name}** offers a projected improvement of **${improvement.toFixed(1)} points** in our model score.\n\n`;

  // Fixtures
  if (inPlayer.fixtureScore > outPlayer.fixtureScore + 20) {
    reason += `• **Better Fixtures**: ${inPlayer.player.web_name} has significantly easier upcoming games compared to ${outPlayer.player.web_name}.\n`;
  } else if (inPlayer.fixtureScore < outPlayer.fixtureScore - 10) {
    reason += `• **Fixture Warning**: Note that ${inPlayer.player.web_name} has tougher immediate fixtures, but other factors outweigh this.\n`;
  }

  // Form
  if (inPlayer.formScore > outPlayer.formScore + 20) {
    reason += `• **Better Form**: ${inPlayer.player.web_name} is currently in much better form (Points per Game/Recent Points).\n`;
  }

  // Price
  if (priceDiff < 0) {
    reason += `• **Budget**: Frees up £${Math.abs(priceDiff).toFixed(1)}m in funds.\n`;
  } else if (priceDiff > 0) {
    reason += `• **Investment**: Uses £${priceDiff.toFixed(1)}m of your bank.\n`;
  }

  // Volatility
  if (volatilityPreference > 60 && inPlayer.volatilityScore > 50) {
    reason += `• **Differential Potential**: Matches your high volatility preference with explosive point potential.\n`;
  }

  return reason;
};

export function TransferStrategyClient({

  teams,
  squadPlayers,
  allPlayers,
  fixtures,
  currentGameweek,
  nextGameweeks,
  playerHistories,
  managerTeam,
  managerInfo,
}: TransferStrategyClientProps) {
  /* 
    PERFORMANCE OPTIMIZATION:
    Separate UI state (immediate) from Calculation state (debounced).
    This prevents the heavy transfer strategy calculation from running 
    on every single frame of a slider drag.
  */
  // UI States (Instant feedback)
  const [volatilityUI, setVolatilityUI] = useState(50);
  const [budgetUI, setBudgetUI] = useState(0);

  // Calculation States (Debounced)
  const [volatilityPreference, setVolatilityPreference] = useState(50);
  const [budgetFlexibility, setBudgetFlexibility] = useState(0);

  // Debounce Effects
  useEffect(() => {
    const timer = setTimeout(() => {
      setVolatilityPreference(volatilityUI);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [volatilityUI]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBudgetFlexibility(budgetUI);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [budgetUI]);

  const [freeTransfersInput, setFreeTransfersInput] = useState(1); // User inputs their actual FTs
  const [considerRolling, setConsiderRolling] = useState(true); // Whether to consider banking transfers

  // ML State
  const [useML, setUseML] = useState(false);
  const [mlWeights, setMlWeights] = useState<AlgorithmWeights | null>(null);

  useEffect(() => {
    const loadWeights = async () => {
      const weights = await LearningEngine.getCurrentWeights();
      setMlWeights(weights);
    };
    loadWeights();
  }, []);

  // Get bank balance from manager info (last_deadline_bank is in tenths)
  const bankBalance = (managerInfo.last_deadline_bank || 0) / 10; // Convert to millions

  // Player detail modal
  const { selectPlayer } = usePlayerDetail();

  // Debug: Test if click handler works
  const handlePlayerClick = (player: Player) => {
    console.log('Player clicked:', player.web_name);
    selectPlayer(player);
  };

  // Helper: Get team by ID
  const getTeam = (teamId: number) => teams.find(t => t.id === teamId);

  // Helper: Get position name
  const getPositionName = (elementType: number) => {
    switch (elementType) {
      case 1: return 'GKP';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return 'Unknown';
    }
  };

  // Optimize: Pre-calculate fixture lookup to avoid .filter() in loops
  const fixtureLookup = useMemo(() => {
    const lookup = new Map<number, Fixture[]>(); // TeamID -> Fixtures
    fixtures.forEach(f => {
      // Index by Home Team
      if (!lookup.has(f.team_h)) lookup.set(f.team_h, []);
      lookup.get(f.team_h)?.push(f);

      // Index by Away Team
      if (!lookup.has(f.team_a)) lookup.set(f.team_a, []);
      lookup.get(f.team_a)?.push(f);
    });
    return lookup;
  }, [fixtures]);

  // Helper: Get player's upcoming fixtures (Optimized)
  const getUpcomingFixtures = (player: Player, gameweeksAhead: number) => {
    const upcoming: { opponent: string; difficulty: number; isHome: boolean; gameweek: number }[] = [];
    const teamFixtures = fixtureLookup.get(player.team) || [];

    // Filter relevant fixtures from pre-bucketed list
    // We only need fixtures for the next 'gameweeksAhead' from 'currentGameweek'
    const targetGwStart = currentGameweek + 1;
    const targetGwEnd = currentGameweek + gameweeksAhead;

    for (const fixture of teamFixtures) {
      if (fixture.event >= targetGwStart && fixture.event <= targetGwEnd) {
        const isHome = fixture.team_h === player.team;
        const opponentId = isHome ? fixture.team_a : fixture.team_h;
        const opponent = getTeam(opponentId);
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;

        if (opponent) {
          upcoming.push({
            opponent: opponent.short_name,
            difficulty,
            isHome,
            gameweek: fixture.event,
          });
        }
      }
    }

    // Sort by gameweek to be safe
    return upcoming.sort((a, b) => a.gameweek - b.gameweek);
  };

  // Helper: Calculate fixture difficulty score
  const calculateFixtureScore = (player: Player, gameweeksAhead: number) => {
    const upcomingFixtures = getUpcomingFixtures(player, gameweeksAhead);
    if (upcomingFixtures.length === 0) return 0;

    const avgDifficulty = upcomingFixtures.reduce((sum, f) => sum + f.difficulty, 0) / upcomingFixtures.length;
    const fixtureScore = ((5 - avgDifficulty) / 3) * 100;
    const homeBonus = upcomingFixtures.filter(f => f.isHome).length * 5;

    return Math.min(100, fixtureScore + homeBonus);
  };

  // Helper: Calculate form score
  const calculateFormScore = (player: Player) => {
    const form = parseFloat(player.form);
    const ppg = parseFloat(player.points_per_game);
    return Math.min(100, (form * 0.7 + ppg * 0.3) * 10);
  };

  // Helper: Calculate volatility score
  const calculateVolatility = (player: Player) => {
    const history = playerHistories[player.id];
    if (!history || !history.history || history.history.length < 3) return 0;

    const gameweekPoints = history.history.map((h: any) => h.total_points);
    const avg = gameweekPoints.reduce((sum: number, pts: number) => sum + pts, 0) / gameweekPoints.length;

    if (avg === 0) return 0;

    const variance = gameweekPoints.reduce((sum: number, pts: number) => sum + Math.pow(pts - avg, 2), 0) / gameweekPoints.length;
    const stdDev = Math.sqrt(variance);

    return Math.min(100, (stdDev / avg) * 100);
  };

  // Score all players for transfer consideration
  const scorePlayer = (player: Player, gameweeksAhead: number, volatilityPref: number): PlayerScore => {
    const fixtureScore = calculateFixtureScore(player, gameweeksAhead);
    const formScore = calculateFormScore(player);
    const volatilityScore = calculateVolatility(player);

    let score = 0;
    const reasoning: string[] = [];

    // ... (logic remains similar, abbreviated for performance) ... 
    // Optimization: Inline simple math where possible if bottle-necking, but Logic structure kept for readability

    if (useML && mlWeights) {
      // ... ML Logic ...
      let totalWeight = mlWeights.fixtureWeight + mlWeights.formWeight + mlWeights.ictWeight;
      if (mlWeights.customWeights) Object.values(mlWeights.customWeights).forEach(w => totalWeight += w);

      const wFixture = mlWeights.fixtureWeight / totalWeight;
      const wForm = mlWeights.formWeight / totalWeight;
      const wVol = mlWeights.ictWeight / totalWeight;

      score = (fixtureScore * wFixture + formScore * wForm + volatilityScore * wVol);

      if (mlWeights.customWeights) {
        Object.entries(mlWeights.customWeights).forEach(([metricId, weight]) => {
          const metricDef = AVAILABLE_METRICS.find(m => m.id === metricId);
          if (metricDef) {
            let rawValue = metricDef.getValue(player);
            // Normalize ...
            if (['xg', 'xa', 'xgi'].includes(metricId)) rawValue = rawValue * 100;
            else if (['threat', 'influence', 'creativity'].includes(metricId)) rawValue = Math.min(100, rawValue / 2);

            const normalizedScore = Math.min(100, Math.max(0, rawValue));
            score += normalizedScore * (weight / totalWeight);
            if (normalizedScore > 70) reasoning.push(`High ${metricDef.name}`);
          }
        });
      }
    } else {
      const volatilityWeight = volatilityPref / 100;
      const stabilityWeight = 1 - volatilityWeight;
      const adjustedVolatilityScore = volatilityWeight * volatilityScore + stabilityWeight * (100 - volatilityScore);
      score = (fixtureScore * 0.4 + formScore * 0.35 + adjustedVolatilityScore * 0.25);
    }

    // Reasoning strings
    // Only generate reasoning if high/low logic triggers
    if (fixtureScore > 70) reasoning.push('Excellent fixtures');
    else if (fixtureScore < 40) reasoning.push('Difficult fixtures');
    if (formScore > 70) reasoning.push('Strong form');
    if (volatilityScore > 60) reasoning.push('Explosive potential');

    // ... constructing return object
    // Note: getUpcomingFixtures call here is redundant if we just needed score, 
    // but we need it for 'upcomingFixtures' string array in the UI. 
    // We already called it above for calculation. It's fast now with Map.

    const upcomingStr = getUpcomingFixtures(player, gameweeksAhead).map(f => `${f.isHome ? 'vs' : '@'} ${f.opponent}`);

    return {
      player,
      score,
      fixtureScore,
      formScore,
      volatilityScore,
      upcomingFixtures: upcomingStr,
      reasoning,
    };
  };

  // Generate transfer strategy with OPTIMIZED LOOP
  const transferStrategy = useMemo(() => {
    const strategy: TransferRecommendation[] = [];

    // Track virtual squad that evolves with recommendations
    let virtualSquad = [...squadPlayers];
    let virtualSquadIds = new Set(squadPlayers.map(p => p.id));

    // Track free transfers available
    let currentFreeTransfers = freeTransfersInput;
    let virtualBank = (managerInfo.last_deadline_bank || 0) / 10;

    // Iterate Gameweeks
    for (let i = 0; i < nextGameweeks.length; i++) {
      const gameweek = nextGameweeks[i].id;
      const gameweeksAhead = i + 1;

      // 1. Calculate scores for ALL relevant players ONCE for this gameweek
      // This includes allPlayers (for transfer targets) AND virtualSquad (for transfer out)
      // Optimization: Only score players who have minutes > 0 or are in the squad to reduce set size?
      // Let's stick to scoring everyone but loop cleanly.

      // We'll store top targets by position map
      const topTargetsByPosition = new Map<number, PlayerScore[]>(); // ElementType -> sorted list

      // Score all potential targets (exclude current squad ids later or now)
      // Filter first to reduce scoring calls
      const validCandidates = allPlayers.filter(p =>
        p.minutes > 100 &&
        p.chance_of_playing_next_round !== 0 &&
        !virtualSquadIds.has(p.id) // Exclude current squad
      );

      validCandidates.forEach(p => {
        const s = scorePlayer(p, gameweeksAhead, volatilityPreference);
        if (!topTargetsByPosition.has(p.element_type)) topTargetsByPosition.set(p.element_type, []);
        topTargetsByPosition.get(p.element_type)?.push(s);
      });

      // Sort each position list by score desc
      topTargetsByPosition.forEach((list) => list.sort((a, b) => b.score - a.score));

      // 2. Score Current Squad
      const squadScores = virtualSquad
        .map(p => scorePlayer(p, gameweeksAhead, volatilityPreference))
        .sort((a, b) => a.score - b.score); // Lowest score first (Transfer Out candidates)

      // 3. Find Best Transfer
      const allPossibleTransfers: Array<{
        out: PlayerScore;
        in: PlayerScore;
        improvement: number;
      }> = [];

      // For each squad player, check top 5 replacements in same position
      for (const squadScore of squadScores) {
        const pos = squadScore.player.element_type;
        const sellingPrice = squadScore.player.now_cost / 10;
        const availableFunds = virtualBank + sellingPrice + budgetFlexibility;

        const potentialTargets = topTargetsByPosition.get(pos) || [];

        // Check top candidates until we find affordable ones
        let foundCount = 0;
        for (const target of potentialTargets) {
          if (foundCount >= 5) break; // Look at top 5 valid only

          if ((target.player.now_cost / 10) <= availableFunds) {
            allPossibleTransfers.push({
              out: squadScore,
              in: target,
              improvement: target.score - squadScore.score
            });
            foundCount++;
          }
        }
      }

      // Sort suggested transfers by improvement
      allPossibleTransfers.sort((a, b) => b.improvement - a.improvement);

      const bestTransfer = allPossibleTransfers.length > 0 ? allPossibleTransfers[0] : null;

      // ... (Logic for recommendation generation remains mostly same) ...

      const worstSquadPlayer = bestTransfer?.out;
      const bestTransferTarget = bestTransfer?.in;

      const baseImprovementThreshold = 15;
      const rollingThreshold = 25;
      const improvementThreshold = (considerRolling && currentFreeTransfers === 1) ? rollingThreshold : baseImprovementThreshold;

      if (bestTransferTarget && worstSquadPlayer && bestTransfer) {
        const improvement = bestTransfer.improvement;
        const priceDiff = (bestTransferTarget.player.now_cost - worstSquadPlayer.player.now_cost) / 10;

        if (improvement > improvementThreshold) {
          // ... (Generate explanation logic from before) ...
          let priority: 'high' | 'medium' | 'low' = 'low';
          if (improvement > 30) priority = 'high';
          else if (improvement > 20) priority = 'medium';

          let detailedExplanation = generateTransferExplanation(
            worstSquadPlayer, bestTransferTarget, gameweek, volatilityPreference
          );

          // Create rec object
          // ... Alternatives logic ...
          const alternatives: any[] = [];
          if (i === 0 && allPossibleTransfers.length > 1) {
            const alts = allPossibleTransfers.slice(1, 3);
            for (const alt of alts) {
              alternatives.push({
                transferOut: alt.out,
                transferIn: alt.in,
                reasoning: `Alt: ${alt.in.reasoning.join(', ')}`,
                detailedExplanation: generateTransferExplanation(alt.out, alt.in, gameweek, volatilityPreference),
                priority: alt.improvement > 20 ? 'medium' : 'low'
              });
            }
          }

          strategy.push({
            gameweek,
            transferOut: worstSquadPlayer,
            transferIn: bestTransferTarget,
            reasoning: `Upgrade: ${bestTransferTarget.reasoning.join(', ')}`,
            detailedExplanation,
            priority,
            alternatives: alternatives.length > 0 ? alternatives : undefined
          });

          // Update Virtual Squad
          virtualSquad = virtualSquad.filter(p => p.id !== worstSquadPlayer.player.id);
          virtualSquad.push(bestTransferTarget.player);
          virtualSquadIds.add(bestTransferTarget.player.id); // Add new
          virtualSquadIds.delete(worstSquadPlayer.player.id); // Remove old - wait, Set API is delete

          // Re-sync Set (easier)
          virtualSquadIds = new Set(virtualSquad.map(p => p.id));

          virtualBank += priceDiff;
          currentFreeTransfers = (currentFreeTransfers === 2) ? 1 : 1;

        } else {
          // Rolling...
          strategy.push({
            gameweek,
            reasoning: `Hold transfers${considerRolling && currentFreeTransfers === 1 ? ' (Roll)' : ''}`,
            detailedExplanation: "Squad well positioned. Saving transfer.",
            priority: 'low'
          });
          if (considerRolling && currentFreeTransfers < 2) currentFreeTransfers++;
        }
      } else {
        strategy.push({
          gameweek,
          reasoning: `No beneficial transfers found`,
          detailedExplanation: "No transfers found within budget.",
          priority: 'low'
        });
        if (considerRolling && currentFreeTransfers < 2) currentFreeTransfers++;
      }
    }

    return strategy;

  }, [squadPlayers, allPlayers, nextGameweeks, currentGameweek, volatilityPreference, playerHistories, fixtures, managerInfo, freeTransfersInput, budgetFlexibility, considerRolling, useML, mlWeights]); // Ensure fixtureLookup is stable or use ref

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-500 hover:bg-green-600';
    if (difficulty === 3) return 'bg-yellow-500 hover:bg-yellow-600';
    if (difficulty === 4) return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    if (priority === 'high') return 'bg-red-500 hover:bg-red-600 text-white';
    if (priority === 'medium') return 'bg-orange-500 hover:bg-orange-600 text-white';
    return 'bg-blue-500 hover:bg-blue-600 text-white';
  };

  return (
    <div className="space-y-6">
      {/* Budget Info */}
      <Card>
        <CardHeader>
          <CardTitle>💰 Current Budget & Transfers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Bank Balance</p>
              <p className="text-2xl font-bold text-green-600">£{bankBalance.toFixed(1)}m</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Squad Value</p>
              <p className="text-2xl font-bold text-blue-600">£{(managerInfo.last_deadline_value / 10).toFixed(1)}m</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Free Transfers</p>
              <input
                type="number"
                min="1"
                max="5"
                value={freeTransfersInput}
                onChange={(e) => setFreeTransfersInput(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                className="text-2xl font-bold text-purple-600 w-20 px-2 py-1 border rounded bg-background text-center"
              />
            </div>
          </div>

          {/* Budget Flexibility Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Budget Flexibility</span>
              <span className="text-lg font-bold text-primary">
                {budgetUI > 0 ? '+' : ''}{budgetUI.toFixed(1)}m
              </span>
            </div>
            <Slider
              value={[budgetUI * 10]}
              onValueChange={(value) => setBudgetUI(value[0] / 10)}
              min={-50}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Save £5m</span>
              <span>Neutral</span>
              <span>Spend +£5m</span>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Adjust how much extra you're willing to spend (or save) on transfers
            </p>
          </div>

          {/* Rolling Transfer Option */}
          <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <input
              type="checkbox"
              id="considerRolling"
              checked={considerRolling}
              onChange={(e) => setConsiderRolling(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="considerRolling" className="text-sm font-medium cursor-pointer">
              Consider banking free transfer (rolling to get 2 FTs next week)
            </label>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            💡 Recommendations consider your available funds (bank + selling price {budgetUI !== 0 ? `${budgetUI > 0 ? '+' : ''}${budgetUI.toFixed(1)}m flexibility` : ''})
          </p>
        </CardContent>
      </Card>

      {/* ML Strategy Toggle */}
      <Card className="mb-6 border-purple-500/20 bg-purple-50/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle>ML Enhanced Strategy</CardTitle>
            </div>
            <Switch checked={useML} onCheckedChange={setUseML} />
          </div>
          <CardDescription>
            Use the self-learning ML model to weight decision factors
          </CardDescription>
        </CardHeader>
        {useML && (
          <CardContent>
            <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-purple-600" />
                <h4 className="font-semibold text-purple-700 dark:text-purple-300 text-sm">Model Active</h4>
              </div>
              <div className="text-purple-600/90 dark:text-purple-400/90 text-xs">
                The strategy is now using learned weights from historical simulations:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Form Weight: {(mlWeights?.formWeight ?? 0).toFixed(2)}</li>
                  <li>Fixture Weight: {(mlWeights?.fixtureWeight ?? 0).toFixed(2)}</li>
                  <li>ICT/Stats Weight: {(mlWeights?.ictWeight ?? 0).toFixed(2)}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Risk Appetite Slider */}
      <Card>
        <CardHeader>
          <CardTitle>⚖️ Risk Appetite</CardTitle>
          <CardDescription>
            Adjust your transfer strategy from stable (conservative) to volatile (ambitious)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {volatilityUI < 33 ? '🛡️ Stable (Conservative)' :
                  volatilityUI < 67 ? '⚖️ Balanced' :
                    '🚀 Volatile (Ambitious)'}
              </span>
              <span className="text-2xl font-bold text-primary">{volatilityUI}</span>
            </div>
            <Slider
              value={[volatilityUI]}
              onValueChange={(value) => setVolatilityUI(value[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Consistent performers</span>
              <span>Boom-or-bust differentials</span>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
            <p className="font-semibold">How this affects recommendations:</p>
            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
              <li><strong>Stable (0-33):</strong> Prioritizes consistent, reliable players with low variance. Best when protecting a league lead.</li>
              <li><strong>Balanced (34-66):</strong> Mix of consistency and upside. Good for steady climbs.</li>
              <li><strong>Volatile (67-100):</strong> Prioritizes high-ceiling differentials who can deliver explosive scores. Best when chasing.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Plan */}
      <Card>
        <CardHeader>
          <CardTitle>📅 5-Week Transfer Plan</CardTitle>
          <CardDescription>
            Strategic recommendations for the next {nextGameweeks.length} gameweeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4 mt-4">
              {transferStrategy.map((rec, idx) => (
                <Card key={idx} className={rec.priority === 'high' ? 'border-red-500 border-2' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Gameweek {rec.gameweek}
                        {rec.alternatives && <span className="text-sm font-normal text-muted-foreground ml-2">(3 options)</span>}
                      </CardTitle>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority.toUpperCase()} PRIORITY
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {rec.transferOut && rec.transferIn ? (
                      <div className="space-y-4">
                        {/* Transfer Out */}
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">❌ TRANSFER OUT</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <button
                                onClick={() => rec.transferOut && handlePlayerClick(rec.transferOut.player)}
                                className="font-semibold hover:text-primary hover:underline cursor-pointer text-left"
                              >
                                {rec.transferOut?.player.web_name}
                              </button>
                              <p className="text-sm text-muted-foreground">
                                {rec.transferOut && getTeam(rec.transferOut.player.team)?.short_name} • {rec.transferOut && getPositionName(rec.transferOut.player.element_type)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono">£{rec.transferOut && (rec.transferOut.player.now_cost / 10).toFixed(1)}m</p>
                              <p className="text-xs text-muted-foreground">Score: {rec.transferOut && rec.transferOut.score.toFixed(1)}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {rec.transferOut.upcomingFixtures.slice(0, 3).map((fix, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {fix}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Transfer In */}
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">✅ TRANSFER IN</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <button
                                onClick={() => rec.transferIn && handlePlayerClick(rec.transferIn.player)}
                                className="font-semibold hover:text-primary hover:underline cursor-pointer text-left"
                              >
                                {rec.transferIn?.player.web_name}
                              </button>
                              <p className="text-sm text-muted-foreground">
                                {rec.transferIn && getTeam(rec.transferIn.player.team)?.short_name} • {rec.transferIn && getPositionName(rec.transferIn.player.element_type)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono">£{rec.transferIn && (rec.transferIn.player.now_cost / 10).toFixed(1)}m</p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                Score: {rec.transferIn && rec.transferIn.score.toFixed(1)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {rec.transferIn?.upcomingFixtures.slice(0, 3).map((fix, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {fix}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                              {rec.transferIn?.reasoning.join(' • ')}
                            </p>
                          </div>
                        </div>

                        {/* Detailed Explanation */}
                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                          <p className="text-xs font-semibold mb-2 text-primary">📝 Detailed Analysis (Option 1 - Recommended):</p>
                          <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                            {rec.detailedExplanation}
                          </div>
                        </div>

                        {/* Alternative Options */}
                        {rec.alternatives && rec.alternatives.length > 0 && (
                          <div className="space-y-4 mt-4">
                            <p className="text-sm font-semibold text-primary">🔄 Alternative Options:</p>
                            {rec.alternatives.map((alt, altIdx) => (
                              <div key={altIdx} className="border-l-4 border-blue-500 pl-4 space-y-3">
                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  Option {altIdx + 2} - {alt.priority.toUpperCase()} Priority
                                </p>

                                {/* Alternative Transfer Out */}
                                <div className="p-2 bg-red-50/50 dark:bg-red-950/10 rounded-lg text-sm">
                                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">❌ OUT</p>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <button
                                        onClick={() => handlePlayerClick(alt.transferOut.player)}
                                        className="font-semibold text-xs hover:text-primary hover:underline cursor-pointer text-left"
                                      >
                                        {alt.transferOut.player.web_name}
                                      </button>
                                      <p className="text-xs text-muted-foreground">
                                        {getTeam(alt.transferOut.player.team)?.short_name} • {getPositionName(alt.transferOut.player.element_type)}
                                      </p>
                                    </div>
                                    <p className="text-xs font-mono">£{(alt.transferOut.player.now_cost / 10).toFixed(1)}m</p>
                                  </div>
                                </div>

                                {/* Alternative Transfer In */}
                                <div className="p-2 bg-green-50/50 dark:bg-green-950/10 rounded-lg text-sm">
                                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">✅ IN</p>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <button
                                        onClick={() => handlePlayerClick(alt.transferIn.player)}
                                        className="font-semibold text-xs hover:text-primary hover:underline cursor-pointer text-left"
                                      >
                                        {alt.transferIn.player.web_name}
                                      </button>
                                      <p className="text-xs text-muted-foreground">
                                        {getTeam(alt.transferIn.player.team)?.short_name} • {getPositionName(alt.transferIn.player.element_type)}
                                      </p>
                                    </div>
                                    <p className="text-xs font-mono">£{(alt.transferIn.player.now_cost / 10).toFixed(1)}m</p>
                                  </div>
                                </div>

                                {/* Alternative Brief Explanation */}
                                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 rounded-lg">
                                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                                    {alt.detailedExplanation.split('\n\n')[0]}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4">
                        <p className="text-sm font-semibold mb-2 text-primary">📝 Analysis:</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {rec.detailedExplanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="detailed" className="mt-4">
              <div className="space-y-6">
                {transferStrategy.map((rec, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">Gameweek {rec.gameweek}</CardTitle>
                        <Badge className={getPriorityColor(rec.priority)}>{rec.priority}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rec.transferOut && rec.transferIn && (
                        <>
                          {/* Detailed Written Explanation */}
                          <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <span className="text-xl">📝</span>
                              Transfer Analysis
                            </h4>
                            <div className="text-sm leading-relaxed space-y-3 text-foreground/90 whitespace-pre-line">
                              {rec.detailedExplanation}
                            </div>
                          </div>

                          {/* Player Comparison Cards */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Transfer Out Details */}
                            <Card className="border-red-200 dark:border-red-900">
                              <CardHeader className="pb-3 bg-red-50 dark:bg-red-950/20">
                                <CardTitle className="text-base text-red-600 dark:text-red-400">
                                  ❌ Transfer Out
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 pt-4">
                                <div>
                                  <button
                                    onClick={() => rec.transferOut && handlePlayerClick(rec.transferOut.player)}
                                    className="font-semibold text-lg hover:text-primary hover:underline cursor-pointer text-left"
                                  >
                                    {rec.transferOut?.player.web_name}
                                  </button>
                                  <p className="text-sm text-muted-foreground">
                                    {rec.transferOut && getTeam(rec.transferOut.player.team)?.name} • {rec.transferOut && getPositionName(rec.transferOut.player.element_type)}
                                  </p>
                                  <p className="text-sm font-mono mt-1">£{rec.transferOut && (rec.transferOut.player.now_cost / 10).toFixed(1)}m</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Fixtures</p>
                                    <p className="font-bold">{rec.transferOut?.fixtureScore.toFixed(0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Form</p>
                                    <p className="font-bold">{rec.transferOut?.formScore.toFixed(0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Volatility</p>
                                    <p className="font-bold">{rec.transferOut?.volatilityScore.toFixed(0)}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold mb-1">Upcoming Fixtures:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {rec.transferOut?.upcomingFixtures.map((fix, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        GW{rec.gameweek + i}: {fix}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Form: {rec.transferOut?.player.form} |
                                    PPG: {rec.transferOut?.player.points_per_game} |
                                    Total: {rec.transferOut?.player.total_points}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Transfer In Details */}
                            <Card className="border-green-200 dark:border-green-900">
                              <CardHeader className="pb-3 bg-green-50 dark:bg-green-950/20">
                                <CardTitle className="text-base text-green-600 dark:text-green-400">
                                  ✅ Transfer In
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 pt-4">
                                <div>
                                  <button
                                    onClick={() => rec.transferIn && handlePlayerClick(rec.transferIn.player)}
                                    className="font-semibold text-lg hover:text-primary hover:underline cursor-pointer text-left"
                                  >
                                    {rec.transferIn?.player.web_name}
                                  </button>
                                  <p className="text-sm text-muted-foreground">
                                    {rec.transferIn && getTeam(rec.transferIn.player.team)?.name} • {rec.transferIn && getPositionName(rec.transferIn.player.element_type)}
                                  </p>
                                  <p className="text-sm font-mono mt-1">£{rec.transferIn && (rec.transferIn.player.now_cost / 10).toFixed(1)}m</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Fixtures</p>
                                    <p className="font-bold text-green-600">{rec.transferIn?.fixtureScore.toFixed(0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Form</p>
                                    <p className="font-bold text-green-600">{rec.transferIn?.formScore.toFixed(0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Volatility</p>
                                    <p className="font-bold text-green-600">{rec.transferIn?.volatilityScore.toFixed(0)}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold mb-1">Upcoming Fixtures:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {rec.transferIn?.upcomingFixtures.map((fix, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        GW{rec.gameweek + i}: {fix}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Form: {rec.transferIn?.player.form} |
                                    PPG: {rec.transferIn?.player.points_per_game} |
                                    Total: {rec.transferIn?.player.total_points}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold mb-1">Key Strengths:</p>
                                  <ul className="text-xs space-y-1">
                                    {rec.transferIn?.reasoning.map((reason, i) => (
                                      <li key={i} className="flex items-start gap-1">
                                        <span className="text-green-600">✓</span>
                                        <span>{reason}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </>
                      )}
                      {!rec.transferOut && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                            <span className="text-xl">💡</span>
                            Hold Strategy
                          </h4>
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {rec.detailedExplanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Strategy Summary */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Strategy Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">
                {transferStrategy.filter(r => r.priority === 'high').length}
              </p>
              <p className="text-sm text-muted-foreground">High Priority Transfers</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">
                {transferStrategy.filter(r => r.priority === 'medium').length}
              </p>
              <p className="text-sm text-muted-foreground">Medium Priority Transfers</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {transferStrategy.filter(r => r.transferOut && r.transferIn).length}
              </p>
              <p className="text-sm text-muted-foreground">Total Recommended Transfers</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
              💡 Strategy Tips:
            </p>
            <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
              <li>Focus on high priority transfers first</li>
              <li>Consider your available free transfers when planning</li>
              <li>Be flexible - form and injuries change weekly</li>
              <li>Use wildcard if 3+ transfers look appealing</li>
              <li>Adjust volatility slider based on your league position</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

