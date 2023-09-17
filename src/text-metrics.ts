import { createSvgElement } from "./createSvgElement";

export function getCharacterMetrics(
  container: SVGElement,
  fontName: string,
  fontSize: number
): Promise<{ width: number; height: number }> {
  const text = createSvgElement("text");
  container.appendChild(text);
  text.setAttribute(
    "style",
    `font-size: ${fontSize}px; font-family: ${fontName};`
  );
  text.innerHTML = "a";
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      const { width, height } = text.getBBox();
      resolve({ width, height });
      text.remove();
    });
  });
}
