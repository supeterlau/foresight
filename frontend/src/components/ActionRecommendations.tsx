import React, { useState } from 'react';
import { Sparkles, CheckCircle2, EyeOff, Radio, Play, Flame, BarChart2, Check, RefreshCw } from 'lucide-react';
import { Recommendation } from '../types';

interface ActionRecommendationsProps {
  recommendations: Recommendation[];
  onStatusChange: (recId: string, newStatus: 'pending' | 'resolved' | 'dismissed') => void;
  isLoading?: boolean;
}

export default function ActionRecommendations({ recommendations, onStatusChange, isLoading }: ActionRecommendationsProps) {
  const [filterTab, setFilterTab] = useState<'pending' | 'resolved' | 'dismissed'>('pending');

  const filteredRecs = recommendations.filter(r => r.status === filterTab);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'low':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-zinc-400 bg-zinc-800';
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'pipeline':
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case 'mr':
        return <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />;
      case 'issues':
        return <BarChart2 className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl shadow-xl overflow-hidden">
      
      {/* Card Header & Tab Controls */}
      <div className="p-6 border-b border-zinc-805 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-widest font-mono text-zinc-300">Action Recommendations</h3>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-sans">
            Foresight intelligence recommendations sorted by priority and actionable state.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex p-0.5 bg-zinc-950 border border-zinc-850 rounded-lg self-start md:self-auto">
          {(['pending', 'resolved', 'dismissed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-md text-[10.5px] font-mono capitalize transition-all select-none ${
                filterTab === tab
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List content */}
      <div className="divide-y divide-zinc-900">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 text-xs font-mono">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3 text-zinc-600" />
            Updating recommendations state...
          </div>
        ) : filteredRecs.length === 0 ? (
          <div className="p-12 text-center bg-zinc-950/20 text-zinc-500 font-sans">
            <p className="text-xs font-mono">
              No recommendations in the <strong className="text-zinc-400 capitalize">{filterTab}</strong> list.
            </p>
            {filterTab === 'pending' && (
              <p className="text-[10px] text-zinc-600 mt-1 font-sans">
                Excellent! All suggestions have been completed or scheduled.
              </p>
            )}
          </div>
        ) : (
          filteredRecs.map((rec) => (
            <div 
              key={rec.id} 
              className="p-5 hover:bg-zinc-900/30 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 max-w-2xl">
                <span className="p-2 rounded bg-zinc-950 border border-zinc-850 block mt-0.5 shrink-0">
                  {getCategoryIcon(rec.type)}
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      {rec.title}
                    </span>
                    <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border ${getPriorityStyle(rec.priority)}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    {rec.description}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[10px] text-zinc-500 font-mono">
                    <span>Generated on:</span>
                    <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full md:w-auto shrink-0 self-end md:self-auto">
                {filterTab === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onStatusChange(rec.id, 'resolved')}
                      className="flex-1 md:flex-initial h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] font-medium text-zinc-300 transition-all flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Resolve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(rec.id, 'dismissed')}
                      className="flex-1 md:flex-initial h-8 px-3 rounded-md bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-[11px] text-zinc-500 hover:text-zinc-300 transition-all flex items-center justify-center gap-1"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Dismiss</span>
                    </button>
                  </>
                )}

                {filterTab !== 'pending' && (
                  <button
                    type="button"
                    onClick={() => onStatusChange(rec.id, 'pending')}
                    className="flex-1 md:flex-initial h-8 px-3 rounded-md bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-[11px] text-zinc-400 transition-all flex items-center justify-center gap-1"
                  >
                    <span>Revert to Pending</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
