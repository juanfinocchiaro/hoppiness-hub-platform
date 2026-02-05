import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("merges tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

