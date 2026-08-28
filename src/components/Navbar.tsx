import React from 'react';
import {
  Activity,
  Dumbbell,
  PlayCircle,
  BookOpen,
  History,
  Volume2,
  Video,
  Flame,
  Bot,
  Trophy,
} from 'lucide-react';

export type AppTab = 'routines' | 'live' | 'playback' | 'skills' | 'library' | 'history';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isWorkoutActive: boolean;
  hasRecordedSession: boolean;
  onOpenAudioSettings: () => void;
  onOpenAICoach?: () => void;
  onOpenStrengthStandards?: () => void;
  isCameraActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isWorkoutActive,
  hasRecordedSession,
  onOpenAudioSettings,
  onOpenAICoach,
  onOpenStrengthStandards,
  isCameraActive,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
        {/* Brand / Logo */}
        <div
          id="app-brand"
          className="flex cursor-pointer items-center space-x-2.5"
          onClick={() => setActiveTab('routines')}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-md shadow-emerald-500/20">
            <Activity className="h-5 w-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-sm font-bold tracking-tight text-white sm:text-base">
                CALI<span className="text-emerald-400">FORM</span>.AI
              </span>
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                PRO COACH
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-1.5">
          <button
            id="nav-tab-routines"
            onClick={() => setActiveTab('routines')}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'routines'
                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Routines</span>
          </button>

          <button
            id="nav-tab-skills"
            onClick={() => setActiveTab('skills')}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'skills'
                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Skill Tree</span>
          </button>

          <button
            id="nav-tab-live"
            onClick={() => setActiveTab('live')}
            className={`relative flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'live'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                : isWorkoutActive
                ? 'bg-emerald-500/20 text-emerald-300 animate-pulse ring-1 ring-emerald-500'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>Live Vision</span>
            {isWorkoutActive && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
            )}
          </button>

          <button
            id="nav-tab-playback"
            onClick={() => setActiveTab('playback')}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'playback'
                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                : hasRecordedSession
                ? 'text-emerald-300 hover:bg-slate-900'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Playback</span>
            <span className="md:hidden">Review</span>
          </button>

          <button
            id="nav-tab-library"
            onClick={() => setActiveTab('library')}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'library'
                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Library</span>
          </button>

          <button
            id="nav-tab-history"
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Analytics</span>
          </button>
        </nav>

        {/* Action Tools: AI Coach, Strength Standards, Audio */}
        <div className="flex items-center space-x-1.5">
          {onOpenAICoach && (
            <button
              id="btn-ai-coach"
              onClick={onOpenAICoach}
              title="Ask AI Biomechanics Coach & Generate Skill Roadmaps"
              className="flex items-center space-x-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all"
            >
              <Bot className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">AI Coach</span>
            </button>
          )}

          {onOpenStrengthStandards && (
            <button
              id="btn-strength-standards"
              onClick={onOpenStrengthStandards}
              title="Calisthenics Strength Standards & Benchmarks"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-amber-500/40 hover:text-amber-300"
            >
              <Trophy className="h-3.5 w-3.5" />
            </button>
          )}

          {isCameraActive && (
            <div className="flex items-center space-x-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-500/30">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-red-500" />
              <span>REC</span>
            </div>
          )}

          <button
            id="btn-audio-settings"
            onClick={onOpenAudioSettings}
            title="Audio Voice Coach Settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-white"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
