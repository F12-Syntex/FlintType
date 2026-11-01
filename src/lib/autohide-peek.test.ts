import { describe, expect, it } from "vitest";
import { PEEK_EDGE_PX, peekEdge } from "./autohide-peek";

describe("peekEdge", () => {
  const H = 720;

  it("peeks the top within the edge band", () => {
    expect(peekEdge(0, H)).toBe("top");
    expect(peekEdge(PEEK_EDGE_PX, H)).toBe("top");
    expect(peekEdge(-10, H)).toBe("top"); // pointer above the viewport
  });

  it("peeks the bottom within the edge band", () => {
    expect(peekEdge(H, H)).toBe("bottom");
    expect(peekEdge(H - PEEK_EDGE_PX, H)).toBe("bottom");
    expect(peekEdge(H + 10, H)).toBe("bottom"); // pointer below the viewport
  });

  it("is null in the middle", () => {
    expect(peekEdge(H / 2, H)).toBeNull();
    expect(peekEdge(PEEK_EDGE_PX + 1, H)).toBeNull();
    expect(peekEdge(H - PEEK_EDGE_PX - 1, H)).toBeNull();
  });

  it("prefers top when the bands overlap on a short viewport", () => {
    // viewport shorter than two edge bands — every point is in both zones.
    expect(peekEdge(30, 80)).toBe("top");
  });

  it("honours a custom edge threshold", () => {
    expect(peekEdge(20, H, 10)).toBeNull();
    expect(peekEdge(8, H, 10)).toBe("top");
  });
});
