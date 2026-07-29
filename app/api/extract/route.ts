/**
 * Document Extraction Agent (V4.2 / V6.4) - endpoint POST /api/extract.
 * Menerima { text }, mengembalikan field skenario hasil ekstraksi. Jalur utama
 * DeepSeek (JSON terstruktur); mundur ke regex bila tidak dikonfigurasi/gagal.
 * Verifikasi sesi.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/queries";
import { extractScenarioFieldsEnhanced } from "@/lib/extract";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let text = "";
  try {
    const body = await req.json();
    if (typeof body?.text === "string") text = body.text;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const fields = await extractScenarioFieldsEnhanced(text);
  return NextResponse.json({ fields });
}
