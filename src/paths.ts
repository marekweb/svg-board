import { Point, mid } from "./point";

export function generateQuadraticMidpointSmoothedPathString(
  points: Point[]
): string {
  // Need at least 3 points
  if (points.length < 3) {
    return "";
  }
  const first = points[0];
  const second = points[1];
  const last = points[points.length - 1];
  const midTwo = mid(first, second);
  const restWithoutLast = points.slice(1, points.length - 1);
  return `M${first.x},${first.y}L${midTwo.x},${midTwo.y}${restWithoutLast
    .map((point, i) => {
      const m = mid(point, points[i + 2]);
      return `Q${point.x},${point.y} ${m.x},${m.y}`;
    })
    .join("")}L${last.x},${last.y}`;
}

export function generateLinearPathString(points: Point[]): string {
  const pointStrings = points.map((p) => `${p.x},${p.y}`);
  return `M${pointStrings.join(" ")}`;
}
