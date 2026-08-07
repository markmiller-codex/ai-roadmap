export type TraceSource="user"|"AI"|"deterministic"|"benchmark"|"system";
export interface TraceEntry { id:string; timestamp:string; eventType:string; message:string; affectedId?:string; before?:unknown; after?:unknown; source:TraceSource; }
