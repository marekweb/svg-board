import { createSvgElement, setAttributes, setStyle } from "./createSvgElement";
import { PenDefinition } from "./pen";
import {
  add,
  mul,
  negative,
  ORIGIN,
  Point,
  round,
  transformPoint,
} from "./point";
import { TextGrid } from "./TextGrid";
import { PenDrawer } from "./PenDrawer";
import { ElementDrawer } from "./ElementDrawer";
import { RectangleDrawer } from "./RectangleDrawer";
import { pens } from "./pen";

window.addEventListener("load", () => {
  const elements = createBoardElements();
  new Application(elements);
});

interface BoardElements {
  svgElement: SVGSVGElement;
  contentGroupElement: SVGGElement;
  upperGroupElement: SVGGElement;
  lowerGroupElement: SVGGElement;
  textGroupElement: SVGGElement;
  debugTextElement: SVGTextElement;
  gridElement: SVGGElement;
  debugCircleElement: SVGCircleElement;
}

type BufferedEvent =
  | { type: "keyup"; key: string }
  | { type: "keydown"; key: string; meta: boolean }
  | { type: "pointerdown"; location: Point }
  | { type: "pointermove"; location: Point; relative: Point }
  | { type: "pointerup"; location: Point }
  | {
      type: "wheel";
      relative: Point;
    }
  | { type: "wheel-ctrl"; location: Point; delta: number };

const ENABLE_GRID = true;

function createBoardElements(): BoardElements {
  const svgElement = createSvgElement("svg");

  const contentGroupElement = createSvgElement("g", { id: "content-group" });
  svgElement.appendChild(contentGroupElement);

  const upperGroupElement = createSvgElement("g", { id: "upper-layer" });
  contentGroupElement.appendChild(upperGroupElement);

  const lowerGroupElement = createSvgElement("g", { id: "lower-layer" });
  contentGroupElement.appendChild(lowerGroupElement);

  const textGroupElement = createSvgElement("g", { id: "text-layer" });
  contentGroupElement.appendChild(textGroupElement);

  const gridElement = createSvgElement("g");
  contentGroupElement.appendChild(gridElement);

  const debugTextElement = createSvgElement("text", {
    id: "debug-text",
    y: "12px",
    style: "font-size: 12px; font-family: monospace",
  });
  svgElement.appendChild(debugTextElement);

  // Debug circle is in SVG coordinates, not content group.
  const debugCircleElement = createSvgElement("circle", {
    r: 5,
    style: "fill: red",
  });
  // Debug circle is disabled by commenting out the next line.
  // svgElement.appendChild(debugCircleElement);

  return {
    svgElement,
    contentGroupElement,
    upperGroupElement,
    lowerGroupElement,
    textGroupElement,
    debugTextElement,
    gridElement,
    debugCircleElement,
  };
}

class Application {
  private boardTranslate: Point = { x: 0, y: 0 };
  private boardScale = 1;

  private elements: BoardElements;
  private inputState:
    | "none"
    | "draw-ready"
    | "drawing"
    | "rect-ready"
    | "rect-drawing"
    | "hold-panning"
    | "text"
    | "text-selecting" = "none";
  private textGrid: TextGrid;

  private eventBuffer: BufferedEvent[] = [];
  private requestedAnimationFrame: number | undefined;

  // Used as a left margin, when pressing enter
  private initialCursorX = 0;

  private currentPathDrawer: ElementDrawer | undefined;

  constructor(elements: BoardElements) {
    this.elements = elements;
    this.textGrid = new TextGrid(this.elements.textGroupElement);
    window.importData = (data) => this.textGrid.importData(data)
    this.initialCursorX = 0;

    setStyle(this.elements.svgElement, {
      cursor: "crosshair",
    });

    document.body.appendChild(this.elements.svgElement);

    stretchToViewport(this.elements.svgElement);
    const bbox = this.elements.svgElement.getBBox();
    const boundingClientRect = this.elements.svgElement.getBoundingClientRect();
    console.log({ bbox, boundingClientRect });

    this.setupDotGrid();

    this.updateDebugState();

    this.attachEventListeners();
  }

  updateDebugText(text: string) {
    this.elements.debugTextElement.innerHTML = text;
  }

  updateDebugState() {
    this.updateDebugText(
      `${this.inputState}  T:${this.boardTranslate.x},${this.boardTranslate.y}  S:${this.boardScale}`
    );
  }

  updateDebugCircle(point: Point) {
    setAttributes(this.elements.debugCircleElement, {
      cx: `${point.x}px`,
      cy: `${point.y}px`,
    });
  }

  enterState(state: typeof this.inputState) {
    const oldState = this.inputState;
    this.inputState = state;
    console.log(`!!!State: ${oldState} -> ${state}`);
    this.updateDebugState();
  }

