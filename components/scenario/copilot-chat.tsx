"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Trash2, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { askCopilot } from "@/lib/actions/copilot-actions";
import type { ScenarioContext } from "@/lib/ai/copilot";
import { formatPersen, formatRasio, formatRupiahCompact } from "@/lib/format";

const STORAGE_KEY = "copilot-history-v1";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  comparison?: ScenarioContext[];
  source?: "ai" | "rule";
}

export function CopilotChat({
  suggestions,
}: {
  suggestions: string[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Muat riwayat dari localStorage (client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw) as ChatMessage[]);
    } catch {
      // abaikan riwayat rusak
    }
    setHydrated(true);
  }, []);

  // Simpan riwayat setelah hidrasi.
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || pending) return;
    setError(null);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    startTransition(async () => {
      const res = await askCopilot(q);
      if (res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: res.data.text,
            comparison: res.data.comparison,
            source: res.data.source,
          },
        ]);
      } else {
        setError(res.error === "UNAUTHORIZED" ? "Sesi berakhir. Muat ulang dan masuk kembali." : "Gagal memproses.");
      }
    });
  };

  const clearHistory = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <Card className="flex h-[70vh] min-h-[420px] flex-col p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-deepteal" />
          <span className="text-sm font-medium text-ink">Copilot skenario</span>
        </div>
        {messages.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={clearHistory}>
            <Trash2 className="size-4" /> Bersihkan
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {hydrated && messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate">
              Tanyakan tentang skenario Anda: perbandingan, risiko, atau
              rekomendasi. Jawaban dibantu DeepSeek; bila tidak tersedia,
              memakai aturan. Riwayat tersimpan di perangkat ini.
            </p>
            {suggestions.length >= 2 && (
              <div className="flex flex-wrap gap-2">
                <Suggestion onClick={() => send(`Bandingkan ${suggestions[0]} dan ${suggestions[1]}`)}>
                  Bandingkan {suggestions[0]} dan {suggestions[1]}
                </Suggestion>
                <Suggestion onClick={() => send(`Apa risiko ${suggestions[0]}?`)}>
                  Apa risiko {suggestions[0]}?
                </Suggestion>
                <Suggestion onClick={() => send("Rekomendasi?")}>Rekomendasi?</Suggestion>
              </div>
            )}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "space-y-2"}>
            <div
              className={
                "max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm leading-relaxed " +
                (m.role === "user"
                  ? "bg-deepteal text-ivory"
                  : "border border-border bg-muted/40 text-ink")
              }
            >
              {m.text}
            </div>
            {m.role === "assistant" && m.source === "ai" && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber">
                <Sparkles className="size-3" /> Dijawab DeepSeek
              </span>
            )}
            {m.comparison && m.comparison.length >= 2 && <ComparisonTable rows={m.comparison} />}
          </div>
        ))}

        {pending && (
          <div className="flex items-center gap-2 text-xs text-slate">
            <Loader2 className="size-3.5 animate-spin" /> Copilot berpikir...
          </div>
        )}
        {error && <p className="text-xs text-risky">{error}</p>}
      </div>

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Tulis pertanyaan... (Enter untuk kirim, Shift+Enter baris baru)"
          className="max-h-32 resize-none"
        />
        <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Kirim">
          <Send className="size-4" />
        </Button>
      </form>
    </Card>
  );
}

function Suggestion({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-deepteal hover:bg-muted"
    >
      {children}
    </button>
  );
}

function ComparisonTable({ rows }: { rows: ScenarioContext[] }) {
  const [a, b] = rows;
  const row = (label: string, va: string, vb: string) => (
    <tr className="border-t border-border">
      <td className="px-2 py-1.5 text-xs text-slate">{label}</td>
      <td className="num px-2 py-1.5 text-right text-xs text-ink">{va}</td>
      <td className="num px-2 py-1.5 text-right text-xs text-ink">{vb}</td>
    </tr>
  );
  const p = (v: number | null) => (v === null ? "-" : formatPersen(v, 2));
  const r = (v: number | null) => (v === null ? "-" : formatRasio(v));
  return (
    <div className="max-w-[85%] overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-2 py-1.5 text-left text-[11px] font-medium text-slate">Metrik</th>
            <th className="px-2 py-1.5 text-right text-[11px] font-medium text-ink">{a.nama}</th>
            <th className="px-2 py-1.5 text-right text-[11px] font-medium text-ink">{b.nama}</th>
          </tr>
        </thead>
        <tbody>
          {row("EAR", p(a.earPersen), p(b.earPersen))}
          {row("DSCR rata-rata", r(a.dscrRataRata), r(b.dscrRataRata))}
          {row("DSCR minimum", r(a.dscrMinimum), r(b.dscrMinimum))}
          {row("NPV", formatRupiahCompact(a.npv), formatRupiahCompact(b.npv))}
          {row("Status", a.status, b.status)}
        </tbody>
      </table>
    </div>
  );
}
