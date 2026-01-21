"use client";

import { useEffect, useState, useRef } from "react";
import { DialogLine } from "@/types";
import { Play, Pause, SkipForward, SkipBack, Settings, Volume2 } from "lucide-react";

interface AudioPlayerProps {
    script: DialogLine[];
}

export function AudioPlayer({ script }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [host1Voice, setHost1Voice] = useState<SpeechSynthesisVoice | null>(null);
    const [host2Voice, setHost2Voice] = useState<SpeechSynthesisVoice | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [speed, setSpeed] = useState(1.0);
    const [debugInfo, setDebugInfo] = useState("");

    const isPlayingRef = useRef(false);
    const currentIndexRef = useRef(0);

    // Keep refs in sync
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    // Load voices
    useEffect(() => {
        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            console.log("Available voices:", available.length);
            setDebugInfo(`Голосов найдено: ${available.length}`);

            if (available.length === 0) return;

            setVoices(available);

            // Try to find Russian voices first
            const russianVoices = available.filter(v => v.lang.startsWith('ru'));
            console.log("Russian voices:", russianVoices.length);

            const voice1 = russianVoices[0]
                || available.find(v => v.name.includes('David') || v.name.includes('Male'))
                || available[0];
            const voice2 = russianVoices[1] || russianVoices[0]
                || available.find(v => v.name.includes('Zira') || v.name.includes('Female'))
                || available[1] || available[0];

            setHost1Voice(voice1);
            setHost2Voice(voice2);
            setDebugInfo(`Голос 1: ${voice1?.name || 'нет'}, Голос 2: ${voice2?.name || 'нет'}`);
        };

        // Initial load
        loadVoices();

        // Chrome requires this event
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const playCurrentLine = () => {
        const index = currentIndexRef.current;

        if (index >= script.length) {
            setIsPlaying(false);
            setCurrentIndex(0);
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const line = script[index];
        if (!line || !line.text) {
            console.error("No text to speak at index", index);
            return;
        }

        console.log(`Playing line ${index}: "${line.text.substring(0, 50)}..."`);

        const utterance = new SpeechSynthesisUtterance(line.text);

        // Set voice
        const selectedVoice = line.speaker === "Host 1" ? host1Voice : host2Voice;
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.rate = speed;
        utterance.pitch = line.speaker === "Host 1" ? 0.9 : 1.1;
        utterance.volume = 1.0;
        utterance.lang = 'ru-RU'; // Force Russian

        utterance.onstart = () => {
            console.log("Speech started");
        };

        utterance.onend = () => {
            console.log("Speech ended, isPlaying:", isPlayingRef.current);
            if (isPlayingRef.current) {
                const nextIndex = currentIndexRef.current + 1;
                if (nextIndex < script.length) {
                    setCurrentIndex(nextIndex);
                    // Small delay then play next
                    setTimeout(() => {
                        if (isPlayingRef.current) {
                            playCurrentLine();
                        }
                    }, 400);
                } else {
                    // End of script
                    setIsPlaying(false);
                    setCurrentIndex(0);
                }
            }
        };

        utterance.onerror = (e) => {
            console.error('Speech error:', e.error);
            setDebugInfo(`Ошибка: ${e.error}`);
        };

        window.speechSynthesis.speak(utterance);
    };

    // Start playing when isPlaying becomes true
    useEffect(() => {
        if (isPlaying) {
            playCurrentLine();
        } else {
            window.speechSynthesis.cancel();
        }
    }, [isPlaying]);

    const togglePlay = () => {
        console.log("Toggle play, current state:", isPlaying);
        if (isPlaying) {
            setIsPlaying(false);
            window.speechSynthesis.cancel();
        } else {
            setIsPlaying(true);
        }
    };

    const skipTo = (index: number) => {
        window.speechSynthesis.cancel();
        setCurrentIndex(index);
        if (isPlayingRef.current) {
            setTimeout(playCurrentLine, 100);
        }
    };

    const progress = script.length > 0 ? ((currentIndex + 1) / script.length) * 100 : 0;

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Debug Info */}
            {debugInfo && (
                <div className="mb-2 text-xs text-slate-500 text-center">
                    {debugInfo}
                </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <div className="mb-4 p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-4">
                    <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Настройки голоса
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400">Ведущий 1</label>
                            <select
                                className="w-full text-sm p-2 rounded-lg bg-slate-900 border border-slate-600 text-white"
                                onChange={(e) => {
                                    const v = voices.find(v => v.name === e.target.value);
                                    setHost1Voice(v || null);
                                }}
                                value={host1Voice?.name || ""}
                            >
                                <option value="">Выберите голос</option>
                                {voices.map(v => (
                                    <option key={v.name} value={v.name}>
                                        {v.name} ({v.lang})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400">Ведущий 2</label>
                            <select
                                className="w-full text-sm p-2 rounded-lg bg-slate-900 border border-slate-600 text-white"
                                onChange={(e) => {
                                    const v = voices.find(v => v.name === e.target.value);
                                    setHost2Voice(v || null);
                                }}
                                value={host2Voice?.name || ""}
                            >
                                <option value="">Выберите голос</option>
                                {voices.map(v => (
                                    <option key={v.name} value={v.name}>
                                        {v.name} ({v.lang})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400">Скорость: {speed.toFixed(1)}x</label>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className="w-full accent-purple-500"
                        />
                    </div>
                </div>
            )}

            {/* Main Player */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Volume2 className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Сейчас говорит</p>
                            <p className="font-semibold text-white">{script[currentIndex]?.speaker || "—"}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 rounded-lg hover:bg-slate-700 transition text-slate-400 hover:text-white"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                {/* Text Display */}
                <div className="min-h-[100px] bg-slate-900/50 rounded-xl p-4 mb-6 flex items-center justify-center">
                    <p className="text-center text-lg text-slate-200 italic leading-relaxed">
                        "{script[currentIndex]?.text || "..."}"
                    </p>
                </div>

                {/* Progress */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Фраза {currentIndex + 1} из {script.length}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => skipTo(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        className="p-3 rounded-full hover:bg-slate-700 transition disabled:opacity-30"
                    >
                        <SkipBack className="w-6 h-6 text-white" />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="p-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95"
                    >
                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </button>
                    <button
                        onClick={() => skipTo(Math.min(script.length - 1, currentIndex + 1))}
                        disabled={currentIndex === script.length - 1}
                        className="p-3 rounded-full hover:bg-slate-700 transition disabled:opacity-30"
                    >
                        <SkipForward className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
