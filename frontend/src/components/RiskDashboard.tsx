import React from 'react';
import { AlertOctagon, Users, ShieldAlert, Zap, Clock, Info } from 'lucide-react';
import { RiskAnalysis } from '../types';

interface RiskDashboardProps {
  risks: RiskAnalysis[];
}

export default function RiskDashboard({ risks }: RiskDashboardProps) {
  
  const getRiskIcon = (title: string, severity: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('bus factor')) {
      return <Users className="w-4 h-4 text-rose-400" />;
    }
    if (titleLower.includes('pipeline') || titleLower.includes('build') || titleLower.includes('stable')) {
      return <ShieldAlert className="w-4 h-4 text-amber-400" />;
    }
    if (titleLower.includes('prolonged') || titleLower.includes('cycle') || titleLower.includes('time') || titleLower.includes('latency')) {
      return <Clock className="w-4 h-4 text-blue-400" />;
    }
    return <AlertOctagon className="w-4 h-4 text-zinc-400" />;
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-rose-950/40 bg-rose-950/10 text-rose-400';
      case 'medium':
        return 'border-amber-950/40 bg-amber-950/10 text-amber-400';
      case 'low':
        return 'border-blue-950/40 bg-blue-950/10 text-blue-400';
      default:
        return 'border-zinc-850 bg-zinc-900/10 text-zinc-400';
    }
  };

  return (
    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-semibold uppercase tracking-widest font-mono text-zinc-300">Operational Risk Dashboard</h3>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-sans">
            Continuous scans for development vulnerability indicators, knowledge silos, and delivery blocks.
          </p>
        </div>
        
        <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
          Foresight Engine Live
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {risks.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 py-10 text-center rounded-lg border border-dashed border-zinc-800/50 bg-zinc-950/10">
            <Info className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 font-mono">No risks detected. Run analysis to trigger risk audits.</p>
          </div>
        ) : (
          risks.map((risk, index) => {
            const isHigh = risk.severity === 'high';
            const isMed = risk.severity === 'medium';
            
            return (
              <div 
                key={index} 
                className={`p-4 border rounded-lg transition-all flex flex-col justify-between space-y-3.5 bg-gradient-to-b from-zinc-950/70 to-zinc-950/20 ${
                  isHigh 
                    ? 'border-rose-900/30 shadow-lg shadow-rose-950/[0.02]' 
                    : isMed 
                    ? 'border-amber-900/30' 
                    : 'border-zinc-800/80'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded bg-zinc-900 border border-zinc-800/50">
                        {getRiskIcon(risk.title, risk.severity)}
                      </span>
                      <h4 className="text-xs font-semibold text-zinc-200 tracking-tight leading-snug">
                        {risk.title}
                      </h4>
                    </div>
                    
                    <span className={`text-[8.5px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border ${getSeverityStyle(risk.severity)}`}>
                      {risk.severity}
                    </span>
                  </div>
                  
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    {risk.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Probability Metric:</span>
                  <span className={isHigh ? 'text-rose-400 font-medium' : isMed ? 'text-amber-400/90' : 'text-blue-400'}>
                    {isHigh ? '85%' : isMed ? '55%' : '15%'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {risks.some(r => r.severity === 'high') && (
        <div className="p-3 bg-red-950/15 border border-red-900/30 rounded-lg flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[10.5px] text-red-300 leading-normal font-sans">
            <strong>Critical Alert:</strong> High Bus Factor / Branch stability risks identified. It is highly recommended to allocate cross-training tickets and prioritize build pipeline consolidation in the upcoming sprint.
          </p>
        </div>
      )}
    </div>
  );
}
