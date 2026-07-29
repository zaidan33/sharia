/**
 * Document Extraction Agent (V4.2) - endpoint POST /api/extract.
 * Menerima { text } dan mengembalikan field skenario hasil ekstraksi regex.
 * Verifikasi sesi. AI integration menyusul (PRD §16 V4).
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/queries";
import { extractScenarioFields } from "@/lib/extract";

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

  const fields = extractScenarioFields(text);
  return NextResponse.json({ fields });
}
