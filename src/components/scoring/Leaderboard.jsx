import { useState } from 'react';
import { Trophy, Sparkles, Sliders, CheckCircle2, ShieldAlert, Cpu, Terminal, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DEFAULT_SCORING_RULES, calculateLeaderboard } from '../../services/scoringEngine';
import { runDay1OvernightAIValidation } from '../../services/aiValidationService';

export default function Leaderboard({ teams, submissions, courseClues, onSubmissionsValidated }) {
  const [ruleWeights, setRuleWeights] = useState(DEFAULT_SCORING_RULES);
  const [vibePrompt, setVibePrompt] = useState('Reward group photo compliance and high spatial precision');
  const [isValidating, setIsValidating] = useState(false);

  // Run Day 1 Overnight AI Batch Validation
  const handleTriggerAIValidation = async () => {
    setIsValidating(true);
    const validated = await runDay1OvernightAIValidation(submissions, courseClues);
    if (onSubmissionsValidated) onSubmissionsValidated(validated);
    setIsValidating(false);

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Calculate multi-factor leaderboard results
  const leaderboard = calculateLeaderboard(teams, submissions, courseClues, ruleWeights, 60, vibePrompt);

  const handleSliderChange = (key, val) => {
    setRuleWeights(prev => ({
      ...prev,
      [key]: parseInt(val, 10)
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>SPATIAL OLYMPICS 2026 LIVE LEADERBOARD & VIBE-CODING ENGINE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-100 mt-1">Multi-Factor Scoring & Workshop Rules Studio</h2>
            <p className="text-slate-400 text-sm mt-1">
              Live prompt-driven rule evaluation for workshop demonstrations. Adjust criteria weights or type vibe-coding prompts to tune winner selection on the fly.
            </p>
          </div>

          <button
            onClick={handleTriggerAIValidation}
            disabled={isValidating}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 font-extrabold text-sm text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isValidating ? 'Processing Batch...' : 'Run Day 1 AI Validation'}</span>
          </button>
        </div>
      </div>

      {/* Live Workshop Vibe-Coding Prompt Builder Banner */}
      <div className="p-4 rounded-2xl bg-purple-950/60 border border-purple-500/50 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
            <Terminal className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>WORKSHOP VIBE-CODING PROMPT BUILDER (LIVE DEMO)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900 text-purple-200 border border-purple-700 font-bold uppercase">
            Prompt Evaluation Active
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={vibePrompt}
            onChange={e => setVibePrompt(e.target.value)}
            placeholder="Type live rules e.g., 'Reward group photos and speed capture'..."
            className="flex-1 bg-slate-950 border border-purple-500/40 rounded-xl px-3.5 py-2 text-xs text-purple-100 focus:outline-none focus:border-purple-400 font-mono shadow-inner"
          />
          <button
            onClick={() => {
              confetti({ particleCount: 60, spread: 50 });
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
          >
            Apply Vibe Rule
          </button>
        </div>
        <p className="text-[11px] text-purple-300/80">
          Try typing keywords: <code className="text-amber-300">"group photo"</code>, <code className="text-cyan-300">"speed"</code>, or <code className="text-emerald-300">"precision"</code> to see live score adjustments!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Metric Weight Sliders */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Criteria Weight Sliders
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              Live Tuning
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Spatial Distance Precision</span>
                <span className="font-mono text-cyan-400">{ruleWeights.spatialPrecisionWeight || 35}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ruleWeights.spatialPrecisionWeight || 35}
                onChange={e => handleSliderChange('spatialPrecisionWeight', e.target.value)}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Photo Object & Vision QA</span>
                <span className="font-mono text-purple-400">{ruleWeights.photoVerificationWeight || 25}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ruleWeights.photoVerificationWeight || 25}
                onChange={e => handleSliderChange('photoVerificationWeight', e.target.value)}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Group Photo Compliance (+15% Bonus)</span>
                <span className="font-mono text-emerald-400">{ruleWeights.groupPhotoBonusWeight || 15}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ruleWeights.groupPhotoBonusWeight || 15}
                onChange={e => handleSliderChange('groupPhotoBonusWeight', e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Point Capture Speed (PTS/min)</span>
                <span className="font-mono text-amber-400">{ruleWeights.captureRateWeight || 15}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ruleWeights.captureRateWeight || 15}
                onChange={e => handleSliderChange('captureRateWeight', e.target.value)}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Time Penalty Weight</span>
                <span className="font-mono text-rose-400">{ruleWeights.timePenaltyWeight || 10}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={ruleWeights.timePenaltyWeight || 10}
                onChange={e => handleSliderChange('timePenaltyWeight', e.target.value)}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="text-amber-400 font-bold">Primary Fail-Safe Mechanism:</div>
            <div>Raw points earned provide a fail-safe baseline, supplemented by multi-factor weighted multipliers.</div>
          </div>
        </div>

        {/* Right 2 Columns: Transparent Leaderboard Cards */}
        <div className="lg:col-span-2 space-y-5">
          
          <div className="space-y-3">
            {leaderboard.map((teamRes) => {
              const isGold = teamRes.rank === 1;
              const isSilver = teamRes.rank === 2;

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-lg text-slate-100">{teamRes.teamName}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            {teamRes.cluesCompleted}/{teamRes.totalClues} Clues Done
                          </span>
                          {teamRes.groupPhotoVerifiedCount > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                              📸 {teamRes.groupPhotoVerifiedCount} Group Photos
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Members: {teamRes.members.join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-2xl font-black text-amber-300">
                        {teamRes.finalScore} <span className="text-xs font-normal text-slate-400">PTS</span>
                      </div>
                      <div className="text-[11px] text-cyan-400">
                        Base: {teamRes.rawPointsEarned} pts | Rate: {teamRes.ptsPerMin} pts/m
                      </div>
                    </div>

                  </div>

                  {/* AI Metrics Breakdown */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-4 gap-2 text-center font-mono text-xs">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Spatial QA</span>
                      <span className="text-cyan-400 font-bold">{teamRes.breakdown.spatialAccuracyScore}%</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Vision QA</span>
                      <span className="text-purple-400 font-bold">{teamRes.breakdown.photoVerificationScore}%</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Group Photo</span>
                      <span className="text-emerald-400 font-bold">{teamRes.breakdown.groupPhotoComplianceScore}%</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Capture Rate</span>
                      <span className="text-amber-400 font-bold">{teamRes.breakdown.captureRateScore}%</span>
                    </div>
                  </div>

                  {/* Explainable Analysis Rationale */}
                  <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60 font-mono">
                    <span className="text-amber-400 font-semibold">AI Evaluation Rationale: </span>
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
