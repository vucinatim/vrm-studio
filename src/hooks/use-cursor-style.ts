import { useEffect } from "react";

const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

const ROTATE_CURSOR = "grab";
const ROTATING_CURSOR = "grabbing";
const PAN_CURSOR = "all-scroll";
const PANNING_CURSOR = "grabbing";

export const useCursorStyle = (canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!canvas) return;

    let isPanningKey = false;

    const setCursor = (cursor: string) => {
      canvas.style.cursor = cursor;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const panKeyPressed = e.shiftKey || (isMac ? e.metaKey : e.ctrlKey);
      if (panKeyPressed && !isPanningKey) {
        isPanningKey = true;
        setCursor(PAN_CURSOR);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isPanningKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        isPanningKey = false;
        setCursor(ROTATE_CURSOR);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left mouse button
        setCursor(isPanningKey ? PANNING_CURSOR : ROTATING_CURSOR);
      }
    };

    const handleMouseUp = () => {
      setCursor(isPanningKey ? PAN_CURSOR : ROTATE_CURSOR);
    };

    const handleMouseEnter = (e: MouseEvent) => {
      isPanningKey = e.shiftKey || (isMac ? e.metaKey : e.ctrlKey);
      setCursor(isPanningKey ? PAN_CURSOR : ROTATE_CURSOR);

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseLeave = () => {
      setCursor("default");

      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };

    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      if (canvas) {
        setCursor("default");
      }
    };
  }, [canvas]);
};
