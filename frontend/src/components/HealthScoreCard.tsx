import React from 'react';
import { Activity, ShieldAlert, Sparkles, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { ProjectHealthScore, ProjectHealthReport } from '../types';

interface HealthScoreCardProps {
  health: ProjectHealthScore;
  stats?: ProjectHealthReport;
}

export default function HealthScoreCard({ health, stats }: HealthScoreCardProps) {
  const score = health.score;
  const rating = health.rating || 'Fair';

  // Find colors based on rating
  const getRatingColorClass = (rate: string) => {
    switch (rate.toLowerCase()) {
      case 'excellent':
        return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'good':
        return 'text-teal-400 border-teal-500/20 bg-teal-500/5';
      case 'fair':
        return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'poor':
        return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      default:
        return 'text-zinc-400 border-zinc-800 bg-zinc-900/5';
    }
  };

  const getMeterStrokeColor = (rate: string) => {
    switch (rate.toLowerCase()) {
      case 'excellent': return '#10b981'; // Emerald
      case 'good': return '#14b8a6';      // Teal
      case 'fair': return '#f59e0b';      // Amber
      case 'poor': return '#f43f5e';      // Rose
      default: return '#71717a';
    }
  };

  // Circular calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
      
      {/* Background radial highlight */}
      <div className="absolute right-0 top-0 w-48 h-48 bg-zinc-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
        <div className="space-y-4 flex-1">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-widest font-mono text-zinc-300">
                Foresight Health Score
              </h3>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-2xl font-bold font-display tracking-tight text-zinc-100">
                Health Score: {score}/100
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono border font-semibold ${getRatingColorClass(rating)}`}>
                {rating}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            {health.summary}
          </p>

          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 divide-x divide-zinc-900">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Pipeline Status</span>
                <span className="block text-xs font-mono font-bold text-zinc-300">
                  {stats.pipelineStats.successRate}% Success
                </span>
              </div>
              <div className="space-y-1 pl-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Review Code Delivery</span>
                <span className="block text-xs font-mono font-bold text-zinc-300">
                  ~{stats.mrStats.avgMergeTimeDays} Days
                </span>
              </div>
              <div className="space-y-1 pl-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Backlog Resolution</span>
                <span className="block text-xs font-mono font-bold text-zinc-300">
                  {stats.issueStats.avgResolutionDays} Days
                </span>
              </div>
              <div className="space-y-1 pl-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Staff Commit Pace</span>
                <span className="block text-xs font-mono font-bold text-zinc-300">
                  {stats.commitStats.totalCount} Commits
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Visual score gauge */}
        <div className="relative shrink-0 flex items-center justify-center p-2 rounded-xl bg-zinc-950/40 border border-zinc-900">
          <div className="relative w-28 h-28 flex items-center justify-center">
            
            <svg className="w-full h-full transform -rotate-90">
              {/* Outer standard background circle */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-zinc-800"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Real metric radial */}
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke={getMeterStrokeColor(rating)}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Inner score absolute display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
              <span className="text-xl font-bold font-mono tracking-tighter text-zinc-100">
                {score}%
              </span>
              <span className="text-[9px] uppercase font-semibold font-mono tracking-wider text-zinc-500">
                Confidenced
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
