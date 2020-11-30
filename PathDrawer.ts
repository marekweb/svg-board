import {
  generateQuadraticMidpointSmoothedPathString,
  generateLinearPathString,
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

type PathElementFactory = () => SVGPathElement;

export interface PathDrawer<P> {
  startPath(origin: Point): P;
  updatePath(path: P, point: Point): void;
  endPath(path: P): void;
}

export interface ActiveDrawingPath {
  pathElement: SVGPathElement;
  points: Point[];
}

export class ActivePathDrawer implements PathDrawer<ActiveDrawingPath> {
  private createPathElement: PathElementFactory;

  constructor({
    createPathElement,
  }: {
    createPathElement: PathElementFactory;
  }) {
    this.createPathElement = createPathElement;
  }

  public startPath(origin: Point): ActiveDrawingPath {
    const pathElement = this.createPathElement();
    return {
      pathElement,
      points: [origin],
    };
  }

  public updatePath(path: ActiveDrawingPath, point: Point): void {
    path.points.push(point);
    // Performance note: this re-generates the path string on every new point.
    const pathString = generatePathString(path.points);
    path.pathElement.setAttribute("d", pathString);
  }

  public endPath(/*path: ActiveDrawingPath*/): void {
    // Nothing to do here
  }
}
