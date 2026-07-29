/**
 * Conversational Copilot (V5.2) - IMPLEMENTATION_PLAN V5 instr 2.
 *
 * Mesin jawaban rule-based (tanpa LLM) atas pertanyaan tentang skenario
 * pengguna. Mendeteksi intent (perbandingan / risiko / rekomendasi / info),
 * mencocokkan nama skenario yang disebut, lalu menyusun jawaban template.
 * Fungsi murni - bekerja atas ScenarioContext[] (data datar, serializable).
 */
import type { StatusKelayakan } from "@/lib/engine";
import { formatPersen, formatRasio, formatRupiah, formatRupiahCompact } from "@/lib/format";

export type CopilotIntent = "comparison" | "risk" | "recommendation" | "info";

export interface ScenarioContext {
  id: number;
  nama: string;
  skemaLabel: string; // "Murabahah" / "Konvensional" / ...
  status: StatusKelayakan;
  earPersen: number | null;
  dscrRataRata: number | null;
  dscrMinimum: number | null;
  npv: number;
  irrPersen: number | null;
}

export interface CopilotAnswer {
  intent: CopilotIntent;
  text: string;
  matched: ScenarioContext[];
  comparison: ScenarioContext[]; // dua skenario untuk side-by-side
}

const EAR = (v: number | null) => (v === null ? "-" : formatPersen(v, 2));
const DSCR = (v: number | null) => (v === null ? "-" : formatRasio(v));
const NPV = formatRupiahCompact;

/** Skenario yang namanya disebut di pertanyaan (case-insensitive, nama >= 3 char). */
function resolveMatched(question: string, scenarios: ScenarioContext[]): ScenarioContext[] {
  const q = question.toLowerCase();
  const out: ScenarioContext[] = [];
  for (const s of scenarios) {
    if (s.nama.length >= 3 && q.includes(s.nama.toLowerCase())) out.push(s);
  }
  return out;
}

function detectIntent(question: string, matched: ScenarioContext[]): CopilotIntent {
  const q = question.toLowerCase();
  if (matched.length >= 2 && /(banding|perbandingan|dibanding|vs\b)/.test(q))
    return "comparison";
  if (/(rekomendasi|saran|mana (yang|yg)|terbaik|pilih)/.test(q)) return "recommendation";
  if (/(risiko|beresiko|bahaya|berbahaya|aman)/.test(q)) return "risk";
  return "info";
}

function comparisonText(a: ScenarioContext, b: ScenarioContext): string {
  const aBetterEar = (a.earPersen ?? Infinity) <= (b.earPersen ?? Infinity);
  const aBetterDscr = (a.dscrRataRata ?? -Infinity) >= (b.dscrRataRata ?? -Infinity);
  const aBetterNpv = a.npv >= b.npv;
  const aScore = (aBetterEar ? 1 : 0) + (aBetterDscr ? 1 : 0) + (aBetterNpv ? 1 : 0);
  const bScore = 3 - aScore;
  const winner = aScore >= bScore ? a : b;
  return (
    `Perbandingan ${a.nama} vs ${b.nama}:\n` +
    `- EAR: ${EAR(a.earPersen)} vs ${EAR(b.earPersen)}\n` +
    `- DSCR rata-rata: ${DSCR(a.dscrRataRata)} vs ${DSCR(b.dscrRataRata)}\n` +
    `- DSCR minimum: ${DSCR(a.dscrMinimum)} vs ${DSCR(b.dscrMinimum)}\n` +
    `- NPV: ${NPV(a.npv)} vs ${NPV(b.npv)}\n` +
    `- Status: ${a.status} vs ${b.status}\n` +
    `Berdasarkan EAR, DSCR, dan NPV, ${winner.nama} sedikit lebih menguntungkan. ` +
    `Pakai EAR sebagai pembanding utama antar-skema.`
  );
}

