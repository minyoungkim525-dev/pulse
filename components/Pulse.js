import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Clock, ChevronRight, Check, Heart, Sun, Leaf, Download, Share2, Lightbulb, MessageCircle  } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserEntries, saveEntry } from '../lib/database';
import { detectPatterns } from '../lib/insights';

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
  const [isExporting, setIsExporting] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [insights, setInsights] = useState([]);
  const [moodFilter, setMoodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ step: '', message: '' });
  const [prediction, setPrediction] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
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
  if (history.length >= 3) {
    setInsights(detectPatterns(history));
  }
}, [history]);

useEffect(() => {
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, []);

useEffect(() => {
  setPrediction(null); // Clear prediction when new entry added
}, [history.length]);

const renderMarkdown = (text) => {
  // Simple bold parsing - you can extend this for other markdown features
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

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

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    
    setIsRecording(true);
    setRecordingTime(0);
    setStage("recording");
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
  } catch (err) {
    console.error('Microphone error:', err);
    toast.error("Please allow microphone access to record your check-in.");
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
    toast.error("Recording too short. Try speaking for at least 10 seconds.");
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
    toast.error("No recording found");
    return;
  }

  setStage("processing");
  setAnalysisProgress({ step: 'starting', message: 'Processing your recording...' });

  try {
    // Simulate progress updates while waiting for API
    const progressSteps = [
      { step: 'mood', message: 'Transcribing your voice...', delay: 800 },
      { step: 'themes', message: 'Analyzing what you said...', delay: 1200 },
      { step: 'patterns', message: 'Finding patterns...', delay: 1000 },
      { step: 'generating', message: 'Creating your changelog...', delay: 800 }
    ];
    
    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setAnalysisProgress(progressSteps[currentStep]);
        currentStep++;
      }
    }, 800);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const transcribeResponse = await fetch('/api/transcribe-audio', {
      method: 'POST',
      body: formData,
    });

    if (!transcribeResponse.ok) {
      clearInterval(progressInterval);
      const errorData = await transcribeResponse.json();
      throw new Error(errorData.details || 'Failed to transcribe audio');
    }

    const { transcript } = await transcribeResponse.json();

    const analyzeResponse = await fetch('/api/analyze-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });

    clearInterval(progressInterval);

    if (!analyzeResponse.ok) {
      throw new Error('Failed to analyze entry');
    }

    const { analysis } = await analyzeResponse.json();
    console.log('Raw API response:', JSON.stringify(analysis, null, 2)); 

    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((now - start) / (1000 * 60 * 60 * 24 * 7));

    const newChangelog = {
      version: `v${now.getFullYear()}.Week${week}`,
      date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      new_features: analysis.new_features,
      bug_fixes: analysis.bug_fixes,
      known_issues: analysis.known_issues,
      mood: analysis.mood,
      themes: analysis.themes,
      transcript
    };

    const savedEntry = await saveEntry(user.id, newChangelog);

    if (savedEntry) {
      setHistory(prev => [savedEntry, ...prev]);
      setAudioBlob(null);
      setAudioURL(null);
      setCurrentChangelog(savedEntry);
      toast.success("Entry saved successfully!");
      setTimeout(() => {
        setStage("changelog");
      }, 500);
    } else {
      throw new Error('Failed to save entry');
    }

  } catch (error) {
    console.error('Processing error:', error);
    
    if (error.message.includes('transcribe')) {
      toast.error("Couldn't transcribe audio. Try recording again or use text input.");
    } else if (error.message.includes('analyze')) {
      toast.error("AI analysis failed. Check your internet connection.");
    } else if (error.message.includes('save')) {
      toast.error("Couldn't save to database. Please try again.");
    } else {
      toast.error(`Error: ${error.message}. Please try again.`);
    }
    
    setStage("review");
  }
};