  /**
   * Request that processEvents() should be called on the next animation frame (idempotent).
   */
  requestProcessEvents() {
    if (this.requestedAnimationFrame === undefined) {
      this.requestedAnimationFrame = window.requestAnimationFrame(() => {
        this.requestedAnimationFrame = undefined;
        this.processEvents();
      });
    }
  }

  processEvents() {
    if (this.eventBuffer.length === 0) {
      console.warn(
        "processEvents called needlessly: eventBuffer is empty. this is not a problem but it indicates a possible bug."
      );
      return;
    }
    for (const event of this.eventBuffer) {
      this.processEvent(event);
    }
    this.eventBuffer = [];
  }

  processEvent(event: BufferedEvent) {
    if (this.inputState !== "text" && event.type === "keydown") {
      switch (event.key) {
        case "t":
          this.enterState("text");
          return;

        case "d":
          this.enterState("draw-ready");
          return;

        case "r":
          this.enterState("rect-ready");
          return;

        case "-":
          this.applyScaleFactor(0.5, this.getScreenCenter());
          return;

        case "=":
          this.applyScaleFactor(2, this.getScreenCenter());
          return;

        case " ":
          this.enterState("hold-panning");
          this.elements.svgElement.requestPointerLock();
          console.log("Hold panning");
          return;

        case "x":
            // "Export"
            const spans = this.textGrid.export()
            const f = JSON.stringify(spans);
            console.log(f)
            const blob = new Blob([f], {type: "applcation/json"})
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.download = "spans.json";
            a.href = url;
            a.click();
            return;

 
 

      }
    }

    if (this.inputState !== "hold-panning" && event.type === "wheel") {
      this.movePan(negative(event.relative));
      return;
    }

    if (this.inputState !== "hold-panning" && event.type === "wheel-ctrl") {
      const center = this.getScreenCenter();
      this.updateDebugCircle(center);
      const boardPoint = this.transformInputPoint(center);
      console.log("Factor", event.delta);
      this.applyScaleDelta(event.delta, boardPoint);
      return;
    }

    if (this.inputState === "hold-panning") {
      if (event.type === "pointermove") {
        this.movePan(event.relative);
        console.log("Panning");
        return;
      }

      if (event.type === "keyup" && event.key === " ") {
        console.log("Got a key space up");
        document.exitPointerLock();
        this.enterState("none");
        return;
      }

      return;
    }

    if (this.inputState === "draw-ready" && event.type === "pointerdown") {
      const boardPoint = this.transformInputPoint(event.location);
      this.enterState("drawing");
      const penIndex = 0;
      const pen = pens[penIndex];
      if (!pen) {
        throw new Error(`Pen ${penIndex} not found`);
      }

      let layerElement;
      switch (pen.layer) {
        case "lower":
          layerElement = this.elements.lowerGroupElement;
          break;
        case "upper":
          layerElement = this.elements.upperGroupElement;
          break;
        default:
          throw new Error(`Unknown layer ${pen.layer}`);
      }

      this.currentPathDrawer = new PenDrawer(
        layerElement,
        pen.classList
      );
      this.currentPathDrawer.startPath(boardPoint);
      return;
    }

    if (this.inputState === "drawing" && event.type === "pointermove") {
      const boardPoint = this.transformInputPoint(event.location);
      this.currentPathDrawer?.updatePath(boardPoint);
      return;
    }

    if (this.inputState === "drawing" && event.type === "pointerup") {
      this.currentPathDrawer?.endPath();
      this.enterState("draw-ready");
      return;
    }

    if (this.inputState === "rect-ready" && event.type === "pointerdown") {
      const boardPoint = this.transformInputPoint(event.location);
      this.enterState("rect-drawing");
      this.currentPathDrawer = new RectangleDrawer(
        this.elements.upperGroupElement
      );
      this.currentPathDrawer.startPath(boardPoint);
      return;
    }

    if (this.inputState === "rect-drawing" && event.type === "pointermove") {
      const boardPoint = this.transformInputPoint(event.location);
      this.currentPathDrawer?.updatePath(boardPoint);
      return;
    }

    if (this.inputState === "rect-drawing" && event.type === "pointerup") {
      this.currentPathDrawer?.endPath();
      this.enterState("rect-ready");
      return;
    }

    if (this.inputState === "text" && event.type === "pointerdown") {
      this.updateDebugCircle(event.location);

      const boardPoint = this.transformInputPoint(event.location);
      const { x, y } = TextGrid.findCellFromPoint(boardPoint);
      this.initialCursorX = x;
      // this.initialCursorY = y;

      this.textGrid.moveCursor(x, y);
      this.textGrid.showCursor();
      this.enterState("text-selecting");
      this.updateDebugState();
      console.log("Moved cursor");
    } else if (
      this.inputState === "text-selecting" &&
      event.type === "pointermove"
    ) {
      const boardPoint = this.transformInputPoint(event.location);
      const newCursorEnd = TextGrid.findCellFromPoint(boardPoint);
      this.textGrid.setSelectionEnd(newCursorEnd);
    } else if (
      this.inputState === "text-selecting" &&
      event.type === "pointerup"
    ) {
      this.enterState("text");
    } else if (event.type === "keydown" && event.key === "Escape") {
      if (this.inputState === "text") {
        this.textGrid.hideCursor();
      }
      this.enterState("none");
    } else if (this.inputState === "text" && event.type == "keydown") {
      if (event.key.length === 1 && !event.meta) {
        this.textGrid.writeCharacterAtCursor(event.key);
      } else if (event.key === "b" && event.meta) {
        // toggle bold under this character (or this selection)
        this.textGrid.toggleCellClassAtSelection("bold");
      } else if (event.key === "u" && event.meta) {
        this.textGrid.toggleCellClassAtSelection("underlined");
      } else if (event.key === "z" && event.meta) {
        this.textGrid.toggleCellClassAtSelection("highlight-red");
      } else if (event.key === "ArrowLeft") {
        this.textGrid.moveCursorRelative(-1);
      } else if (event.key === "ArrowRight") {
        this.textGrid.moveCursorRelative(1);
      } else if (event.key === "ArrowUp") {
        this.textGrid.moveCursorRelative(0, -1);
      } else if (event.key === "ArrowDown") {
        this.textGrid.moveCursorRelative(0, 1);
      } else if (event.key == "Backspace") {
        this.textGrid.moveCursorRelative(-1);
        const cursor = this.textGrid.getCursor();
        this.textGrid.clearCharacter(cursor.x, cursor.y);
      } else if (event.key === "Enter") {
        // Need to know where we began
        this.textGrid.moveCursor(
          this.initialCursorX,
          this.textGrid.getCursor().y + 1
        );
      } else if (event.key === "Tab") {
        // Now we need to prevenet default but it's too late...
        const columnFromInitialCursor =
          this.textGrid.getCursor().x - this.initialCursorX;
        if (columnFromInitialCursor % 2 == 0) {
          this.textGrid.moveCursorRelative(2);
        } else {
          this.textGrid.moveCursorRelative(1);
        }
      } else {
        console.log("Text tool is ignoring key:", event.key);
      }
    }
  }

