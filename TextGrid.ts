import { createSvgElement } from "./createSvgElement";
import { Point } from "./point";

const fontSize = 20;
const fontFamily = "Menlo";

const courierWidthMetric = 0.6;
const courierHeightMetric = 1.1;

const baselineFromBottomAsFractionOfFontSize = 0.2;
const baselineFromBottom = fontSize * baselineFromBottomAsFractionOfFontSize;

export const cellWidth = fontSize * courierWidthMetric;
export const cellHeight = fontSize * courierHeightMetric;

type CellMap = Map<string, SVGTextElement>;

console.log("Initiating CellMap");

export class TextGrid {
  private cellMap: CellMap = new Map();
  private parentSvgElemnent: SVGElement;
  private cursorRectElement: SVGRectElement;
  private cursorX = 0;
  private cursorY = 0;

  constructor(parentSvgElement: SVGElement) {
    this.parentSvgElemnent = parentSvgElement;
    this.cursorRectElement = createSvgElement("rect");
    this.cursorRectElement.setAttribute("width", String(cellWidth));
    this.cursorRectElement.setAttribute("height", String(cellHeight));
    this.cursorRectElement.style.verticalAlign = "bottom";
    this.cursorRectElement.style.fill = "pink";
    this.applyCursor();
    this.parentSvgElemnent.appendChild(this.cursorRectElement);
  }

  getCursor(): { x: number; y: number } {
    return { x: this.cursorX, y: this.cursorY };
  }

  /**
   * Move cursor to cell. Independant of cursor visiblity.
   * @param x Cell x
   * @param y Cell y
   */
  moveCursor(x: number, y: number) {
    this.cursorX = x;
    this.cursorY = y;
    this.applyCursor();
  }

  moveCursorRelative(x: number, y = 0) {
    this.cursorX += x;
    this.cursorY += y;
    this.applyCursor();
  }

  applyCursor() {
    this.cursorRectElement.setAttribute("x", String(cellWidth * this.cursorX));
    this.cursorRectElement.setAttribute("y", String(cellHeight * this.cursorY));
  }

  showCursor() {
    this.cursorRectElement.style.visibility = "visible";
  }

  hideCursor() {
    this.cursorRectElement.style.visibility = "hidden";
  }

  static findCellFromPoint(point: Point): { x: number; y: number } {
    return {
      x: Math.floor(point.x / cellWidth),
      y: Math.floor(point.y / cellHeight),
    };
  }

  createCell(x: number, y: number): SVGTextElement {
    const element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    const key = `${x},${y}`;

    // Not sure if we need this
    // element.setAttribute("data-x", String(x));
    // element.setAttribute("data-y", String(y));

    element.setAttribute("x", String(x * cellWidth));
    element.setAttribute(
      "y",
      String((y + 1) * cellHeight - baselineFromBottom)
    );
    element.setAttribute(
      "style",
      `font-size: ${fontSize}px; font-family: ${fontFamily};`
    );

    this.cellMap.set(key, element);
    this.parentSvgElemnent.appendChild(element);
    return element;
  }

  private getCell(x: number, y: number) {
    const key = `${x},${y}`;
    return this.cellMap.get(key);
  }

  writeCharacterAtCursor(char: string) {
    this.writeCharacter(this.cursorX, this.cursorY, char);
    this.cursorX++;
    this.applyCursor();
  }

  writeCharacter(x: number, y: number, char: string) {
    let cell = this.getCell(x, y);
    if (!cell) {
      cell = this.createCell(x, y);
    }
    cell.innerHTML = char;
  }

  clearCharacter(x: number, y: number) {
    const cell = this.getCell(x, y);
    if (!cell) {
      return;
    }
    cell.innerHTML = "";
  }

  writeText(x: number, y: number, text: string): { x: number; y: number } {
    if (!text?.length) {
      return { x: 0, y: 0 };
    }

    let column = 0;
    for (const c of text) {
      if (c === "\n") {
        column = 0;
        y++;
      } else {
        this.writeCharacter(x + column, y, c);
        column++;
      }
    }
    return { x: x + column, y };
  }

  writeTextAtCursor(text: string) {
    const newCursor = this.writeText(this.cursorX, this.cursorY, text);
    this.moveCursor(newCursor?.x, newCursor.y);
  }

  export(): ExportedTextGrid {
    const cells = Array.from(this.cellMap);
    // TODO:
    // Get only cells with text.
    // Sort by coordinates
    // Collect contiguous spans of text, splitting on X or more spaces between. (for e.gX=3 or a bit larger )
    throw new Error("Not implemented");
  }

  import(data: ExportedTextGrid) {
    // TODO
    throw new Error("Not implemented");
  }
}

type ExportedTextGrid = ExportedTextSpan[];

type ExportedTextSpan = {
  x: number;
  y: number;
  value: string;
};
