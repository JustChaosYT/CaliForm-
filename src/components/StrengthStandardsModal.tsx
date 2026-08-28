import React, { useState } from 'react';
import { Award, Dumbbell, Trophy, BarChart3, TrendingUp, Zap, HelpCircle, Check } from 'lucide-react';

interface StrengthStandardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BenchmarkItem {
  key: string;
  name: string;
  unit: string;
  beginner: number;
  novice: number;
  intermediate: number;
  advanced: number;
  elite: number;
  tip: string;
}

const BENCHMARKS: BenchmarkItem[] = [
  {
    key: 'pullups',
    name: 'Strict Pull-ups',
    unit: 'reps',
    beginner: 1,
    novice: 6,
    intermediate: 12,
    advanced: 20,
    elite: 30,
    tip: 'Focus on full dead hang at bottom and sternum-to-bar height.',
  },
  {
    key: 'pushups',
    name: 'Strict Push-ups',
    unit: 'reps',
    beginner: 5,
    novice: 18,
    intermediate: 35,
    advanced: 55,
    elite: 80,
    tip: 'Lock out scapulae in protraction on every single rep.',
  },
  {
    key: 'dips',
    name: 'Parallel Bar Dips',
    unit: 'reps',
    beginner: 2,
    novice: 10,
    intermediate: 22,
    advanced: 38,
    elite: 55,
    tip: 'Dip down below 90° elbow flexion with depressed scapulae.',
  },
  {
    key: 'muscleups',
    name: 'Strict Bar Muscle-Ups',
    unit: 'reps',
    beginner: 0,
    novice: 1,
    intermediate: 5,
    advanced: 10,
    elite: 18,
    tip: 'Master high chest-to-bar pullups to minimize transition friction.',
  },
  {
    key: 'lsit',
    name: 'L-Sit Hold Duration',
    unit: 'sec',
    beginner: 3,
    novice: 12,
    intermediate: 25,
    advanced: 45,
    elite: 60,
    tip: 'Depress shoulders downward hard to lift hips higher.',
  },
  {
    key: 'hspu',
    name: 'Wall Handstand Push-ups',
    unit: 'reps',
    beginner: 0,
    novice: 2,
    intermediate: 8,
    advanced: 15,
    elite: 25,
    tip: 'Maintain tripod trajectory: head reaches forward at bottom.',
  },
];

export const StrengthStandardsModal: React.FC<StrengthStandardsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [bodyweight, setBodyweight] = useState<number>(75); // kg
  const [stats, setStats] = useState<Record<string, number>>({
    pullups: 10,
    pushups: 28,
    dips: 16,
    muscleups: 2,
    lsit: 18,
    hspu: 4,
  });

  if (!isOpen) return null;

  const handleStatChange = (key: string, val: number) => {
    setStats((prev) => ({ ...prev, [key]: Math.max(0, val) }));
  };

  const getTier = (item: BenchmarkItem, value: number) => {
    if (value >= item.elite) return { label: 'Elite', color: 'text-amber-300 bg-amber-500/20 border-amber-500/30', score: 100 };
    if (value >= item.advanced) return { label: 'Advanced', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30', score: 80 };
    if (value >= item.intermediate) return { label: 'Intermediate', color: 'text-sky-400 bg-sky-500/20 border-sky-500/30', score: 60 };
    if (value >= item.novice) return { label: 'Novice', color: 'text-teal-400 bg-teal-500/20 border-teal-500/30', score: 40 };
    return { label: 'Beginner', color: 'text-slate-400 bg-slate-800 border-slate-700', score: 20 };
  };

  // Overall Score
  const totalScore = Math.round(
    BENCHMARKS.reduce((acc, b) => acc + getTier(b, stats[b.key] || 0).score, 0) / BENCHMARKS.length
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Calisthenics Strength Standards & Benchmarks
              </h2>
              <p className="text-[11px] text-slate-400">
                Compare your bodyweight records to international gymnastic standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Score Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 p-5 border border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Overall Calisthenics Tier</span>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-2xl font-black text-white">
                  {totalScore >= 85 ? 'Olympic Master' : totalScore >= 70 ? 'Advanced Athlete' : totalScore >= 50 ? 'Solid Intermediate' : 'Developing Novice'}
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/30">
                  {totalScore}/100 Index
                </span>
              </div>
            </div>

            {/* Quick Progress Bar */}
            <div className="w-full sm:w-64">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Power Index</span>
                <span className="font-mono text-emerald-400 font-bold">{totalScore}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Benchmark Items Table */}
          <div className="space-y-3">
            {BENCHMARKS.map((item) => {
              const currentVal = stats[item.key] || 0;
              const tier = getTier(item, currentVal);
              const maxVal = item.elite;
              const percent = Math.min(100, Math.round((currentVal / maxVal) * 100));

              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 transition-all hover:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-white">{item.name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${tier.color}`}>
                        {tier.label}
                      </span>
                    </div>

                    {/* Input Control */}
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-slate-400">Your Record:</label>
                      <input
                        type="number"
                        min="0"
                        value={currentVal}
                        onChange={(e) => handleStatChange(item.key, parseInt(e.target.value) || 0)}
                        className="w-20 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-center font-mono text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400 font-mono">{item.unit}</span>
                    </div>
                  </div>

                  {/* Visual Progress Against Benchmarks */}
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Beg: {item.beginner}</span>
                      <span>Nov: {item.novice}</span>
                      <span>Int: {item.intermediate}</span>
                      <span>Adv: {item.advanced}</span>
                      <span>Elite: {item.elite}+</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    💡 <strong className="text-slate-300">Coach Tip:</strong> {item.tip}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950/60 p-4 text-center">
          <p className="text-xs text-slate-400">
            Benchmarks compiled from Olympic gymnastics physical preparation standards and world calisthenics federations.
          </p>
        </div>
      </div>
    </div>
  );
};
