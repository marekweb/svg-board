type ElementAttributeName<T extends Element> = keyof {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T as T[K] extends Function ? never : K]: string;
};

type ElementAttributes<T extends Element> = Partial<{
  [K in ElementAttributeName<T>]: unknown;
}>;

/**
 * Create any SVG element;
 */
export function createSvgElement<T extends keyof SVGElementTagNameMap>(
  name: T,
  attributes?: ElementAttributes<SVGElementTagNameMap[T]>,
  classList?: string[] | string
): SVGElementTagNameMap[T] {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  if (attributes) {
    setAttributes<SVGElementTagNameMap[T]>(element, attributes);
  }
  if (typeof classList === "string") {
    element.classList.add(classList);
  } else if (Array.isArray(classList)) {
    element.classList.add(...classList);
  }
  return element;
}

export function setAttributes<T extends SVGElement>(
  element: T,
  attributes?: ElementAttributes<T>
): void {
  if (attributes) {
    for (const key in attributes) {
      element.setAttribute(key, String(attributes[key]));
    }
  }
}

export function setStyle(
  element: SVGElement | HTMLElement,
  styleAttributes: Partial<CSSStyleDeclaration>
): void {
  for (const key in styleAttributes) {
    // The "" fallback is to make TS happy. Could it be fixed differently?
    element.style[key] = styleAttributes[key] ?? "";
  }
}
