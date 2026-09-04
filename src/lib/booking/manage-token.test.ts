import { describe, expect, it } from "vitest";
import {
  hashManageToken,
  issueManageToken,
  looksLikeManageToken,
  manageTokenExpired,
  manageTokenMatches,
  MANAGE_TOKEN_GRACE_DAYS,
} from "./manage-token";

describe("issueManageToken", () => {
  it("returns a url-safe token and its hash", () => {
    const { token, hash } = issueManageToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashManageToken(token)).toBe(hash);
  });

  it("never repeats a token", () => {
    const seen = new Set(
      Array.from({ length: 2000 }, () => issueManageToken().token),
    );
    expect(seen.size).toBe(2000);
  });

  it("does not leak the token through its hash", () => {
    const { token, hash } = issueManageToken();
    expect(hash).not.toContain(token);
    expect(token).not.toContain(hash);
  });

  /**
   * Guards the reason this module exists: sequentially issued tokens must
   * share no structure. A cuid would fail this — its leading characters are
   * a timestamp and barely move between calls.
   */
  it("produces tokens with no shared prefix", () => {
    const a = issueManageToken().token;
    const b = issueManageToken().token;
    let shared = 0;
    while (shared < a.length && a[shared] === b[shared]) shared++;
    expect(shared).toBeLessThan(4);
  });
});

describe("manageTokenMatches", () => {
  it("accepts identical hashes and rejects different ones", () => {
    const { hash } = issueManageToken();
    expect(manageTokenMatches(hash, hash)).toBe(true);
    expect(manageTokenMatches(hash, issueManageToken().hash)).toBe(false);
  });

  it("rejects mismatched lengths without throwing", () => {
    expect(manageTokenMatches("abc", "abcdef")).toBe(false);
  });
});

describe("looksLikeManageToken", () => {
  it("accepts a real token", () => {
    expect(looksLikeManageToken(issueManageToken().token)).toBe(true);
  });

  it("rejects junk before it reaches the database", () => {
    for (const bad of ["", "../../etc/passwd", "'; DROP TABLE", "short", "a".repeat(200)]) {
      expect(looksLikeManageToken(bad)).toBe(false);
    }
  });
});

describe("manageTokenExpired", () => {
  const ends = new Date("2026-09-15T15:00:00Z");

  it("stays valid during the grace window", () => {
    expect(manageTokenExpired(ends, new Date("2026-09-16T00:00:00Z"))).toBe(false);
    expect(
      manageTokenExpired(
        ends,
        new Date(ends.getTime() + (MANAGE_TOKEN_GRACE_DAYS - 1) * 86_400_000),
      ),
    ).toBe(false);
  });

  it("expires after the grace window", () => {
    expect(
      manageTokenExpired(
        ends,
        new Date(ends.getTime() + (MANAGE_TOKEN_GRACE_DAYS + 1) * 86_400_000),
      ),
    ).toBe(true);
  });
});
