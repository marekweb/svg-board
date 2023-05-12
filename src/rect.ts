import { Point } from "./point";

export type Rect = Readonly<{
  x: number;
  y: number;
  w: number;
  h: number;
}>;

export function isRectEqual(rect1: Rect, rect2: Rect): boolean {
  if (rect1.x !== rect2.x || rect1.y !== rect2.y) {
    return false;
  }

  if (rect1.w !== rect2.w || rect1.h !== rect2.h) {
    return false;
  }

  return true;
}

export function convertPointsToRect(a: Point, b: Point): Rect {
  // Find the left, right, top, and bottom coordinates of the rectangle
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);

  // Return the normalized coordinates of the rectangle
  return { x: left, y: top, w: right - left, h: bottom - top };
}
