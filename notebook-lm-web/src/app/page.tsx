"use client";

import { useState, useEffect } from "react";
import { Plus, X, PanelLeftClose, PanelLeft, Bot, FileText, Mic, Presentation, Loader2, Search, Globe, FileCheck2, Edit2, Check, LogOut, User as UserIcon } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { PresentationViewer } from "@/components/PresentationViewer";
import { DialogLine, Slide, Source, Notebook } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Sidebar Item Component
const SidebarItem = ({ title, active, onClick, date }: { title: string, active: boolean, onClick: () => void, date?: string }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${
      active ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
    }`}
  >
    <span className="truncate pr-2">{title || "Без названия"}</span>
    {date && <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">{date}</span>}
  </button>
);

export default function Home() {
  // Auth state
  const [user, setUser] = useState<{userId: string, username: string} | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Navigation states
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [isExploreMode, setIsExploreMode] = useState(false);
  
  // Editor state
  const [noteTitle, setNoteTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<"editor" | "summary" | "audio" | "slides">("editor");

  const [script, setScript] = useState<DialogLine[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [summary, setSummary] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        fetchNotebooks(data.user.userId);
      }
    } catch(e) { /* ignore */ }
    setIsAuthLoading(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Ошибка аутентификации");
      
      setUser({ userId: data.id, username: data.username });
      fetchNotebooks(data.id);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setNotebooks([]);
    handleNew();
  };

  const fetchNotebooks = async (userId?: string, explore = false) => {
    try {
      const url = explore ? "/api/notebooks?explore=true" : "/api/notebooks";
      const res = await fetch(url);
      if (res.ok) {
        setNotebooks(await res.json());
      }
    } catch (e) {
      console.error("Ошибка загрузки конспектов", e);
    }
  };

  const toggleExploreMode = () => {
    const nextMode = !isExploreMode;
    setIsExploreMode(nextMode);
    fetchNotebooks(user?.userId, nextMode);
  };

  const handleNew = () => {
    setIsExploreMode(false);
    setActiveNotebookId(null);
    setNoteTitle("");
    setSourceText("");
    setSources([]);
    setScript([]);
    setSlides([]);
    setSummary("");
    setActiveOutputTab("editor");
    fetchNotebooks(user?.userId, false); 
  };

  const loadNotebook = async (n: Notebook) => {
    setIsExploreMode(false);
    setActiveNotebookId(n.id);
    setNoteTitle(n.title);
    setSourceText(n.source_text || "");
    try {
      setSources(JSON.parse(n.sources || "[]"));
      setScript(JSON.parse(n.audio_script || "[]"));
      setSlides(JSON.parse(n.slides || "[]"));
    } catch(e) { /* ignore */ }
    setSummary(n.summary || "");
    setActiveOutputTab(n.summary ? "summary" : "editor");
    
    // Switch sidebar back to personal notebooks if we were exploring
    if (isExploreMode) fetchNotebooks(user?.userId, false);
  };

  // Helper to persist state to DB
  const saveToDb = async (updates: Record<string, any>) => {
    if (!user) return; // Must be logged in
    try {
      if (activeNotebookId) {
        const res = await fetch(`/api/notebooks/${activeNotebookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (res.ok) fetchNotebooks(user.userId, false);
      } else {
        const payload = {
          title: updates.title || noteTitle || "Новый конспект",
          sourceText: updates.sourceText || sourceText,
          sources: updates.sources || JSON.stringify(sources),
          ...updates
        };
        const res = await fetch("/api/notebooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const fresh = await res.json();
          setActiveNotebookId(fresh.id);
          fetchNotebooks(user.userId, false);
        }
      }
    } catch(e) {
      console.error("Ошибка сохранения в базу данных", e);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => setNoteTitle(e.target.value);
  const handleTitleBlur = () => { if (noteTitle.trim() && noteTitle !== "Новый конспект") saveToDb({ title: noteTitle }); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Ошибка сервера: ${res.status}`);
      }

      if (data.text) {
        const newSource: Source = {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type.startsWith('image') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'text',
          content: data.text,
          date: new Date()
        };
        const updatedSources = [...sources, newSource];
        setSources(updatedSources);
        saveToDb({ sources: JSON.stringify(updatedSources) });
      } else {
        throw new Error("Сервер не вернул текст из файла");
      }
    } catch (error: any) {
      console.error("File upload error:", error);
      alert(`Ошибка обработки файла: ${error.message}`);
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const removeSource = (id: string) => {
    const updated = sources.filter(x => x.id !== id);
    setSources(updated);
    saveToDb({ sources: JSON.stringify(updated) });
  };

  const getCombinedContext = () => {
    const sourceContent = sources.map(s => `[Source: ${s.name}]\n${s.content}`).join("\n\n");
    return `${sourceText}\n\n${sourceContent}`.trim();
  };

  const generate = async (type: "audio_script" | "presentation" | "summary") => {
    const context = getCombinedContext();
    if (!context) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context }),
      });

      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();

      if (!activeNotebookId) {
        await saveToDb({ title: noteTitle || "Новый конспект", sourceText, sources: JSON.stringify(sources) });
      }

      if (type === "audio_script") {
        setScript(data);
        setActiveOutputTab("audio");
        saveToDb({ audioScript: JSON.stringify(data) });
      } else if (type === "presentation") {
        setSlides(data);
        setActiveOutputTab("slides");
        saveToDb({ slides: JSON.stringify(data) });
      } else {
        const sumText = data.summary || data.text || JSON.stringify(data);
        setSummary(sumText);
        setActiveOutputTab("summary");
        saveToDb({ summary: sumText });
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка генерации");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredNotebooks = notebooks.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // AUTH WALL rendering
  if (isAuthLoading) {
    return <div className="h-screen w-full bg-[#171717] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-500" /></div>;
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#171717] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] font-sans antialiased text-neutral-200">
        <div className="w-full max-w-sm p-8 border border-neutral-800 bg-[#212121]/90 backdrop-blur-xl rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-700">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">Цифровые Конспекты</h1>
            <p className="text-sm text-neutral-400">Войдите в ваше интеллектуальное пространство.</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">{authError}</div>}
            
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">Имя пользователя</label>
              <input 
                type="text" 
                value={authForm.username}
                onChange={e => setAuthForm({...authForm, username: e.target.value})}
                required
                className="w-full px-4 py-2.5 bg-[#171717] border border-neutral-800 focus:border-neutral-500 rounded-xl outline-none transition-colors"
                placeholder="Имя пользователя..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">Пароль</label>
              <input 
                type="password" 
                value={authForm.password}
                onChange={e => setAuthForm({...authForm, password: e.target.value})}
                required
                className="w-full px-4 py-2.5 bg-[#171717] border border-neutral-800 focus:border-neutral-500 rounded-xl outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="w-full py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors mt-2">
              {authMode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          <p className="text-center text-xs text-neutral-500 mt-6">
            {authMode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} className="text-neutral-300 hover:text-white hover:underline transition">
              {authMode === "login" ? "Зарегистрироваться" : "Войти"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // MAIN APP rendering
  return (
    <div className="flex h-screen bg-[#171717] text-neutral-200 font-sans overflow-hidden selection:bg-neutral-700 selection:text-white">
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-[260px]' : 'w-0'} overflow-hidden flex-shrink-0 transition-all duration-300 ease-in-out bg-[#171717] border-r border-[#2f2f2f] flex flex-col relative`}>
        <div className="p-3 flex flex-col gap-1 border-b border-[#2f2f2f]">
          <div className="flex gap-2 items-center justify-between">
            <button onClick={handleNew} className="flex-1 flex items-center justify-between px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm transition-colors cursor-pointer">
              <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Новый конспект</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 cursor-pointer">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <button onClick={toggleExploreMode} className={`w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isExploreMode ? "bg-neutral-200 text-black" : "text-neutral-300 hover:bg-neutral-800"}`}>
            <Globe className="w-4 h-4" /> База конспектов сообщества
          </button>
        </div>

        <div className="px-3 py-3">
          <div className="relative group">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input type="text" placeholder="Поиск конспектов..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-transparent border border-neutral-800 focus:border-neutral-600 rounded-md py-1.5 pl-8 pr-3 text-sm text-neutral-200 outline-none transition-colors placeholder:text-neutral-600" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">
          <div className="text-xs font-medium text-neutral-500 mb-2 px-1">{isExploreMode ? "Поиск по сообществу" : "Ваши цифровые конспекты"}</div>
          {filteredNotebooks.length === 0 ? (
            <div className="text-xs text-neutral-600 px-1 py-2">Конспектов не найдено</div>
          ) : (
            filteredNotebooks.map(n => (
              <SidebarItem key={n.id} title={n.title} active={activeNotebookId === n.id} onClick={() => loadNotebook(n)} />
            ))
          )}
        </div>

        {/* User Profile Bar */}
        <div className="p-3 border-t border-[#2f2f2f] bg-[#171717] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-300 truncate">
             <div className="w-7 h-7 bg-neutral-800 rounded-full flex items-center justify-center shrink-0"><UserIcon className="w-4 h-4"/></div>
             <span className="truncate">{user.username}</span>
          </div>
          <button onClick={logout} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-md transition cursor-pointer" title="Выйти">
             <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#212121]">
        
        {/* Top Navbar */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-transparent shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 transition cursor-pointer">
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            
            {!isExploreMode && (
              <input value={noteTitle} onChange={handleTitleChange} onBlur={handleTitleBlur} placeholder="Новый конспект" className="bg-transparent text-lg font-medium text-neutral-200 outline-none focus:ring-1 ring-neutral-700 rounded px-2 py-0.5 placeholder:text-neutral-600 w-full max-w-sm" />
            )}
            {isExploreMode && (
              <h2 className="text-lg font-medium text-neutral-200 px-2">Цифровые конспекты сообщества</h2>
            )}
          </div>

          {!isExploreMode && (
            <div className="flex items-center gap-2">
               {!isGenerating && sources.length > 0 && <span className="text-xs text-neutral-500 flex items-center gap-1"><FileCheck2 className="w-3.5 h-3.5" /> источников: {sources.length}</span>}
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto w-full relative">
          
          {isExploreMode ? (
            <div className="max-w-5xl mx-auto px-6 py-8 animate-in fade-in duration-500">
               <div className="mb-8">
                 <h1 className="text-3xl font-semibold mb-2 text-white">База конспектов</h1>
                 <p className="text-neutral-400 text-sm flex items-center gap-2"><Globe className="w-4 h-4"/> Изучайте цифровые конспекты, созданные другими участниками.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {notebooks.map(n => (
                   <div key={n.id} onClick={() => loadNotebook(n)} className="p-5 rounded-2xl border border-neutral-800 bg-[#1e1e1e] hover:bg-neutral-800 cursor-pointer shadow-sm hover:shadow-md transition-all group flex flex-col">
                     <div className="flex items-start justify-between mb-3">
                       <span className="text-xs px-2 py-1 bg-white/5 text-neutral-300 rounded-md border border-white/5">{n.subject || "Общее"}</span>
                     </div>
                     <h3 className="font-semibold text-[17px] mb-2 text-neutral-200 group-hover:text-white transition-colors">{n.title || "Без названия"}</h3>
                     <p className="text-sm text-neutral-500 line-clamp-2 mt-auto">
                       {n.summary ? n.summary.replace(/[^a-zA-Zа-яА-ЯёЁ0-9 ]/g, "").substring(0, 100) + "..." : "Конспект еще не сгенерирован."}
                     </p>
                     
                     <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-5 pt-3 border-t border-neutral-800/50">
                        <span className={user.username === n.author ? "text-blue-400" : ""}>{user.username === n.author ? "Вы" : `От ${n.author || "Аноним"}`}</span>
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-full">
              
              {/* Context/Editor Section */}
              {activeOutputTab === "editor" ? (
                <div className="flex-1 flex flex-col animate-in fade-in duration-500">
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sources.map(s => (
                        <div key={s.id} className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-full pl-3 pr-1.5 py-1 text-sm text-neutral-300">
                          <FileText className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="max-w-[120px] truncate">{s.name}</span>
                          <button onClick={() => removeSource(s.id)} className="text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      
                      <label className="flex items-center gap-2 bg-transparent border border-dashed border-neutral-700 hover:border-neutral-500 hover:text-neutral-300 rounded-full px-3 py-1 text-sm text-neutral-400 cursor-pointer transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                        {isProcessing ? "Извлечение..." : "Загрузить файл"}
                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,image/*,.txt" disabled={isProcessing} />
                      </label>
                    </div>

                    <textarea 
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      onBlur={() => saveToDb({ sourceText })}
                      placeholder="Добавьте свои заметки, вставьте текст или задайте вопрос..."
                      className="w-full min-h-[50vh] bg-transparent text-neutral-200 placeholder:text-neutral-600 text-lg resize-none outline-none leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                /* Viewer Section (Summary, Audio, Slides) */
                <div className="flex-1 animate-in slide-in-from-bottom-2 duration-500 pb-20">
                  {activeOutputTab === "summary" && (
                     <div className="max-w-none flex flex-col min-h-full relative">
                       <div className="flex justify-end mb-2 sticky top-0 z-10">
                         <button 
                           onClick={() => {
                             if (isEditingSummary) saveToDb({ summary });
                             setIsEditingSummary(!isEditingSummary);
                           }}
                           className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800/80 backdrop-blur hover:bg-neutral-700 rounded-lg transition border border-neutral-700"
                         >
                           {isEditingSummary ? <><Check className="w-3.5 h-3.5"/> Сохранить</> : <><Edit2 className="w-3.5 h-3.5"/> Изменить</>}
                         </button>
                       </div>
                       
                       {isEditingSummary ? (
                         <textarea
                           value={summary}
                           onChange={(e) => setSummary(e.target.value)}
                           className="w-full min-h-[50vh] bg-[#1a1a1a] text-neutral-200 placeholder:text-neutral-600 text-[15px] resize-none outline-none leading-relaxed border border-neutral-700 rounded-lg p-4 focus:border-neutral-500 transition-colors shadow-inner"
                         />
                       ) : (
                         <div className="prose prose-invert prose-neutral prose-p:leading-relaxed prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800 max-w-none">
                           <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{summary}</ReactMarkdown>
                         </div>
                       )}
                     </div>
                  )}
                  {activeOutputTab === "audio" && (
                   <div className="max-w-xl mx-auto mt-10">
                     {script.length > 0 ? <AudioPlayer script={script} /> : <div className="text-neutral-500 text-center">Аудио не сгенерировано.</div>}
                   </div>
                  )}
                  {activeOutputTab === "slides" && (
                    <div className="mt-4">
                      {slides.length > 0 ? <PresentationViewer slides={slides} /> : <div className="text-neutral-500 text-center">Слайды не сгенерированы.</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action / Toolbar (Bottom fixed) - Hidden in Explore Mode */}
        {!isExploreMode && (
          <div className="shrink-0 max-w-3xl w-full mx-auto p-4 mb-4">
            <div className="bg-neutral-800 border border-neutral-700 p-1.5 rounded-2xl flex items-center justify-between shadow-lg">
              
              {/* Tab Switches */}
              <div className="flex gap-1 bg-neutral-900/50 p-1 rounded-xl">
                <button onClick={() => setActiveOutputTab("editor")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeOutputTab === "editor" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}>Черновик</button>
                {(summary || isGenerating) && <button onClick={() => setActiveOutputTab("summary")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeOutputTab === "summary" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}><Bot className="w-4 h-4"/> Конспект</button>}
                {script.length > 0 && <button onClick={() => setActiveOutputTab("audio")} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeOutputTab === "audio" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}><Mic className="w-4 h-4"/></button>}
                {slides.length > 0 && <button onClick={() => setActiveOutputTab("slides")} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${activeOutputTab === "slides" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"}`}><Presentation className="w-4 h-4"/></button>}
              </div>

              {/* Sub-Actions */}
              <div className="flex gap-2 px-2">
                <button 
                  onClick={() => generate("summary")} 
                  disabled={isGenerating || (!sourceText && sources.length === 0)}
                  className="bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:bg-neutral-500 px-4 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer"
                >
                  {isGenerating ? "Анализирую..." : "Сгенерировать конспект"}
                </button>
                
                <div className="hidden sm:flex gap-1 border-l border-neutral-700 pl-2 ml-1">
                  <button 
                    onClick={() => generate("audio_script")}
                    disabled={isGenerating || (!sourceText && sources.length === 0)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    title="Создать подкаст"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => generate("presentation")}
                    disabled={isGenerating || (!sourceText && sources.length === 0)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    title="Создать презентацию"
                  >
                    <Presentation className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
            <div className="text-center mt-2 text-[11px] text-neutral-500">
               Система использует ИИ. Обязательно проверяйте важные сгенерированные конспекты.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
