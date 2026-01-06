"use client";

import { useState } from "react";
import { Slide } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Presentation } from "lucide-react";

interface PresentationViewerProps {
    slides: Slide[];
}

export function PresentationViewer({ slides }: PresentationViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextSlide = () => setCurrentIndex(p => Math.min(slides.length - 1, p + 1));
    const prevSlide = () => setCurrentIndex(p => Math.max(0, p - 1));

    if (!slides.length) return null;

    return (
        <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center gap-6">
            <div className="relative w-full aspect-video bg-card border rounded-xl shadow-2xl overflow-hidden flex flex-col">
                <div className="absolute top-4 right-4 text-muted-foreground flex items-center gap-2">
                    <Presentation className="w-4 h-4" />
                    <span className="text-sm font-mono">{currentIndex + 1} / {slides.length}</span>
                </div>

                <div className="flex-1 p-12 flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                                {slides[currentIndex].title}
                            </h2>
                            <ul className="space-y-3">
                                {slides[currentIndex].bullets.map((bullet, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 * i }}
                                        className="text-xl text-card-foreground/90 flex items-start gap-3"
                                    >
                                        <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                                        {bullet}
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {slides[currentIndex].notes && (
                    <div className="p-4 bg-muted/30 border-t text-sm text-muted-foreground italic">
                        Note: {slides[currentIndex].notes}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={prevSlide}
                    disabled={currentIndex === 0}
                    className="p-3 rounded-full hover:bg-muted disabled:opacity-50 transition"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex gap-2">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30'}`}
                        />
                    ))}
                </div>
                <button
                    onClick={nextSlide}
                    disabled={currentIndex === slides.length - 1}
                    className="p-3 rounded-full hover:bg-muted disabled:opacity-50 transition"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
