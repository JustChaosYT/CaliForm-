import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Lock,
  Flame,
  Zap,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Shield,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Routine } from '../types/workout';
import { CALISTHENICS_EXERCISES } from '../data/calisthenicsLibrary';

export interface SkillNode {
  id: string;
  name: string;
  category: 'push' | 'pull' | 'core' | 'statics' | 'legs';
  tier: 1 | 2 | 3 | 4 | 5;
  points: number;
  description: string;
  prerequisite?: string;
  masteryGoal: string;
  keyCue: string;
  exerciseId?: string;
}

const SKILL_TREE_DATA: SkillNode[] = [
  // PUSH
  {
    id: 'push_1',
    name: 'Knee / Incline Pushup',
    category: 'push',
    tier: 1,
    points: 10,
    description: 'Foundation for horizontal pushing and core brace.',
    masteryGoal: '3 sets of 15 strict reps',
    keyCue: 'Keep elbows tucked at 45° and core rigid.',
    exerciseId: 'pushup',
  },
  {
    id: 'push_2',
    name: 'Standard Strict Pushup',
    category: 'push',
    tier: 2,
    points: 20,
    description: 'Full chest-to-deck bodyweight standard.',
    masteryGoal: '3 sets of 20 full-depth reps',
    keyCue: 'Protracted scapulae at top, full depth at bottom.',
    exerciseId: 'pushup',
  },
  {
    id: 'push_3',
    name: 'Diamond & Archer Pushup',
    category: 'push',
    tier: 3,
    points: 35,
    description: 'Triceps isolation and unilateral push progression.',
    masteryGoal: '3 sets of 12 reps per side',
    keyCue: 'Maintain hollow body, lean into working arm.',
    exerciseId: 'diamond_pushup',
  },
  {
    id: 'push_4',
    name: 'Parallel Bar Dips',
    category: 'push',
    tier: 3,
    points: 40,
    description: 'Vertical pushing strength for chest and triceps.',
    masteryGoal: '3 sets of 15 reps past 90°',
    keyCue: 'Slight forward lean, depress shoulders throughout.',
    exerciseId: 'dips',
  },
  {
    id: 'push_5',
    name: 'Pike Pushup / Elevated Pike',
    category: 'push',
    tier: 4,
    points: 50,
    description: 'Overhead vertical pressing for shoulder hypertrophy.',
    masteryGoal: '3 sets of 10 head-to-floor reps',
    keyCue: 'Head moves forward into a tripod at bottom.',
    exerciseId: 'pike_pushup',
  },
  {
    id: 'push_6',
    name: 'Wall Handstand Pushup',
    category: 'push',
    tier: 5,
    points: 80,
    description: 'Full overhead bodyweight pressing power.',
    masteryGoal: '3 sets of 6 strict reps',
    keyCue: 'Full shoulder lock at top, hollow body against wall.',
    exerciseId: 'pike_pushup',
  },

  // PULL
  {
    id: 'pull_1',
    name: 'Dead Hang & Scapular Pulls',
    category: 'pull',
    tier: 1,
    points: 10,
    description: 'Grip endurance and active shoulder depression.',
    masteryGoal: '60s active dead hang',
    keyCue: 'Depress scapula without bending elbows.',
    exerciseId: 'pullup',
  },
  {
    id: 'pull_2',
    name: 'Inverted Bodyweight Row',
    category: 'pull',
    tier: 2,
    points: 20,
    description: 'Horizontal pull foundation for upper back and lats.',
    masteryGoal: '3 sets of 12 chest-to-bar reps',
    keyCue: 'Retract shoulder blades, pull chest to bar.',
    exerciseId: 'australian_pullup',
  },
  {
    id: 'pull_3',
    name: 'Strict Pull-up / Chin-up',
    category: 'pull',
    tier: 3,
    points: 40,
    description: 'The golden standard of upper body pulling strength.',
    masteryGoal: '3 sets of 10 full dead-hang reps',
    keyCue: 'Chin fully over bar, dead hang at bottom with zero kip.',
    exerciseId: 'pullup',
  },
  {
    id: 'pull_4',
    name: 'Chest-to-Bar High Pull-up',
    category: 'pull',
    tier: 4,
    points: 60,
    description: 'Explosive vertical pulling power for muscle-up transition.',
    masteryGoal: '3 sets of 6 explosive reps to sternum',
    keyCue: 'Drive elbows down and back aggressively.',
    exerciseId: 'pullup',
  },
  {
    id: 'pull_5',
    name: 'Bar Muscle-Up',
    category: 'pull',
    tier: 5,
    points: 100,
    description: 'Mastery transition from pull to dip in one fluid motion.',
    masteryGoal: '5 strict consecutive clean reps',
    keyCue: 'High explosive pull, lean chest forward over bar, press out.',
    exerciseId: 'pullup',
  },

  // CORE
  {
    id: 'core_1',
    name: 'Standard Plank & Hollow Body',
    category: 'core',
    tier: 1,
    points: 10,
    description: 'Anterior chain isometric stability.',
    masteryGoal: '60s unbroken strict hold',
    keyCue: 'Posterior pelvic tilt, squeeze glutes and quads.',
    exerciseId: 'plank',
  },
  {
    id: 'core_2',
    name: 'Hanging Knee Raises',
    category: 'core',
    tier: 2,
    points: 20,
    description: 'Decompress spine while activating lower rectus abdominis.',
    masteryGoal: '3 sets of 15 controlled reps',
    keyCue: 'Avoid swinging, lift knees to chest with hips flexing.',
    exerciseId: 'hanging_leg_raise',
  },
  {
    id: 'core_3',
    name: 'Hanging Straight Leg Raise',
    category: 'core',
    tier: 3,
    points: 40,
    description: 'Full hip flexion and compression strength.',
    masteryGoal: '3 sets of 10 strict toes-to-bar reps',
    keyCue: 'Point toes, straight knees, controlled eccentric return.',
    exerciseId: 'hanging_leg_raise',
  },
  {
    id: 'core_4',
    name: 'Dragon Flag (Bruce Lee)',
    category: 'core',
    tier: 4,
    points: 70,
    description: 'Legendary full-body lever core power.',
    masteryGoal: '3 sets of 5 strict slow reps',
    keyCue: 'Body stays in rigid straight line from shoulders to toes.',
    exerciseId: 'plank',
  },

  // STATICS
  {
    id: 'stat_1',
    name: 'Tuck L-Sit / Parallel Bar L-Sit',
    category: 'statics',
    tier: 2,
    points: 25,
    description: 'Shoulder depression and hip flexor compression.',
    masteryGoal: '30s clean hold with knees locked',
    keyCue: 'Depress shoulders down hard, push ground away.',
    exerciseId: 'l_sit',
  },
  {
    id: 'stat_2',
    name: 'Tuck Planche & Planche Lean',
    category: 'statics',
    tier: 3,
    points: 45,
    description: 'Straight-arm scapular protraction and anterior delt load.',
    masteryGoal: '20s clean hold',
    keyCue: 'Max protraction, lean forward until feet float.',
    exerciseId: 'plank',
  },
  {
    id: 'stat_3',
    name: 'Tuck Front Lever',
    category: 'statics',
    tier: 4,
    points: 60,
    description: 'Straight-arm lat pulling power in horizontal plane.',
    masteryGoal: '20s flat-back tuck hold',
    keyCue: 'Retract and depress scapulae, pull bar to hips.',
    exerciseId: 'australian_pullup',
  },
  {
    id: 'stat_4',
    name: 'Full Front Lever / Full Planche',
    category: 'statics',
    tier: 5,
    points: 120,
    description: 'The pinnacle of gymnastics and calisthenics statics.',
    masteryGoal: '10s pristine straight-body hold',
    keyCue: 'Total body tension, zero hip sag or pike.',
    exerciseId: 'plank',
  },

  // LEGS
  {
    id: 'legs_1',
    name: 'Air Squat & Jump Squat',
    category: 'legs',
    tier: 1,
    points: 10,
    description: 'Full depth knee and hip mobility foundation.',
    masteryGoal: '3 sets of 25 below-parallel reps',
    keyCue: 'Knees track over toes, chest up.',
    exerciseId: 'squat',
  },
  {
    id: 'legs_2',
    name: 'Bulgarian Split Squat',
    category: 'legs',
    tier: 2,
    points: 25,
    description: 'Unilateral leg strength and hip stability.',
    masteryGoal: '3 sets of 12 reps per leg',
    keyCue: 'Deep knee bend, keep torso tall.',
    exerciseId: 'squat',
  },
  {
    id: 'legs_3',
    name: 'Pistol Squat (Single Leg)',
    category: 'legs',
    tier: 4,
    points: 60,
    description: 'True unilateral bodyweight leg mastery and ankle mobility.',
    masteryGoal: '3 sets of 8 strict reps per leg',
    keyCue: 'Opposite leg extended straight forward, descend smoothly.',
    exerciseId: 'squat',
  },
];