  attachEventListeners() {
    console.log("Attaching listeners...");

    // this.elements.svgElement.addEventListener("paste", (event) => {
    document.addEventListener("paste", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const text = event.clipboardData?.getData("text");
      console.log("Pasting text", text);
      if (text && this.inputState === "text") {
        this.textGrid.writeTextAtCursor(text);
      }
    });

    const TIMER_INTERVAL = 4000;
    console.log(
      `Recurring timer is running at an interval of ${TIMER_INTERVAL}ms`
    );
    window.setInterval(() => {
      console.debug("Pruning cells");
      this.textGrid.pruneCells();
    }, TIMER_INTERVAL);

    window.addEventListener("keydown", (event: KeyboardEvent) => {
      //   event.preventDefault();
      //   event.stopPropagation();

      if (event.repeat) {
        // Ignore all repeated keys (they aren't real keydowns)
        return;
      }

      // Special handling of certain keys that need stop propagation
      if (event.key == "Tab") {
        event.preventDefault();
      }

      console.log("Key object", event);

      this.eventBuffer.push({
        type: "keydown",
        key: event.key,
        meta: event.metaKey,
      });
      console.log("Key is ", JSON.stringify(event.key));
      this.requestProcessEvents();
    });

    window.addEventListener("keyup", (event: KeyboardEvent) => {
      //   event.preventDefault();
      //   event.stopPropagation();

      if (event.repeat) {
        // Ignore all repeated keys (they aren't real keypresses)
        return;
      }

      this.eventBuffer.push({ type: "keyup", key: event.key });
      this.requestProcessEvents();
    });

    this.elements.svgElement.addEventListener(
      "pointerdown",
      (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        this.eventBuffer.push({
          type: "pointerdown",
          location: { x: event.offsetX, y: event.offsetY },
        });
        this.requestProcessEvents();
      }
    );

    this.elements.svgElement.addEventListener(
      "pointermove",
      (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (
          this.inputState !== "hold-panning" &&
          this.inputState !== "drawing" &&
          this.inputState !== "rect-drawing" &&
          this.inputState !== "text-selecting"
        ) {
          return;
        }
        const coalescedEvents = event.getCoalescedEvents();
        coalescedEvents.forEach((event) => {
          this.eventBuffer.push({
            type: "pointermove",
            location: { x: event.offsetX, y: event.offsetY },
            relative: { x: event.movementX, y: event.movementY },
          });
        });
        this.requestProcessEvents();
      }
    );

