import { describe, expect, it } from "vitest";
import { isNavActive } from "./nav-active";

describe("isNavActive", () => {
  it("matches the page itself", () => {
    expect(isNavActive("/dashboard/clients", "/dashboard/clients")).toBe(true);
  });

  /** Opening one client must keep "Clients" lit. */
  it("matches pages nested beneath the link", () => {
    expect(isNavActive("/dashboard/clients/abc123", "/dashboard/clients")).toBe(true);
  });

  it("does not match a sibling with a shared prefix", () => {
    expect(isNavActive("/dashboard/clients", "/dashboard/client")).toBe(false);
    expect(isNavActive("/gallery-old", "/gallery")).toBe(false);
  });

  /**
   * /dashboard prefixes every dashboard route, so treating it loosely would
   * light "Today" on every page in the section.
   */
  it("requires an exact match when told to", () => {
    expect(isNavActive("/dashboard", "/dashboard", { exact: true })).toBe(true);
    expect(isNavActive("/dashboard/revenue", "/dashboard", { exact: true })).toBe(false);
  });

  it("ignores a query string on the link", () => {
    expect(isNavActive("/gallery", "/gallery?barber=eduardo")).toBe(true);
  });

  it("keeps a section lit when the page itself is filtered", () => {
    expect(isNavActive("/gallery", "/gallery")).toBe(true);
  });

  it("treats an anchor link as never active", () => {
    expect(isNavActive("/", "/#visit")).toBe(false);
    expect(isNavActive("/barbers", "/#visit")).toBe(false);
  });

  it("matches the home page only exactly", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/barbers", "/")).toBe(false);
  });
});
