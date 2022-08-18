export const cellWidth = 12;
export const cellHeight = 18;

type CellMap = Map<string, SVGTextElement>;

console.log("Initiating CellMap");

const cellMap: CellMap = new Map();

function createCell(x: number, y: number): SVGTextElement {
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  const key = `${x},${y}`;
  element.setAttribute("data-x", String(x));
  element.setAttribute("data-y", String(y));
  cellMap.set(key, element);
  return element;
}

function getCell(x: number, y: number) {
  const key = `${x},${y}`;
  return cellMap.get(key);
}

export function writeCharacter(x: number, y: number, char: string) {
  let cell = getCell(cellMap, x, y);
  if (!cell) {
    cell = createCell(cellMap, x, y);
  }
  cell.innerHTML = char;
}

export function clearCharacter(x: number, y: number) {
  const cell = getCell(cellMap, x, y);
  if (!cell) {
    return;
  }
  cell.innerHTML = "";
}
