export interface DialogLine {
    speaker: "Host 1" | "Host 2";
    text: string;
}

export interface Slide {
    title: string;
    bullets: string[];
    notes?: string;
}

export interface GenerationRequest {
    type: "audio_script" | "presentation" | "summary";
    context: string;
}

export interface Source {
    id: string;
    name: string;
    type: "pdf" | "image" | "text" | "paste";
    content: string;
    date: Date;
}

export interface Notebook {
    id: string;
    title: string;
    subject: string;
    author: string;
    created_at: string;
    updated_at: string;
    rating: number;
    views: number;
    source_text: string;
    sources: string;
    summary: string;
    audio_script: string;
    slides: string;
}
