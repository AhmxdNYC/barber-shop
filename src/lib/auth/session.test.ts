import { beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "./session";

const PAYLOAD = { userId: "u1", email: "eduardo@example.com", name: "Eduardo" };

beforeAll(() => {
  process.env.AUTH_SECRET = "a".repeat(48);
});

describe("session tokens", () => {
  it("round-trips a valid session", async () => {
    const token = await createSessionToken(PAYLOAD);
    expect(await readSessionToken(token)).toMatchObject(PAYLOAD);
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(PAYLOAD);
    const tampered = token.slice(0, -3) + "aaa";
    expect(await readSessionToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken(PAYLOAD);
    process.env.AUTH_SECRET = "b".repeat(48);
    expect(await readSessionToken(token)).toBeNull();
    process.env.AUTH_SECRET = "a".repeat(48);
  });

  it("returns null for missing or junk input rather than throwing", async () => {
    expect(await readSessionToken(undefined)).toBeNull();
    expect(await readSessionToken("not-a-jwt")).toBeNull();
  });

  it("refuses to sign with a weak secret", async () => {
    const previous = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "short";
    await expect(createSessionToken(PAYLOAD)).rejects.toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = previous;
  });
});
