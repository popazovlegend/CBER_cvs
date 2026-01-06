"use client";

import { useState } from "react";
import { Upload, Sparkles, FileText, Mic, Presentation, Loader2 } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { PresentationViewer } from "@/components/PresentationViewer";
import { DialogLine, Slide } from "@/types";
import { motion } from "framer-motion";

export default function Home() {
  const [sourceText, setSourceText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"audio" | "slides" | "summary">("summary");

  const [script, setScript] = useState<DialogLine[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [summary, setSummary] = useState("");

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
      if (data.text) {
        setSourceText(prev => prev + "\n" + data.text);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to process file");
    } finally {
      setIsProcessing(false);
    }
  };

  const generate = async (type: "audio_script" | "presentation" | "summary") => {
    if (!sourceText) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context: sourceText }),
      });
      const data = await res.json();

      if (type === "audio_script") {
        setScript(data);
        setActiveTab("audio");
      } else if (type === "presentation") {
        setSlides(data);
        setActiveTab("slides");
      } else {
        setSummary(data.summary || data.text || JSON.stringify(data));
        setActiveTab("summary");
      }
    } catch (e) {
      console.error(e);
      alert("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Cortex<span className="text-primary">Note</span></h1>
        </div>
        <div className="text-sm text-muted-foreground">Powered by Gemini 2.0 Flash Exp</div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
        {/* Left Column: Source */}
        <div className="flex flex-col gap-4 h-full">
          <div className="bg-card border rounded-xl p-6 flex-1 flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Sources
              </h2>
              <label className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md transition flex items-center gap-2 text-sm font-medium">
                <Upload className="w-4 h-4" />
                {isProcessing ? "Scanning..." : "Add Source"}
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,image/*,.txt" disabled={isProcessing} />
              </label>
            </div>

            <textarea
              className="flex-1 w-full bg-secondary/30 rounded-lg p-4 resize-none border focus:ring-2 ring-primary/50 outline-none transition font-mono text-sm leading-relaxed"
              placeholder="Paste text here or upload a file (PDF, Image, Text)..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => generate("summary")}
              disabled={isGenerating || !sourceText}
              className="flex flex-col items-center justify-center p-4 bg-card border rounded-xl hover:border-primary transition group disabled:opacity-50"
            >
              <FileText className="w-6 h-6 mb-2 text-muted-foreground group-hover:text-primary transition" />
              <span className="font-medium text-sm">Summary</span>
            </button>
            <button
              onClick={() => generate("audio_script")}
              disabled={isGenerating || !sourceText}
              className="flex flex-col items-center justify-center p-4 bg-card border rounded-xl hover:border-primary transition group disabled:opacity-50"
            >
              <Mic className="w-6 h-6 mb-2 text-muted-foreground group-hover:text-primary transition" />
              <span className="font-medium text-sm">Audio Overview</span>
            </button>
            <button
              onClick={() => generate("presentation")}
              disabled={isGenerating || !sourceText}
              className="flex flex-col items-center justify-center p-4 bg-card border rounded-xl hover:border-primary transition group disabled:opacity-50"
            >
              <Presentation className="w-6 h-6 mb-2 text-muted-foreground group-hover:text-primary transition" />
              <span className="font-medium text-sm">Presentation</span>
            </button>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="bg-card border rounded-xl p-6 h-full shadow-sm flex flex-col relative overflow-hidden">
          {isGenerating && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Synthesizing intelligence...</p>
            </div>
          )}

          <div className="flex items-center gap-2 mb-6 border-b pb-4 overflow-x-auto">
            {["summary", "audio", "slides"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === "summary" && (
              <div className="prose prose-invert max-w-none">
                {summary ? (
                  <div className="whitespace-pre-wrap">{summary}</div>
                ) : (
                  <div className="text-center text-muted-foreground py-20">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Generate a summary to get started</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "audio" && (
              script.length > 0 ? (
                <AudioPlayer script={script} />
              ) : (
                <div className="text-center text-muted-foreground py-20">
                  <Mic className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Generate an audio overview to listen</p>
                </div>
              )
            )}

            {activeTab === "slides" && (
              slides.length > 0 ? (
                <PresentationViewer slides={slides} />
              ) : (
                <div className="text-center text-muted-foreground py-20">
                  <Presentation className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Generate a presentation to view slides</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
