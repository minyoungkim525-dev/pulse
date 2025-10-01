import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Clock, ChevronRight, Check, Heart, Sun, Leaf, Download, Share2 } from 'lucide-react';

const DEMO_PROFILES = {
  alex: {
    name: "Alex",
    description: "Learning boundaries and self-care",
    history: [
      { id: 4, version: "v2025.Week38", date: "Sep 17, 2025", newFeatures: ["Mentoring others"], bugFixes: ["No guilt about boundaries"], knownIssues: [], mood: 8.0 },
      { id: 3, version: "v2025.Week33", date: "Aug 13, 2025", newFeatures: ["Started therapy", "Joined hiking group"], bugFixes: ["Work-life balance"], knownIssues: [], mood: 7.8 },
      { id: 2, version: "v2025.Week30", date: "Jul 23, 2025", newFeatures: ["Morning walks", "Better sleep"], bugFixes: ["Stopped doom-scrolling"], knownIssues: ["Still anxious sometimes"], mood: 6.0 },
      { id: 1, version: "v2025.Week27", date: "Jul 2, 2025", newFeatures: [], bugFixes: [], knownIssues: ["Working 12+ hour days", "Sleep quality terrible"], mood: 3.5 }
    ]
  },
  sam: {
    name: "Sam",
    description: "Creating sustainable routines",
    history: [
      { id: 4, version: "v2025.Week38", date: "Sep 17, 2025", newFeatures: ["All habits maintained"], bugFixes: [], knownIssues: [], mood: 8.5 },
      { id: 3, version: "v2025.Week33", date: "Aug 13, 2025", newFeatures: ["Helping friends"], bugFixes: [], knownIssues: [], mood: 8.2 },
      { id: 2, version: "v2025.Week30", date: "Jul 23, 2025", newFeatures: ["Morning routine", "Gym 3x/week"], bugFixes: ["Consistent bedtime"], knownIssues: ["Still building habits"], mood: 7.0 },
      { id: 1, version: "v2025.Week27", date: "Jul 2, 2025", newFeatures: ["Habit app"], bugFixes: [], knownIssues: ["No routines", "Scattered"], mood: 5.0 }
    ]
  },
  jordan: {
    name: "Jordan",
    description: "Finding home in a new city",
    history: [
      { id: 4, version: "v2025.Week38", date: "Sep 17, 2025", newFeatures: ["Got promoted"], bugFixes: [], knownIssues: [], mood: 8.3 },
      { id: 3, version: "v2025.Week33", date: "Aug 13, 2025", newFeatures: ["Hosted dinner party"], bugFixes: [], knownIssues: [], mood: 8.0 },
      { id: 2, version: "v2025.Week30", date: "Jul 23, 2025", newFeatures: ["Joined climbing gym"], bugFixes: ["Know my way around"], knownIssues: ["Building friendships"], mood: 6.0 },
      { id: 1, version: "v2025.Week27", date: "Jul 2, 2025", newFeatures: [], bugFixes: [], knownIssues: ["Moved to new city", "Feeling lost"], mood: 4.5 }
    ]
  }
};

