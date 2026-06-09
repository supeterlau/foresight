import React, { useState } from 'react';
import { Calendar, CheckSquare, Sparkles, TrendingUp, AlertTriangle, ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { Recommendation } from '../types';

interface SprintPlannerProps {
  recommendations: Recommendation[];
  activeScore: number;
  onStatusChange?: (recId: string, newStatus: 'pending' | 'resolved' | 'dismissed') => void;
}

export default function SprintPlanner({ recommendations, activeScore, onStatusChange }: SprintPlannerProps) {
  const [scheduledIds, setScheduledIds] = useState<string[]>([]);
  const [sprintGoal, setSprintGoal] = useState('Stabilize main branch build and clear pending MR reviews');
  const [isSaved, setIsSaved] = useState(false);

  // Filter recommendations that are not dismissed
  const activeRecs = recommendations.filter(r => r.status !== 'dismissed');

  const toggleSchedule = (id: string) => {
    setScheduledIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    setIsSaved(false);
  };

  const handleSaveSprint = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  // Calculate simulated metrics impact based on checked scheduled actions
  const pipelineImpact = scheduledIds.some(id => {
    const rec = activeRecs.find(r => r.id === id);
    return rec?.type === 'pipeline' || rec?.title.toLowerCase().includes('pipeline') || rec?.title.toLowerCase().includes('build');
  });

  const reviewImpact = scheduledIds.some(id => {
    const rec = activeRecs.find(r => r.id === id);
    return rec?.type === 'mr' || rec?.title.toLowerCase().includes('review') || rec?.title.toLowerCase().includes('mr');
  });

  const issueImpact = scheduledIds.some(id => {
    const rec = activeRecs.find(r => r.id === id);
    return rec?.type === 'issues' || rec?.title.toLowerCase().includes('issue') || rec?.title.toLowerCase().includes('bug');
  });

  // Calculate predicted score increase
  let estimatedHealthBoost = 0;
  if (pipelineImpact) estimatedHealthBoost += 12;
  if (reviewImpact) estimatedHealthBoost += 8;
  if (issueImpact) estimatedHealthBoost += 5;

  const predictedScore = Math.min(100, activeScore + estimatedHealthBoost);

  return (
    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-5 border-b border-zinc-800/60 bg-gradient-to-r from-[#0c0c0e] to-[#121215] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-widest font-mono text-zinc-300">Sprint Planner Agent</h3>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-sans">
            Schedule recommended tasks to calculate immediate estimated project reliability benefits.
          </p>
        </div>
        
        {/* Sprint Estimator Widget */}
        <div className="flex items-center gap-4 px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg">
          <div>
            <div className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Predicted Health</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-bold font-mono tracking-tight text-white">{predictedScore}%</span>
              {estimatedHealthBoost > 0 && (
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium">
                  +{estimatedHealthBoost}%
                </span>
              )}
            </div>
          </div>
          <div className="w-[1px] h-8 bg-zinc-800" />
          <div className="text-[10px] text-zinc-400 max-w-[120px] leading-tight flex items-start gap-1 font-sans">
            <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              {estimatedHealthBoost > 0 ? 'Selected tasks will lift delivery confidence.' : 'Select recommendations to evaluate pipeline gains.'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/60">
        
        {/* Left pane: Selected Backlog Recommendations */}
        <div className="p-6 lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-medium text-zinc-300 font-mono">
              Foresight Recommendations
            </span>
            <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-500 font-mono">
              {activeRecs.length} actionable
            </span>
          </div>

          {activeRecs.length === 0 ? (
            <div className="py-12 text-center rounded-lg border border-dashed border-zinc-800/50 bg-zinc-950/20">
              <Sparkles className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500 font-mono">No active recommendations. Click run analysis.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {activeRecs.map((rec) => {
                const isChecked = scheduledIds.includes(rec.id);
                return (
                  <div 
                    key={rec.id}
                    onClick={() => toggleSchedule(rec.id)}
                    className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-3 select-none ${
                      isChecked 
                        ? 'border-emerald-500/30 bg-emerald-500/[0.02]' 
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40'
                    }`}
                  >
                    <div className="mt-0.5">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked 
                          ? 'bg-emerald-500 border-emerald-400 text-black' 
                          : 'border-zinc-700 bg-zinc-900'
                      }`}>
                        {isChecked && <CheckSquare className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-200 leading-snug">
                          {rec.title}
                        </span>
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                          rec.type === 'pipeline' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : rec.type === 'mr' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : rec.type === 'issues'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {rec.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right pane: Sprint Configuration */}
        <div className="p-6 lg:col-span-5 space-y-5 bg-[#0e0e11]/35">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                Current Sprint Objective
              </label>
              <input
                type="text"
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 text-zinc-200 text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-700 font-sans"
              />
            </div>

            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
                Scheduled Sprint Backlog ({scheduledIds.length})
              </span>
              
              {scheduledIds.length === 0 ? (
                <div className="p-4 text-center rounded border border-dashed border-zinc-900 bg-zinc-950/10">
                  <p className="text-[10px] text-zinc-600 font-mono">
                    Select tasks on the left list to include them in the next deployment sprint.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {scheduledIds.map(id => {
                    const rec = activeRecs.find(r => r.id === id);
                    if (!rec) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 p-2 bg-zinc-900/60 border border-zinc-800 rounded text-xs text-zinc-300 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate flex-1">{rec.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Simulated Sprint Confidence Chart */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/40 rounded-lg space-y-3">
              <div className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Confidenced Metrics Impact</span>
              </div>
              
              <div className="space-y-2">
                {/* Pipeline Stat */}
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>CI/CD Pipeline Success</span>
                    <span className="text-zinc-300 font-semibold">{pipelineImpact ? 'Optimized' : 'Unstable'}</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden mt-1">
                    <div 
                      className={`h-full transition-all duration-500 ${pipelineImpact ? 'bg-emerald-500 w-full' : 'bg-amber-500 w-[62%]'}`} 
                    />
                  </div>
                </div>

                {/* Review Latency */}
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Code Review Latency</span>
                    <span className="text-zinc-300 font-semibold">{reviewImpact ? 'Accelerated' : 'Delayed'}</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden mt-1">
                    <div 
                      className={`h-full transition-all duration-500 ${reviewImpact ? 'bg-emerald-500 w-full' : 'bg-red-500 w-[45%]'}`} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSprint}
              className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold rounded-md shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  Sprint Activated & Scheduled
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-zinc-800" />
                  Activate Iteration Plan
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