    this.elements.svgElement.addEventListener(
      "pointerup",
      (event: PointerEvent) => {
        //   event.preventDefault();
        //   event.stopPropagation();
        this.eventBuffer.push({
          type: "pointerup",
          location: { x: event.offsetX, y: event.offsetY },
        });
        this.requestProcessEvents();
      }
    );

    this.elements.svgElement.addEventListener("wheel", (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.ctrlKey) {
        this.eventBuffer.push({
          type: "wheel-ctrl",
          delta: event.deltaY,
          location: { x: event.clientX, y: event.clientY },
        });
      } else {
        this.eventBuffer.push({
          type: "wheel",
          relative: { x: event.deltaX, y: event.deltaY },
        });
      }
      this.requestProcessEvents();
    });
  }

  movePan(relativeOffset: Point) {
    const PAN_SPEED = 2;
    relativeOffset = mul(relativeOffset, PAN_SPEED);
    this.setTranslate(add(this.boardTranslate, relativeOffset));
  }

  setTranslate(translate: Point) {
    this.boardTranslate = translate;
    this.applyTransform();
  }

  applyScaleFactor(factor: number, origin: Point = ORIGIN) {
    this.boardScale *= factor;

    this.boardTranslate = {
      x: -factor * origin.x + factor * this.boardTranslate.x + origin.x,
      y: -factor * origin.y + factor * this.boardTranslate.y + origin.y,
    };
    this.applyTransform();
  }

  applyScaleDelta(delta: number, origin: Point = ORIGIN) {
    const factor = 1 - delta / 100;
    this.applyScaleFactor(factor, origin);
  }

  setScale(scale: number) {
    this.boardScale = scale;
    console.warn("This is untested (setScale)");
    this.setTranslate(mul(this.boardTranslate, 1 / scale));
    this.applyTransform();
  }

  /**
   * Apply scale and translate to the SVG elements.
   */
  applyTransform() {
    const transformString = generateTransformStringWithUnits(
      this.boardScale,
      this.boardTranslate
    );
    this.elements.contentGroupElement.style.transform = transformString;

    // const gridTransformString = generateTransformStringWithUnitsForGrid(
    //   this.boardScale,
    //   this.boardTranslate
    // );
    // this.elements.gridElement.style.transform = gridTransformString;

    this.updateDebugState();
  }

  setupDotGrid() {
    if (!ENABLE_GRID) {
      return;
    }
    const spacingY = 22 * 4;
    const spacingX = 22 * 4;

    const { width, height } = this.elements.svgElement.getBoundingClientRect();
    const markersXCount = Math.ceil(width / spacingX);
    const markersYCount = Math.ceil(height / spacingY);

    this.elements.gridElement.innerHTML = "";
    for (let y = 0; y < markersYCount; y++) {
      for (let x = 0; x < markersXCount; x++) {
        const marker = createSvgElement("circle", {
          cx: x * spacingX,
          cy: y * spacingY,
          r: 1,
        }, ['dot-grid-marker']);
        this.elements.gridElement.appendChild(marker);
      }
    }
  }

  /** Transform a pointer input location, with board scale and translate, to real board coordinates. */
  transformInputPoint(point: Point): Point {
    return /*round*/(
      transformPoint(point, 1 / this.boardScale, negative(this.boardTranslate))
    );
  }

  untransformInputPoint(point: Point): Point {
    return transformPoint(point, this.boardScale, this.boardTranslate);
  }

  resetZoom() {
    this.setScale(1);
  }

  resetPan() {
    this.setTranslate(ORIGIN);
  }

  createPathElement(penDefinition: PenDefinition): SVGPathElement {
    const element = createSvgElement("path");

    element.classList.remove(...element.classList);
    element.classList.add(penDefinition.className)
    if (penDefinition.layer === "upper") {
      this.elements.upperGroupElement.appendChild(element);
    } else if (penDefinition.layer === "lower") {
      this.elements.lowerGroupElement.appendChild(element);
    }

    return element;
  }

  getScreenCenter(): Point {
    const rect = this.elements.svgElement.getBoundingClientRect();
    console.log({ box: rect });
    return { x: rect.width / 2, y: rect.height / 2 };
  }
}

function stretchToViewport(target: SVGElement | HTMLElement) {
  setStyle(target, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    height: "100%",
    width: "100%",
    backgroundColor: "white",
  });
}

function generateTransformStringWithUnits(scale: number, translate: Point) {
  return `translate(${translate.x}px,${translate.y}px) scale(${scale})`;
}

function generateTransformStringWithUnitsForGrid(
  scale: number,
  translate: Point
) {
  const x = translate.x % 10;
  const y = translate.y % 20;
  return `translate(${x}px,${y}px) scale(${scale})`;
}
