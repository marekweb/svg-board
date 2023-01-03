import { createSvgElement } from "./createSvgElement";
import { add, ORIGIN, Point } from "./point";
import { convertPointsToRect } from "./rect";
import { getCharacterMetrics } from "./text-metrics";

const fontSize = 20;

const baselineFromBottomAsFractionOfFontSize = 0.2;
const baselineFromBottom = fontSize * baselineFromBottomAsFractionOfFontSize;

export const cellWidth = 11; //fontSize * courierWidthMetric;
export const cellHeight = 22; //fontSize * courierHeightMetric;

const highlightClasses = [
  "highlight-red",
  "highlight-green",
  "highlight-blue",
] as const;

interface GridCell {
  groupElement: SVGGElement;
  textElement: SVGTextElement;
  backgroundElement: SVGRectElement;
  location: Point;
}
type CellMap = Map<string, GridCell>;

console.log("Initiating CellMap");

export class TextGrid {
  private cellMap: CellMap = new Map();
  private parentSvgElemnent: SVGElement;
  private cursorRectElement: SVGRectElement;
  private cursorStart: Point = ORIGIN;
  private cursorEnd: Point | undefined;

  constructor(parentSvgElement: SVGElement) {
    this.parentSvgElemnent = parentSvgElement;
    this.cursorRectElement = createSvgElement("rect");
    this.cursorRectElement.setAttribute("width", String(cellWidth));
    this.cursorRectElement.setAttribute("height", String(cellHeight));
    this.cursorRectElement.style.verticalAlign = "bottom";
    this.cursorRectElement.classList.add("selection-cursor");
    this.applyCursor();
    this.parentSvgElemnent.appendChild(this.cursorRectElement);

    const metrics = getCharacterMetrics(this.parentSvgElemnent, "Iosevka", 20);
  }

  /** Return position of the cursor as a single position */
  getCursor(): Point {
    return this.cursorStart;
  }

  /**
   * Move cursor to cell. Independant of cursor visiblity.
   */
  moveCursor(x: number, y: number) {
    this.cursorStart = { x, y };
    this.cursorEnd = undefined;
    this.applyCursor();
  }

  setSelectionEnd(point: Point) {
    console.log("Cursor end set to", this.cursorEnd);

    // Implement maximum selection size This doesn't currently work and it
    // especially doesn't work when the cursor is moved to the left or up.
    const maxCursorEndX = this.cursorStart.x + 30;
    const newCursorEndX = Math.min(point.x, maxCursorEndX);
    const maxCursorEndY = this.cursorStart.y + 30;
    const newCursorEndY = Math.min(point.y, maxCursorEndY);

    this.cursorEnd = { x: newCursorEndX, y: newCursorEndY };

    this.applyCursor();
  }

  /**
   * Make sure that cursorStart is the top left and cursorEnd is the bottom
   * right (because the selection may be created by dragging backwards, i.e.
   * upwards or leftwards).
   *
   * This doesn't need to be the case during `text-selecting` mode, because at
   * that point the cursorStart needs to keep track of where the dragging was
   * started and cursorEnd is where the pointer is currently dragging.
   */
  normalizeCursorSelection() {
    if (!this.cursorEnd) return;
    const rect = convertPointsToRect(this.cursorStart, this.cursorEnd);
    this.cursorStart = { x: rect.x, y: rect.y };
    this.cursorEnd = { x: rect.x + rect.w, y: rect.y + rect.h };
  }

  moveCursorRelative(x: number, y = 0) {
    this.cursorStart = add(this.cursorStart, { x, y });
    this.cursorEnd = undefined;
    this.applyCursor();
  }

