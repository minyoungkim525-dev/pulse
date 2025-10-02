import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Clock, ChevronRight, Check, Heart, Sun, Leaf, Download, Share2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserEntries, saveEntry } from '../lib/database';

export default function Pulse() {
  const { user } = useAuth();
  const [stage, setStage] = useState("home");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [currentChangelog, setCurrentChangelog] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStyle, setExportStyle] = useState('gradient');
  const [textInput, setTextInput] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const cardRef = useRef(null);

  // Load user's entries on mount
  useEffect(() => {
    async function loadEntries() {
      if (user) {
        setLoading(true);
        const entries = await fetchUserEntries(user.id);
        setHistory(entries);
        setLoading(false);
      }
    }
    loadEntries();
  }, [user]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setAudioBlob(blob);
      setAudioURL(URL.createObjectURL(blob));
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderRef.current = mediaRecorder;  // THIS LINE IS CRITICAL
    mediaRecorder.start();
    
    setIsRecording(true);
    setRecordingTime(0);
    setStage("recording");
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
  } catch (err) {
    console.error('Microphone error:', err);
    alert("Please allow microphone access to record your check-in.");
  }
};

const stopRecording = () => {
  console.log('stopRecording called', { 
    mediaRecorderRef: mediaRecorderRef.current,
    isRecording,
    recordingTime 
  });
  if (!mediaRecorderRef.current || !isRecording) return;
  
  if (recordingTime < 10) {
    alert("Your recording is too short! Try speaking for at least 10 seconds.");
    setIsRecording(false);
    clearInterval(timerRef.current);
    setStage("home");
    return;
  }
  
  if (recordingTime > 180) {
    alert("Your recording is quite long! For best results, try to keep it under 3 minutes and focus on the highlights.");
    setIsRecording(false);
    clearInterval(timerRef.current);
    setStage("home");
    return;
  }
  
  setIsRecording(false);
  clearInterval(timerRef.current);
  mediaRecorderRef.current.stop();
  setStage("review");
};

