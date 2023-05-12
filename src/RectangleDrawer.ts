import { createSvgElement } from "./createSvgElement";
import { ElementDrawer } from "./ElementDrawer";
import { ORIGIN, Point } from "./point";
import { convertPointsToRect } from "./rect";

const MINIMUM_RECTANGLE_SIZE = 5;

export class RectangleDrawer implements ElementDrawer {
  private element: SVGElement;
  private container: SVGElement;
  private start: Point = ORIGIN;
  private end: Point = ORIGIN;

  constructor(container: SVGElement) {
    this.container = container;
    this.element = createSvgElement("rect");
    this.element.classList.add("box");
  }

  private apply() {
    const { x, y, w, h } = convertPointsToRect(this.start, this.end);
    this.element.setAttribute("x", String(x));
    this.element.setAttribute("y", String(y));
    this.element.setAttribute("width", String(w));
    this.element.setAttribute("height", String(h));
  }

  public startPath(origin: Point) {
    this.container.appendChild(this.element);
    this.start = origin;
    this.end = origin;
    this.apply();
  }

  public updatePath(point: Point): void {
    this.end = point;
    this.apply();
  }

  public endPath(): void {
    // If the rectangle is of negligeable size, cancel it
    const { w, h } = convertPointsToRect(this.start, this.end);
    if (w < MINIMUM_RECTANGLE_SIZE || h < MINIMUM_RECTANGLE_SIZE) {
      this.element.remove();
    }
    // Nothing else to do here
  }
}
