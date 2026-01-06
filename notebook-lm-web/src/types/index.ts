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
