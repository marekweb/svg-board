export type Point = Readonly<{
  x: number;
  y: number;
}>;

export const ORIGIN: Point = { x: 0, y: 0 };

export function mid(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function diff(a: Point, b: Point): Point {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

export function add(a: Point, b: Point): Point {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

export function mul(point: Point, factor: number): Point {
  return {
    x: point.x * factor,
    y: point.y * factor,
  };
}

export function negative(point: Point): Point {
  return {
    x: -point.x,
    y: -point.y,
  };
}

export function round(point: Point): Point {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
  };
}

/**
 * Apply translate and then scale to get a canvas point from an input point.
 */
export function transformPoint(
  point: Point,
  scale: number,
  translate: Point
): Point {
  return mul(add(point, translate), scale);
}

export function equalsRounded(a: Point, b: Point): boolean {
  return (
    Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y)
  );
}
