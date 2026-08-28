import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  User,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ArrowRight,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Routine } from '../types/workout';

interface AICoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGeneratedRoutine?: (routine: Routine) => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface SkillRoadmapStep {
  stepNumber: number;
  stepName: string;
  exerciseName: string;
  masteryCriteria: string;
  keyCue: string;
  recommendedSetsReps: string;
}

interface SkillRoadmap {
  skillName: string;
  overview: string;
  estimatedTimeline: string;
  steps: SkillRoadmapStep[];
  pitfalls: string[];
  weeklySplitRecommendation: string;
}

export const AICoachModal: React.FC<AICoachModalProps> = ({
  isOpen,
  onClose,
  onSaveGeneratedRoutine,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'roadmap'>('chat');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content:
        "Greetings, athlete! I am your AI Biomechanics & Calisthenics Coach. Ask me anything about joint angles, leverage, muscle activation, or injury prevention. What skill or movement would you like to refine today?",
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Roadmap State
  const [targetSkill, setTargetSkill] = useState('Bar Muscle-Up');
  const [currentLevel, setCurrentLevel] = useState('Intermediate (10 strict pullups, 15 dips)');
  const [equipment, setEquipment] = useState('Pull-up bar, Dip station, Floor');
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<SkillRoadmap | null>(null);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const text = customPrompt || chatInput;
    if (!text.trim() || isChatLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/coach-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessages([...newMessages, { role: 'model', content: data.reply }]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'model',
            content: 'I could not connect to the coach server. Please check your network and retry.',
          },
        ]);
      }
    } catch (e) {
      setMessages([
        ...newMessages,
        {
          role: 'model',
          content: 'An error occurred while communicating with the AI coach. Please try again.',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!targetSkill.trim() || isRoadmapLoading) return;
    setIsRoadmapLoading(true);
    setGeneratedRoadmap(null);

    try {
      const res = await fetch('/api/ai/skill-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSkill,
          currentLevel,
          availableEquipment: equipment,
        }),
      });
      const data = await res.json();
      if (data.success && data.roadmap) {
        setGeneratedRoadmap(data.roadmap);
      }
    } catch (e) {
      console.error('Error generating roadmap', e);
    } finally {
      setIsRoadmapLoading(false);
    }
  };

  const handleConvertRoadmapToRoutine = () => {
    if (!generatedRoadmap || !onSaveGeneratedRoutine) return;
    const newRoutine: Routine = {
      id: `ai_roadmap_${Date.now()}`,
      title: `${generatedRoadmap.skillName} Mastery Progression`,
      description: generatedRoadmap.overview,
      category: 'skill',
      level: 'Advanced',
      estimatedMinutes: 25,
      warmupCues: ['Wrist mobilization', 'Scapular pushups/pullups', 'Hollow body hold'],
      createdAt: Date.now(),
      exercises: generatedRoadmap.steps.slice(0, 4).map((step, idx) => ({
        id: `step-${idx}-${Date.now()}`,
        exerciseId: 'pullup', // fallback
        name: step.progressionName || 'Progression Drill',
        category: 'skill',
        targetSets: 3,
        targetReps: 8,
        isHold: false,
        holdDurationSeconds: 15,
        restSeconds: 75,
      })),
    };
    onSaveGeneratedRoutine(newRoutine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-white">AI Biomechanics Coach</h2>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  Gemini Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Form diagnostics, kinesiology consultation, and skill progressions
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setActiveTab('chat')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'chat'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Coach Q&A
              </button>
              <button
                onClick={() => setActiveTab('roadmap')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'roadmap'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Skill Roadmaps
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'chat' ? (
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-950/40">
            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-3 text-xs leading-relaxed ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role === 'model' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl rounded-2xl p-4 shadow-sm ${
                      m.role === 'user'
                        ? 'bg-emerald-500 text-slate-950 font-medium'
                        : 'bg-slate-900 border border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>

                  {m.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isChatLoading && (
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Coach is analyzing biomechanics...</span>
                </div>
              )}
            </div>

            {/* Quick Starters */}
            <div className="flex flex-wrap gap-1.5 border-t border-slate-800/80 bg-slate-900/60 p-3">
              {[
                'How to stop elbow flare during pushups?',
                'Progression checklist for my first strict Muscle-Up',
                'Hollow body vs arched back in strict pullups',
                'How to strengthen wrists for Planche & Handstands',
              ].map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(starter)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
                >
                  💡 {starter}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="border-t border-slate-800 bg-slate-900 p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the coach about form, joint pain, leverage, or routines..."
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 disabled:opacity-40 hover:bg-emerald-400"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Roadmap Tab */
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase">Target Skill</label>
                <select
                  value={targetSkill}
                  onChange={(e) => setTargetSkill(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Bar Muscle-Up">Bar Muscle-Up</option>
                  <option value="Full Front Lever">Full Front Lever</option>
                  <option value="Full Planche">Full Planche</option>
                  <option value="Strict Handstand Pushup">Strict Handstand Pushup</option>
                  <option value="Dragon Flag">Dragon Flag (Bruce Lee)</option>
                  <option value="Human Flag">Human Flag</option>
                  <option value="Single-Arm Pull-up">Single-Arm Pull-up</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase">Current Baseline</label>
                <input
                  type="text"
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(e.target.value)}
                  placeholder="e.g., 10 pullups, 15 dips"
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase">Equipment</label>
                <input
                  type="text"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="e.g., Pullup bar, rings, dip bars"
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateRoadmap}
              disabled={isRoadmapLoading}
              className="flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-95 disabled:opacity-40"
            >
              {isRoadmapLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Engineering Biomechanical Skill Roadmap...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate 5-Step Master Progression Roadmap</span>
                </>
              )}
            </button>

            {/* Generated Roadmap Output */}
            {generatedRoadmap && (
              <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{generatedRoadmap.skillName} Mastery Path</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{generatedRoadmap.overview}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                    Est. {generatedRoadmap.estimatedTimeline}
                  </span>
                </div>

                {/* 5 Steps */}
                <div className="space-y-3">
                  {generatedRoadmap.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="flex items-start gap-4 rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 text-xs"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono font-bold text-emerald-400 border border-emerald-500/30">
                        {step.stepNumber}
                      </span>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white">{step.stepName}</h4>
                          <span className="font-mono text-emerald-400">{step.recommendedSetsReps}</span>
                        </div>
                        <p className="text-slate-300">
                          <strong className="text-slate-400">Mastery Criteria:</strong> {step.masteryCriteria}
                        </p>
                        <p className="text-slate-400">
                          <strong className="text-slate-500">Key Cue:</strong> {step.keyCue}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pitfalls & Split */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs">
                    <span className="flex items-center space-x-1.5 font-bold text-amber-300 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Injury Pitfalls to Avoid</span>
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {generatedRoadmap.pitfalls.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs">
                    <span className="flex items-center space-x-1.5 font-bold text-slate-200 mb-2">
                      <Calendar className="h-4 w-4 text-emerald-400" />
                      <span>Weekly Training Split</span>
                    </span>
                    <p className="text-slate-400 leading-relaxed">
                      {generatedRoadmap.weeklySplitRecommendation}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleConvertRoadmapToRoutine}
                    className="flex items-center space-x-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                  >
                    <span>Save Roadmap as Custom Workout Routine</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
