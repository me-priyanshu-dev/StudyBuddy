import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  BrainCircuit, 
  MessageSquare, 
  LayoutDashboard, 
  Upload, 
  Send, 
  Loader2,
  FileText,
  Image as ImageIcon,
  PlusCircle,
  X,
  Map,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Star,
  Trophy,
  Flag,
  Pencil,
  Moon,
  Sun
} from 'lucide-react';
import { AppView, ChatMessage, MindMapNode, LearningPath, UserProfile } from './types';
import * as GeminiService from './services/geminiService';
import MindMapViewer from './components/MindMapViewer';
import MarkdownContent from './components/MarkdownContent';

// Helper to read file as base64
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const NAV_ITEMS = [
  { id: AppView.DASHBOARD, label: 'Home', icon: LayoutDashboard },
  { id: AppView.NOTES, label: 'Notes', icon: FileText },
  { id: AppView.MINDMAP, label: 'Mind Map', icon: BrainCircuit },
  { id: AppView.LEARNING_PATH, label: 'Journey', icon: Map },
  { id: AppView.TUTOR, label: 'Prof. Nova', icon: MessageSquare },
];

export default function App() {
  const [activeView, setActiveView] = useState<AppView>(AppView.DASHBOARD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('studyBuddyTheme');
    return saved ? saved === 'dark' : false;
  });

  // User Profile / Onboarding State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('studyBuddyProfile');
    return saved ? JSON.parse(saved) : { name: '', grade: '', targetExam: '', isOnboarded: false };
  });

  // Notes State
  const [notePrompt, setNotePrompt] = useState('');
  const [generatedNote, setGeneratedNote] = useState<string | null>(null);
  const [noteFile, setNoteFile] = useState<File | null>(null);

  // Mind Map State
  const [mindMapTopic, setMindMapTopic] = useState('');
  const [mindMapData, setMindMapData] = useState<MindMapNode | null>(null);

  // Learning Path State
  const [learningTopic, setLearningTopic] = useState('');
  const [learningLevel, setLearningLevel] = useState('Beginner');
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatFile, setChatFile] = useState<File | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('studyBuddyTheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('studyBuddyTheme', 'light');
    }
  }, [isDarkMode]);

  // Initial Chat Welcome
  useEffect(() => {
    if (userProfile.isOnboarded && chatHistory.length === 0) {
      setChatHistory([{
        id: 'init',
        role: 'model',
        text: `Hi ${userProfile.name}! I'm Professor Nova 👩‍🏫. \n\nI see you're in **${userProfile.grade}** preparing for **${userProfile.targetExam}**. \n\nI'm here to help you ace it! Ask me anything, generate notes, or upload a problem.`
      }]);
    }
  }, [userProfile.isOnboarded]);

  const saveProfile = () => {
    const updated = { ...userProfile, isOnboarded: true };
    setUserProfile(updated);
    localStorage.setItem('studyBuddyProfile', JSON.stringify(updated));
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Handlers
  const handleGenerateNote = async () => {
    const promptToSend = notePrompt || (noteFile ? "Analyze this file and create detailed study notes." : "");
    if (!promptToSend && !noteFile) return;

    setLoading(true);
    setError(null);
    try {
      let fileData = undefined;
      let mimeType = undefined;
      if (noteFile) {
        fileData = await readFileAsBase64(noteFile);
        mimeType = noteFile.type;
      }
      const note = await GeminiService.generateNotesService(promptToSend, fileData, mimeType, userProfile);
      setGeneratedNote(note);
    } catch (err: any) {
      setError(err.message || "Failed to generate notes.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMindMap = async () => {
    if (!mindMapTopic) return;
    setLoading(true);
    setError(null);
    try {
      const data = await GeminiService.generateMindMapData(mindMapTopic);
      setMindMapData(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate mind map.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePath = async () => {
    if (!learningTopic) return;
    setLoading(true);
    setError(null);
    try {
      const path = await GeminiService.generateLearningPath(learningTopic, learningLevel, userProfile);
      setLearningPath(path);
    } catch (err: any) {
      setError(err.message || "Failed to generate learning path.");
    } finally {
      setLoading(false);
    }
  };

  const handleStudyStep = (stepTitle: string, concepts: string[]) => {
    setActiveView(AppView.NOTES);
    setNotePrompt(`Create detailed, easy-to-understand notes for the topic: "${stepTitle}" from our unit on "${learningTopic}". \n\nCover these key concepts: ${concepts.join(', ')}. \n\nInclude examples and a summary.`);
    setGeneratedNote(null);
  };

  const handleSendMessage = async () => {
    if (!chatInput && !chatFile) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput,
      image: chatFile ? URL.createObjectURL(chatFile) : undefined
    };

    setChatHistory(prev => [...prev, newMessage]);
    setChatInput('');
    const fileToUpload = chatFile;
    setChatFile(null); 
    setLoading(true);

    try {
      const apiHistory = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      let base64Image = undefined;
      if (fileToUpload) {
        base64Image = await readFileAsBase64(fileToUpload);
      }

      const responseText = await GeminiService.chatWithTutor(apiHistory, newMessage.text, userProfile, base64Image);
      
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      }]);
    } catch (err: any) {
       setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Error: ${err.message || "Something went wrong."}`,
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Onboarding Component ---
  if (!userProfile.isOnboarded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-dots">
        <div className="max-w-md w-full bg-white/90 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-8 relative overflow-hidden text-center transition-colors">
          
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-inner">
              <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-300" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Hi There! 👋</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">I'm <span className="font-bold text-purple-600 dark:text-purple-400">Professor Nova</span>. Let's get to know you!</p>
          </div>

          <div className="space-y-5">
            <div className="text-left">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Name</label>
              <input 
                type="text" 
                value={userProfile.name}
                onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-purple-400 focus:ring-0 outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
                placeholder="What should I call you?"
              />
            </div>
            
            <div className="text-left">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Grade / Class</label>
              <select 
                value={userProfile.grade}
                onChange={(e) => setUserProfile({...userProfile, grade: e.target.value})}
                className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-purple-400 focus:ring-0 outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="" disabled>Select Grade</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10 (Boards)</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 12">Class 12 (Boards)</option>
                <option value="College">College / University</option>
              </select>
            </div>

            <div className="text-left">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">My Goal</label>
               <select 
                value={userProfile.targetExam}
                onChange={(e) => setUserProfile({...userProfile, targetExam: e.target.value})}
                className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-purple-400 focus:ring-0 outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="" disabled>Select Goal</option>
                <option value="School Exams">School Exams</option>
                <option value="JEE Mains/Adv">JEE Mains / Advanced</option>
                <option value="NEET">NEET</option>
                <option value="UPSC">UPSC</option>
                <option value="SAT">SAT</option>
                <option value="Learning for Fun">Just Learning</option>
              </select>
            </div>

            <button 
              onClick={saveProfile}
              disabled={!userProfile.name || !userProfile.grade || !userProfile.targetExam}
              className="btn-bubbly w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
            >
              Let's Learn! <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Sidebar
  const Sidebar = () => (
    <div className="hidden lg:flex flex-col w-72 bg-white/80 dark:bg-slate-900/90 backdrop-blur border-r border-slate-100 dark:border-slate-800 h-full shadow-sm z-10 transition-colors">
      <div className="p-8 pb-4 flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          StudyBuddy
        </h1>
      </div>
      
      <div className="px-6 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800/50 rounded-3xl p-4 border border-blue-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/40 dark:bg-white/5 rounded-full transform translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-lg border-2 border-purple-100 dark:border-slate-600 shadow-sm">
                    {userProfile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-bold text-slate-800 dark:text-white leading-tight">{userProfile.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] font-medium">{userProfile.targetExam}</p>
                </div>
            </div>
             <button onClick={() => setUserProfile({...userProfile, isOnboarded: false})} className="text-xs text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold mt-2 ml-1">Edit Profile</button>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`btn-bubbly w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${
              activeView === item.id
                ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-lg'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <item.icon className={`w-6 h-6 ${activeView === item.id ? 'text-pink-300' : ''}`} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-6 space-y-4">
         <button 
           onClick={toggleDarkMode}
           className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
         >
           {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           {isDarkMode ? 'Light Mode' : 'Dark Mode'}
         </button>
         <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl text-xs text-slate-500 dark:text-slate-400 font-bold text-center">
          Powered by Gemini 2.5 ✨
         </div>
      </div>
    </div>
  );

  // Mobile Bottom Navigation
  const BottomNav = () => (
    <div className="lg:hidden fixed bottom-6 left-4 right-4 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur rounded-3xl flex justify-around items-center p-2 z-50 shadow-2xl border border-white/20">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveView(item.id)}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
            activeView === item.id ? 'bg-white/10 text-white scale-110' : 'text-slate-400'
          }`}
        >
          <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-pink-300' : ''}`} strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );

  // Views
  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto p-6 md:p-10 h-full overflow-y-auto">
      <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white mb-2">Welcome back, {userProfile.name}! 🌟</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg font-medium">What shall we conquer today?</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pb-24">
        {[
            { id: AppView.TUTOR, icon: MessageSquare, title: 'Chat with Nova', desc: 'Ask doubts instantly.', bg: 'bg-cute-pink dark:bg-slate-800', border: 'border-cute-pinkBorder dark:border-slate-700', text: 'text-pink-600 dark:text-pink-400' },
            { id: AppView.NOTES, icon: FileText, title: 'Visual Notes', desc: 'Make boring text fun.', bg: 'bg-cute-blue dark:bg-slate-800', border: 'border-cute-blueBorder dark:border-slate-700', text: 'text-blue-600 dark:text-blue-400' },
            { id: AppView.LEARNING_PATH, icon: Map, title: 'My Journey', desc: 'Map out your chapters.', bg: 'bg-cute-green dark:bg-slate-800', border: 'border-cute-greenBorder dark:border-slate-700', text: 'text-green-600 dark:text-green-400' },
            { id: AppView.MINDMAP, icon: BrainCircuit, title: 'Mind Magic', desc: 'Connect the dots.', bg: 'bg-cute-purple dark:bg-slate-800', border: 'border-cute-purpleBorder dark:border-slate-700', text: 'text-purple-600 dark:text-purple-400' },
        ].map((card) => (
            <div 
            key={card.id}
            onClick={() => setActiveView(card.id)}
            className={`btn-bubbly ${card.bg} p-8 rounded-[2rem] border-4 ${card.border} cursor-pointer group hover:brightness-105 relative overflow-hidden`}
            >
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/30 dark:bg-white/5 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
            <div className={`w-16 h-16 bg-white dark:bg-slate-700 ${card.text} rounded-2xl flex items-center justify-center mb-4 shadow-sm text-3xl transition-colors`}>
                <card.icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{card.title}</h3>
            <p className="text-slate-600 dark:text-slate-400 font-medium">{card.desc}</p>
            </div>
        ))}
      </div>
    </div>
  );

  const renderNotesView = () => (
    <div className="flex flex-col h-full p-4 md:p-8 max-w-7xl mx-auto w-full gap-6 overflow-y-auto pb-24 lg:pb-8">
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        {/* Input */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4 transition-colors">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400"><Upload className="w-5 h-5" /></div>
                 Source Material
             </h3>
             <div>
               <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Topic or Text</label>
               <textarea 
                  className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-blue-400 focus:ring-0 outline-none resize-none h-40 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
                  placeholder="Paste text or describe what you want notes on..."
                  value={notePrompt}
                  onChange={(e) => setNotePrompt(e.target.value)}
               />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Upload File</label>
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-slate-50/50 dark:bg-slate-800/50 group">
                  <input 
                    type="file" 
                    accept="application/pdf,image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                  />
                  <FileText className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold truncate max-w-full px-2 text-slate-600 dark:text-slate-400">{noteFile ? noteFile.name : "Drop PDF or Image"}</span>
                </div>
             </div>
             <button 
                onClick={handleGenerateNote}
                disabled={loading || (!notePrompt && !noteFile)}
                className="btn-bubbly w-full bg-blue-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-blue-200 dark:shadow-none shadow-lg"
             >
                {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Make Magic Notes ✨"}
             </button>
             {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}
          </div>
        </div>

        {/* Output */}
        <div className="w-full lg:w-2/3 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col relative min-h-[500px] overflow-hidden transition-colors">
           <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-900 z-10 pointer-events-none"></div>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur flex justify-between items-center flex-shrink-0 z-20">
            <h3 className="font-bold text-slate-700 dark:text-slate-200 font-hand text-xl px-4">📝 My Notebook</h3>
            {generatedNote && (
              <button onClick={() => setGeneratedNote(null)} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-red-400 hover:text-red-500 shadow-sm transition-colors">Clear Page</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-0 notebook-paper relative">
            {/* Margin Line */}
            <div className="absolute left-8 md:left-16 top-0 bottom-0 w-0.5 bg-red-300 dark:bg-red-900/50 h-full pointer-events-none opacity-50"></div>
            
            <div className="p-8 pl-12 md:pl-24 min-h-full">
              {generatedNote ? (
                <MarkdownContent content={generatedNote} variant="handwritten" />
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-300 dark:text-slate-600 flex-col gap-4 font-hand text-2xl mt-20">
                   <div className="rotate-12 transform">
                     <FileText className="w-24 h-24 opacity-20 text-blue-400" />
                   </div>
                  <p>Notes will appear here...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMindMapView = () => (
    <div className="flex flex-col h-full p-4 md:p-8 gap-6 overflow-y-auto pb-24 lg:pb-8">
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex-shrink-0 transition-colors">
        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
            <BrainCircuit className="w-6 h-6" />
        </div>
        <input 
          type="text"
          placeholder="Enter a topic (e.g., 'Photosynthesis')"
          className="flex-1 w-full bg-transparent outline-none text-slate-800 dark:text-white placeholder:text-slate-400 border-b-2 border-transparent focus:border-purple-300 py-2 text-lg font-bold transition-colors"
          value={mindMapTopic}
          onChange={(e) => setMindMapTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerateMindMap()}
        />
        <button 
          onClick={handleGenerateMindMap}
          disabled={loading || !mindMapTopic}
          className="btn-bubbly w-full md:w-auto bg-purple-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-purple-600 disabled:opacity-50 transition-all shadow-purple-200 dark:shadow-none shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Visualize 🔮"}
        </button>
      </div>
      {error && <p className="text-red-500 font-bold text-center">{error}</p>}
      
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative min-h-[400px] transition-colors">
        <MindMapViewer data={mindMapData} isDarkMode={isDarkMode} />
      </div>
    </div>
  );

  const renderLearningPathView = () => (
    <div className="flex flex-col h-full p-4 md:p-8 gap-8 max-w-5xl mx-auto w-full overflow-y-auto pb-24 lg:pb-8">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex-shrink-0 transition-colors">
        <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400"><Map className="w-6 h-6" /></div>
            Create Your Adventure
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">I want to master...</label>
                <input 
                    type="text"
                    value={learningTopic}
                    onChange={(e) => setLearningTopic(e.target.value)}
                    placeholder="e.g. Calculus, French Revolution"
                    className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-green-400 focus:ring-0 outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium transition-colors"
                />
            </div>
            <div className="w-full md:w-48">
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Difficulty</label>
                <select 
                    value={learningLevel}
                    onChange={(e) => setLearningLevel(e.target.value)}
                    className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-green-400 focus:ring-0 outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-colors"
                >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                </select>
            </div>
            <div className="flex items-end">
                <button 
                    onClick={handleGeneratePath}
                    disabled={loading || !learningTopic}
                    className="btn-bubbly w-full md:w-auto bg-green-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-green-600 disabled:opacity-50 h-[58px] flex items-center justify-center gap-2 shadow-green-200 dark:shadow-none shadow-lg"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Start Quest 🚀"}
                </button>
            </div>
        </div>
        {error && <p className="text-red-500 mt-4 text-center font-bold">{error}</p>}
      </div>

      {learningPath && (
        <div className="space-y-8 pb-10">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">{learningPath.topic}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Your Quest Map</p>
            </div>
            
            <div className="relative max-w-3xl mx-auto py-4">
                {/* Winding Path Line */}
                <div className="absolute left-8 md:left-1/2 top-4 bottom-4 w-1 bg-slate-200 dark:bg-slate-700 border-l-2 border-dashed border-slate-300 dark:border-slate-600 md:-translate-x-1/2 rounded-full"></div>
                
                {learningPath.steps.map((step, idx) => {
                    const colors = [
                      'bg-cute-pink border-cute-pinkBorder text-pink-700 dark:bg-slate-800 dark:border-slate-700 dark:text-pink-400', 
                      'bg-cute-blue border-cute-blueBorder text-blue-700 dark:bg-slate-800 dark:border-slate-700 dark:text-blue-400', 
                      'bg-cute-purple border-cute-purpleBorder text-purple-700 dark:bg-slate-800 dark:border-slate-700 dark:text-purple-400', 
                      'bg-cute-yellow border-cute-yellowBorder text-yellow-700 dark:bg-slate-800 dark:border-slate-700 dark:text-yellow-400'
                    ];
                    const colorClass = colors[idx % colors.length];
                    
                    return (
                    <div key={idx} className={`relative flex flex-col md:flex-row gap-8 mb-12 ${idx % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                        {/* Checkpoint Marker */}
                        <div className={`absolute left-8 md:left-1/2 w-12 h-12 ${idx === 0 ? 'bg-green-500' : (idx === learningPath.steps.length - 1 ? 'bg-yellow-400' : 'bg-white dark:bg-slate-700')} rounded-full border-4 border-slate-100 dark:border-slate-800 shadow-md transform md:-translate-x-1/2 -translate-x-1/2 flex items-center justify-center z-10 text-white dark:text-slate-200 font-bold text-lg`}>
                            {idx === 0 ? <Flag className="w-5 h-5" /> : (idx === learningPath.steps.length - 1 ? <Trophy className="w-5 h-5" /> : idx + 1)}
                        </div>
                        
                        {/* Content Card */}
                        <div className={`w-full md:w-[calc(50%-3rem)] pl-20 md:pl-0 ${idx % 2 !== 0 ? 'md:text-right' : ''}`}>
                           <div className={`btn-bubbly ${colorClass} p-6 rounded-[2rem] border-4 shadow-sm hover:shadow-md transition-all`}>
                                <div className={`flex flex-col ${idx % 2 !== 0 ? 'md:items-end' : ''}`}>
                                    <span className="text-xs font-black uppercase opacity-60 mb-1 tracking-wider text-slate-700 dark:text-slate-400">{step.estimatedTime}</span>
                                    <h4 className="font-extrabold text-xl mb-2 text-slate-800 dark:text-white">{step.title}</h4>
                                    <p className="text-sm opacity-80 mb-4 font-medium leading-relaxed text-slate-700 dark:text-slate-300">{step.description}</p>
                                    <div className={`flex flex-wrap gap-2 ${idx % 2 !== 0 ? 'md:justify-end' : ''} mb-4`}>
                                        {step.keyConcepts.map((concept, cIdx) => (
                                            <span key={cIdx} className="text-[10px] bg-white/50 dark:bg-white/10 px-3 py-1 rounded-full font-bold border border-white/20 dark:border-white/5 dark:text-slate-200">
                                                {concept}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    <button 
                                      onClick={() => handleStudyStep(step.title, step.keyConcepts)}
                                      className="flex items-center gap-2 bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors w-fit text-slate-800 dark:text-white"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      Make Notes
                                    </button>
                                </div>
                           </div>
                        </div>
                    </div>
                )})}
            </div>
        </div>
      )}
    </div>
  );

  const renderTutorView = () => (
    <div className="flex h-full flex-col max-w-4xl mx-auto w-full p-2 md:p-6 overflow-hidden pb-24 lg:pb-6">
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 border-2 border-white dark:border-slate-700 shadow-sm">
                <Sparkles className="w-5 h-5" />
            </div>
            <div>
                 <span className="font-extrabold text-slate-800 dark:text-white block text-lg">Professor Nova</span>
                 <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Online • Ready to help</span>
            </div>
          </div>
          <button onClick={() => setChatHistory([])} className="text-xs font-bold text-slate-400 hover:text-red-400 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
            Clear Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-dots">
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[75%] rounded-3xl p-5 ${
                msg.role === 'user' 
                  ? 'bg-slate-800 dark:bg-slate-700 text-white rounded-br-sm shadow-md' 
                  : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm shadow-sm'
              }`}>
                {msg.image && (
                  <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-2xl mb-3 border-2 border-white/20" />
                )}
                <div className={`prose ${msg.role === 'user' ? 'prose-invert' : 'prose-slate dark:prose-invert'} max-w-none text-sm md:text-base leading-relaxed font-medium`}>
                   {msg.role === 'user' ? (
                     <p>{msg.text}</p>
                   ) : (
                     <MarkdownContent content={msg.text} />
                   )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
               <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl rounded-bl-sm p-4 shadow-sm flex items-center gap-3">
                 <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                 <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Thinking...</span>
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 transition-colors">
          {chatFile && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl w-fit border border-purple-100 dark:border-purple-800">
              <ImageIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 truncate max-w-[150px]">{chatFile.name}</span>
              <button onClick={() => setChatFile(null)} className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"><X className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex gap-2">
             <label className="p-3 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-2xl cursor-pointer transition-colors flex-shrink-0 flex items-center justify-center">
               <input 
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 onChange={(e) => setChatFile(e.target.files?.[0] || null)}
               />
               <PlusCircle className="w-7 h-7" />
             </label>
             <input
               type="text"
               value={chatInput}
               onChange={(e) => setChatInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
               placeholder={`Ask Nova about ${userProfile.targetExam || 'anything'}...`}
               className="flex-1 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-purple-200 dark:focus:border-purple-800 focus:bg-white dark:focus:bg-slate-900 rounded-2xl px-5 focus:ring-0 outline-none min-w-0 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium transition-all"
             />
             <button 
               onClick={handleSendMessage}
               disabled={(!chatInput && !chatFile) || loading}
               className="p-3 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 transition-all shadow-md flex-shrink-0 btn-bubbly"
             >
               <Send className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dots flex-col lg:flex-row font-cute transition-colors duration-300">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-20 flex-shrink-0 shadow-sm sticky top-0 transition-colors">
             <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 flex items-center gap-2">
                 <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                 StudyBuddy
             </h1>
             <div className="flex items-center gap-3">
                 <button onClick={toggleDarkMode} className="text-slate-500 dark:text-slate-300">
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                 </button>
                 <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm border-2 border-white dark:border-slate-700 shadow-sm">
                    {userProfile.name.charAt(0).toUpperCase()}
                 </div>
             </div>
        </div>

        {!process.env.API_KEY && (
             <div className="bg-red-400 text-white text-center py-2 text-xs font-bold flex-shrink-0">
               Warning: API_KEY is missing.
             </div>
        )}
        
        <div className="flex-1 overflow-hidden relative">
            {activeView === AppView.DASHBOARD && renderDashboard()}
            {activeView === AppView.NOTES && renderNotesView()}
            {activeView === AppView.MINDMAP && renderMindMapView()}
            {activeView === AppView.LEARNING_PATH && renderLearningPathView()}
            {activeView === AppView.TUTOR && renderTutorView()}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}