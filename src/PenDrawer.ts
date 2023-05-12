import { ElementDrawer } from "./ElementDrawer";
import { createSvgElement } from "./createSvgElement";
import {
  generateLinearPathString,
  generateQuadraticMidpointSmoothedPathString,
} from "./paths";
import { Point } from "./point";

const PATH_ALGORITHM: "linear" | "smoothed" = "smoothed";

function generatePathString(points: Point[]) {
  if (PATH_ALGORITHM === "smoothed") {
    return generateQuadraticMidpointSmoothedPathString(points);
  } else if (PATH_ALGORITHM === "linear") {
    return generateLinearPathString(points);
  }

  throw new Error("Not a valid path algorithm");
}
export class PenDrawer implements ElementDrawer {
  private element: SVGElement;
  private container: SVGElement;
  private points: Point[] = [];

  constructor(container: SVGElement, classList: string[] = []) {
    this.container = container;
    this.element = createSvgElement("path", {}, classList);
  }

  private applyPath() {
    const pathString = generatePathString(this.points);
    this.element.setAttribute("d", pathString);
  }

  public startPath(origin: Point) {
    this.container.appendChild(this.element);
    this.points.push(origin);
    this.applyPath();
  }

  public updatePath(point: Point): void {
    this.points.push(point);
    // Performance note: this re-generates the path string on every new point.
    this.applyPath();
  }

  public endPath(): void {
    if (this.points.length === 0) {
      this.element.remove();
    }
    // Nothing else to do here
  }
}