const processRecording = async () => {
  if (!audioBlob) {
    alert("No recording found");
    return;
  }

  setStage("processing");

  try {
    // Transcribe audio
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const transcribeResponse = await fetch('/api/transcribe-audio', {
      method: 'POST',
      body: formData,
    });

    if (!transcribeResponse.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const { transcript } = await transcribeResponse.json();

    // Analyze with Claude
    const analyzeResponse = await fetch('/api/analyze-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });

    if (!analyzeResponse.ok) {
      throw new Error('Failed to analyze entry');
    }

    const { analysis } = await analyzeResponse.json();

    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((now - start) / (1000 * 60 * 60 * 24 * 7));

    const newChangelog = {
      version: `v${now.getFullYear()}.Week${week}`,
      date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      newFeatures: analysis.newFeatures,
      bugFixes: analysis.bugFixes,
      knownIssues: analysis.knownIssues,
      mood: analysis.mood,
      themes: analysis.themes,
      transcript
    };

    setCurrentChangelog(newChangelog);
    const savedEntry = await saveEntry(user.id, newChangelog);

    if (savedEntry) {
      setHistory(prev => [savedEntry, ...prev]);
      setAudioBlob(null);
      setAudioURL(null);
      setStage("changelog");
    } else {
      throw new Error('Failed to save entry');
    }

  } catch (error) {
    console.error('Processing error:', error);
    alert(`Error: ${error.message}. Please try again.`);
    setStage("review");
  }
};

const submitTextEntry = async () => {
  const transcript = textInput.trim();
  
  if (transcript.length < 50) {
    alert("Please write at least 50 characters about your week.");
    return;
  }
  
  setStage("processing");
  
  try {
    const response = await fetch('/api/analyze-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });

    if (!response.ok) throw new Error('Failed to analyze entry');

    const { analysis } = await response.json();
    
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((now - start) / (1000 * 60 * 60 * 24 * 7));
    
    const newChangelog = {
      version: `v${now.getFullYear()}.Week${week}`,
      date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      newFeatures: analysis.newFeatures,
      bugFixes: analysis.bugFixes,
      knownIssues: analysis.knownIssues,
      mood: analysis.mood,
      themes: analysis.themes,
      transcript
    };
    
    setCurrentChangelog(newChangelog);
    const savedEntry = await saveEntry(user.id, newChangelog);
    
    if (savedEntry) {
      setHistory(prev => [savedEntry, ...prev]);
      setTextInput('');
      setStage("changelog");
    } else {
      alert("Error saving entry. Please try again.");
      setStage("home");
    }
  } catch (error) {
    console.error('Error:', error);
    alert("Something went wrong. Please try again.");
    setStage("home");
  }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-slate-800">Loading your journey...</h2>
        </div>
      </div>
    );
  }

if (stage === 'home') {
  const hasEntries = history.length > 0;
  const isNewUser = history.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full mb-6 border-2 border-rose-200">
            <Heart className="w-4 h-4 text-rose-500" fill="currentColor" />
            <span className="text-sm text-slate-700">A safe space to be real</span>
          </div>
          <h1 className="text-7xl font-bold text-slate-800 mb-4">Pulse</h1>
          <p className="text-xl text-slate-600">Your weekly check-in. Raw. Real. Just you.</p>
        </div>

        {isNewUser && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-2 border-amber-200 mb-8">
            <div className="text-center">
              <span className="text-5xl mb-4 block">👋</span>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Pulse!</h2>
              <p className="text-slate-600 mb-4">
                This is your space to check in with yourself each week. No judgment, no pressure.
              </p>
              <p className="text-sm text-slate-500">
                Share what's happening in your life, and we'll help you see your progress over time.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-8 border-2 border-orange-200 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            {isNewUser ? "Ready for your first check-in?" : "How's your week been, really?"}
          </h2>
          <p className="text-slate-600 mb-6">No filters. No judgment. Just talk to me.</p>
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 mb-6 border border-amber-200">
            <p className="text-sm font-semibold text-slate-700 mb-2">Not sure what to say? Try:</p>
            <div className="text-xs text-slate-600 space-y-1">
              <div>💭 "So this week I finally..."</div>
              <div>🌱 "I've been trying to..."</div>
              <div>😤 "Honestly, I'm still struggling with..."</div>
              <div>✨ "Something good: I actually..."</div>
            </div>
          </div>
          
          {/* Text Input Area */}
          <div className="space-y-4 mb-4">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Start typing what's on your mind..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-rose-400 focus:outline-none min-h-32 resize-y transition-colors"
              maxLength={1000}
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{textInput.length}/1000 characters</span>
              <span className={textInput.length < 50 ? 'text-amber-600' : 'text-emerald-600'}>
                {textInput.length < 50 ? `Need ${50 - textInput.length} more` : 'Ready to submit'}
              </span>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={submitTextEntry}
              disabled={textInput.trim().length < 50}
              className="flex-1 bg-gradient-to-r from-rose-400 to-orange-400 text-white font-semibold py-5 rounded-2xl flex items-center justify-center gap-3 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              Submit Check-In
            </button>
            <button 
              onClick={startRecording}
              className="bg-white border-2 border-orange-300 text-orange-600 font-semibold px-6 py-5 rounded-2xl hover:border-orange-400 transition-colors"
              title="Voice recording (coming soon)"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-xs text-slate-500 text-center mt-3">
            Type 50+ characters about your week • Voice recording coming soon
          </p>
        </div>

        {hasEntries && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border-2 border-amber-200">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-600" />
                Your Journey
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
                    {history[0].mood > history[history.length - 1].mood ? '+' : ''}
                    {(history[0].mood - history[history.length - 1].mood).toFixed(1)}
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
                {e.new_features && e.new_features[0] && (
                  <div className="text-sm text-slate-700">
                    <span className="text-emerald-500">✨</span> {e.new_features[0]}
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
                  <span className="font-semibold">Perfect!</span> This is exactly what we need
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

  if (stage === 'review') {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-3xl p-8 border-2 border-orange-200 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Recording Complete</h2>
            <p className="text-slate-600">Duration: {formatTime(recordingTime)}</p>
          </div>

          {audioURL && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-2">Listen to your recording:</p>
              <audio 
                src={audioURL} 
                controls 
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={processRecording}
              className="w-full bg-gradient-to-r from-rose-400 to-orange-400 text-white font-semibold py-4 rounded-2xl hover:shadow-lg transition-shadow"
            >
              Analyze My Recording
            </button>
            <button
              onClick={() => {
                setAudioBlob(null);
                setAudioURL(null);
                setRecordingTime(0);
                setStage("home");
              }}
              className="w-full bg-white border-2 border-slate-300 text-slate-700 py-4 rounded-2xl hover:border-slate-400 transition-colors"
            >
              Re-record
            </button>
          </div>
        </div>
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
  // Prepare chart data
  const chartData = history.slice().reverse().map(e => ({
    date: e.date,
    mood: e.mood,
    version: e.version
  }));

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

        {history.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📝</span>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No entries yet</h2>
            <p className="text-slate-600 mb-6">Start your first check-in to begin tracking your journey</p>
            <button
              onClick={() => setStage('home')}
              className="bg-gradient-to-r from-rose-400 to-orange-400 text-white font-semibold px-8 py-4 rounded-2xl hover:shadow-lg transition-shadow"
            >
              Take Your Pulse
            </button>
          </div>
        ) : (
          <>
            {/* Mood Chart */}
            {history.length >= 2 && (
              <div className="bg-white rounded-3xl p-8 border-2 border-orange-200 shadow-xl mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Mood Trend</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        stroke="#64748b"
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        tick={{ fontSize: 12 }}
                        stroke="#64748b"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white',
                          border: '2px solid #fed7aa',
                          borderRadius: '12px',
                          padding: '8px 12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="mood" 
                        stroke="#f97316" 
                        strokeWidth={3}
                        fill="url(#moodGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between mt-4 text-sm text-slate-600">
                  <div>
                    <span className="font-semibold">Average: </span>
                    {(history.reduce((acc, e) => acc + e.mood, 0) / history.length).toFixed(1)}/10
                  </div>
                  <div>
                    <span className="font-semibold">Total Check-ins: </span>
                    {history.length}
                  </div>
                </div>
              </div>
            )}

            {/* Entries List */}
            <h2 className="text-xl font-bold text-slate-800 mb-4">All Entries</h2>
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
                  {e.new_features && e.new_features[0] && (
                    <div className="text-sm text-slate-700 mb-2">
                      <span className="text-emerald-500">✨</span> {e.new_features[0]}
                    </div>
                  )}
                  {e.bug_fixes && e.bug_fixes[0] && (
                    <div className="text-sm text-slate-700 mb-2">
                      <span className="text-blue-500">🐛</span> {e.bug_fixes[0]}
                    </div>
                  )}
                  {e.known_issues && e.known_issues[0] && (
                    <div className="text-sm text-slate-700">
                      <span className="text-amber-500">⚠️</span> {e.known_issues[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

  return null;
}