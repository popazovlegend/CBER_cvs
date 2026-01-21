"use client";

import { useState } from "react";
import { Upload, Sparkles, FileText, Mic, Presentation, Loader2, Search, Star, Eye, BookOpen, Plus, X } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { PresentationViewer } from "@/components/PresentationViewer";
import { DialogLine, Slide, Source } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Sample notes data (like firstUX.py)
const sampleNotes = [
  {
    id: '1',
    title: 'Квадратные уравнения',
    subject: 'Математика',
    author: 'Иван П.',
    date: '2024-12-15',
    rating: 4.5,
    views: 45,
  },
  {
    id: '2',
    title: 'Фотосинтез',
    subject: 'Биология',
    author: 'Мария К.',
    date: '2024-12-18',
    rating: 5.0,
    views: 78,
  },
  {
    id: '3',
    title: 'Великая французская революция',
    subject: 'История',
    author: 'Алексей Н.',
    date: '2024-12-20',
    rating: 4.2,
    views: 32,
  },
];

const subjects = ['Все', 'Математика', 'Физика', 'Химия', 'Биология', 'История', 'Литература'];

export default function Home() {
  // Tab state
  const [activeMainTab, setActiveMainTab] = useState<"browse" | "upload">("upload");

  // Browse tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Все");

  // Upload tab state
  const [sourceText, setSourceText] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<"audio" | "slides" | "summary">("summary");

  const [script, setScript] = useState<DialogLine[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [summary, setSummary] = useState("");

  // Form state (like firstUX.py)
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSubject, setNoteSubject] = useState("Математика");
  const [noteAuthor, setNoteAuthor] = useState("");

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

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || res.statusText);
      }

      const data = await res.json();

      if (data.text) {
        const newSource: Source = {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type.startsWith('image') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'text',
          content: data.text,
          date: new Date()
        };
        setSources(prev => [...prev, newSource]);
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Ошибка обработки файла");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const removeSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const getCombinedContext = () => {
    const sourceContent = sources.map(s => `[Источник: ${s.name}]\n${s.content}`).join("\n\n");
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

      if (!res.ok) {
        throw new Error(res.statusText);
      }

      const data = await res.json();

      if (type === "audio_script") {
        setScript(data);
        setActiveOutputTab("audio");
      } else if (type === "presentation") {
        setSlides(data);
        setActiveOutputTab("slides");
      } else {
        setSummary(data.summary || data.text || JSON.stringify(data));
        setActiveOutputTab("summary");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка генерации. Попробуйте снова.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredNotes = sampleNotes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "Все" || note.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 font-sans">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2.5 rounded-xl shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">📚 Цифровые конспекты</h1>
            <p className="text-xs text-slate-400">Всего конспектов: {sampleNotes.length} | AI-обработка</p>
          </div>
        </div>
      </header>

      {/* Main Tabs (like firstUX.py) */}
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveMainTab("browse")}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${activeMainTab === "browse"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
          >
            <Search className="w-4 h-4" /> Найти конспект
          </button>
          <button
            onClick={() => setActiveMainTab("upload")}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${activeMainTab === "upload"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
          >
            <Upload className="w-4 h-4" /> Загрузить конспект
          </button>
        </div>

        {/* Browse Tab */}
        {activeMainTab === "browse" && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-slate-400 mb-1 block">Поиск</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Название конспекта..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 ring-purple-500 outline-none"
                  />
                </div>
              </div>
              <div className="min-w-[150px]">
                <label className="text-xs text-slate-400 mb-1 block">Предмет</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 ring-purple-500 outline-none"
                >
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Notes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map(note => (
                <div key={note.id} className="bg-slate-900/80 border border-slate-700 rounded-xl p-5 hover:border-purple-500/50 transition-all group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg">{note.subject}</span>
                    <div className="flex items-center gap-1 text-amber-400 text-sm">
                      <Star className="w-3.5 h-3.5 fill-current" /> {note.rating}
                    </div>
                  </div>
                  <h3 className="font-semibold text-white mb-2 group-hover:text-purple-300 transition">{note.title}</h3>
                  <p className="text-sm text-slate-400 mb-3">Автор: {note.author}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{note.date}</span>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {note.views}
                    </div>
                  </div>
                </div>
              ))}
              {filteredNotes.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500">
                  Конспекты не найдены
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeMainTab === "upload" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6 flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" /> Новый конспект
              </h2>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Название</label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Квадратные уравнения"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Предмет</label>
                  <select
                    value={noteSubject}
                    onChange={(e) => setNoteSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                  >
                    {subjects.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Автор</label>
                  <input
                    type="text"
                    value={noteAuthor}
                    onChange={(e) => setNoteAuthor(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Источники (фото/PDF)</label>
                <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${isProcessing ? 'opacity-50 pointer-events-none border-slate-600' : 'border-slate-600 hover:border-purple-500 hover:bg-purple-500/5'}`}>
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">{isProcessing ? "Сканирование..." : "Выбрать файл"}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,image/*,.txt" disabled={isProcessing} />
                </label>
              </div>

              {/* Sources List */}
              {sources.length > 0 && (
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {sources.map(source => (
                    <div key={source.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg text-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {source.type === 'image' ? <Sparkles className="w-4 h-4 text-purple-400" /> : <FileText className="w-4 h-4 text-blue-400" />}
                        <span className="truncate text-white">{source.name}</span>
                        <span className="text-xs text-slate-500">{(source.content.length / 1000).toFixed(1)}k</span>
                      </div>
                      <button onClick={() => removeSource(source.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Text Input */}
              <div className="flex-1 flex flex-col min-h-0">
                <label className="text-xs text-slate-400 mb-1">Текст / Заметки</label>
                <textarea
                  className="flex-1 min-h-[120px] w-full bg-slate-900 rounded-lg p-3 resize-none border border-slate-700 focus:ring-2 ring-purple-500 outline-none text-white text-sm"
                  placeholder="Вставьте текст или заметки..."
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => generate("summary")}
                  disabled={isGenerating || (!sourceText && sources.length === 0)}
                  className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/30 transition"
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">Конспект</span>
                </button>
                <button
                  onClick={() => generate("audio_script")}
                  disabled={isGenerating || (!sourceText && sources.length === 0)}
                  className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/30 transition"
                >
                  <Mic className="w-5 h-5" />
                  <span className="text-xs">Аудио</span>
                </button>
                <button
                  onClick={() => generate("presentation")}
                  disabled={isGenerating || (!sourceText && sources.length === 0)}
                  className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/30 transition"
                >
                  <Presentation className="w-5 h-5" />
                  <span className="text-xs">Слайды</span>
                </button>
              </div>
            </div>

            {/* Right: Output */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6 flex flex-col relative overflow-hidden">
              {isGenerating && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                  <p className="text-slate-400 animate-pulse">🧠 AI обрабатывает...</p>
                </div>
              )}

              {/* Output Tabs */}
              <div className="flex items-center gap-2 mb-5 border-b border-slate-700 pb-4">
                {[
                  { key: "summary", label: "Конспект", icon: FileText },
                  { key: "audio", label: "Аудио", icon: Mic },
                  { key: "slides", label: "Слайды", icon: Presentation },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveOutputTab(tab.key as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeOutputTab === tab.key
                        ? "bg-purple-600 text-white"
                        : "text-slate-400 hover:bg-slate-700"
                      }`}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Output Content */}
              <div className="flex-1 overflow-y-auto">
                {activeOutputTab === "summary" && (
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-purple-300 prose-strong:text-white">
                    {summary ? (
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {summary}
                      </ReactMarkdown>
                    ) : (
                      <div className="text-center text-slate-500 py-16">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Загрузите материал и нажмите "Конспект"</p>
                      </div>
                    )}
                  </div>
                )}

                {activeOutputTab === "audio" && (
                  script.length > 0 ? (
                    <AudioPlayer script={script} />
                  ) : (
                    <div className="text-center text-slate-500 py-16">
                      <Mic className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Нажмите "Аудио" для генерации подкаста</p>
                    </div>
                  )
                )}

                {activeOutputTab === "slides" && (
                  slides.length > 0 ? (
                    <PresentationViewer slides={slides} />
                  ) : (
                    <div className="text-center text-slate-500 py-16">
                      <Presentation className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Нажмите "Слайды" для создания презентации</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
