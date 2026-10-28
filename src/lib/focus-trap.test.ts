// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetFocusTrapsForTests,
  activateFocusTrap,
  captureReturnTarget,
  type FocusTrapOptions,
  resolveReturnTarget,
} from "./focus-trap";

const BUTTONS = `<button id="a">a</button><button id="b">b</button><button id="c">c</button>`;

/** Page content first, then an overlay portaled after it (as the app's
 *  dialogs are): root > [backdrop, panel > controls]. */
function setup(panelHtml = BUTTONS) {
  document.body.innerHTML = `<main><div id="bar"><button id="trigger">open</button><button id="next">next</button></div></main>`;
  const root = document.createElement("div");
  root.innerHTML = `<button id="backdrop" tabindex="-1">x</button><div id="panel" tabindex="-1">${panelHtml}</div>`;
  document.body.appendChild(root);
  return { root, panel: document.getElementById("panel")! };
}

const $ = (id: string) => document.getElementById(id)!;
const focused = () => document.activeElement?.id;

function press(key: string, init: KeyboardEventInit = {}) {
  const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  (document.activeElement ?? document.body).dispatchEvent(e);
  return e;
}

function open(panel: HTMLElement, root: HTMLElement, extra: Partial<FocusTrapOptions> = {}) {
  return activateFocusTrap(panel, {
    root,
    returnTo: captureReturnTarget(document.activeElement),
    onEscape: () => {},
    ...extra,
  });
}

/** A second overlay portaled after everything else. */
function overlay(id: string, html: string) {
  const root = document.createElement("div");
  root.innerHTML = `<div id="${id}" tabindex="-1">${html}</div>`;
  document.body.appendChild(root);
  return { root, panel: $(id) };
}

afterEach(() => {
  __resetFocusTrapsForTests();
  document.body.innerHTML = "";
});

describe("initial focus", () => {
  it("focuses the first control by default", () => {
    const { root, panel } = setup();
    $("trigger").focus();
    open(panel, root);
    expect(focused()).toBe("a");
  });

  it("prefers [data-autofocus], then initialFocus()", () => {
    const { root, panel } = setup(
      `<button id="a">a</button><button id="b" data-autofocus>b</button><button id="c">c</button>`,
    );
    const release = open(panel, root, { initialFocus: () => $("c") });
    expect(focused()).toBe("b");
    release();
    const fresh = setup();
    open(fresh.panel, fresh.root, { initialFocus: () => $("c") });
    expect(focused()).toBe("c");
  });

  it("keeps a control the caller already focused (autoFocus)", () => {
    const { root, panel } = setup();
    $("b").focus();
    open(panel, root);
    expect(focused()).toBe("b");
  });

  it("falls back to the panel when nothing inside can take focus", () => {
    const { root, panel } = setup(`<p>Just text.</p>`);
    open(panel, root);
    expect(focused()).toBe("panel");
  });
});

