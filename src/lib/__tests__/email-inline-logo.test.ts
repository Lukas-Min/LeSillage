import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const HTML = '<a><img src="https://lesillagemanila.com/logo/mark.png" width="46"></a><img src="https://x.test/photo.jpg">';

async function freshModule() {
  vi.resetModules();
  return import("@/lib/email");
}

describe("withInlineLogo", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://test");
    vi.stubEnv("AUTH_SECRET", "0".repeat(32));
    vi.stubEnv("ADMIN_PASSWORD", "abcdef1");
    vi.stubEnv("GMAIL_APP_PASSWORD", "xxxxxxxx");
    vi.stubEnv("APP_URL", "https://lesillagemanila.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("attaches the logo and points the header image at it, leaving other images alone", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { withInlineLogo } = await freshModule();
    const result = await withInlineLogo(HTML);
    expect(fetchMock).toHaveBeenCalledWith("https://lesillagemanila.com/logo/mark.png");
    expect(result.html).toContain('src="cid:logo@lesillagemanila"');
    expect(result.html).toContain('src="https://x.test/photo.jpg"');
    expect(result.attachments?.[0]).toMatchObject({ cid: "logo@lesillagemanila", contentType: "image/png" });
  });

  it("keeps the linked logo when it can't be fetched, and tries again next time", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const { withInlineLogo } = await freshModule();
    const first = await withInlineLogo(HTML);
    expect(first).toEqual({ html: HTML, attachments: undefined });
    await withInlineLogo(HTML);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("leaves an email without the logo untouched", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { withInlineLogo } = await freshModule();
    expect(await withInlineLogo("<p>Hi</p>")).toEqual({ html: "<p>Hi</p>", attachments: undefined });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
