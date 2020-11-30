/**
 * Create any SVG element;
 */
export function createSvgElement<T extends keyof SVGElementTagNameMap>(
  name: T,
  attributes?: Record<string, string>
): SVGElementTagNameMap[T] {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  setAttributes(element, attributes);
  return element;
}

function setAttributes<T extends SVGElement>(
  element: T,
  attributes?: Record<string, string>
): void {
  if (attributes) {
    for (const key in attributes) {
      element.setAttribute(key, attributes[key]);
    }
  }
}

export function setStyle(
  element: SVGElement | HTMLElement,
  styleAttributes: Partial<CSSStyleDeclaration>
): void {
  for (const key in styleAttributes) {
    // The '' fallback is to make TS happy. Could it be fixed differently?
    element.style[key] = styleAttributes[key] ?? "";
  }
}
