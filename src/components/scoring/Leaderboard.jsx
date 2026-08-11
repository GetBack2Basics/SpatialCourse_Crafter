import { useState } from 'react';
import confetti from 'canvas-confetti';
import { DEFAULT_SCORING_RULES, calculateLeaderboard } from '../../services/scoringEngine';
import { runDay1OvernightAIValidation } from '../../services/aiValidationService';

export default function Leaderboard({
  teams,
  submissions,
  courseClues,
  onSubmissionsValidated,
  onValidationStart,
  courses = [],
  selectedCourseId,
  onSelectCourse,
  activeCourse,
}) {
  const [ruleWeights, setRuleWeights] = useState(DEFAULT_SCORING_RULES);
  const [vibePrompt, setVibePrompt] = useState('Reward group photo compliance and high spatial precision');
  const [isValidating, setIsValidating] = useState(false);

  // Run Day 1 Overnight AI Batch Validation
  const handleTriggerAIValidation = async () => {
    if (onValidationStart) onValidationStart(); // open logs terminal immediately
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

  // Calculate multi-factor leaderboard results from real data
  const leaderboard = calculateLeaderboard(
    teams,
    submissions,
    courseClues,
    ruleWeights,
    activeCourse?.durationMinutes || 60,
    vibePrompt
  );

  // Teams that have at least one submission for this course
  const teamsWithSubmissions = leaderboard.filter(t => t.cluesCompleted > 0);
  const hasData = teamsWithSubmissions.length > 0;

  const handleSliderChange = (key, val) => {
    setRuleWeights(prev => ({
      ...prev,
      [key]: parseInt(val, 10)
    }));
  };

  const handleApplyVibe = () => {
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.5 }
    });
  };

  return (
    <div className="relative min-h-screen bg-background text-on-background font-body-md">
      {/* Atmospheric Background Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-surface-variant" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-8 sm:py-12 w-full space-y-12">

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-[#00e5ff] text-[24px]">terminal</span>
              <h2 className="font-label-md text-label-md text-[#00e5ff] tracking-widest uppercase">
                Multi-Factor Scoring &amp; Workshop Rules Studio
              </h2>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-background mb-4 uppercase tracking-tighter">
              Live Leaderboard &amp;{' '}
              <span className="text-primary">Vibe-Coding Engine</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Live prompt-driven rule evaluation. Adjust criteria weights or type vibe-coding prompts to tune winner selection on the fly.
            </p>
          </div>

          <button
            onClick={handleTriggerAIValidation}
            disabled={isValidating}
            className="bg-primary hover:bg-primary-dim disabled:opacity-50 text-on-primary font-label-md text-label-md uppercase px-8 py-4 rounded-xl shadow-xl shadow-primary/20 flex items-center gap-3 transition-all transform hover:-translate-y-1 group cursor-pointer"
          >
            <span className={`material-symbols-outlined group-hover:rotate-180 transition-transform duration-500 ${isValidating ? 'animate-spin' : ''}`}>
              {isValidating ? 'autorenew' : 'play_circle'}
            </span>
            <span>{isValidating ? 'Processing Batch...' : 'Run Validation'}</span>
          </button>
        </header>

        {/* Project Selector */}
        {courses.length > 0 && (
          <section className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[#00e5ff] text-[20px]">folder_open</span>
              <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">Project</span>
            </div>
            <div className="flex-1 w-full">
              <select
                value={selectedCourseId}
                onChange={e => onSelectCourse && onSelectCourse(e.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant/40 rounded-xl px-4 py-2.5 text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-[#00e5ff] cursor-pointer"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title || c.id}
                    {c.subtitle ? ` — ${c.subtitle}` : ''}
                  </option>
                ))}
              </select>
            </div>
            {activeCourse && (
              <div className="flex items-center gap-3 text-on-surface-variant font-body-sm shrink-0">
                <span className="material-symbols-outlined text-[16px]">timer</span>
                <span>{activeCourse.durationMinutes || 60} min</span>
                <span className="material-symbols-outlined text-[16px] ml-2">pin_drop</span>
                <span>{(activeCourse.clues || []).length} clues</span>
              </div>
            )}
          </section>
        )}

        {/* Split View Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

          {/* Left Column: Vibe-Coding Studio */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* Prompt Builder Panel */}
            <section className="bg-surface-container rounded-2xl p-6 relative overflow-hidden group border border-outline-variant/30 shadow-lg">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#00e5ff]"></div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-label-md text-label-md text-on-surface tracking-widest uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00e5ff] text-[18px]">code_blocks</span>
                  Workshop Vibe-Coding Prompt Builder
                </h3>
                <div className="flex items-center gap-2 bg-[#00e5ff]/10 px-3 py-1.5 rounded-full border border-[#00e5ff]/20">
                  <div className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></div>
                  <span className="font-label-sm text-label-sm text-[#00e5ff]">Live Evaluation</span>
                </div>
              </div>
              <div className="mb-4 relative">
                <textarea
                  value={vibePrompt}
                  onChange={e => setVibePrompt(e.target.value)}
                  className="w-full bg-surface-container-highest text-on-surface font-body-sm p-4 rounded-xl h-32 focus:outline-none focus:ring-1 focus:ring-[#00e5ff] resize-none placeholder:text-on-surface-variant/50 border border-outline-variant/30"
                  placeholder="Try typing keywords: 'group photo', 'speed', or 'precision' to see live score adjustments..."
                />
                <span className="material-symbols-outlined absolute right-4 bottom-4 text-[#00e5ff]/30 pointer-events-none">
                  auto_awesome
                </span>
              </div>
              <button
                onClick={handleApplyVibe}
                className="w-full bg-surface-container-highest hover:bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 font-label-md text-label-md uppercase py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">magic_button</span>
                Apply Vibe Rule
              </button>
            </section>

            {/* Criteria Weights Panel */}
            <section className="bg-surface-container rounded-2xl p-6 border border-outline-variant/30 shadow-lg">
              <h3 className="font-label-md text-label-md text-on-surface tracking-widest uppercase mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb300] text-[18px]">tune</span>
                Evaluation Criteria Weights
              </h3>

              <div className="space-y-6">
                {/* Weight Item 1: Spatial Precision */}
                <div>
                  <div className="flex justify-between font-label-md text-label-md mb-2">
                    <span className="text-on-surface-variant">Spatial Distance Precision</span>
                    <span className="text-[#ffb300] font-mono">{ruleWeights.spatialPrecisionWeight || 35}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ruleWeights.spatialPrecisionWeight || 35}
                    onChange={e => handleSliderChange('spatialPrecisionWeight', e.target.value)}
                    className="w-full accent-[#ffb300] cursor-pointer mb-2"
                  />
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ffb300] rounded-full transition-all duration-300 relative"
                      style={{ width: `${ruleWeights.spatialPrecisionWeight || 35}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20"></div>
                    </div>
                  </div>
                </div>

                {/* Weight Item 2: Photo Verification */}
                <div>
                  <div className="flex justify-between font-label-md text-label-md mb-2">
                    <span className="text-on-surface-variant">Photo Object &amp; Vision QA</span>
                    <span className="text-[#00e5ff] font-mono">{ruleWeights.photoVerificationWeight || 25}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ruleWeights.photoVerificationWeight || 25}
                    onChange={e => handleSliderChange('photoVerificationWeight', e.target.value)}
                    className="w-full accent-[#00e5ff] cursor-pointer mb-2"
                  />
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00e5ff] rounded-full transition-all duration-300"
                      style={{ width: `${ruleWeights.photoVerificationWeight || 25}%` }}
                    ></div>
                  </div>
                </div>

                {/* Weight Item 3: Group Photo Bonus */}
                <div>
                  <div className="flex justify-between font-label-md text-label-md mb-2">
                    <span className="text-on-surface-variant">Group Photo Compliance (Bonus)</span>
                    <span className="text-primary font-mono">{ruleWeights.groupPhotoBonusWeight || 15}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ruleWeights.groupPhotoBonusWeight || 15}
                    onChange={e => handleSliderChange('groupPhotoBonusWeight', e.target.value)}
                    className="w-full accent-primary cursor-pointer mb-2"
                  />
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${ruleWeights.groupPhotoBonusWeight || 15}%` }}
                    ></div>
                  </div>
                </div>

                {/* Weight Item 4: Capture Rate */}
                <div>
                  <div className="flex justify-between font-label-md text-label-md mb-2">
                    <span className="text-on-surface-variant">Point Capture Speed (PTS/min)</span>
                    <span className="text-[#ffb300] font-mono">{ruleWeights.captureRateWeight || 15}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ruleWeights.captureRateWeight || 15}
                    onChange={e => handleSliderChange('captureRateWeight', e.target.value)}
                    className="w-full accent-[#ffb300] cursor-pointer mb-2"
                  />
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ffb300] rounded-full opacity-70 transition-all duration-300"
                      style={{ width: `${ruleWeights.captureRateWeight || 15}%` }}
                    ></div>
                  </div>
                </div>

                {/* Weight Item 5: Time Penalty */}
                <div>
                  <div className="flex justify-between font-label-md text-label-md mb-2">
                    <span className="text-on-surface-variant">Time Penalty Weight</span>
                    <span className="text-error font-mono">{ruleWeights.timePenaltyWeight || 10}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ruleWeights.timePenaltyWeight || 10}
                    onChange={e => handleSliderChange('timePenaltyWeight', e.target.value)}
                    className="w-full accent-error cursor-pointer mb-2"
                  />
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-error rounded-full transition-all duration-300"
                      style={{ width: `${ruleWeights.timePenaltyWeight || 10}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Fail-safe Note */}
              <div className="mt-8 p-4 bg-surface-container-highest rounded-xl border border-outline-variant/20 flex gap-3 items-start">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">info</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  <strong className="text-on-surface font-semibold">Primary Fail-Safe Mechanism:</strong> Raw points earned provide a fail-safe baseline, supplemented by multi-factor weighted multipliers.
                </p>
              </div>
            </section>
          </div>

          {/* Right Column: Live Leaderboard */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="flex justify-between items-center mb-2 px-2">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-3">
                Live Standings
                <div className="flex space-x-1">
                  <div className="w-1.5 h-4 bg-primary animate-[pulse_1s_ease-in-out_infinite]"></div>
                  <div className="w-1.5 h-6 bg-[#00e5ff] animate-[pulse_1.2s_ease-in-out_infinite]"></div>
                  <div className="w-1.5 h-3 bg-[#ffb300] animate-[pulse_0.8s_ease-in-out_infinite]"></div>
                </div>
              </h3>
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest bg-surface-container-highest px-3 py-1 rounded-full border border-outline-variant/30">
                {teamsWithSubmissions.length} / {teams.length} Teams Active
              </span>
            </div>

            {/* Empty State — no submissions yet */}
            {!hasData && (
              <div className="bg-surface-container rounded-2xl p-12 border border-outline-variant/20 flex flex-col items-center justify-center text-center gap-5 shadow-lg">
                <span className="material-symbols-outlined text-[64px] text-on-surface-variant/30">leaderboard</span>
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2">No Submissions Yet</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
                    Leaderboard rankings will appear here once teams start submitting clue responses for{' '}
                    <span className="text-on-surface font-semibold">{activeCourse?.title || 'this project'}</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant/60 font-label-sm text-label-sm mt-2">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  <span>{teams.length} team{teams.length !== 1 ? 's' : ''} registered</span>
                  <span className="mx-2">·</span>
                  <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                  <span>{(activeCourse?.clues || []).length} clues in course</span>
                </div>
              </div>
            )}

            {/* Team Cards — only shown when there are real submissions */}
            {hasData && teamsWithSubmissions.map((teamRes) => {
              const isRank1 = teamRes.rank === 1;
              const isRank2 = teamRes.rank === 2;

              return (
                <article
                  key={teamRes.teamId}
                  className={`bg-surface-container rounded-2xl p-6 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl group border shadow-lg ${
                    isRank1
                      ? 'border-primary/30 hover:shadow-primary/10'
                      : isRank2
                      ? 'border-[#ffb300]/30 hover:shadow-[#ffb300]/10'
                      : 'border-outline-variant/20 hover:shadow-[#00e5ff]/10'
                  }`}
                >
                  {/* Glow effect for rank 1 */}
                  {isRank1 && (
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors"></div>
                  )}

                  {/* Rank Indicator */}
                  <div
                    className={`absolute right-0 top-0 font-headline-md text-headline-md w-12 h-12 flex items-center justify-center rounded-bl-2xl shadow-lg ${
                      isRank1
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-highest text-on-surface-variant border-l border-b border-outline-variant/20'
                    }`}
                  >
                    {teamRes.rank}
                  </div>

                  <div className="pr-14 mb-5">
                    <h4 className="font-headline-lg text-headline-lg text-on-surface mb-2 flex items-center gap-3 flex-wrap">
                      {teamRes.teamName}
                    </h4>
                    <div className="flex gap-4 font-body-sm text-body-sm text-on-surface-variant items-center bg-surface-container-highest/50 inline-flex px-3 py-1.5 rounded-lg border border-outline-variant/20 flex-wrap">
                      <span className="flex items-center gap-1.5 text-on-surface">
                        <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                        {teamRes.cluesCompleted}/{teamRes.totalClues} Clues Done
                      </span>
                      {teamRes.members?.length > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-outline-variant hidden sm:inline-block"></span>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">group</span>
                            {teamRes.members.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-surface-container-highest rounded-xl border border-outline-variant/20">
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Total Score</div>
                      <div className={`font-headline-md text-headline-md drop-shadow-md ${isRank1 ? 'text-primary' : 'text-on-surface'}`}>
                        {teamRes.finalScore} PTS
                      </div>
                    </div>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Base Points</div>
                      <div className="font-body-lg text-body-lg text-on-surface">{teamRes.rawPointsEarned} pts</div>
                    </div>
                    <div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Capture Rate</div>
                      <div className="font-body-lg text-body-lg text-on-surface">{teamRes.ptsPerMin} pts/m</div>
                    </div>
                  </div>

                  {/* Metric Chips */}
                  <div className="mb-6 flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-surface-container-highest border border-outline-variant/30 rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#00e5ff]">my_location</span>
                      Spatial QA: {teamRes.breakdown?.spatialAccuracyScore || 0}%
                    </span>
                    <span className="px-3 py-1.5 bg-surface-container-highest border border-outline-variant/30 rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#00e5ff]">visibility</span>
                      Vision QA: {teamRes.breakdown?.photoVerificationScore || 0}%
                    </span>
                    <span className="px-3 py-1.5 bg-surface-container-highest border border-outline-variant/30 rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#00e5ff]">diversity_3</span>
                      Group Photo: {teamRes.breakdown?.groupPhotoComplianceScore || 0}%
                    </span>
                    <span className="px-3 py-1.5 bg-surface-container-highest border border-outline-variant/30 rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#00e5ff]">speed</span>
                      Capture Rate: {teamRes.breakdown?.captureRateScore || 0}%
                    </span>
                  </div>

                  {/* AI Rationale */}
                  <div className={`bg-surface-container-highest p-4 rounded-xl border-l-4 ${isRank1 ? 'border-primary' : 'border-outline-variant'}`}>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      <span className={`font-semibold font-label-md uppercase tracking-wider ${isRank1 ? 'text-primary' : 'text-on-surface'}`}>
                        &gt; AI Rationale:
                      </span>{' '}
                      {teamRes.aiRationale}
                    </p>
                  </div>
                </article>
              );
            })}

            {/* Teams registered but no submissions — summary list */}
            {hasData && leaderboard.filter(t => t.cluesCompleted === 0).length > 0 && (
              <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/20 shadow">
                <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">pending</span>
                  Awaiting First Submission
                </h4>
                <div className="flex flex-wrap gap-2">
                  {leaderboard
                    .filter(t => t.cluesCompleted === 0)
                    .map(t => (
                      <span
                        key={t.teamId}
                        className="px-3 py-1.5 bg-surface-container-highest border border-outline-variant/30 rounded-lg font-label-sm text-label-sm text-on-surface-variant"
                      >
                        {t.teamName}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
