/**
 * Tes DeepSeek API Client (V6.4) - tanpa jaringan (fetch di-mock).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { askDeepSeek, isDeepSeekConfigured, getDeepSeekModel, stripMarkdown } from "../deepseek";

describe("isDeepSeekConfigured / getDeepSeekModel", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("tidak terkonfigurasi bila env kosong/undefined", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    expect(isDeepSeekConfigured()).toBe(false);
  });

  it("terkonfigurasi bila env terisi", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    expect(isDeepSeekConfigured()).toBe(true);
  });

  it("model default deepseek-chat, bisa ditimpa DEEPSEEK_MODEL", () => {
    vi.stubEnv("DEEPSEEK_MODEL", "");
    expect(getDeepSeekModel()).toBe("deepseek-chat");
    vi.stubEnv("DEEPSEEK_MODEL", "  custom-pro  ");
    expect(getDeepSeekModel()).toBe("custom-pro");
  });
});

describe("askDeepSeek", () => {
  beforeEach(() => vi.stubEnv("DEEPSEEK_API_KEY", "sk-test"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("null bila tidak terkonfigurasi (fetch tak dipanggil)", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await askDeepSeek("s", "u")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mengembalikan konten (di-trim) pada respons sukses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: " Halo " } }] }),
      }),
    );
    expect(await askDeepSeek("s", "u")).toBe("Halo");
  });

  it("null bila konten kosong", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "   " } }] }),
      }),
    );
    expect(await askDeepSeek("s", "u")).toBeNull();
  });

  it("null pada respons non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    expect(await askDeepSeek("s", "u")).toBeNull();
  });

  it("null bila fetch melempar (timeout/jaringan)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("aborted")));
    expect(await askDeepSeek("s", "u")).toBeNull();
  });

  it("mengirim body & header sesuai kontrak OpenAI-kompatibel", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await askDeepSeek("sys", "usr", { temperature: 0.1, maxTokens: 5, json: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer sk-test" });
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("deepseek-chat");
    expect(body.stream).toBe(false);
    expect(body.temperature).toBe(0.1);
    expect(body.max_tokens).toBe(5);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "usr" },
    ]);
  });
});

describe("stripMarkdown", () => {
  it("membuang penanda tebal dan heading", () => {
    expect(stripMarkdown("**SYARIAH** sesuai")).toBe("SYARIAH sesuai");
    expect(stripMarkdown("## Judul\nparagraf")).toBe("Judul\nparagraf");
  });
  it("no-op untuk teks polos", () => {
    expect(stripMarkdown("Teks biasa tanpa markdown.")).toBe("Teks biasa tanpa markdown.");
  });
});
