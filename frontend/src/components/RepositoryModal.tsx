import React, { useState } from 'react';
import { X, Globe, GitBranch, Plus, ShieldCheck } from 'lucide-react';

interface RepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (repo: { name: string; owner: string; gitlabUrl: string; projectId: string }) => void;
}

export default function RepositoryModal({ isOpen, onClose, onAdd }: RepositoryModalProps) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com');
  const [projectId, setProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitlabUrl || !projectId) {
      setError('GitLab Instance URL and Project ID are required.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      onAdd({
        name: name || projectId,
        owner: owner || 'Default Group',
        gitlabUrl,
        projectId
      });
      setName('');
      setOwner('');
      setGitlabUrl('https://gitlab.com');
      setProjectId('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add repository');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0e0e11] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase font-display text-zinc-100">
              Monitor New Repository
            </h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/45 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-1.5">
              Project Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. shopflow-core"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#141416]/90 border border-zinc-800 focus:border-zinc-700 rounded-md text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-zinc-100 transition-all font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-1.5">
                Owner / Organization
              </label>
              <input
                type="text"
                placeholder="e.g. Acme SaaS"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-3 py-2 bg-[#141416]/90 border border-zinc-800 focus:border-zinc-700 rounded-md text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-zinc-100 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-1.5">
                Project ID / Target Reference
              </label>
              <input
                type="text"
                placeholder="e.g. shopflow (or 9283472)"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#141416]/90 border border-zinc-800 focus:border-zinc-700 rounded-md text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-zinc-100 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-1.5">
              GitLab Instance URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-600" />
              <input
                type="url"
                placeholder="https://gitlab.com"
                value={gitlabUrl}
                onChange={(e) => setGitlabUrl(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-[#141416]/90 border border-zinc-800 focus:border-zinc-700 rounded-md text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-zinc-100 transition-all font-mono"
              />
            </div>
            <p className="mt-1 text-[10px] text-zinc-500 font-sans">
              Provide your self-hosted company GitLab endpoint or stay defaults.
            </p>
          </div>

          <div className="p-3 bg-[#112] border border-[#223] rounded-md flex items-start gap-2 text-[10.5px] text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              If your repository is private, verify that the <strong>GITLAB_PRIVATE_TOKEN</strong> is specified in the workspace settings. For public mock/sandbox repositories, standard API requests proceed instantly.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 hover:bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-400 hover:text-zinc-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 font-medium text-xs text-zinc-950 rounded-md shadow-lg shadow-emerald-500/10 transition-all"
            >
              {isLoading ? 'Monitoring...' : 'Verify & Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
