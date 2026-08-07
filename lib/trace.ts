import type { TraceEntry } from "@/types/trace";
const KEY="ai-roadmap-trace-v1",MAX=250;
export function loadTrace():TraceEntry[]{if(typeof window==="undefined")return[];try{const value=JSON.parse(localStorage.getItem(KEY)??"[]");return Array.isArray(value)?value.slice(-MAX):[];}catch{return[];}}
export function saveTrace(entries:TraceEntry[]){if(typeof window!=="undefined")localStorage.setItem(KEY,JSON.stringify(entries.slice(-MAX)));}
export function clearStoredTrace(){if(typeof window!=="undefined")localStorage.removeItem(KEY);}
export function traceEntry(input:Omit<TraceEntry,"id"|"timestamp">):TraceEntry{return{id:typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():`trace-${Date.now()}`,timestamp:new Date().toISOString(),...input};}
export function appendStoredTrace(input:Omit<TraceEntry,"id"|"timestamp">){const entries=[...loadTrace(),traceEntry(input)].slice(-MAX);saveTrace(entries);window.dispatchEvent(new CustomEvent("ai-roadmap-trace",{detail:entries.at(-1)}));}