describe("Tab and Escape", () => {
  it("wraps Tab from the last control and Shift+Tab from the first", () => {
    const { root, panel } = setup();
    open(panel, root);
    $("c").focus();
    expect(press("Tab").defaultPrevented).toBe(true);
    expect(focused()).toBe("a");
    expect(press("Tab", { shiftKey: true }).defaultPrevented).toBe(true);
    expect(focused()).toBe("c");
  });

  it("leaves Tab between inner controls to the browser", () => {
    const { root, panel } = setup();
    open(panel, root);
    $("b").focus();
    expect(press("Tab").defaultPrevented).toBe(false);
    expect(press("Tab", { shiftKey: true }).defaultPrevented).toBe(false);
  });

  it("Shift+Tab from the panel itself goes to the last control", () => {
    const { root, panel } = setup();
    open(panel, root);
    panel.focus();
    press("Tab", { shiftKey: true });
    expect(focused()).toBe("c");
  });

  it("brings Tab back inside when focus fell to <body>", () => {
    const { root, panel } = setup();
    open(panel, root);
    (document.activeElement as HTMLElement).blur();
    press("Tab");
    expect(focused()).toBe("a");
  });

  it("closes on Escape and claims the key", () => {
    const { root, panel } = setup();
    const onEscape = vi.fn();
    open(panel, root, { onEscape });
    const e = press("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it("ignores an Escape something inside already handled", () => {
    const { root, panel } = setup();
    const onEscape = vi.fn();
    open(panel, root, { onEscape });
    $("a").addEventListener("keydown", (e) => e.preventDefault());
    press("Escape");
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("leaves keys pressed in an overlay opened on top alone", () => {
    const { root, panel } = setup();
    const onEscape = vi.fn();
    open(panel, root, { onEscape });
    overlay("menu", `<button id="item">item</button>`);
    $("item").focus();
    expect(focused()).toBe("item");
    expect(press("Tab").defaultPrevented).toBe(false);
    press("Escape");
    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe("focus pulled behind the modal", () => {
  it("is pulled back in, and becomes where focus returns on close", () => {
    const { root, panel } = setup();
    const release = open(panel, root);
    $("b").focus();
    $("next").focus(); // e.g. a closing menu restoring its trigger
    expect(focused()).toBe("b");
    release();
    expect(focused()).toBe("next");
  });

  it("moves to the panel when the focused control is removed", async () => {
    const { root, panel } = setup();
    open(panel, root);
    $("b").focus();
    $("b").remove(); // e.g. a picker swapping to another view
    await new Promise((r) => setTimeout(r, 0));
    expect(focused()).toBe("panel");
  });

  it("can't rest on the backdrop", () => {
    const { root, panel } = setup();
    open(panel, root);
    $("backdrop").focus();
    expect(focused()).toBe("a");
  });
});

describe("release", () => {
  it("returns focus to the trigger", () => {
    const { root, panel } = setup();
    $("trigger").focus();
    open(panel, root)();
    expect(focused()).toBe("trigger");
  });

  it("lands on the nearest control when the trigger is gone", () => {
    const { root, panel } = setup();
    $("trigger").focus();
    const release = open(panel, root);
    $("trigger").remove(); // e.g. Reset hides once nothing is left
    release();
    expect(focused()).toBe("next");
  });

  it("leaves focus that something else placed outside the dialog", () => {
    const { root, panel } = setup();
    $("trigger").focus();
    const release = open(panel, root);
    overlay("palette", `<input id="search" />`);
    $("search").focus(); // e.g. the command palette opening on top
    release();
    expect(focused()).toBe("search");
  });

  it("blurs a closing panel when there is nowhere to go", () => {
    const { root, panel } = setup();
    const release = open(panel, root); // opened with focus on <body>
    expect(focused()).toBe("a");
    release();
    expect(document.activeElement).toBe(document.body);
  });
});

describe("stacked traps", () => {
  it("only the top trap handles keys; closing it returns focus below", () => {
    const sheet = setup();
    $("trigger").focus();
    const sheetEscape = vi.fn();
    const releaseSheet = open(sheet.panel, sheet.root, { onEscape: sheetEscape });
    $("b").focus();

    const dialog = overlay("dialog", `<button id="x">x</button><button id="y">y</button>`);
    const dialogEscape = vi.fn();
    const releaseDialog = open(dialog.panel, dialog.root, { onEscape: dialogEscape });
    expect(focused()).toBe("x");
    $("y").focus();
    press("Tab");
    expect(focused()).toBe("x");
    press("Escape");
    expect(dialogEscape).toHaveBeenCalledTimes(1);
    expect(sheetEscape).not.toHaveBeenCalled();

    releaseDialog();
    expect(focused()).toBe("b");
    releaseSheet();
    expect(focused()).toBe("trigger");
  });

  it("falls back to the sheet's trigger once the sheet is gone too", () => {
    const sheet = setup();
    $("trigger").focus();
    const releaseSheet = open(sheet.panel, sheet.root);
    $("b").focus();
    // A sheet item opens a dialog and closes the sheet in one go: the
    // dialog reads its return target while the sheet is still open.
    const returnTo = captureReturnTarget(document.activeElement);
    const dialog = overlay("dialog", `<button id="x">x</button>`);
    releaseSheet();
    const releaseDialog = activateFocusTrap(dialog.panel, {
      root: dialog.root,
      returnTo,
      onEscape: () => {},
    });
    expect(focused()).toBe("x");
    sheet.root.remove();
    releaseDialog();
    expect(focused()).toBe("trigger");
  });
});

describe("captureReturnTarget / resolveReturnTarget", () => {
  it("maps a menu item to its menu's trigger", () => {
    document.body.innerHTML = `
      <button id="menu-trigger">more</button>
      <div role="menu" aria-labelledby="menu-trigger"><div id="item" role="menuitem" tabindex="-1">Unfollow</div></div>
    `;
    $("item").focus();
    expect(captureReturnTarget(document.activeElement)?.el.id).toBe("menu-trigger");
  });

  it("returns nothing for <body>", () => {
    expect(captureReturnTarget(document.body)).toBeNull();
    expect(resolveReturnTarget(null)).toBeNull();
  });
});
