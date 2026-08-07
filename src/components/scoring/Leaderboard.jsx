import React, { useState } from 'react';
import { Trophy, Sparkles, Sliders, CheckCircle2, ShieldAlert, Cpu, ArrowUpRight, Award, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DEFAULT_SCORING_RULES, calculateDay2Leaderboard } from '../../services/scoringEngine';
import { runDay1OvernightAIValidation } from '../../services/aiValidationService';

export default function Leaderboard({ teams, submissions, courseClues, onSubmissionsValidated }) {
  const [ruleWeights, setRuleWeights] = useState(DEFAULT_SCORING_RULES);
  const [isValidating, setIsValidating] = useState(false);

  // Run Day 1 Overnight AI Batch Validation
  const handleTriggerAIValidation = async () => {
    setIsValidating(true);
    const validated = await runDay1OvernightAIValidation(submissions, courseClues);
    onSubmissionsValidated(validated);
    setIsValidating(false);

    // Fire victory confetti celebration
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Calculate Day 2 Leaderboard results
  const leaderboard = calculateDay2Leaderboard(teams, submissions, courseClues, ruleWeights);

  const handleSliderChange = (key, val) => {
    setRuleWeights(prev => ({
      ...prev,
      [key]: parseInt(val, 10)
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>DAY 2 PARTICIPANT-DRIVEN AI SCORING STUDIO</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-100 mt-1">Spatial Olympics Leaderboard & Rule Engine</h2>
            <p className="text-slate-400 text-sm mt-1">
              Teams vote & adjust scoring mechanism weights. GCP AI processes spatial metrics in minutes to yield transparent results.
            </p>
          </div>

          <button
            onClick={handleTriggerAIValidation}
            disabled={isValidating}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 font-extrabold text-sm text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isValidating ? 'Running GCP AI Batch...' : 'Run Day 1 AI Validation'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Day 2 Participant Rule Prioritizer */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Participant Scoring Weight Sliders
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              Day 2 Voting
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Adjust rule priorities below to dynamically re-score all team submissions in real-time.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Spatial Distance Precision</span>
                <span className="font-mono text-cyan-400">{ruleWeights.spatialPrecisionWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ruleWeights.spatialPrecisionWeight}
                onChange={e => handleSliderChange('spatialPrecisionWeight', e.target.value)}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>AI Photo Object Recognition</span>
                <span className="font-mono text-purple-400">{ruleWeights.photoVerificationWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ruleWeights.photoVerificationWeight}
                onChange={e => handleSliderChange('photoVerificationWeight', e.target.value)}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Attribute Data Quality & Schema</span>
                <span className="font-mono text-emerald-400">{ruleWeights.attributeQualityWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ruleWeights.attributeQualityWeight}
                onChange={e => handleSliderChange('attributeQualityWeight', e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Completion Speed & Timeliness</span>
                <span className="font-mono text-amber-400">{ruleWeights.speedBonusWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ruleWeights.speedBonusWeight}
                onChange={e => handleSliderChange('speedBonusWeight', e.target.value)}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="text-amber-400 font-bold">Rule Evaluation Rationale:</div>
            <div>AI evaluates weighted parameters against ground-truth survey points & vision QA.</div>
          </div>
        </div>

        {/* Right 2 Columns: Transparent Leaderboard Podium & Table */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Leaderboard Cards */}
          <div className="space-y-3">
            {leaderboard.map((teamRes) => {
              const isGold = teamRes.rank === 1;
              const isSilver = teamRes.rank === 2;
              const isBronze = teamRes.rank === 3;

              return (
                <div
                  key={teamRes.teamId}
                  className={`p-5 rounded-2xl border transition-all ${
                    isGold
                      ? 'bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-amber-500/50 shadow-xl shadow-amber-500/10'
                      : isSilver
                      ? 'bg-slate-900/80 border-slate-700'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg font-mono shadow-md ${
                        isGold ? 'bg-amber-400 text-slate-950' : isSilver ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                      }`}>
                        #{teamRes.rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-lg text-slate-100">{teamRes.teamName}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            {teamRes.cluesCompleted}/{teamRes.totalClues} Clues Done
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Members: {teamRes.members.join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-amber-300 font-mono">
                        {teamRes.finalScore} <span className="text-xs font-normal text-slate-400">PTS</span>
                      </div>
                      <div className="text-[11px] text-cyan-400 font-mono">
                        Multiplier: {teamRes.breakdown.overallScoreMultiplier}%
                      </div>
                    </div>

                  </div>

                  {/* AI Metrics Breakdown */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center font-mono text-xs">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Spatial QA</span>
                      <span className="text-cyan-400 font-bold">{teamRes.breakdown.spatialAccuracyScore}%</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">AI Vision</span>
                      <span className="text-purple-400 font-bold">{teamRes.breakdown.photoVerificationScore}%</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Attributes</span>
                      <span className="text-emerald-400 font-bold">{teamRes.breakdown.attributeQualityScore}%</span>
                    </div>
                  </div>

                  {/* Explainable AI Rationale */}
                  <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60 font-mono">
                    <span className="text-amber-400 font-semibold">AI Analysis Rationale: </span>
                    {teamRes.aiRationale}
                  </div>

                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
