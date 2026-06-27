import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, Sparkles, AlertTriangle, ShieldCheck, HelpCircle, 
  RefreshCw, CheckCircle2, XCircle, Info, Flame, Trash2, 
  ArrowRight, ShieldAlert, Zap, Globe, Lightbulb, Heart, Play
} from "lucide-react";

interface CleanlinessGameProps {
  currentUserId: string;
  onRewardXP?: (xpAmount: number) => void;
}

// GAME 1: WASTESORTER TYPE DEFINITIONS
interface WasteItem {
  id: string;
  name: string;
  emoji: string;
  category: "biodegradable" | "recyclable" | "e-waste" | "hazardous";
  fact: string;
}

const WASTE_ITEMS: WasteItem[] = [
  { id: "1", name: "Banana Peel", emoji: "🍌", category: "biodegradable", fact: "Organic waste decomposes in weeks and turns into nutrient-rich compost!" },
  { id: "2", name: "Plastic Soda Bottle", emoji: "🍾", category: "recyclable", fact: "Plastics can take up to 450 years to decompose in a landfill. Recycling it is crucial!" },
  { id: "3", name: "Dead Alkaline Battery", emoji: "🔋", category: "e-waste", fact: "Batteries contain toxic heavy metals. They must be collected separately as e-waste to avoid soil contamination." },
  { id: "4", name: "Expired Medicines", emoji: "💊", category: "hazardous", fact: "Chemical pharmaceutical waste should never be flushed; it pollutes water tables." },
  { id: "5", name: "Apple Core", emoji: "🍎", category: "biodegradable", fact: "Rotting organic matter in landfills releases methane, but composting converts it safely!" },
  { id: "6", name: "Cardboard Box", emoji: "📦", category: "recyclable", fact: "Recycling 1 ton of paper/cardboard saves approximately 17 mature trees!" },
  { id: "7", name: "Broken Glass Bottle", emoji: "🍾", category: "recyclable", fact: "Glass can be recycled infinitely without losing its quality or purity!" },
  { id: "8", name: "Old Smart Phone", emoji: "📱", category: "e-waste", fact: "Electronics contain precious metals like gold and copper which can be safely extracted and reused." },
  { id: "9", name: "Leftover Rice", emoji: "🍚", category: "biodegradable", fact: "Wet food waste makes up nearly 60% of municipal trash in developing countries." },
  { id: "10", name: "Aerosol Spray Can", emoji: "💨", category: "hazardous", fact: "Pressurized spray cans are highly flammable and require specialized chemical processing." },
  { id: "11", name: "Torn Newspaper", emoji: "📰", category: "recyclable", fact: "Recycling paper uses 70% less energy compared to manufacturing raw wood pulp." },
  { id: "12", name: "Computer Mouse", emoji: "🖱️", category: "e-waste", fact: "E-waste is the fastest-growing solid waste stream in the world." }
];

// GAME 2: CIVIC TRIVIA TYPE DEFINITIONS
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "Which color code is universally used for 'Biodegradable (Wet)' waste collection bins?",
    options: ["Green Bin", "Blue Bin", "Yellow Bin", "Red Bin"],
    correctIdx: 0,
    explanation: "Green bins are allocated for organic, biodegradable wet waste like vegetable scraps, leftover food, and garden leaves."
  },
  {
    id: "q2",
    question: "What is the critical penalty for open trash burning in residential areas under clean air regulations?",
    options: ["It is encouraged for quick disposal", "It is illegal as it releases dangerous dioxins", "It is only allowed on weekends", "No penalty exists"],
    correctIdx: 1,
    explanation: "Open trash burning is strictly illegal. It generates heavy particulate matter and carcinogenic dioxins, directly damaging public health."
  },
  {
    id: "q3",
    question: "How long does a standard aluminum beverage can take to naturally decompose if thrown in public spaces?",
    options: ["10 years", "50 years", "80 to 200 years", "Never"],
    correctIdx: 2,
    explanation: "Aluminum cans do not rust away easily. They remain intact in soils and landfills for 80 to 200 years unless recycled."
  },
  {
    id: "q4",
    question: "What is the best household strategy to implement 'Source Segregation' effectively?",
    options: [
      "Keep food leftovers and dry paper in the exact same bin",
      "Maintain separate bins for wet, dry recyclable, and domestic hazardous waste",
      "Dump everything outside and let the municipal sweepers sort it",
      "Burn plastics weekly in the backyard"
    ],
    correctIdx: 1,
    explanation: "Segregating waste right at the source (your home) ensures recyclable materials don't get contaminated by wet organic matter."
  },
  {
    id: "q5",
    question: "Why should we avoid throwing cooking oils or grease down the kitchen sink drain?",
    options: [
      "It makes the sink look shiny",
      "It hardens in sewers to form 'fatbergs' that choke municipal drain pipes",
      "It cleans the pipelines",
      "It breeds healthy river fish"
    ],
    correctIdx: 1,
    explanation: "Pouring fats, oils, and grease down sinks chokes domestic plumbing and merges with other trash to form toxic sewer blocks called 'fatbergs'."
  }
];

