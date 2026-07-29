/**
 * DeepSeek API Client (V6.4) - PRD V6 §4.
 *
 * Klien sisi-server untuk https://api.deepseek.com/v1/chat/completions
 * (antarmuka kompatibel OpenAI). Dipakai oleh fitur AI yang sudah ada
 * (ekstraksi dokumen, narasi, copilot, cek syariah) sebagai jalur utama;
 * bila tidak dikonfigurasi atau gagal, pemanggil mundur ke aturan/template.
 *
 * Catatan arsitektur: modul ini BUKAN bagian /lib/engine/ (yang wajib murni -
 * tanpa fetch/env). Karena itu penggunaan fetch + process.env di sini sah dan
 * hanya berjalan di server (Server Component / Server Action / Route Handler).
 *
 * Kontrak kunci: askDeepSeek TIDAK PERNAH melempar. Ia mengembalikan string
 * isi asisten, atau null bila: API key tidak diset, respons non-2xx, timeout,
 * error jaringan, atau isi kosong. Pemanggil cukup cek `null` untuk fallback.
 */
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

/**
 * Model default. "deepseek-chat" adalah alias non-reasoning yang mengembalikan
 * `content` langsung (berbeda dari alias deepseek-v4-flash/pro yang menyimpan
 * proses berpikir di `reasoning_content`). Bisa ditimpa via DEEPSEEK_MODEL.
 */
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface DeepSeekOptions {
  /** Timpa model (default: deepseek-chat / DEEPSEEK_MODEL). */
  model?: string;
  /** 0-2. Default 0,4 (cukup deterministik untuk angka & ringkasan). */
  temperature?: number;
  /** Batas token output. */
  maxTokens?: number;
  /** Batas waktu sebelum abort (ms). Default 30 detik. */
  timeoutMs?: number;
  /** Paksa response_format json_object (untuk ekstraksi terstruktur). */
  json?: boolean;
}

interface DeepSeekMessage {
  content?: string | null;
}
interface DeepSeekChoice {
  message?: DeepSeekMessage;
}
interface DeepSeekResponseBody {
  choices?: DeepSeekChoice[];
}

/** Apakah DEEPSEEK_API_KEY sudah diset (non-kosong). */
export function isDeepSeekConfigured(): boolean {
  const key = process.env.DEEPSEEK_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

/** Model aktif (DEEPSEEK_MODEL bila diset, selain itu deepseek-chat). */
export function getDeepSeekModel(): string {
  const m = process.env.DEEPSEEK_MODEL;
  return typeof m === "string" && m.trim() ? m.trim() : DEFAULT_MODEL;
}

/**
 * Bersihkan penanda markdown dasar (tebal `**`, heading `#`) agar tampil rapi
 * sebagai paragraf polos di UI. Aman untuk teks tanpa markdown (no-op).
 */
export function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\n)#{1,6}\s+/g, "$1")
    .trim();
}

/**
 * Satu putaran chat completion. Kembalikan isi teks asisten (sudah di-trim),
 * atau null bila gagal/tidak dikonfigurasi. Tidak melempar.
 */
export async function askDeepSeek(
  systemPrompt: string,
  userMessage: string,
  opts: DeepSeekOptions = {},
): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (typeof key !== "string" || key.trim().length === 0) return null;

  const body: Record<string, unknown> = {
    model: opts.model && opts.model.trim() ? opts.model.trim() : getDeepSeekModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: typeof opts.temperature === "number" ? opts.temperature : 0.4,
    stream: false,
  };
  if (typeof opts.maxTokens === "number") body.max_tokens = opts.maxTokens;
  if (opts.json) body.response_format = { type: "json_object" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as DeepSeekResponseBody;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    // Abort (timeout), gangguan jaringan, atau JSON rusak -> fallback.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
