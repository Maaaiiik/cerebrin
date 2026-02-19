"use client";

import React, { useState, useEffect } from "react";
import { Bot, Sparkles, Send, BrainCircuit, AlertTriangle, Loader2 } from "lucide-react";

export default function CouncilPage() {
    const [query, setQuery] = useState("");
    const [responses, setResponses] = useState<{ [key: string]: string }>({
        claude: "",
        gpt: "",
        gemini: "",
        judge: ""
    });
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [keys, setKeys] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const storedKeys = localStorage.getItem("api_keys");
        if (storedKeys) {
            setKeys(JSON.parse(storedKeys));
        }
    }, []);

    const callOpenAI = async (prompt: string, apiKey: string) => {
        if (!apiKey) return "API Key not configured.";
        try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }]
                })
            });
            const data = await res.json();
            return data.choices?.[0]?.message?.content || "Error fetching GPT response.";
        } catch (e) { return "Error calling OpenAI."; }
    };

    const callAnthropic = async (prompt: string, apiKey: string) => {
        if (!apiKey) return "API Key not configured.";
        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json", "dangerously-allow-browser": "true" }, // Note: client-side danger
                body: JSON.stringify({
                    model: "claude-3-5-sonnet-20240620",
                    max_tokens: 1024,
                    messages: [{ role: "user", content: prompt }]
                })
            });
            const data = await res.json();
            return data.content?.[0]?.text || "Error fetching Claude response.";
        } catch (e) { return "Error calling Anthropic."; }
    };

    const callGemini = async (prompt: string, apiKey: string) => {
        if (!apiKey) return "API Key not configured.";
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error fetching Gemini response.";
        } catch (e) { return "Error calling Gemini."; }
    };

    const handleAsk = async () => {
        if (!query) return;
        setResponses({ claude: "", gpt: "", gemini: "", judge: "" });
        setIsSynthesizing(true);

        const prompt = `Context: Strategic Analysis. Question: ${query}`;

        // Parallel calls
        const [gptRes, claudeRes, geminiRes] = await Promise.all([
            callOpenAI(prompt, keys.openai),
            callAnthropic(prompt, keys.anthropic),
            callGemini(prompt, keys.gemini)
        ]);

        setResponses({
            gpt: gptRes,
            claude: claudeRes,
            gemini: geminiRes,
            judge: ""
        });

        // Referee Logic (using GPT-4)
        if (keys.openai) {
            const judgePrompt = `
                Analyze these 3 responses to the question: "${query}"
                
                GPT-4o: ${gptRes}
                Claude 3.5: ${claudeRes}
                Gemini 1.5: ${geminiRes}
                
                Act as a Supreme Judge. Synthesize the best points, call out contradictions, and provide a final strategic verdict.
            `;
            const judgeRes = await callOpenAI(judgePrompt, keys.openai);
            setResponses(prev => ({ ...prev, judge: judgeRes }));
        } else {
            setResponses(prev => ({ ...prev, judge: "Judge requires OpenAI API Key." }));
        }

        setIsSynthesizing(false);
    };

    return (
        <div className="h-full flex flex-col p-6 bg-slate-900 overflow-hidden relative">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                    Consejo de Modelos
                </h1>
                <p className="text-slate-400 mt-2">Consulta a la Junta Directiva Artificial</p>
            </div>

            {/* Input Area */}
            <div className="max-w-3xl mx-auto w-full mb-8 relative z-10">
                <div className="relative">
                    <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-full py-4 px-6 pr-12 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-lg transition-all"
                        placeholder="Pregunta estratégica al consejo..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                    />
                    <button
                        onClick={handleAsk}
                        className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Send size={20} />
                    </button>
                </div>
                {!keys.openai && !keys.anthropic && !keys.gemini && (
                    <p className="text-xs text-amber-500 mt-2 text-center flex items-center justify-center gap-1">
                        <AlertTriangle size={12} /> Configura tus API Keys en Ajustes para activar los modelos.
                    </p>
                )}
            </div>

            {/* Grid of Models */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-64">

                {/* Claude */}
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 backdrop-blur-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-orange-400">
                        <Bot size={24} />
                        <h3 className="font-semibold">Claude 3.5 Sonnet</h3>
                    </div>
                    <div className="prose prose-invert prose-sm text-slate-300 flex-1 overflow-y-auto max-h-[300px]">
                        {isSynthesizing && !responses.claude ? (
                            <div className="animate-pulse space-y-2">
                                <div className="h-2 bg-slate-800 rounded w-3/4"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                            </div>
                        ) : responses.claude || <span className="text-slate-600 italic text-sm">Esperando consulta...</span>}
                    </div>
                </div>

                {/* GPT */}
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 backdrop-blur-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <Sparkles size={24} />
                        <h3 className="font-semibold">GPT-4o</h3>
                    </div>
                    <div className="prose prose-invert prose-sm text-slate-300 flex-1 overflow-y-auto max-h-[300px]">
                        {isSynthesizing && !responses.gpt ? (
                            <div className="animate-pulse space-y-2">
                                <div className="h-2 bg-slate-800 rounded w-3/4"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                            </div>
                        ) : responses.gpt || <span className="text-slate-600 italic text-sm">Esperando consulta...</span>}
                    </div>
                </div>

                {/* Gemini */}
                <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 backdrop-blur-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-blue-400">
                        <BrainCircuit size={24} />
                        <h3 className="font-semibold">Gemini 1.5 Pro</h3>
                    </div>
                    <div className="prose prose-invert prose-sm text-slate-300 flex-1 overflow-y-auto max-h-[300px]">
                        {isSynthesizing && !responses.gemini ? (
                            <div className="animate-pulse space-y-2">
                                <div className="h-2 bg-slate-800 rounded w-3/4"></div>
                                <div className="h-2 bg-slate-800 rounded w-full"></div>
                            </div>
                        ) : responses.gemini || <span className="text-slate-600 italic text-sm">Esperando consulta...</span>}
                    </div>
                </div>
            </div>

            {/* The Judge (Overlay) */}
            {(responses.judge || isSynthesizing) && (
                <div className="absolute bottom-0 left-0 right-0 bg-slate-950/95 border-t border-indigo-500/30 p-8 backdrop-blur-xl shadow-[0_-10px_40px_rgba(79,70,229,0.2)] transition-all transform translate-y-0 z-50">
                    <div className="max-w-5xl mx-auto flex items-start gap-6">
                        <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/40 mt-1">
                            <BrainCircuit size={32} className="text-white" />
                        </div>
                        <div className="flex-1 max-h-[200px] overflow-y-auto pr-4">
                            <h3 className="text-xl font-bold text-indigo-400 mb-2">Veredicto del Juez Supremo</h3>
                            <div className="text-slate-200 leading-relaxed text-base">
                                {responses.judge ? (
                                    <p className="whitespace-pre-wrap">{responses.judge}</p>
                                ) : (
                                    <div className="flex items-center gap-3 text-indigo-300 animate-pulse">
                                        <Loader2 className="animate-spin" /> Sintetizando consenso estratégico...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