export default function CleanlinessGame({ currentUserId, onRewardXP }: CleanlinessGameProps) {
  const [activeGame, setActiveGame] = useState<"menu" | "sorter" | "quiz">("menu");
  const [userXPEarned, setUserXPEarned] = useState(0);

  // ==========================================
  // GAME 1: ECO-SORTER STATES
  // ==========================================
  const [sorterItems, setSorterItems] = useState<WasteItem[]>([]);
  const [currentSorterIdx, setCurrentSorterIdx] = useState(0);
  const [sorterScore, setSorterScore] = useState(0);
  const [sorterFeedback, setSorterFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);
  const [sorterLives, setSorterLives] = useState(3);
  const [sorterFinished, setSorterFinished] = useState(false);
  const [sorterStreak, setSorterStreak] = useState(0);

  // ==========================================
  // GAME 2: CIVIC TRIVIA STATES
  // ==========================================
  const [quizQuestionsList, setQuizQuestionsList] = useState<QuizQuestion[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  // Initialize Sorter Game
  const startSorterGame = () => {
    // Shuffle waste items
    const shuffled = [...WASTE_ITEMS].sort(() => Math.random() - 0.5);
    setSorterItems(shuffled.slice(0, 8)); // 8 items to sort per session
    setCurrentSorterIdx(0);
    setSorterScore(0);
    setSorterLives(3);
    setSorterStreak(0);
    setSorterFeedback(null);
    setSorterFinished(false);
    setActiveGame("sorter");
  };

  // Initialize Quiz Game
  const startQuizGame = () => {
    const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
    setQuizQuestionsList(shuffled);
    setCurrentQuizIdx(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setQuizAnswered(false);
    setQuizFinished(false);
    setActiveGame("quiz");
  };

  // Sorter Core Mechanics
  const handleSortItem = (binCategory: "biodegradable" | "recyclable" | "e-waste" | "hazardous") => {
    if (sorterFeedback || sorterFinished) return;

    const currentItem = sorterItems[currentSorterIdx];
    const isCorrect = currentItem.category === binCategory;

    if (isCorrect) {
      setSorterScore(prev => prev + 10);
      setSorterStreak(prev => prev + 1);
      setSorterFeedback({
        isCorrect: true,
        text: `Correct! ${currentItem.emoji} ${currentItem.name} goes into ${binCategory.toUpperCase()}. ${currentItem.fact}`
      });
    } else {
      setSorterLives(prev => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          setSorterFinished(true);
          const rewardedXP = sorterScore;
          setUserXPEarned(p => p + rewardedXP);
          saveXPRewardToBackend(rewardedXP);
          if (onRewardXP) onRewardXP(rewardedXP);
        }
        return nextLives;
      });
      setSorterStreak(0);
      setSorterFeedback({
        isCorrect: false,
        text: `Incorrect! ${currentItem.emoji} ${currentItem.name} actually belongs in the ${currentItem.category.toUpperCase()} bin. ${currentItem.fact}`
      });
    }
  };

  const nextSorterItem = () => {
    setSorterFeedback(null);
    if (currentSorterIdx < sorterItems.length - 1) {
      setCurrentSorterIdx(prev => prev + 1);
    } else {
      setSorterFinished(true);
      // Give real XP on completion based on success
      const rewardedXP = sorterScore + (sorterStreak * 5);
      setUserXPEarned(prev => prev + rewardedXP);
      saveXPRewardToBackend(rewardedXP);
      if (onRewardXP) onRewardXP(rewardedXP);
    }
  };

  // Quiz Core Mechanics
  const handleAnswerSelect = (optionIdx: number) => {
    if (quizAnswered) return;
    setSelectedAnswer(optionIdx);
    setQuizAnswered(true);

    const isCorrect = optionIdx === quizQuestionsList[currentQuizIdx].correctIdx;
    if (isCorrect) {
      setQuizScore(prev => prev + 20);
    }
  };

  const nextQuizQuestion = () => {
    setSelectedAnswer(null);
    setQuizAnswered(false);

    if (currentQuizIdx < quizQuestionsList.length - 1) {
      setCurrentQuizIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
      // Reward quiz score as XP
      const finalScore = quizScore;
      setUserXPEarned(prev => prev + finalScore);
      saveXPRewardToBackend(finalScore);
      if (onRewardXP) onRewardXP(finalScore);
    }
  };

  // Real API Sync to update citizen XP points in database
  const saveXPRewardToBackend = async (earned: number) => {
    if (earned <= 0) return;
    try {
      await fetch(`/api/arcade/reward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ xp: earned })
      });
    } catch (e) {
      console.error("Failed to sync arcade XP:", e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* HEADER ARCADE OVERVIEW */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-emerald-800/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/20">
                <Globe className="w-5 h-5 text-teal-300 animate-spin" />
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white leading-none">The Eco-Arcade</h2>
            </div>
            <p className="text-xs text-teal-100/70 font-semibold max-w-xl leading-relaxed">
              Play mini-games to sharpen your environmental awareness, learn waste sorting strategies, and earn bonus Citizen XP to upgrade your civil badge!
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md p-3 px-5 rounded-2xl border border-white/5 flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <span className="text-[10px] text-teal-300 uppercase font-black tracking-widest block">Arcade Points</span>
              <span className="text-base font-black text-white mt-0.5">+{userXPEarned} XP Earned</span>
            </div>
          </div>
        </div>
      </div>

      {/* GAME MENU */}
      {activeGame === "menu" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Game 1 Banner: Sorter */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition duration-300 flex flex-col">
            <div className="p-6 bg-teal-50 border-b border-slate-100 flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-600 flex items-center justify-center border border-teal-200 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-700 px-2.5 py-1 rounded-md border border-teal-200">
                Practice Game
              </span>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-800 leading-none">The Green Sorter</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Fast-paced sorting game! Put dry recyclables, compostable food scrap, electronics, and hazard chemicals in correct municipal bins. Don't lose all your lives!
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                  <span className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border">
                    🎮 8 Items to Sort
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border">
                    ❤️ 3 Lives per Play
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border">
                    ⚡ Streak Multipliers
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border">
                    🎓 Smart Eco-Facts
                  </span>
                </div>

                <button
                  onClick={startSorterGame}
                  className="w-full bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-black text-xs py-3 px-4 rounded-xl transition shadow-md shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Launch Green Sorter
                </button>
              </div>
            </div>
          </div>

          {/* Game 2 Banner: Trivia */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition duration-300 flex flex-col">
            <div className="p-6 bg-slate-900 text-white border-b border-slate-850 flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-teal-300 flex items-center justify-center border border-white/5 shadow-xs">
                <HelpCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2.5 py-1 rounded-md border border-teal-500/30">
                Quiz Arcade
              </span>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-800 leading-none">Clean City Trivia</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Test your local knowledge! Answer questions about waste recycling codes, environmental regulations, wet/dry bin rules, and composting methods.
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                  <span className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border">
                    ❓ 5 Questions
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border">
                    💡 Deep Explanations
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border">
                    🏆 +20 XP per Answer
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border">
                    🛡️ Civic Champion Badge
                  </span>
                </div>

                <button
                  onClick={startQuizGame}
                  className="w-full bg-slate-900 hover:bg-slate-950 active:scale-98 text-white font-black text-xs py-3 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Launch City Trivia
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* GAME 1: WASTESORTER GAMEPLAY SCREEN */}
      {activeGame === "sorter" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          
          {/* Header info */}
          <div className="flex items-center justify-between border-b border-slate-150 pb-4">
            <button
              onClick={() => setActiveGame("menu")}
              className="text-xs font-bold text-slate-400 hover:text-slate-800 flex items-center gap-1 transition"
            >
              ← Arcade Menu
            </button>

            <div className="flex items-center gap-4 text-xs font-black text-slate-700">
              <span className="bg-teal-50 px-3 py-1.5 rounded-lg border text-teal-700">
                Score: {sorterScore} pts
              </span>
              <span className="bg-slate-50 px-3 py-1.5 rounded-lg border">
                Item: {currentSorterIdx + 1} / {sorterItems.length}
              </span>
              <span className="bg-rose-50 px-3 py-1.5 rounded-lg border text-rose-600 flex items-center gap-1">
                {"❤️".repeat(Math.max(0, sorterLives))}
                {sorterLives <= 0 && "Game Over"}
              </span>
            </div>
          </div>

          {!sorterFinished ? (
            <div className="space-y-6">
              
              {/* Question / Falling Item Stage */}
              <div className="bg-slate-50 rounded-2xl p-8 border border-dashed flex flex-col items-center justify-center text-center space-y-4 min-h-[220px] relative">
                
                {sorterStreak >= 3 && (
                  <span className="absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 animate-bounce">
                    <Zap className="w-3 h-3 fill-white" /> {sorterStreak} STREAK MULTIPLIER!
                  </span>
                )}

                <div className="text-6xl animate-pulse">
                  {sorterItems[currentSorterIdx]?.emoji}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Where does <span className="text-teal-600">"{sorterItems[currentSorterIdx]?.name}"</span> belong?
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">
                    Select the municipal collection category bin to safely process this item.
                  </p>
                </div>
              </div>

              {/* Feedback Alert banner */}
              <AnimatePresence mode="wait">
                {sorterFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-xl border flex gap-3 ${
                      sorterFeedback.isCorrect 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-850" 
                        : "bg-rose-50 border-rose-200 text-rose-850"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {sorterFeedback.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black uppercase block tracking-wider">
                        {sorterFeedback.isCorrect ? "Awesome Sorting!" : "Uh oh! Segregation mistake"}
                      </span>
                      <p className="text-xs font-medium leading-relaxed mt-1">
                        {sorterFeedback.text}
                      </p>
                      
                      <button
                        onClick={nextSorterItem}
                        className="mt-3 text-xs font-black underline flex items-center gap-1 hover:opacity-80"
                      >
                        Proceed to Next Item <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selection Categories Bins */}
              {!sorterFeedback && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Bin 1: Biodegradable */}
                  <button
                    onClick={() => handleSortItem("biodegradable")}
                    className="group bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl p-4 text-center space-y-3 transition hover:scale-102 active:scale-98 cursor-pointer shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg mx-auto shadow-sm group-hover:rotate-12 transition">
                      🥬
                    </div>
                    <div className="leading-tight">
                      <span className="text-xs font-black text-emerald-800 uppercase block tracking-wider">Compost Bin</span>
                      <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Wet Organic Food</span>
                    </div>
                  </button>

                  {/* Bin 2: Recyclable */}
                  <button
                    onClick={() => handleSortItem("recyclable")}
                    className="group bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl p-4 text-center space-y-3 transition hover:scale-102 active:scale-98 cursor-pointer shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg mx-auto shadow-sm group-hover:rotate-12 transition">
                      📦
                    </div>
                    <div className="leading-tight">
                      <span className="text-xs font-black text-blue-800 uppercase block tracking-wider">Recycle Bin</span>
                      <span className="text-[9px] text-blue-600 font-bold block mt-0.5">Paper, Glass, Plastic</span>
                    </div>
                  </button>

                  {/* Bin 3: E-Waste */}
                  <button
                    onClick={() => handleSortItem("e-waste")}
                    className="group bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl p-4 text-center space-y-3 transition hover:scale-102 active:scale-98 cursor-pointer shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center text-lg mx-auto shadow-sm group-hover:rotate-12 transition">
                      🔌
                    </div>
                    <div className="leading-tight">
                      <span className="text-xs font-black text-amber-800 uppercase block tracking-wider">E-Waste Box</span>
                      <span className="text-[9px] text-amber-600 font-bold block mt-0.5">Batteries, Electronics</span>
                    </div>
                  </button>

                  {/* Bin 4: Hazardous */}
                  <button
                    onClick={() => handleSortItem("hazardous")}
                    className="group bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl p-4 text-center space-y-3 transition hover:scale-102 active:scale-98 cursor-pointer shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center text-lg mx-auto shadow-sm group-hover:rotate-12 transition">
                      ☣️
                    </div>
                    <div className="leading-tight">
                      <span className="text-xs font-black text-rose-800 uppercase block tracking-wider">Hazard Box</span>
                      <span className="text-[9px] text-rose-600 font-bold block mt-0.5">Chemicals, Medicines</span>
                    </div>
                  </button>
                </div>
              )}

            </div>
          ) : (
            // Sorter Game Finished screen
            <div className="text-center py-10 space-y-5 max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-full bg-teal-100 border border-teal-200 text-teal-600 flex items-center justify-center text-2xl mx-auto shadow-xs">
                🏆
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-800 leading-none">Sorting Completed!</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Excellent work segregation agent. You handled municipal waste with safe protocols.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Final Score</span>
                  <span className="text-base font-black text-slate-800">{sorterScore} pts</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">XP Bonus Granted</span>
                  <span className="text-base font-black text-teal-600">+{sorterScore + (sorterStreak * 5)} XP</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={startSorterGame}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs py-3 px-4 rounded-xl transition cursor-pointer"
                >
                  Play Again
                </button>
                <button
                  onClick={() => setActiveGame("menu")}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs py-3 px-4 rounded-xl transition shadow-md cursor-pointer"
                >
                  Return to Arcade
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* GAME 2: CIVIC TRIVIA QUESTION SCREEN */}
      {activeGame === "quiz" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          
          {/* Header Info */}
          <div className="flex items-center justify-between border-b border-slate-150 pb-4">
            <button
              onClick={() => setActiveGame("menu")}
              className="text-xs font-bold text-slate-400 hover:text-slate-800 flex items-center gap-1 transition"
            >
              ← Arcade Menu
            </button>

            <div className="flex items-center gap-4 text-xs font-black text-slate-700">
              <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg">
                Score: {quizScore} XP
              </span>
              <span className="bg-slate-50 px-3 py-1.5 rounded-lg border">
                Question: {currentQuizIdx + 1} / {quizQuestionsList.length}
              </span>
            </div>
          </div>

          {!quizFinished ? (
            <div className="space-y-5">
              {/* Question Text */}
              <div className="space-y-2">
                <span className="text-[9px] bg-teal-50 text-teal-700 font-extrabold px-2 py-0.5 rounded border border-teal-200 uppercase tracking-widest">
                  Civic Knowledge Challenge
                </span>
                <h3 className="text-base md:text-lg font-black text-slate-800 leading-snug">
                  {quizQuestionsList[currentQuizIdx]?.question}
                </h3>
              </div>

              {/* Options list */}
              <div className="space-y-3 pt-2">
                {quizQuestionsList[currentQuizIdx]?.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrectAnswer = idx === quizQuestionsList[currentQuizIdx].correctIdx;
                  
                  let buttonClass = "bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200";
                  if (quizAnswered) {
                    if (isCorrectAnswer) {
                      buttonClass = "bg-emerald-50 border-emerald-300 text-emerald-800";
                    } else if (isSelected) {
                      buttonClass = "bg-rose-50 border-rose-300 text-rose-800";
                    } else {
                      buttonClass = "bg-slate-50 opacity-60 text-slate-400 border-slate-100";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={quizAnswered}
                      onClick={() => handleAnswerSelect(idx)}
                      className={`w-full text-left p-4 rounded-xl border-2 text-xs md:text-sm font-bold transition flex items-center justify-between gap-3 ${buttonClass} ${
                        !quizAnswered ? "cursor-pointer hover:translate-x-1 duration-150" : ""
                      }`}
                    >
                      <span>{opt}</span>
                      {quizAnswered && isCorrectAnswer && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {quizAnswered && isSelected && !isCorrectAnswer && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation section shown after answering */}
              <AnimatePresence>
                {quizAnswered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 text-teal-900 mt-2 space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-teal-800">
                      <Lightbulb className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider">Civic Wisdom</span>
                    </div>
                    <p className="text-xs leading-relaxed font-semibold text-teal-800">
                      {quizQuestionsList[currentQuizIdx]?.explanation}
                    </p>

                    <button
                      onClick={nextQuizQuestion}
                      className="mt-4 bg-slate-900 hover:bg-slate-950 text-white text-xs font-black py-2 px-4 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      {currentQuizIdx < quizQuestionsList.length - 1 ? "Next Question" : "Complete Challenge"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          ) : (
            // Quiz completed screen
            <div className="text-center py-10 space-y-5 max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center text-2xl mx-auto shadow-xs">
                🎓
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-800 leading-none">Challenge Completed!</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Wonderful. Educated citizens form the bedrock of clean and transparent local administration.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Total Score</span>
                  <span className="text-base font-black text-slate-800">
                    {quizScore} pts
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">XP Reward Granted</span>
                  <span className="text-base font-black text-teal-600">+{quizScore} XP</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={startQuizGame}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs py-3 px-4 rounded-xl transition cursor-pointer"
                >
                  Play Again
                </button>
                <button
                  onClick={() => setActiveGame("menu")}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs py-3 px-4 rounded-xl transition shadow-md cursor-pointer"
                >
                  Return to Arcade
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* DOCK TIP */}
      <div className="bg-slate-50 border rounded-2xl p-4 flex gap-3 items-start text-slate-600">
        <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Why segregation matters</h4>
          <p className="text-[11px] leading-relaxed text-slate-500 font-semibold">
            When biodegradable waste is mixed with non-biodegradable items like plastics, the entire lot is rendered unrecyclable and ends up in massive choking city landfills, producing toxic leachate and carbon gases. Segregating right at the home source saves municipal processing costs by over 40%!
          </p>
        </div>
      </div>

    </div>
  );
}
