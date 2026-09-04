import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "./password";

const GOOD = "correct-horse-battery-staple";

describe("hashPassword", () => {
  it("never stores the password itself", async () => {
    const hash = await hashPassword(GOOD);
    expect(hash).not.toContain(GOOD);
    expect(hash.startsWith("scrypt$")).toBe(true);
  });

  it("salts, so the same password hashes differently every time", async () => {
    expect(await hashPassword(GOOD)).not.toBe(await hashPassword(GOOD));
  });

  it("refuses a password shorter than the minimum", async () => {
    await expect(hashPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).rejects.toThrow();
  });
});

describe("verifyPassword", () => {
  it("accepts the right password", async () => {
    expect(await verifyPassword(GOOD, await hashPassword(GOOD))).toBe(true);
  });

  it("rejects the wrong password", async () => {
    expect(await verifyPassword("wrong-password-entirely", await hashPassword(GOOD))).toBe(false);
  });

  it("rejects when no hash is stored, rather than letting anyone in", async () => {
    expect(await verifyPassword(GOOD, null)).toBe(false);
    expect(await verifyPassword(GOOD, "")).toBe(false);
  });

  it("rejects a malformed stored value instead of throwing", async () => {
    for (const bad of ["garbage", "scrypt$", "bcrypt$aa$bb", "$$"]) {
      expect(await verifyPassword(GOOD, bad)).toBe(false);
    }
  });
});
