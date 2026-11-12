import { describe, expect, it, vi } from "vitest";
import Card from "./Card";

describe("Card keyboard activation", () => {
  it.each(["Enter", " "])("activates once with %j and prevents the default key action", (key) => {
    const onClick = vi.fn();
    const preventDefault = vi.fn();
    const target = {};
    const card = Card({ children: "Open topic", onClick });
    card.props.onKeyDown({ key, target, currentTarget: target, preventDefault });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(card.props.role).toBe("button");
    expect(card.props.tabIndex).toBe(0);
  });

  it.each(["Tab", "Escape", "ArrowRight", "a"])("does not hijack %j", (key) => {
    const onClick = vi.fn();
    const preventDefault = vi.fn();
    const target = {};
    Card({ children: "Open topic", onClick }).props.onKeyDown({ key, target, currentTarget: target, preventDefault });
    expect(onClick).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it.each(["Enter", " "])("does not also activate for a descendant control's %j", (key) => {
    const onClick = vi.fn();
    const preventDefault = vi.fn();
    Card({ children: "Open topic", onClick }).props.onKeyDown({ key, target: {}, currentTarget: {}, preventDefault });
    expect(onClick).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("preserves pointer activation", () => {
    const onClick = vi.fn();
    Card({ children: "Open topic", onClick }).props.onClick();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not make a static card a pretend button or keyboard stop", () => {
    const { props } = Card({ children: "Study summary" });
    expect(props.role).toBeUndefined();
    expect(props.tabIndex).toBeUndefined();
    expect(props.onClick).toBeUndefined();
    expect(props.onKeyDown).toBeUndefined();
  });
});