const submitTextEntry = async () => {
  const transcript = textInput.trim();
  
  if (transcript.length < 50) {
    toast.error("Please write at least 50 characters about your week.");
    return;
  }

  // Clear demo mode when submitting real entry
  if (isDemoMode) {
    setIsDemoMode(false);
    setHistory([]); // Clear demo data
  }
  setStage("processing");
  setAnalysisProgress({ step: 'starting', message: 'Reading your entry...' });
  
  try {
    // Simulate progress updates while waiting for API
    const progressSteps = [
      { step: 'mood', message: 'Thinking about what you said..', delay: 1200 },
      { step: 'themes', message: 'Detecting key themes...', delay: 1200 },
      { step: 'patterns', message: 'Finding patterns...', delay: 1200 },
      { step: 'generating', message: 'Creating your changelog...', delay: 1200 }
    ];
    
    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setAnalysisProgress(progressSteps[currentStep]);
        currentStep++;
      }
    }, 800);
    
    const response = await fetch('/api/analyze-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });

    clearInterval(progressInterval);
    
    if (!response.ok) throw new Error('Failed to analyze entry');

    const { analysis } = await response.json();
    
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((now - start) / (1000 * 60 * 60 * 24 * 7));
    
    const newChangelog = {
      version: `v${now.getFullYear()}.Week${week}`,
      date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      new_features: analysis.new_features,
      bug_fixes: analysis.bug_fixes,
      known_issues: analysis.known_issues,
      mood: analysis.mood,
      themes: analysis.themes,
      transcript
    };
    
    const savedEntry = await saveEntry(user.id, newChangelog);
    
    if (savedEntry) {
      setHistory(prev => [savedEntry, ...prev]);
      setTextInput('');
      setCurrentChangelog(savedEntry);
      toast.success("Entry saved successfully!");
      setTimeout(() => {
        setStage("changelog");
      }, 500);
    } else {
      toast.error("Couldn't save entry. Please try again.");
      setStage("home");
    }
  } catch (error) {
    console.error('Error:', error);
    
    if (error.message.includes('analyze')) {
      toast.error("AI analysis failed. Check your internet connection.");
    } else {
      toast.error("Something went wrong. Please try again.");
    }
    
    setStage("home");
  }
};

const askQuestion = async () => {
  if (!chatInput.trim()) return;
  
  const userMessage = { role: 'user', content: chatInput };
  setChatMessages(prev => [...prev, userMessage]);
  setChatInput('');
  setChatLoading(true);

  try {
    const response = await fetch('/api/chat-journey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: chatInput,
        entries: history.slice(0, 10),
        previousMessages: chatMessages
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }
    const { answer } = await response.json();
    setChatMessages(prev => [...prev, { role: 'assistant', content: answer }]);
  } catch (error) {
    console.error('Chat error:', error);
    toast.error("Couldn't get answer. Try again.");
  }
  setChatLoading(false);
};