interface SkillTreeMatrixProps {
  onPracticeSkill?: (exerciseId: string) => void;
  onStartSkillPractice?: (routine: Routine) => void;
  onOpenAICoach?: () => void;
  onOpenStrengthStandards?: () => void;
}

export const SkillTreeMatrix: React.FC<SkillTreeMatrixProps> = ({
  onPracticeSkill,
  onStartSkillPractice,
  onOpenAICoach,
  onOpenStrengthStandards,
}) => {
  const [unlockedSkills, setUnlockedSkills] = useState<Record<string, 'locked' | 'in_progress' | 'mastered'>>(() => {
    try {
      const saved = localStorage.getItem('caliform_skill_tree_progress');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading skill tree', e);
    }
    // Default initial unlocked skills
    return {
      push_1: 'mastered',
      push_2: 'in_progress',
      pull_1: 'mastered',
      pull_2: 'in_progress',
      core_1: 'mastered',
      legs_1: 'mastered',
      legs_2: 'in_progress',
    };
  });

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'push' | 'pull' | 'core' | 'statics' | 'legs'>('all');
  const [activeSkillModal, setActiveSkillModal] = useState<SkillNode | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('caliform_skill_tree_progress', JSON.stringify(unlockedSkills));
    } catch (e) {
      console.warn('Error saving skill tree', e);
    }
  }, [unlockedSkills]);

  // Calculations
  const totalPossiblePoints = SKILL_TREE_DATA.reduce((acc, s) => acc + s.points, 0);
  const earnedPoints = SKILL_TREE_DATA.reduce((acc, s) => {
    const status = unlockedSkills[s.id];
    if (status === 'mastered') return acc + s.points;
    if (status === 'in_progress') return acc + Math.floor(s.points * 0.4);
    return acc;
  }, 0);

  const masteryPercent = Math.round((earnedPoints / totalPossiblePoints) * 100);

  // Determine Calisthenics Athlete Title / Tier
  let athleteTitle = 'Novice Practitioner';
  let tierBadgeColor = 'text-slate-400 bg-slate-800';
  if (masteryPercent >= 80) {
    athleteTitle = 'Olympic Beast / Master';
    tierBadgeColor = 'text-amber-300 bg-amber-500/20 ring-1 ring-amber-500/50';
  } else if (masteryPercent >= 55) {
    athleteTitle = 'Advanced Calisthenics Athlete';
    tierBadgeColor = 'text-emerald-300 bg-emerald-500/20 ring-1 ring-emerald-500/50';
  } else if (masteryPercent >= 30) {
    athleteTitle = 'Intermediate Striker';
    tierBadgeColor = 'text-sky-300 bg-sky-500/20 ring-1 ring-sky-500/50';
  } else if (masteryPercent >= 15) {
    athleteTitle = 'Adept Trainee';
    tierBadgeColor = 'text-teal-300 bg-teal-500/20 ring-1 ring-teal-500/50';
  }

  // Category point breakdown
  const categoryScores = {
    push: calculateCategoryMastery('push'),
    pull: calculateCategoryMastery('pull'),
    core: calculateCategoryMastery('core'),
    statics: calculateCategoryMastery('statics'),
    legs: calculateCategoryMastery('legs'),
  };

  function calculateCategoryMastery(cat: string): number {
    const catSkills = SKILL_TREE_DATA.filter((s) => s.category === cat);
    const catMax = catSkills.reduce((acc, s) => acc + s.points, 0);
    const catEarned = catSkills.reduce((acc, s) => {
      const status = unlockedSkills[s.id];
      if (status === 'mastered') return acc + s.points;
      if (status === 'in_progress') return acc + Math.floor(s.points * 0.4);
      return acc;
    }, 0);
    return catMax > 0 ? Math.round((catEarned / catMax) * 100) : 0;
  }

  const toggleSkillStatus = (id: string) => {
    setUnlockedSkills((prev) => {
      const current = prev[id] || 'locked';
      const next = current === 'locked' ? 'in_progress' : current === 'in_progress' ? 'mastered' : 'locked';
      return { ...prev, [id]: next };
    });
  };

  const handleLaunchPractice = (skill: SkillNode) => {
    if (onPracticeSkill && skill.exerciseId) {
      setActiveSkillModal(null);
      onPracticeSkill(skill.exerciseId);
      return;
    }

    const exId = skill.exerciseId || 'pushup';
    const exDef = CALISTHENICS_EXERCISES.find((e) => e.id === exId) || CALISTHENICS_EXERCISES[0];
    const mappedCategory = skill.category === 'statics' ? 'skill' : (skill.category as any);
    const quickRoutine: Routine = {
      id: `practice_${skill.id}_${Date.now()}`,
      title: `${skill.name} Mastery Practice`,
      description: `Targeted session focused on unlocking ${skill.name}. Focus: ${skill.keyCue}`,
      category: mappedCategory,
      level: skill.tier >= 4 ? 'Advanced' : skill.tier >= 3 ? 'Intermediate' : 'Beginner',
      estimatedMinutes: 12,
      warmupCues: ['Joint rotations', 'Targeted muscle activation', 'Tendon warm-up'],
      createdAt: Date.now(),
      exercises: [
        {
          id: `ex-${skill.id}-${Date.now()}`,
          exerciseId: exDef.id,
          name: skill.name,
          category: mappedCategory,
          targetSets: 4,
          targetReps: exDef.isHold ? 0 : 8,
          isHold: exDef.isHold,
          holdDurationSeconds: exDef.isHold ? 20 : 0,
          restSeconds: 60,
        },
      ],
    };
    setActiveSkillModal(null);
    if (onStartSkillPractice) {
      onStartSkillPractice(quickRoutine);
    }
  };

  const filteredSkills =
    selectedCategory === 'all'
      ? SKILL_TREE_DATA
      : SKILL_TREE_DATA.filter((s) => s.category === selectedCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Top Banner & Power Level Showcase */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center space-x-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                <Flame className="h-3.5 w-3.5" />
                <span>CALISTHENICS MASTERY MATRIX</span>
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${tierBadgeColor}`}>
                {athleteTitle}
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
              Skill Progression & Power Tree
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Track your journey from foundational pushups and dead hangs to Olympic-level Muscle-Ups, Dragon Flags, and Planche. Click any node to log mastery or launch live camera practice.
            </p>
          </div>

          {/* Master Progress Ring & Stats */}
          <div className="flex items-center gap-6 rounded-2xl bg-slate-950/80 p-4 sm:p-5 border border-slate-800">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-700 ease-out"
                  strokeDasharray={`${masteryPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-base font-black text-white">{masteryPercent}%</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase">Mastery</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Power Points:</span>
                <span className="font-mono font-bold text-emerald-400">{earnedPoints} / {totalPossiblePoints}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Mastered Skills:</span>
                <span className="font-mono font-bold text-white">
                  {Object.values(unlockedSkills).filter((v) => v === 'mastered').length} / {SKILL_TREE_DATA.length}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">In Training:</span>
                <span className="font-mono font-bold text-amber-400">
                  {Object.values(unlockedSkills).filter((v) => v === 'in_progress').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Mastery Balance Bars */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5 border-t border-slate-800/80 pt-5">
          {(['push', 'pull', 'core', 'statics', 'legs'] as const).map((cat) => (
            <div key={cat} className="rounded-xl bg-slate-950/50 p-2.5 border border-slate-800/60">
              <div className="flex items-center justify-between text-[11px] font-bold capitalize text-slate-300">
                <span>{cat}</span>
                <span className="font-mono text-emerald-400">{categoryScores[cat]}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${categoryScores[cat]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'push', 'pull', 'core', 'statics', 'legs'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'all' ? 'All Skills' : `${cat} Tree`}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Mastered</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>In Training</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span>Locked</span>
          </span>
        </div>
      </div>

      {/* Skill Nodes Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSkills.map((skill) => {
          const status = unlockedSkills[skill.id] || 'locked';

          let borderClass = 'border-slate-800 bg-slate-900/60 opacity-80';
          let statusBadge = (
            <span className="flex items-center space-x-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              <Lock className="h-3 w-3" />
              <span>Locked</span>
            </span>
          );

          if (status === 'mastered') {
            borderClass = 'border-emerald-500/40 bg-slate-900/90 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20';
            statusBadge = (
              <span className="flex items-center space-x-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Mastered</span>
              </span>
            );
          } else if (status === 'in_progress') {
            borderClass = 'border-amber-500/40 bg-slate-900/90 ring-1 ring-amber-500/20';
            statusBadge = (
              <span className="flex items-center space-x-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>In Training</span>
              </span>
            );
          }

          return (
            <div
              key={skill.id}
              id={`skill-card-${skill.id}`}
              onClick={() => setActiveSkillModal(skill)}
              className={`group flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all hover:scale-[1.01] hover:border-emerald-500/50 ${borderClass}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-slate-950 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-slate-800">
                    Tier {skill.tier} • {skill.category}
                  </span>
                  {statusBadge}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {skill.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                    {skill.description}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950/70 p-2.5 border border-slate-800/80 text-xs">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Mastery Criteria:</span>
                  <span className="font-semibold text-slate-200">{skill.masteryGoal}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                <span className="font-mono text-emerald-400 font-bold">+{skill.points} PTS</span>
                <span className="flex items-center space-x-1 text-slate-400 group-hover:text-emerald-400 transition-colors font-semibold">
                  <span>View Details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Skill Detail Modal */}
      {activeSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-400 border border-emerald-500/20">
                  Tier {activeSkillModal.tier} • {activeSkillModal.category.toUpperCase()}
                </span>
                <h2 className="mt-2 text-xl font-extrabold text-white">{activeSkillModal.name}</h2>
              </div>
              <button
                onClick={() => setActiveSkillModal(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{activeSkillModal.description}</p>

            <div className="space-y-3 rounded-2xl bg-slate-950 p-4 border border-slate-800 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Mastery Standard</span>
                <span className="font-semibold text-emerald-400">{activeSkillModal.masteryGoal}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Key Biomechanical Cue</span>
                <span className="text-slate-200">{activeSkillModal.keyCue}</span>
              </div>
            </div>

            {/* Status Switcher */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Current Status</span>
                <button
                  onClick={() => toggleSkillStatus(activeSkillModal.id)}
                  className="mt-1 flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="capitalize">
                    {unlockedSkills[activeSkillModal.id] ? unlockedSkills[activeSkillModal.id].replace('_', ' ') : 'Locked'} (Click to cycle)
                  </span>
                </button>
              </div>

              <button
                id="launch-skill-practice-btn"
                onClick={() => handleLaunchPractice(activeSkillModal)}
                className="flex items-center space-x-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
              >
                <Play className="h-3.5 w-3.5 fill-slate-950" />
                <span>Practice with AI Camera</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
