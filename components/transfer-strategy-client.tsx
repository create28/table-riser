'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team, Fixture } from '@/lib/fpl-api';
import { usePlayerDetail } from '@/components/player-detail-provider';

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
  const [volatilityPreference, setVolatilityPreference] = useState(50); // 0 = stable, 100 = volatile
  const [freeTransfersInput, setFreeTransfersInput] = useState(1); // User inputs their actual FTs
  const [budgetFlexibility, setBudgetFlexibility] = useState(0); // -5 to +5 million
  const [considerRolling, setConsiderRolling] = useState(true); // Whether to consider banking transfers

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

  // Helper: Generate detailed transfer explanation
  const generateTransferExplanation = (
    transferOut: PlayerScore,
    transferIn: PlayerScore,
    gameweek: number,
    volatilityPref: number
  ): string => {
    const outPlayer = transferOut.player;
    const inPlayer = transferIn.player;
    const outTeam = getTeam(outPlayer.team)?.short_name || 'Unknown';
    const inTeam = getTeam(inPlayer.team)?.short_name || 'Unknown';
    const position = getPositionName(outPlayer.element_type);
    
    let explanation = '';

    // Opening
    explanation += `For Gameweek ${gameweek}, we recommend transferring out **${outPlayer.web_name}** (${outTeam}, ${position}) and bringing in **${inPlayer.web_name}** (${inTeam}, ${position}). `;

    // Why transfer out
    explanation += `\n\n**Why sell ${outPlayer.web_name}?** `;
    
    if (transferOut.fixtureScore < 50) {
      const nextFixtures = transferOut.upcomingFixtures.slice(0, 3).join(', ');
      explanation += `${outPlayer.web_name} faces a difficult run of fixtures (${nextFixtures}) with an average difficulty that makes returns unlikely. `;
    }
    
    if (transferOut.formScore < 50) {
      explanation += `Their recent form has been concerning with only ${outPlayer.form} points per game over the last few weeks. `;
    }
    
    if (transferOut.volatilityScore > 70 && volatilityPref < 40) {
      explanation += `Additionally, as you're playing a stable strategy, ${outPlayer.web_name}'s high volatility (boom-or-bust nature) doesn't align with your risk appetite. `;
    } else if (transferOut.volatilityScore < 30 && volatilityPref > 60) {
      explanation += `For your ambitious strategy, ${outPlayer.web_name} lacks the explosive ceiling needed to make significant gains. `;
    }

    explanation += `Their overall score of ${transferOut.score.toFixed(1)} suggests limited potential in the coming weeks.`;

    // Why transfer in
    explanation += `\n\n**Why buy ${inPlayer.web_name}?** `;
    
    if (transferIn.fixtureScore > 70) {
      const nextFixtures = transferIn.upcomingFixtures.slice(0, 3).join(', ');
      explanation += `${inPlayer.web_name} has an excellent fixture run (${nextFixtures}) that presents strong opportunities for points. `;
    } else if (transferIn.fixtureScore > 55) {
      explanation += `${inPlayer.web_name} has a favorable fixture schedule ahead that should yield returns. `;
    }
    
    if (transferIn.formScore > 70) {
      explanation += `They're in exceptional form, averaging ${inPlayer.form} points per game recently, with ${inPlayer.goals_scored} goals and ${inPlayer.assists} assists this season. `;
    } else if (transferIn.formScore > 55) {
      explanation += `Their form is solid with consistent returns and they've shown they can deliver points. `;
    }

    if (transferIn.volatilityScore > 70 && volatilityPref > 60) {
      explanation += `With your ambitious strategy, ${inPlayer.web_name}'s high ceiling and explosive potential (volatility: ${transferIn.volatilityScore.toFixed(0)}) makes them an ideal differential pick. `;
    } else if (transferIn.volatilityScore < 30 && volatilityPref < 40) {
      explanation += `For your conservative approach, ${inPlayer.web_name} offers reliable, consistent returns with minimal risk (volatility: ${transferIn.volatilityScore.toFixed(0)}). `;
    } else if (transferIn.volatilityScore >= 40 && transferIn.volatilityScore <= 60) {
      explanation += `${inPlayer.web_name} offers a balanced profile - capable of big hauls while maintaining decent consistency. `;
    }

    // Value consideration
    const priceDiff = (inPlayer.now_cost - outPlayer.now_cost) / 10;
    const outPrice = outPlayer.now_cost / 10;
    const inPrice = inPlayer.now_cost / 10;
    
    explanation += `\n\n**Price:** Selling ${outPlayer.web_name} (£${outPrice.toFixed(1)}m) and buying ${inPlayer.web_name} (£${inPrice.toFixed(1)}m) `;
    
    if (Math.abs(priceDiff) < 0.1) {
      explanation += `is essentially cost-neutral. `;
    } else if (priceDiff > 0) {
      explanation += `requires an extra £${priceDiff.toFixed(1)}m from your bank, but the upgrade in quality and fixture-proofing justifies the investment. `;
    } else {
      explanation += `frees up £${Math.abs(priceDiff).toFixed(1)}m that can be banked for future transfers or used to strengthen other areas of your squad. `;
    }

    // Ownership insight
    const ownership = parseFloat(inPlayer.selected_by_percent);
    if (ownership < 5) {
      explanation += `With only ${ownership.toFixed(1)}% ownership, ${inPlayer.web_name} is a strong differential who could separate you from rivals. `;
    } else if (ownership > 30) {
      explanation += `While ${inPlayer.web_name} is popular (${ownership.toFixed(1)}% ownership), their upcoming fixtures make them essential. `;
    }

    // Score improvement
    const improvement = transferIn.score - transferOut.score;
    explanation += `\n\n**Overall Impact:** This transfer improves your squad's projected score by ${improvement.toFixed(1)} points, combining better fixtures (${transferIn.fixtureScore.toFixed(0)} vs ${transferOut.fixtureScore.toFixed(0)}), superior form (${transferIn.formScore.toFixed(0)} vs ${transferOut.formScore.toFixed(0)}), and `;
    
    if (volatilityPref > 60) {
      explanation += `higher upside potential for your ambitious strategy.`;
    } else if (volatilityPref < 40) {
      explanation += `greater consistency for your stable strategy.`;
    } else {
      explanation += `a better risk-reward balance.`;
    }

    return explanation;
  };

  // Helper: Get player's upcoming fixtures
  const getUpcomingFixtures = (player: Player, gameweeksAhead: number) => {
    const upcoming: { opponent: string; difficulty: number; isHome: boolean; gameweek: number }[] = [];
    
    for (let i = 1; i <= gameweeksAhead; i++) {
      const gw = currentGameweek + i;
      const playerFixtures = fixtures.filter(f => 
        f.event === gw && (f.team_h === player.team || f.team_a === player.team)
      );

      playerFixtures.forEach(fixture => {
        const isHome = fixture.team_h === player.team;
        const opponentId = isHome ? fixture.team_a : fixture.team_h;
        const opponent = getTeam(opponentId);
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;

        if (opponent) {
          upcoming.push({
            opponent: opponent.short_name,
            difficulty,
            isHome,
            gameweek: gw,
          });
        }
      });
    }

    return upcoming;
  };

  // Helper: Calculate fixture difficulty score (lower difficulty = better)
  const calculateFixtureScore = (player: Player, gameweeksAhead: number) => {
    const upcomingFixtures = getUpcomingFixtures(player, gameweeksAhead);
    if (upcomingFixtures.length === 0) return 0;

    const avgDifficulty = upcomingFixtures.reduce((sum, f) => sum + f.difficulty, 0) / upcomingFixtures.length;
    
    // Convert to score (easier fixtures = higher score)
    // Difficulty ranges from 2 (easiest) to 5 (hardest)
    const fixtureScore = ((5 - avgDifficulty) / 3) * 100;
    
    // Bonus for home fixtures
    const homeBonus = upcomingFixtures.filter(f => f.isHome).length * 5;
    
    return Math.min(100, fixtureScore + homeBonus);
  };

  // Helper: Calculate form score
  const calculateFormScore = (player: Player) => {
    const form = parseFloat(player.form);
    const ppg = parseFloat(player.points_per_game);
    
    // Weight recent form more heavily
    const formScore = (form * 0.7 + ppg * 0.3) * 10;
    
    return Math.min(100, formScore);
  };

  // Helper: Calculate volatility score
  const calculateVolatility = (player: Player) => {
    const history = playerHistories[player.id];
    if (!history || !history.history || history.history.length < 3) {
      return 0;
    }

    const gameweekPoints = history.history.map((h: any) => h.total_points);
    const avg = gameweekPoints.reduce((sum: number, pts: number) => sum + pts, 0) / gameweekPoints.length;
    const variance = gameweekPoints.reduce((sum: number, pts: number) => sum + Math.pow(pts - avg, 2), 0) / gameweekPoints.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize to 0-100 scale
    const volatilityScore = Math.min(100, (stdDev / avg) * 100);
    
    return volatilityScore;
  };

  // Score all players for transfer consideration
  const scorePlayer = (player: Player, gameweeksAhead: number, volatilityPref: number): PlayerScore => {
    const fixtureScore = calculateFixtureScore(player, gameweeksAhead);
    const formScore = calculateFormScore(player);
    const volatilityScore = calculateVolatility(player);
    
    // Weight volatility based on user preference
    // Low preference (0) = prefer stable players (low volatility)
    // High preference (100) = prefer volatile players (high volatility)
    const volatilityWeight = volatilityPref / 100;
    const stabilityWeight = 1 - volatilityWeight;
    
    const adjustedVolatilityScore = volatilityWeight * volatilityScore + stabilityWeight * (100 - volatilityScore);
    
    // Combined score with weights
    const score = (
      fixtureScore * 0.4 + 
      formScore * 0.35 + 
      adjustedVolatilityScore * 0.25
    );

    const upcomingFixtures = getUpcomingFixtures(player, gameweeksAhead);
    
    const reasoning: string[] = [];
    if (fixtureScore > 70) reasoning.push('Excellent fixtures');
    if (fixtureScore < 40) reasoning.push('Difficult fixtures');
    if (formScore > 70) reasoning.push('Strong form');
    if (formScore < 40) reasoning.push('Poor form');
    if (volatilityScore > 60) reasoning.push('High ceiling (explosive)');
    if (volatilityScore < 30) reasoning.push('Consistent performer');

    return {
      player,
      score,
      fixtureScore,
      formScore,
      volatilityScore,
      upcomingFixtures: upcomingFixtures.map(f => `${f.isHome ? 'vs' : '@'} ${f.opponent}`),
      reasoning,
    };
  };

  // Generate transfer strategy
  const transferStrategy = useMemo(() => {
    const strategy: TransferRecommendation[] = [];
    
    // Track virtual squad that evolves with recommendations
    let virtualSquad = [...squadPlayers];
    let virtualSquadIds = new Set(squadPlayers.map(p => p.id));
    
    // Track free transfers available (starts with user input, can be rolled)
    let currentFreeTransfers = freeTransfersInput;
    
    // Get current bank balance from manager info (in tenths)
    let virtualBank = (managerInfo.last_deadline_bank || 0) / 10; // Convert to millions

    // Score all squad players for each upcoming gameweek
    for (let i = 0; i < nextGameweeks.length; i++) {
      const gameweek = nextGameweeks[i].id;
      const gameweeksAhead = i + 1;

      // Score current virtual squad players
      const squadScores = virtualSquad
        .map(p => scorePlayer(p, gameweeksAhead, volatilityPreference))
        .sort((a, b) => a.score - b.score); // Lowest score = transfer out candidate

      // Find transfer opportunities (must be same position AND affordable)
      const allPossibleTransfers: Array<{
        out: PlayerScore;
        in: PlayerScore;
        improvement: number;
      }> = [];

      // For each squad player, find best replacements in SAME POSITION
      for (const squadScore of squadScores) {
        const playerPosition = squadScore.player.element_type;
        const sellingPrice = squadScore.player.now_cost / 10; // Convert to millions
        const availableFunds = virtualBank + sellingPrice + budgetFlexibility; // Total budget after selling + flexibility
        
        // Score potential transfer targets (same position, not in squad, affordable)
        const positionTargets = allPlayers
          .filter(p => 
            p.element_type === playerPosition && // SAME POSITION
            !virtualSquadIds.has(p.id) && // Not in current virtual squad
            p.minutes > 100 && // Has played
            p.chance_of_playing_next_round !== 0 && // Not injured
            (p.now_cost / 10) <= availableFunds // AFFORDABLE
          )
          .map(p => scorePlayer(p, gameweeksAhead, volatilityPreference))
          .sort((a, b) => b.score - a.score); // Highest score = transfer in candidate

        // Add top targets for this squad player
        if (positionTargets.length > 0) {
          for (const target of positionTargets.slice(0, 3)) { // Top 3 targets per player
            const improvement = target.score - squadScore.score;
            allPossibleTransfers.push({
              out: squadScore,
              in: target,
              improvement
            });
          }
        }
      }

      // Sort all possible transfers by improvement
      allPossibleTransfers.sort((a, b) => b.improvement - a.improvement);

      // Get best transfer
      const bestTransfer = allPossibleTransfers.length > 0 ? allPossibleTransfers[0] : null;

      const worstSquadPlayer = bestTransfer?.out;
      const bestTransferTarget = bestTransfer?.in;

      // Determine if we should make a transfer based on improvement and rolling strategy
      // Rolling threshold: if considerRolling is true and we have 1 FT, require higher improvement
      const baseImprovementThreshold = 15;
      const rollingThreshold = 25; // Higher threshold if considering rolling
      const improvementThreshold = (considerRolling && currentFreeTransfers === 1) ? rollingThreshold : baseImprovementThreshold;
      
      if (bestTransferTarget && worstSquadPlayer && bestTransfer) {
        const improvement = bestTransfer.improvement;
        const priceDiff = (bestTransferTarget.player.now_cost - worstSquadPlayer.player.now_cost) / 10;

        if (improvement > improvementThreshold) {
          let priority: 'high' | 'medium' | 'low' = 'low';
          if (improvement > 30) priority = 'high';
          else if (improvement > 20) priority = 'medium';

          let detailedExplanation = generateTransferExplanation(
            worstSquadPlayer,
            bestTransferTarget,
            gameweek,
            volatilityPreference
          );

          // Add info about using FT
          detailedExplanation += `\n\n**Free Transfers:** You currently have ${currentFreeTransfers} free transfer(s). `;
          if (currentFreeTransfers === 1) {
            detailedExplanation += `This transfer will use your free transfer for this gameweek. `;
          } else if (currentFreeTransfers === 2) {
            detailedExplanation += `This transfer uses 1 of your 2 free transfers. You can make another transfer without a points hit. `;
          }
          
          // Add budget info
          if (priceDiff > 0) {
            detailedExplanation += `This transfer costs an additional £${priceDiff.toFixed(1)}m. `;
          } else if (priceDiff < 0) {
            detailedExplanation += `This transfer frees up £${Math.abs(priceDiff).toFixed(1)}m in your budget. `;
          }

          // For the FIRST gameweek only, get 2 alternative options
          const alternatives: Array<{
            transferOut: PlayerScore;
            transferIn: PlayerScore;
            reasoning: string;
            detailedExplanation: string;
            priority: 'high' | 'medium' | 'low';
          }> = [];

          if (i === 0 && allPossibleTransfers.length > 1) {
            // Get alternatives (skip the best one we already have)
            const alternativeTransfers = allPossibleTransfers.slice(1, 3); // Next 2 best

            for (const altTransfer of alternativeTransfers) {
              const altImprovement = altTransfer.improvement;
              let altPriority: 'high' | 'medium' | 'low' = 'low';
              if (altImprovement > 30) altPriority = 'high';
              else if (altImprovement > 20) altPriority = 'medium';

              const altExplanation = generateTransferExplanation(
                altTransfer.out,
                altTransfer.in,
                gameweek,
                volatilityPreference
              );

              alternatives.push({
                transferOut: altTransfer.out,
                transferIn: altTransfer.in,
                reasoning: `Alternative for GW${gameweek}: ${altTransfer.in.reasoning.join(', ')}`,
                detailedExplanation: altExplanation,
                priority: altPriority,
              });
            }
          }

          strategy.push({
            gameweek,
            transferOut: worstSquadPlayer,
            transferIn: bestTransferTarget,
            reasoning: `Upgrade for GW${gameweek}: ${bestTransferTarget.reasoning.join(', ')}`,
            detailedExplanation,
            priority,
            alternatives: alternatives.length > 0 ? alternatives : undefined,
          });

          // Update virtual squad for next gameweek (use best transfer)
          virtualSquad = virtualSquad.filter(p => p.id !== worstSquadPlayer.player.id);
          virtualSquad.push(bestTransferTarget.player);
          virtualSquadIds = new Set(virtualSquad.map(p => p.id));
          
          // Update virtual bank
          virtualBank += priceDiff;
          
          // Use 1 free transfer (reset to 1 for next week if this is the first gameweek)
          if (currentFreeTransfers === 2) {
            currentFreeTransfers = 1; // Used 1, still have 1 left
          } else {
            currentFreeTransfers = 1; // Used FT, get 1 next week
          }
        } else {
          // Consider rolling the transfer
          let holdExplanation = `**🏦 Rolling Transfer Recommended for Gameweek ${gameweek}**\n\n`;
          
          if (considerRolling && currentFreeTransfers === 1) {
            holdExplanation += `Your squad is well-positioned and the best available transfer only offers a ${improvement.toFixed(1)} point improvement (below the threshold of ${improvementThreshold}). ` +
              `**Banking your free transfer** to have 2 FTs next gameweek allows you to:\n\n` +
              `• Make multiple position swaps without taking hits\n` +
              `• React to injuries and price changes with more flexibility\n` +
              `• Execute more complex transfer strategies\n\n` +
              `The best transfer option would be ${worstSquadPlayer.player.web_name} (score: ${worstSquadPlayer.score.toFixed(1)}) ` +
              `➡️ ${bestTransferTarget.player.web_name} (score: ${bestTransferTarget.score.toFixed(1)}), but waiting allows better opportunities.`;
            
            // Bank the transfer (increase FT count to 2 for next week, max 2)
            currentFreeTransfers = Math.min(2, currentFreeTransfers + 1);
          } else {
            holdExplanation += `Your squad is well-positioned for Gameweek ${gameweek}. ` +
              `The current analysis suggests that no transfer would provide a significant enough improvement (threshold: ${improvementThreshold} points) to justify using a transfer. ` +
              `Your worst-performing player (${worstSquadPlayer.player.web_name}) still has a competitive score of ${worstSquadPlayer.score.toFixed(1)}, ` +
              `and the best available transfer target (${bestTransferTarget.player.web_name}) would only improve this by ${improvement.toFixed(1)} points.`;
          }

          strategy.push({
            gameweek,
            reasoning: `Hold transfers - squad well positioned${considerRolling && currentFreeTransfers === 2 ? ' (2 FTs next week)' : ''}`,
            detailedExplanation: holdExplanation,
            priority: 'low',
          });
        }
      }
    }

    return strategy;
  }, [squadPlayers, allPlayers, nextGameweeks, currentGameweek, volatilityPreference, playerHistories, fixtures, managerInfo, freeTransfersInput, budgetFlexibility, considerRolling]);

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
                max="2"
                value={freeTransfersInput}
                onChange={(e) => setFreeTransfersInput(Math.min(2, Math.max(1, parseInt(e.target.value) || 1)))}
                className="text-2xl font-bold text-purple-600 w-20 px-2 py-1 border rounded bg-background text-center"
              />
            </div>
          </div>

          {/* Budget Flexibility Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Budget Flexibility</span>
              <span className="text-lg font-bold text-primary">
                {budgetFlexibility > 0 ? '+' : ''}{budgetFlexibility.toFixed(1)}m
              </span>
            </div>
            <Slider
              value={[budgetFlexibility * 10]}
              onValueChange={(value) => setBudgetFlexibility(value[0] / 10)}
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
            💡 Recommendations consider your available funds (bank + selling price {budgetFlexibility !== 0 ? `${budgetFlexibility > 0 ? '+' : ''}${budgetFlexibility.toFixed(1)}m flexibility` : ''})
          </p>
        </CardContent>
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
                {volatilityPreference < 33 ? '🛡️ Stable (Conservative)' : 
                 volatilityPreference < 67 ? '⚖️ Balanced' : 
                 '🚀 Volatile (Ambitious)'}
              </span>
              <span className="text-2xl font-bold text-primary">{volatilityPreference}</span>
            </div>
            <Slider
              value={[volatilityPreference]}
              onValueChange={(value) => setVolatilityPreference(value[0])}
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