const exportToImage = async () => {
  setIsExporting(true);
  
  try {
    const domtoimage = (await import('dom-to-image-more')).default;
    const card = document.getElementById('export-card');
    
    if (!card) {
      throw new Error('Export card not found');
    }

    const dataUrl = await domtoimage.toPng(card, {
      width: 1080,
      height: 1920,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    });

    const link = document.createElement('a');
    link.download = `pulse-${currentChangelog.version}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Image downloaded! Share it on Instagram!');
    setShowExportModal(false);
    setIsExporting(false);

  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export. Please try again.');
    setIsExporting(false);
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
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="mb-6 bg-amber-100 border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎭</span>
              <div>
                <div className="font-semibold text-amber-900">Demo Mode Active</div>
                <div className="text-xs text-amber-700">This is sample data showing a burnout recovery journey</div>
              </div>
            </div>
            <button
              onClick={() => {
                setHistory([]);
                setIsDemoMode(false);
                setPrediction(null);
                setChatMessages([]);
                toast.success("Demo cleared. Ready for your real journey!");
              }}
              className="bg-white border-2 border-amber-600 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-50 transition-colors"
            >
              Exit Demo
            </button>
          </div>
        )}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full mb-6 border-2 border-rose-200">
            <Heart className="w-4 h-4 text-rose-500" fill="currentColor" />
            <span className="text-sm text-slate-700">A safe space to be real</span>
          </div>
          <h1 className="text-7xl font-bold text-slate-800 mb-4">Pulse</h1>
          <p className="text-xl text-slate-600">Check in weekly. No filters, no judgment. I'm here to listen.</p>
        </div>

        {isNewUser && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border-2 border-amber-200 mb-8">
            <div className="text-center">
              <span className="text-5xl mb-4 block">👋</span>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Pulse</h2>
              <p className="text-slate-600 mb-4">
                Hey, I'm glad you're here
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Check in with me weekly. I'll help you see the patterns you'd otherwise miss—what's working, what's shifting, where you're headed.
              </p>
              
              <button
                onClick={() => {
                  setIsDemoMode(true);
                  const demoEntries = [
                    {
                      id: 'demo-4',
                      version: 'v2025.Week40',
                      date: 'Oct 2, 2025',
                      new_features: ['Started therapy sessions', 'Morning meditation routine'],
                      bug_fixes: ['Stopped doom-scrolling before bed'],
                      known_issues: [],
                      mood: 7.8,
                      themes: ['mental', 'health'],
                      transcript: 'This week has been a turning point...',
                      created_at: new Date().toISOString()
                    },
                    {
                      id: 'demo-3',
                      version: 'v2025.Week38',
                      date: 'Sep 17, 2025',
                      new_features: ['Joined a hiking group'],
                      bug_fixes: ['Better work-life boundaries'],
                      known_issues: ['Still anxious about deadlines'],
                      mood: 6.5,
                      themes: ['relationships', 'work'],
                      transcript: 'Making progress but still struggling...',
                      created_at: new Date().toISOString()
                    },
                    {
                      id: 'demo-2',
                      version: 'v2025.Week35',
                      date: 'Aug 27, 2025',
                      new_features: ['Started morning walks'],
                      bug_fixes: [],
                      known_issues: ['Sleep quality terrible', 'Work stress overwhelming'],
                      mood: 4.5,
                      themes: ['health', 'work'],
                      transcript: 'Feeling burnt out and exhausted...',
                      created_at: new Date().toISOString()
                    },
                    {
                      id: 'demo-1',
                      version: 'v2025.Week32',
                      date: 'Aug 6, 2025',
                      new_features: [],
                      bug_fixes: [],
                      known_issues: ['Working 12+ hour days', 'No energy for anything'],
                      mood: 3.2,
                      themes: ['work', 'health'],
                      transcript: 'Rock bottom. Everything feels too hard...',
                      created_at: new Date().toISOString()
                    }
                  ];
                  
                  setHistory(demoEntries);
                  toast.success("Demo mode loaded! Explore the features.");
                }}
                className="bg-white border-2 border-orange-300 text-orange-600 px-6 py-3 rounded-2xl hover:bg-orange-50 transition-colors font-medium"
              >
                👀 Try Demo (No Signup Required)
              </button>
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
              <div>"This week I finally..."</div>
              <div>"I've been trying to..."</div>
              <div>"Real talk: I'm still struggling with..."</div>
              <div>"One win: I actually..."</div>
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
              title="Voice recording"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-xs text-slate-500 text-center mt-3">
            Write 50+ characters • Or record your voice
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
                  <div className="text-sm text-slate-500">You started at</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl">{getMoodEmoji(history[history.length - 1].mood)}</span>
                    <span className="text-xl font-bold">{history[history.length - 1].mood}/10</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-emerald-200">
                  <div className="text-sm text-slate-500">You're at</div>
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

            {/* Insight Card */}
            {insights.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border-2 border-blue-200 mb-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  What I'm noticing
                </h3>
                {/* Prediction card */}
                {history.length >= 4 && (
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🔮</span>
                      <div className="flex-1">
                        <div className="font-semibold text-purple-900 text-sm mb-2">
                          Looking Ahead
                        </div>
                        {!prediction ? (
                          <button 
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/predict', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ entries: history.slice(0, 8) })
                                });
                                const { prediction: pred } = await response.json();
                                setPrediction(pred);
                              } catch (error) {
                                toast.error("Couldn't generate prediction. Try again.");
                              }
                            }}
                            className="text-sm text-purple-700 underline hover:text-purple-900"
                          >
                            Want to know what your pattern suggests for next week?
                          </button>
                        ) : (
                          <div className="text-sm text-purple-800 leading-relaxed">
                            {prediction}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {insights.map((insight, i) => (
                    <div 
                      key={i}
                      className={`p-4 rounded-2xl border-2 ${
                        insight.type === 'positive' ? 'bg-emerald-50 border-emerald-200' :
                        insight.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{insight.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 text-sm mb-1">
                            {insight.title}
                          </div>
                          <div className="text-slate-600 text-sm">
                            {insight.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

        {/* Floating Chat Button */}
        {history.length > 0 && (
          <button
            onClick={() => setShowChat(true)}
            className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all z-40"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}
      </div>

            {/* CHAT MODAL */}
      {showChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-6">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl md:max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Ask About Your Journey</h3>
              <button 
                onClick={() => setShowChat(false)} 
                className="text-slate-500 hover:text-slate-800 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  <p className="mb-4 font-semibold">Try asking:</p>
                  <div className="space-y-2 text-sm">
                    <button 
                      onClick={() => setChatInput("When was I last this happy?")} 
                      className="block w-full p-3 bg-blue-50 rounded-xl text-left hover:bg-blue-100 transition-colors"
                    >
                      "When was I last this happy?"
                    </button>
                    <button 
                      onClick={() => setChatInput("What patterns do you see in my struggles?")} 
                      className="block w-full p-3 bg-blue-50 rounded-xl text-left hover:bg-blue-100 transition-colors"
                    >
                      "What patterns do you see in my struggles?"
                    </button>
                    <button 
                      onClick={() => setChatInput("Am I actually getting better?")} 
                      className="block w-full p-3 bg-blue-50 rounded-xl text-left hover:bg-blue-100 transition-colors"
                    >
                      "Am I actually getting better?"
                    </button>
                  </div>
                </div>
              )}
              
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-rose-400 to-orange-400 text-white' 
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {renderMarkdown(msg.content)}
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-4 rounded-2xl">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !chatLoading && askQuestion()}
                  placeholder="Ask me anything about your journey..."
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:outline-none"
                />
                <button
                  onClick={askQuestion}
                  disabled={!chatInput.trim() || chatLoading}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
                  <span className="font-semibold">Keep going, I'm here!</span> Just need a few more seconds...
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
                  <span className="font-semibold">Got it.</span> Anything else?
                </p>
              </div>
            )}
            {recordingTime > 120 && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 mb-4">
                <p className="text-orange-800 text-sm">
                  <span className="font-semibold">I'm listening...</span> Feel free to wrap up when ready
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          {analysisProgress?.step === 'starting' && 'Reading your entry...'}
          {analysisProgress?.step === 'mood' && 'Thinking about what you said...'}
          {analysisProgress?.step === 'themes' && 'Detecting key themes...'}
          {analysisProgress?.step === 'patterns' && 'Finding patterns...'}
          {analysisProgress?.step === 'generating' && 'Creating your changelog...'}
          {!analysisProgress?.step && 'Give me a sec...'}
        </h2>
        <p className="text-slate-600 text-sm">
          {analysisProgress?.message || 'This will just take a moment...'}
        </p>
        
        {/* Progress indicator */}
        <div className="mt-6 flex justify-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${analysisProgress?.step === 'starting' || analysisProgress?.step === 'mood' || analysisProgress?.step === 'themes' || analysisProgress?.step === 'patterns' || analysisProgress?.step === 'generating' ? 'bg-orange-400' : 'bg-slate-300'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-colors ${analysisProgress?.step === 'mood' || analysisProgress?.step === 'themes' || analysisProgress?.step === 'patterns' || analysisProgress?.step === 'generating' ? 'bg-orange-400' : 'bg-slate-300'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-colors ${analysisProgress?.step === 'themes' || analysisProgress?.step === 'patterns' || analysisProgress?.step === 'generating' ? 'bg-orange-400' : 'bg-slate-300'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-colors ${analysisProgress?.step === 'patterns' || analysisProgress?.step === 'generating' ? 'bg-orange-400' : 'bg-slate-300'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-colors ${analysisProgress?.step === 'generating' ? 'bg-orange-400' : 'bg-slate-300'}`}></div>
        </div>
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

          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
            <p className="text-sm text-blue-900">
              Ready to analyze your recording. This will transcribe your audio and generate your weekly changelog.
            </p>
          </div>

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
      {/* Export Modal */}
      {showExportModal && currentChangelog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border-2 border-orange-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-orange-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Share Your Update</h3>
              <p className="text-slate-600 text-sm">Instagram Story sized (1080x1920)</p>
            </div>

            {/* Preview Card */}
            <div id="export-card" className="mb-6 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg">
              <div 
                style={{
                  aspectRatio: '9/16',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: exportStyle === 'gradient' 
                    ? 'linear-gradient(135deg, #fef3c7 0%, #ffe4e6 50%, #fed7aa 100%)' 
                    : exportStyle === 'minimal'
                    ? 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
                    : 'linear-gradient(135deg, #d1fae5 0%, #fef3c7 50%, #ffe4e6 100%)'
                }}
              >
                {/* Top Section */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: exportStyle === 'gradient' ? '#fb7185' : exportStyle === 'minimal' ? '#334155' : '#10b981',
                    borderRadius: '50%',
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Heart style={{ width: '24px', height: '24px', color: 'white' }} fill="white" />
                  </div>
                  <div style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '20px', marginBottom: '4px' }}>
                    {currentChangelog.version}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    {currentChangelog.date}
                  </div>
                </div>

                {/* Mood Section */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '60px', marginBottom: '12px' }}>
                    {currentChangelog?.mood && getMoodEmoji(currentChangelog.mood)}
                  </div>
                  <div style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '18px' }}>
                    {currentChangelog.mood}/10 Wellbeing
                  </div>
                </div>

                {/* Content Section */}
                <div style={{ width: '100%' }}>
                  {currentChangelog.new_features[0] && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                        color: exportStyle === 'gradient' ? '#dc2626' : exportStyle === 'minimal' ? '#334155' : '#059669'
                      }}>
                        ✨ This Week
                      </div>
                      <div style={{
                        color: '#475569',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {currentChangelog.new_features[0]}
                      </div>
                    </div>
                  )}
                  {currentChangelog.bug_fixes[0] && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginBottom: '8px',
                        color: exportStyle === 'minimal' ? '#334155' : '#2563eb'
                      }}>
                        🐛 Fixed
                      </div>
                      <div style={{
                        color: '#475569',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {currentChangelog.bug_fixes[0]}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                    Track your growth with
                  </div>
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: exportStyle === 'gradient' ? '#f43f5e' : exportStyle === 'minimal' ? '#1e293b' : '#059669'
                  }}>
                    Pulse
                  </div>
                  <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '4px' }}>
                    yourpulse.app
                  </div>
                </div>
              </div>
            </div>

            {/* Style Selection */}
            <div className="space-y-2 mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-3">Choose a style:</p>
              
              <button
                onClick={() => setExportStyle('gradient')}
                className={`w-full p-3 rounded-xl border-2 transition-all text-sm ${
                  exportStyle === 'gradient'
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-slate-200 bg-white hover:border-orange-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-200 via-rose-200 to-orange-200"></div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-800">Warm Gradient</div>
                    <div className="text-xs text-slate-600">Energetic and vibrant</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setExportStyle('minimal')}
                className={`w-full p-3 rounded-xl border-2 transition-all text-sm ${
                  exportStyle === 'minimal'
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-slate-200 bg-white hover:border-orange-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-white border border-slate-200"></div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-800">Minimal</div>
                    <div className="text-xs text-slate-600">Clean and professional</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setExportStyle('nature')}
                className={`w-full p-3 rounded-xl border-2 transition-all text-sm ${
                  exportStyle === 'nature'
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-slate-200 bg-white hover:border-orange-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-200 via-amber-200 to-rose-200"></div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-800">Nature</div>
                    <div className="text-xs text-slate-600">Earthy and calming</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 bg-white border-2 border-slate-300 text-slate-700 py-3 rounded-2xl font-medium hover:border-slate-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={exportToImage}
                disabled={isExporting}
                className="flex-1 bg-gradient-to-r from-rose-400 to-orange-400 text-white py-3 rounded-2xl font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-shadow disabled:opacity-50"
              >
                {isExporting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full mb-4 border-2 border-emerald-300">
            <Check className="w-4 h-4 text-emerald-700" />
            <span className="text-sm text-emerald-700 font-medium">Recorded</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-800">Here's what I'm hearing</h1>
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

          {currentChangelog.new_features?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-emerald-600 font-semibold mb-3">✨ New this week</h3>
              <ul className="space-y-2">
                {currentChangelog.new_features?.map((f, i) => (
                  <li key={i} className="text-slate-700 pl-4">• {f}</li>
                ))}
              </ul>
            </div>
          )}

          {currentChangelog.bug_fixes?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-blue-600 font-semibold mb-3">🎯 Made progress on</h3>
              <ul className="space-y-2">
                {currentChangelog.bug_fixes?.map((f, i) => (
                  <li key={i} className="text-slate-700 pl-4">• {f}</li>
                ))}
              </ul>
            </div>
          )}

          {currentChangelog.known_issues?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-amber-600 font-semibold mb-3">⚠️ Still working through</h3>
              <ul className="space-y-2">
                {currentChangelog.known_issues?.map((f, i) => (
                  <li key={i} className="text-slate-700 pl-4">• {f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* SIMILAR MOMENTS */}
        {history.length > 3 && currentChangelog?.id && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 border-2 border-blue-200 mb-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              You've Felt This Way Before
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Based on your mood ({currentChangelog.mood}/10), here are similar moments from your journey:
            </p>
            <div className="space-y-3">
              {history
                .filter(e => e.id && currentChangelog.id && e.id !== currentChangelog.id && Math.abs(e.mood - currentChangelog.mood) <= 1.5)
                .slice(0, 3)
                .map(e => (
                  <div key={e.id} className="bg-white rounded-xl p-4 border border-blue-200">
                    <div className="flex justify-between mb-2">
                      <div className="font-medium text-slate-800">{e.version}</div>
                      <div className="flex items-center gap-1">
                        <span className="text-xl">{getMoodEmoji(e.mood)}</span>
                        <span className="text-sm text-slate-600">{e.mood}/10</span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">{e.date}</div>
                    {e.new_features && e.new_features[0] && (
                      <div className="text-sm text-slate-700 mt-2">
                        <span className="text-emerald-500">✨</span> {e.new_features[0]}
                      </div>
                    )}
                  </div>
                ))}
              {history.filter(e => e.id && currentChangelog.id && e.id !== currentChangelog.id && Math.abs(e.mood - currentChangelog.mood) <= 1.5).length === 0 && (
                <div className="text-center text-slate-500 py-4">
                  <p className="text-sm">No similar moments found yet. Keep checking in!</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex-1 bg-white border-2 border-rose-300 hover:border-rose-400 text-rose-600 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
          >
            <Share2 className="w-5 h-5" />
            Share to Instagram
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
  // Filter logic
  const filteredHistory = history.filter(e => {
    const matchesMood = moodFilter === 'all' ||
      (moodFilter === 'high' && e.mood >= 7) ||
      (moodFilter === 'medium' && e.mood >= 5 && e.mood < 7) ||
      (moodFilter === 'low' && e.mood < 5);
    
    const matchesSearch = searchQuery === '' || 
      e.new_features?.some(f => f.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.bug_fixes?.some(f => f.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.known_issues?.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesMood && matchesSearch;
  });

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
              How's it really going?
            </button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search your entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-rose-400 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMoodFilter('all')}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                      moodFilter === 'all' 
                        ? 'bg-slate-700 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setMoodFilter('high')}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                      moodFilter === 'high' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                    }`}
                  >
                    High
                  </button>
                  <button
                    onClick={() => setMoodFilter('medium')}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                      moodFilter === 'medium' 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                    }`}
                  >
                    Mid
                  </button>
                  <button
                    onClick={() => setMoodFilter('low')}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                      moodFilter === 'low' 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                    }`}
                  >
                    Low
                  </button>
                </div>
              </div>
            </div>

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
                    <span className="font-semibold">Total: </span>
                    {history.length} entries
                  </div>
                </div>
              </div>
            )}

            {/* Filtered Results */}
            <div className="mb-4 text-sm text-slate-600">
              Showing {filteredHistory.length} of {history.length} entries
            </div>

            <div className="space-y-6">
              {filteredHistory.map(e => (
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

            {filteredHistory.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">🔍</span>
                <p className="text-slate-600">No entries match your filters</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

  return null;
}