  /**
   * Update the cursor rect based on cursorStart and cursorEnd.
   */
  applyCursor() {
    console.log("Applying cursor location");
    const cursorEnd = this.cursorEnd ?? this.cursorStart;
    // this.cursorRectElement.setAttribute("x", String(cellWidth * this.cursorX));
    // this.cursorRectElement.setAttribute("y", String(cellHeight * this.cursorY));

    const selectionRect = convertPointsToRect(this.cursorStart, cursorEnd);

    this.cursorRectElement.setAttribute(
      "x",
      String(cellWidth * selectionRect.x)
    );
    this.cursorRectElement.setAttribute(
      "y",
      String(cellHeight * selectionRect.y)
    );
    this.cursorRectElement.setAttribute(
      "width",
      String(cellWidth * (selectionRect.w + 1))
    );
    this.cursorRectElement.setAttribute(
      "height",
      String(cellHeight * (selectionRect.h + 1))
    );
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

  createCell(x: number, y: number): GridCell {
    const textElement = createSvgElement(
      "text",
      {
        x: String(x * cellWidth + cellWidth / 2),
        y: String((y + 1) * cellHeight - baselineFromBottom),
        "text-anchor": "middle",
      },
      "cell"
    );
    const backgroundElement = createSvgElement("rect", {
      x: String(x * cellWidth),
      y: String(y * cellHeight),
      width: String(cellWidth),
      height: String(cellHeight),
    });
    backgroundElement.classList.add("text-bg");
    const groupElement = createSvgElement("g", {});
    const key = `${x},${y}`;

    // Not sure if we need this
    // element.setAttribute("data-x", String(x));
    // element.setAttribute("data-y", String(y));

    // textElement.setAttribute(
    //   "style",
    //   `font-size: ${fontSize}px; font-family: ${fontFamily};`
    // );
    groupElement.appendChild(backgroundElement);

    groupElement.appendChild(textElement);
    this.parentSvgElemnent.appendChild(groupElement);

    const cell = {
      groupElement,
      textElement,
      backgroundElement,
      location: { x, y },
    };

    this.cellMap.set(key, cell);
    return cell;
  }

  private getCell(x: number, y: number): GridCell | undefined {
    const key = `${x},${y}`;
    return this.cellMap.get(key);
  }

  private getOrCreateCell(x: number, y: number): GridCell {
    let cell = this.getCell(x, y);
    if (!cell) {
      cell = this.createCell(x, y);
    }
    return cell;
  }

  getCellsInSelection(includeEmptyCells = false): GridCell[] {
    // Handle the case when a single cell is selected
    if (!this.cursorEnd) {
      console.log("Got only one cell from selection");
      const cell = this.getCell(this.cursorStart.x, this.cursorStart.y);
      if (cell) {
        return [cell];
      }
      return [];
    }

    const cells = [];
    for (let y = this.cursorStart.y; y <= this.cursorEnd.y; y++) {
      for (let x = this.cursorStart.x; x <= this.cursorEnd.x; x++) {
        const cell = includeEmptyCells
          ? this.getOrCreateCell(x, y)
          : this.getCell(x, y);
        if (!cell || (isCellEmpty(cell) && !includeEmptyCells)) {
          continue;
        }
        cells.push(cell);
      }
    }
    return cells;
  }

  pruneCells() {
    const allCells = Array.from(this.cellMap);
    for (const cellEntry of allCells) {
      const [key, cell] = cellEntry;
      if (isCellEmpty(cell)) {
        this.cellMap.delete(key);
      }
    }
  }

  toggleCellClassAtSelection(className: string) {
    const firstCell = this.getCell(this.cursorStart.x, this.cursorStart.y);
    const value =
      firstCell && firstCell.groupElement.classList.contains(className);
    const cells = this.getCellsInSelection();
    // TODO: decide what to do when the cell is actually empty.
    for (const cell of cells) {
      cell.groupElement.classList.toggle(className, !value);
    }
  }

  removeClassesOnSelection(classNames: readonly string[]) {
    const cells = this.getCellsInSelection();
    for (const cell of cells) {
      cell.groupElement.classList.remove(...classNames);
    }
  }

  addClassesOnSelection(className: typeof highlightClasses[number]) {
    const cells = this.getCellsInSelection(true);
    for (const cell of cells) {
      cell.groupElement.classList.add(className);
    }
  }

  setHighlightClassOnSelection(className: typeof highlightClasses[number]) {
    this.clearHighlightOnSelection();
    this.addClassesOnSelection(className);
  }

  clearHighlightOnSelection() {
    this.removeClassesOnSelection(highlightClasses);
  }

  writeCharacterAtCursor(char: string) {
    this.writeCharacter(this.cursorStart.x, this.cursorStart.y, char);
    this.cursorStart = { x: this.cursorStart.x + 1, y: this.cursorStart.y };
    this.cursorEnd = undefined;
    this.applyCursor();
  }

  writeCharacter(x: number, y: number, char: string) {
    const cell = this.getOrCreateCell(x, y);
    cell.textElement.innerHTML = char;
  }

  clearCharacter(x: number, y: number) {
    const cell = this.getCell(x, y);
    if (!cell) {
      return;
    }
    cell.textElement.innerHTML = "";
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
    const newCursor = this.writeText(
      this.cursorStart.x,
      this.cursorStart.y,
      text
    );
    this.moveCursor(newCursor?.x, newCursor.y);
  }

  getSelectedText(): string {
    const cells = this.getCellsInSelection();
    if (!cells.length) {
      return "";
    }

    let text = "";
    let currentY = this.cursorStart.y;
    let lastX = this.cursorStart.x - 1;
    let leadingSpaces = 0;
    for (const cell of cells) {
      if (cell.location.y !== currentY) {
        const lines = cell.location.y - currentY;
        currentY = cell.location.y;
        leadingSpaces = cell.location.x - this.cursorStart.x;
        text += "\n".repeat(lines) + " ".repeat(leadingSpaces);
        lastX = this.cursorStart.x - 1;
      }
      // Add spaces since last cell
      const spaces = cell.location.x - lastX - 1;
      text += " ".repeat(spaces) + cell.textElement.innerHTML;
      lastX = cell.location.x;
    }
    return text;
  }

  export(): ExportedTextGrid {
    const cells = Array.from(this.cellMap).map((entry) => {
      const cell = entry[1];
      // const [coords, cell] = entry;
      // const [x, y] = entry[0].split(",").map((n) => Number.parseInt(n, 10));
      return {
        x: cell.location.x,
        y: cell.location.y,
        text: cell.textElement.innerHTML,
        classList: Array.from(cell.groupElement.classList).sort(),
      };
    });

    const cellsByY = new Map<number, typeof cells>();
    for (const cell of cells) {
      let cellList = cellsByY.get(cell.y);
      if (!cellList) {
        cellList = [];
        cellsByY.set(cell.y, cellList);
      }
      cellList.push(cell);
    }

    // Consolidate into spans
    const spans: ExportedTextSpan[] = [];
    Array.from(cellsByY).forEach(([y, entry]) => {
      const sortedCells = entry.sort((a, b) => a.x - b.x);
      if (!sortedCells.length) {
        return;
      }
      let span: ExportedTextSpan = {
        x: sortedCells[0].x,
        y,
        t: sortedCells[0].text,
      };
      if (sortedCells[0].classList.length) {
        span.c = sortedCells[0].classList;
      }
      spans.push(span);

      for (const cell of sortedCells.slice(1)) {
        const distance = cell.x - span.x - span.t.length;
        if (distance < 3) {
          // todo also check the class list
          span.t += " ".repeat(distance) + cell.text;
        } else {
          span = {
            x: cell.x,
            y,
            t: cell.text,
          };
          if (cell.classList.length) {
            span.c = cell.classList;
          }
          spans.push(span);
        }
      }
    });

    return { version: 1, spans };
  }

  clear() {
    for (const cell of this.cellMap.values()) {
      cell.textElement.remove();
      cell.groupElement.remove();
    }
    this.cellMap.clear();
  }

  importData(data: ExportedTextGrid) {
    // Origin is used if we are importing to a location, not to the origin.
    const origin = ORIGIN;
    this.clear();

    for (const entry of data.spans) {
      this.writeText(origin.x + entry.x, origin.y + entry.y, entry.t);
    }
  }
}

export type ExportedTextGrid = {
  version: 1;
  spans: ExportedTextSpan[];
};

type ExportedTextSpan = {
  x: number;
  y: number;
  t: string;
  c?: string[];
};

function getCellText(cell: GridCell): string {
  return cell.textElement.innerHTML;
}

function isCellEmpty(cell: GridCell | undefined): boolean {
  if (!cell) {
    return true;
  }
  const text = getCellText(cell);
  if (text === "" || text === " ") {
    return true;
  }

  return false;
}
