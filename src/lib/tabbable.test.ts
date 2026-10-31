// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { canFocus, coarsePointer, tabbables, wrapTab } from "./tabbable";

function mount(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

const ids = (els: HTMLElement[]) => els.map((el) => el.id);

describe("tabbables", () => {
  it("lists the Tab stops in document order", () => {
    const host = mount(`
      <a id="link" href="/x">link</a>
      <a id="nohref">anchor without href</a>
      <button id="btn">ok</button>
      <input id="text" />
      <input id="hidden" type="hidden" />
      <select id="sel"><option>a</option></select>
      <textarea id="area"></textarea>
      <div id="div">plain div</div>
      <div id="custom" tabindex="0">custom</div>
    `);
    expect(ids(tabbables(host))).toEqual([
      "link", "btn", "text", "sel", "area", "custom",
    ]);
  });

  it("skips disabled controls, tabindex=-1 and inert subtrees", () => {
    const host = mount(`
      <button id="off" disabled>off</button>
      <button id="minus" tabindex="-1">minus</button>
      <div inert><button id="inert">inert</button></div>
      <button id="on">on</button>
    `);
    expect(ids(tabbables(host))).toEqual(["on"]);
  });

  it("skips a disabled control even when it carries a tabindex", () => {
    const host = mount(`
      <button id="a">a</button>
      <button id="off" disabled tabindex="0">off</button>
      <input id="field" disabled tabindex="0" />
    `);
    expect(ids(tabbables(host))).toEqual(["a"]);
  });

  it("stops once per radio group, on the checked radio", () => {
    const host = mount(`
      <input id="a" type="radio" name="g" />
      <input id="b" type="radio" name="g" checked />
      <input id="c" type="radio" name="g" />
      <button id="after">after</button>
    `);
    expect(ids(tabbables(host))).toEqual(["b", "after"]);
  });

  it("stops on the first radio when none in the group is checked", () => {
    const host = mount(`
      <input id="a" type="radio" name="g" />
      <input id="b" type="radio" name="g" />
    `);
    expect(ids(tabbables(host))).toEqual(["a"]);
  });

  it("returns nothing for a missing container", () => {
    expect(tabbables(null)).toEqual([]);
  });
});

describe("canFocus", () => {
  it("is false once detached, disabled or inert", () => {
    const host = mount(`
      <button id="ok">ok</button>
      <button id="off" disabled>off</button>
      <div inert><button id="inert">x</button></div>
    `);
    const get = (id: string) => host.querySelector<HTMLElement>(`#${id}`)!;
    expect(canFocus(get("ok"))).toBe(true);
    expect(canFocus(get("off"))).toBe(false);
    expect(canFocus(get("inert"))).toBe(false);
    const ok = get("ok");
    ok.remove();
    expect(canFocus(ok)).toBe(false);
  });
});

describe("coarsePointer", () => {
  it("follows the (pointer: coarse) media query", () => {
    const matchMedia = vi.fn((q: string) => ({ matches: q === "(pointer: coarse)" }));
    vi.stubGlobal("matchMedia", matchMedia);
    expect(coarsePointer()).toBe(true);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(coarsePointer()).toBe(false);
  });
});

describe("wrapTab", () => {
  const tab = (shiftKey = false) =>
    new KeyboardEvent("keydown", { key: "Tab", shiftKey, cancelable: true });

  it("wraps at the ends and leaves the middle to the browser", () => {
    const host = mount(`<button id="a">a</button><button id="b">b</button>`);
    const [a, b] = tabbables(host) as [HTMLElement, HTMLElement];
    let e = tab();
    wrapTab(e, host, b);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(a);
    e = tab(true);
    wrapTab(e, host, a);
    expect(document.activeElement).toBe(b);
    e = tab();
    wrapTab(e, host, a);
    expect(e.defaultPrevented).toBe(false);
  });

  it("wraps past a disabled last control that carries a tabindex", () => {
    const host = mount(
      `<button id="a">a</button><button id="b">b</button><button id="off" disabled tabindex="0">off</button>`,
    );
    const [a, b] = tabbables(host) as [HTMLElement, HTMLElement];
    let e = tab();
    wrapTab(e, host, b);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(a);
    e = tab(true);
    wrapTab(e, host, a);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(b);
  });

  it("wraps from a focused element outside the Tab order", () => {
    const host = mount(
      `<button id="a">a</button><button id="seg" tabindex="-1">seg</button>`,
    );
    const e = tab();
    wrapTab(e, host, host.querySelector("#seg"));
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("a");
  });

  it("holds focus on the container when it has no controls", () => {
    const host = mount(`<p>text</p>`);
    host.tabIndex = -1;
    const e = tab();
    wrapTab(e, host, document.body);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(host);
  });
});