function riskText(targets: ScenarioContext[]): string {
  if (targets.length === 0) return "Tidak ada skenario yang disebut. Coba: 'Apa risiko Nama Skenario?'.";
  const lines = targets.map((s) => {
    const notes: string[] = [];
    const min = s.dscrMinimum;
    if (min !== null && min < 1)
      notes.push(`DSCR minimum ${formatRasio(min)} (< 1,00 - arus kas tak menutup angsuran di bulan terketat, RISIKO TINGGI)`);
    else if (min !== null && min < 1.25)
      notes.push(`DSCR minimum ${formatRasio(min)} (margin tipis, perlu perhatian)`);
    if (s.npv < 0) notes.push(`NPV negatif (${formatRupiah(s.npv)}) - tidak menambah nilai`);
    if (s.irrPersen === null) notes.push(`IRR tak terdefinisi`);
    if (s.status === "TIDAK_LAYAK") notes.push(`status TIDAK LAYAK`);
    const body = notes.length === 0
      ? `tidak ada risiko mencolok: DSCR minimum ${DSCR(min)}, NPV ${NPV(s.npv)}.`
      : notes.join("; ") + ".";
    return `${s.nama} (${s.skemaLabel}): ${body}`;
  });
  return lines.join("\n");
}

function recommend(scenarios: ScenarioContext[]): ScenarioContext | null {
  if (scenarios.length === 0) return null;
  const pool = scenarios.filter((s) => s.status === "LAYAK");
  const candidates = pool.length > 0 ? pool : scenarios.filter((s) => s.status === "WASPADA");
  const finalPool = candidates.length > 0 ? candidates : scenarios;
  // EAR terendah, tiebreak DSCR tertinggi.
  return [...finalPool].sort((a, b) => {
    const ear = (a.earPersen ?? Infinity) - (b.earPersen ?? Infinity);
    if (Math.abs(ear) > 1e-9) return ear;
    return (b.dscrRataRata ?? -Infinity) - (a.dscrRataRata ?? -Infinity);
  })[0];
}

function recommendationText(scenarios: ScenarioContext[], matched: ScenarioContext[]): string {
  const pool = matched.length > 0 ? matched : scenarios;
  if (pool.length === 0) return "Belum ada skenario untuk direkomendasikan. Buat skenario dulu di Dashboard.";
  const best = recommend(pool);
  if (!best) return "Tidak ada skenario yang bisa direkomendasikan.";
  const layakNote = best.status === "LAYAK"
    ? "termasuk yang layak"
    : best.status === "WASPADA"
      ? "layak tapi perlu perhatian (WASPADA)"
      : "berstatus TIDAK LAYAK - pertimbangkan struktur lain via Optimizer";
  return (
    `Rekomendasi: ${best.nama} (${best.skemaLabel}). ` +
    `EAR ${EAR(best.earPersen)} adalah yang terendah dengan DSCR rata-rata ${DSCR(best.dscrRataRata)} ` +
    `dan NPV ${NPV(best.npv)} (${layakNote}). ` +
    `EAR jadi pembanding utama karena sudah dinormalisasi antar-skema.`
  );
}

function infoText(matched: ScenarioContext[], scenarios: ScenarioContext[]): string {
  if (matched.length === 1) {
    const s = matched[0];
    return (
      `${s.nama} (${s.skemaLabel}): status ${s.status}, EAR ${EAR(s.earPersen)}, ` +
      `DSCR rata-rata ${DSCR(s.dscrRataRata)} (minimum ${DSCR(s.dscrMinimum)}), ` +
      `NPV ${NPV(s.npv)}, IRR ${s.irrPersen === null ? "tak terdefinisi" : formatPersen(s.irrPersen, 2)}.`
    );
  }
  if (scenarios.length === 0)
    return "Anda belum punya skenario. Buat dulu, lalu saya bisa membandingkan, menjelaskan risiko, atau merekomendasikan.";
  const daftar = scenarios.map((s) => `'${s.nama}'`).join(", ");
  return (
    `Saya bisa: membandingkan, menjelaskan risiko, atau merekomendasikan skenario.\n` +
    `Skenario Anda: ${daftar}.\n` +
    `Contoh: 'Bandingkan ${scenarios[0].nama} dan ${scenarios[1]?.nama ?? "skenario lain"}', ` +
    `'Apa risiko ${scenarios[0].nama}?', 'Rekomendasi?'`
  );
}

export function answerCopilot(
  question: string,
  scenarios: ScenarioContext[],
): CopilotAnswer {
  const matched = resolveMatched(question, scenarios);
  const intent = detectIntent(question, matched);

  let text: string;
  let comparison: ScenarioContext[] = [];

  switch (intent) {
    case "comparison": {
      const [a, b] = matched;
      text = comparisonText(a, b);
      comparison = [a, b];
      break;
    }
    case "risk":
      text = riskText(matched.length > 0 ? matched : scenarios);
      break;
    case "recommendation":
      text = recommendationText(scenarios, matched);
      break;
    default:
      text = infoText(matched, scenarios);
  }

  return { intent, text, matched, comparison };
}
