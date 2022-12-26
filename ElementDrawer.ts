import { Point } from "./point";

export interface ElementDrawer {
  startPath(origin: Point): void;
  updatePath(point: Point): void;
  endPath(): void;
}
