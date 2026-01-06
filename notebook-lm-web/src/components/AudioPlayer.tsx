"use client";

import { useEffect, useState, useRef } from "react";
import { DialogLine } from "@/types";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
    script: DialogLine[];
}

export function AudioPlayer({ script }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            setVoices(available);
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        return () => {
            window.speechSynthesis.cancel();
        }
    }, []);

    const playLine = (index: number) => {
        if (index >= script.length) {
            setIsPlaying(false);
            setCurrentIndex(0);
            return;
        }

        const line = script[index];
        const utterance = new SpeechSynthesisUtterance(line.text);

        // Simple voice assignment logic
        // Host 1: Prefer Male/Deep. Host 2: Prefer Female/Higher.
        // This is browser dependent. 
        const host1Voice = voices.find(v => v.name.includes("Male") || v.name.includes("David") || v.name.includes("Google US English")) || voices[0];
        const host2Voice = voices.find(v => v.name.includes("Female") || v.name.includes("Zira") || v.name.includes("Google UK English Female")) || voices[1] || voices[0];

        utterance.voice = line.speaker === "Host 1" ? host1Voice : host2Voice;
        utterance.rate = 1.0;
        utterance.pitch = line.speaker === "Host 1" ? 0.9 : 1.1; // Fallback subtle pitch diff

        utterance.onend = () => {
            if (isPlaying) {
                setCurrentIndex(prev => {
                    const next = prev + 1;
                    if (next < script.length) {
                        playLine(next);
                    } else {
                        setIsPlaying(false);
                    }
                    return next;
                });
            }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        if (isPlaying && !window.speechSynthesis.speaking) {
            playLine(currentIndex);
        } else if (!isPlaying) {
            window.speechSynthesis.cancel();
        }
    }, [isPlaying]);

    const togglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
            window.speechSynthesis.cancel();
        } else {
            setIsPlaying(true);
            // Logic handled in effect or restart
            if (!window.speechSynthesis.speaking) playLine(currentIndex);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-card rounded-xl border shadow-lg">
            <div className="flex flex-col items-center gap-6">
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-medium text-muted-foreground">Now Playing</h3>
                    <p className="text-2xl font-bold text-primary">
                        {script[currentIndex]?.speaker || "End"}
                    </p>
                </div>

                <div className="w-full h-32 bg-secondary/50 rounded-lg flex items-center justify-center p-4 overflow-y-auto">
                    <p className="text-center text-lg italic opacity-80 transition-all duration-300">
                        "{script[currentIndex]?.text}"
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-3 rounded-full hover:bg-secondary transition" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                        <SkipBack className="w-6 h-6" />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-lg scale-100 active:scale-95"
                    >
                        {isPlaying ? <Pause className="w-8 h-8 font-fill" /> : <Play className="w-8 h-8 ml-1" />}
                    </button>
                    <button className="p-3 rounded-full hover:bg-secondary transition" onClick={() => setCurrentIndex(Math.min(script.length - 1, currentIndex + 1))} disabled={currentIndex === script.length - 1}>
                        <SkipForward className="w-6 h-6" />
                    </button>
                </div>

                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div
                        className="bg-primary h-full transition-all duration-500"
                        style={{ width: `${((currentIndex) / script.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
