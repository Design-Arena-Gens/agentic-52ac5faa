"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; timestamp: number };
type AgentState = {
  step: string;
  collected: {
    name?: string;
    phone?: string;
    email?: string;
    service?: string;
    date?: string; // ISO date
    time?: string; // HH:mm
    timezone?: string;
    notes?: string;
  };
  bookingId?: string;
};

const defaultGreeting =
  "Hello! You?ve reached the AI Receptionist. How can I help you today?";

function useSpeech() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognitionImpl =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (SpeechRecognitionImpl) {
      recognitionRef.current = new SpeechRecognitionImpl();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";
      setSupported(true);
    }
  }, []);

  function speak(text: string) {
    if (!synth) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    synth.cancel();
    synth.speak(utter);
  }

  function start(onResult: (finalText: string) => void, onEnd?: () => void) {
    const rec = recognitionRef.current;
    if (!rec) return;
    setListening(true);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from((e as any).results)
        .map((res: any) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) onResult(transcript);
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      onEnd?.();
    };
    rec.start();
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return { speak, start, stop, listening, supported };
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: defaultGreeting, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(true);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [busy, setBusy] = useState(false);
  const { speak, start, stop, listening, supported } = useSpeech();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, busy]);

  useEffect(() => {
    if (!speaking) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") speak(last.content);
  }, [messages, speak, speaking]);

  async function send(text: string) {
    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          state: agentState,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as {
        reply: string;
        state: AgentState;
        done?: boolean;
      };
      setAgentState(data.state);
      setMessages((m) => [...m, { role: "assistant", content: data.reply, timestamp: Date.now() }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "I?m sorry?there was a technical issue. Could you try again, or I can escalate to a human.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const placeholder = useMemo(() => {
    if (busy) return "Working?";
    if (listening) return "Listening? say something";
    return "Type your message";
  }, [busy, listening]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] border bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="font-semibold">AI Receptionist</div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary text-sm"
            onClick={() => setSpeaking((s) => !s)}
            aria-pressed={speaking}
          >
            {speaking ? "?? Voice On" : "?? Voice Off"}
          </button>
          <button
            className="btn btn-secondary text-sm"
            onClick={() => {
              const text = messages
                .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
                .join("\n");
              navigator.clipboard.writeText(text);
            }}
          >
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] rounded-lg bg-sky-600 text-white px-3 py-2"
                : "mr-auto max-w-[80%] rounded-lg bg-gray-100 text-gray-900 px-3 py-2"
            }
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="mr-auto max-w-[80%] rounded-lg bg-gray-100 text-gray-900 px-3 py-2">
            Thinking?
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="p-3 border-t flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = input.trim();
          if (!trimmed) return;
          setInput("");
          void send(trimmed);
        }}
      >
        <input
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-200"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy || listening}
          autoComplete="off"
        />
        {supported && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (listening) {
                stop();
                return;
              }
              start((finalText) => {
                setInput("");
                void send(finalText);
              });
            }}
            disabled={busy}
          >
            {listening ? "? Stop" : "??? Speak"}
          </button>
        )}
        <button className="btn btn-primary" disabled={busy || listening}>
          Send
        </button>
      </form>
    </div>
  );
}