export default function Pulse() {
  const [stage, setStage] = useState("home");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentChangelog, setCurrentChangelog] = useState(null);
  const [currentProfile, setCurrentProfile] = useState("alex");
  const [history, setHistory] = useState(DEMO_PROFILES.alex.history);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStyle, setExportStyle] = useState('gradient');
  
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setHistory(DEMO_PROFILES[currentProfile].history);
  }, [currentProfile]);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    setStage("recording");
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    clearInterval(timerRef.current);
    
    // Quality checks before processing
    if (recordingTime < 10) {
      alert("Your recording is too short! Try speaking for at least 10 seconds about what happened this week.");
      setStage("home");
      return;
    }
    
    if (recordingTime > 180) {
      alert("Your recording is quite long! For best results, try to keep it under 3 minutes and focus on the highlights.");
      setStage("home");
      return;
    }
    
    setStage("processing");
    
    setTimeout(() => {
      // Simulate speech-to-text quality check
      const mockTranscript = "yea umm"; // In real app, this would be actual transcript
      const wordCount = mockTranscript.trim().split(/\s+/).length;
      
      // Check if recording has enough content
      if (wordCount < 15) {
        setStage("insufficient");
        return;
      }
      
      const newChangelog = {
        version: "v2025.Week40",
        date: "Oct 1, 2025",
        newFeatures: ["Started morning walks", "Better sleep schedule"],
        bugFixes: ["Stopped checking phone before bed"],
        knownIssues: ["Still anxious about deadlines"],
        mood: 7.5
      };
      setCurrentChangelog(newChangelog);
      const newEntry = { id: Date.now(), ...newChangelog };
      setHistory(prev => [newEntry, ...prev]);
      setStage("changelog");
    }, 2000);
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getMoodEmoji = (m) => {
    if (m >= 8) return "😊";
    if (m >= 6.5) return "🙂";
    if (m >= 5) return "😐";
    if (m >= 3) return "😔";
    return "😞";
  };

  const getMoodColor = (m) => {
    if (m >= 8) return "from-emerald-400 to-green-500";
    if (m >= 6.5) return "from-amber-400 to-orange-400";
    return "from-orange-400 to-red-400";
  };

  if (stage === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50">
        {showWelcome && (
          <div className="fixed inset-0 bg-white/95 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-8 max-w-2xl border-2 border-orange-200 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <Heart className="w-10 h-10 text-white" fill="white" />
                </div>
                <h2 className="text-4xl font-bold text-slate-800 mb-2">Hey there, I'm Pulse 👋</h2>
                <p className="text-slate-600">Let's check in with yourself - no pressure, just honesty</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                    <span className="text-amber-700 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-semibold">Vent for a minute</h3>
                    <p className="text-sm text-slate-600">Just talk - victories, struggles, whatever's real</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center">
                    <span className="text-rose-700 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-semibold">We'll organize it</h3>
                    <p className="text-sm text-slate-600">Your ramble becomes clear insights</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <span className="text-emerald-700 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-semibold">Watch yourself grow</h3>
                    <p className="text-sm text-slate-600">See proof you're moving forward, even on hard days</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6">
                <p className="text-sm text-amber-900 mb-3 flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  <strong>Pick a journey to explore:</strong>
                </p>
                {Object.entries(DEMO_PROFILES).map(([key, p]) => (
                  <button 
                    key={key} 
                    onClick={() => setCurrentProfile(key)}
                    className={`w-full text-left p-3 rounded-xl mb-2 transition-all ${
                      currentProfile === key 
                        ? 'bg-rose-100 border-2 border-rose-400' 
                        : 'bg-white border-2 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-600">{p.description}</div>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowWelcome(false)}
                className="w-full bg-gradient-to-r from-rose-400 to-orange-400 text-white font-semibold py-4 rounded-2xl hover:shadow-lg transition-shadow"
              >
                I'm Ready to Talk
              </button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex justify-between mb-6">
            <div className="text-sm text-slate-600">
              Viewing: <span className="font-semibold">{DEMO_PROFILES[currentProfile].name}</span>
            </div>
            <button onClick={() => setShowWelcome(true)} className="text-xs text-rose-500 underline">
              Switch Profile
            </button>
          </div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full mb-6 border-2 border-rose-200">
              <Heart className="w-4 h-4 text-rose-500" fill="currentColor" />
              <span className="text-sm text-slate-700">A safe space to be real</span>
            </div>
            <h1 className="text-7xl font-bold text-slate-800 mb-4">Pulse</h1>
            <p className="text-xl text-slate-600">Your weekly check-in. Raw. Real. Just you.</p>
          </div>

          <div className="bg-white rounded-3xl p-8 border-2 border-orange-200 shadow-xl mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-3">How's your week been, really?</h2>
            <p className="text-slate-600 mb-6">No filters. No judgment. Just talk to me.</p>
            
            {/* Quick prompts */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 mb-6 border border-amber-200">
              <p className="text-sm font-semibold text-slate-700 mb-2">Not sure what to say? Try:</p>
              <div className="text-xs text-slate-600 space-y-1">
                <div>💭 "So this week I finally..."</div>
                <div>🌱 "I've been trying to..."</div>
                <div>😤 "Honestly, I'm still struggling with..."</div>
                <div>✨ "Something good: I actually..."</div>
              </div>
            </div>
            
            <button 
              onClick={startRecording}
              className="w-full bg-gradient-to-r from-rose-400 to-orange-400 text-white font-semibold py-5 rounded-2xl flex items-center justify-center gap-3 hover:shadow-lg transition-shadow"
            >
              <Mic className="w-6 h-6" />
              Start Venting (I'm Listening)
            </button>
            <p className="text-xs text-slate-500 text-center mt-3">
              30-90 seconds • Just talk naturally, like you're thinking out loud
            </p>
          </div>

          {history.length > 0 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border-2 border-amber-200">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-emerald-600" />
                  {DEMO_PROFILES[currentProfile].name}'s Journey
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-4 border border-orange-200">
                    <div className="text-sm text-slate-500">Started at</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-2xl">{getMoodEmoji(history[history.length - 1].mood)}</span>
                      <span className="text-xl font-bold">{history[history.length - 1].mood}/10</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-emerald-200">
                    <div className="text-sm text-slate-500">Current</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-2xl">{getMoodEmoji(history[0].mood)}</span>
                      <span className="text-xl font-bold">{history[0].mood}/10</span>
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">
                      +{(history[0].mood - history[history.length - 1].mood).toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Recent Updates
                </h3>
                <button 
                  onClick={() => setStage('history')} 
                  className="text-rose-500 text-sm flex items-center gap-1 hover:underline"
                >
                  View All<ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {history.slice(0, 3).map(e => (
                <div 
                  key={e.id} 
                  onClick={() => setStage('history')}
                  className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-orange-300 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between mb-3">
                    <div>
                      <div className="text-orange-600 font-mono text-sm font-medium">{e.version}</div>
                      <div className="text-slate-500 text-sm">{e.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getMoodEmoji(e.mood)}</span>
                      <span className="text-sm">{e.mood}/10</span>
                    </div>
                  </div>
                  {e.newFeatures[0] && (
                    <div className="text-sm text-slate-700">
                      <span className="text-emerald-500">✨</span> {e.newFeatures[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'recording') {
    const isMinimumMet = recordingTime >= 10;
    const isOptimalRange = recordingTime >= 30 && recordingTime <= 120;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <div className="w-32 h-32 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full mx-auto mb-8 flex items-center justify-center animate-pulse">
            <Mic className="w-16 h-16 text-white" />
          </div>
          <div className="text-6xl font-mono text-slate-800 font-bold mb-4">{formatTime(recordingTime)}</div>
          
          {/* Recording quality indicator */}
          <div className="mb-6">
            {recordingTime < 10 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-4">
                <p className="text-amber-800 text-sm">
                  <span className="font-semibold">Keep going, you got this!</span> Just need a few more seconds...
                </p>
              </div>
            )}
            {recordingTime >= 10 && recordingTime < 30 && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 mb-4">
                <p className="text-blue-800 text-sm">
                  <span className="font-semibold">Nice!</span> Keep talking if there's more on your mind
                </p>
              </div>
            )}
            {isOptimalRange && (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 mb-4">
                <p className="text-emerald-800 text-sm">
                  <span className="font-semibold">Perfect! 💚</span> This is exactly what we need
                </p>
              </div>
            )}
            {recordingTime > 120 && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 mb-4">
                <p className="text-orange-800 text-sm">
                  <span className="font-semibold">Wow, you've got a lot to say!</span> Feel free to wrap up when ready
                </p>
              </div>
            )}
          </div>
          
          <p className="text-slate-700 text-lg mb-8">I'm listening... say whatever's on your mind</p>
          <button 
            onClick={stopRecording}
            className={`w-full font-semibold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all ${
              isMinimumMet 
                ? 'bg-slate-700 text-white hover:bg-slate-800' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
            disabled={!isMinimumMet}
          >
            <Square className="w-5 h-5" />
            {isMinimumMet ? 'Done - Show Me My Update' : `Talk for ${10 - recordingTime}s more`}
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'insufficient') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl p-8 border-2 border-amber-300 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">🤔</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Hey, that was a bit short!</h2>
              <p className="text-slate-600">I need a little more to work with. Let's try again?</p>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="text-xl">💭</span>
                Here's some stuff you could tell me about:
              </h3>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">✨</span>
                  <span>"I finally started that thing I've been putting off..."</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">🎯</span>
                  <span>"I managed to stop doing [bad habit] this week"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">😤</span>
                  <span>"Honestly, I'm still struggling with..."</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-rose-500 mt-1">❤️</span>
                  <span>"Overall, I'm feeling [however you're actually feeling]"</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
              <p className="text-sm text-blue-900">
                <strong>Real talk:</strong> Just ramble for 30-90 seconds. Talk like you're venting to someone who gets it. I'll make sense of it, I promise!
              </p>
            </div>

            <button 
              onClick={() => {
                setStage("home");
                setRecordingTime(0);
              }}
              className="w-full bg-gradient-to-r from-rose-400 to-orange-400 text-white font-semibold py-4 rounded-2xl hover:shadow-lg transition-shadow"
            >
              Let's Try Again - I Got This
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-slate-800">Making sense of what you said...</h2>
        </div>
      </div>
    );
  }

  if (stage === 'changelog' && currentChangelog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full mb-4 border-2 border-emerald-300">
              <Check className="w-4 h-4 text-emerald-700" />
              <span className="text-sm text-emerald-700 font-medium">Recorded</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-800">Here's What You Said</h1>
          </div>

          <div className="bg-white rounded-3xl p-8 border-2 border-orange-200 shadow-2xl mb-6">
            <div className="flex justify-between mb-6 pb-6 border-b-2 border-slate-100">
              <div>
                <div className="text-orange-600 font-mono text-2xl font-bold">📦 {currentChangelog.version}</div>
                <div className="text-slate-500">{currentChangelog.date}</div>
              </div>
              <div className={`px-5 py-3 rounded-2xl bg-gradient-to-r ${getMoodColor(currentChangelog.mood)} text-white font-semibold flex items-center gap-2`}>
                <span className="text-2xl">{getMoodEmoji(currentChangelog.mood)}</span>
                {currentChangelog.mood}/10
              </div>
            </div>

            {currentChangelog.newFeatures.length > 0 && (
              <div className="mb-6">
                <h3 className="text-emerald-600 font-semibold mb-3">✨ New Features</h3>
                <ul className="space-y-2">
                  {currentChangelog.newFeatures.map((f, i) => (
                    <li key={i} className="text-slate-700 pl-4">• {f}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentChangelog.bugFixes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-blue-600 font-semibold mb-3">🐛 Bug Fixes</h3>
                <ul className="space-y-2">
                  {currentChangelog.bugFixes.map((f, i) => (
                    <li key={i} className="text-slate-700 pl-4">• {f}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentChangelog.knownIssues.length > 0 && (
              <div className="mb-6">
                <h3 className="text-amber-600 font-semibold mb-3">⚠️ Known Issues</h3>
                <ul className="space-y-2">
                  {currentChangelog.knownIssues.map((f, i) => (
                    <li key={i} className="text-slate-700 pl-4">• {f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => alert('Export feature - would create shareable image!')}
              className="flex-1 bg-white border-2 border-rose-300 hover:border-rose-400 text-rose-600 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
            <button 
              onClick={() => setStage('home')} 
              className="flex-1 bg-white border-2 border-slate-300 text-slate-700 py-4 rounded-2xl hover:border-slate-400 transition-colors"
            >
              Home
            </button>
            <button 
              onClick={() => setStage('history')} 
              className="flex-1 bg-gradient-to-r from-rose-400 to-orange-400 text-white py-4 rounded-2xl hover:shadow-lg transition-shadow"
            >
              History
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'history') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between mb-8">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500" />
              Your History
            </h1>
            <button 
              onClick={() => setStage('home')} 
              className="text-slate-600 hover:text-slate-800 transition-colors"
            >
              ← Back
            </button>
          </div>

          <div className="space-y-6">
            {history.map(e => (
              <div key={e.id} className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-orange-300 transition-colors">
                <div className="flex justify-between mb-3">
                  <div>
                    <div className="text-orange-600 font-mono font-bold">{e.version}</div>
                    <div className="text-slate-500 text-sm">{e.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getMoodEmoji(e.mood)}</span>
                    <span className="text-sm">{e.mood}/10</span>
                  </div>
                </div>
                {e.newFeatures[0] && (
                  <div className="text-sm text-slate-700 mb-2">
                    <span className="text-emerald-500">✨</span> {e.newFeatures[0]}
                  </div>
                )}
                {e.bugFixes[0] && (
                  <div className="text-sm text-slate-700 mb-2">
                    <span className="text-blue-500">🐛</span> {e.bugFixes[0]}
                  </div>
                )}
                {e.knownIssues[0] && (
                  <div className="text-sm text-slate-700">
                    <span className="text-amber-500">⚠️</span> {e.knownIssues[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}