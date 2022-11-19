import { createSvgElement, setAttributes, setStyle } from "./createSvgElement";
import { PenDefinition } from "./pen";
import { add, mul, negative, ORIGIN, Point, transformPoint } from "./point";
import { TextGrid } from "./TextGrid";

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
  debugCircleElement: SVGCircleElement;
}

type BufferedEvent =
  | { type: "keyup"; key: string }
  | { type: "keydown"; key: string }
  | { type: "pointerdown"; location: Point }
  | { type: "pointermove"; location: Point; relative: Point }
  | { type: "pointerup"; location: Point }
  | {
      type: "wheel";
      relative: Point;
    }
  | { type: "wheel-ctrl"; location: Point; delta: number };

function createBoardElements(): BoardElements {
  const svgElement = createSvgElement("svg");

  const contentGroupElement = createSvgElement("g", { id: "content-group" });
  // contentGroupElement.style.transition = "0.1s transform";
  svgElement.appendChild(contentGroupElement);

  const upperGroupElement = createSvgElement("g", { id: "upper-layer" });
  contentGroupElement.appendChild(upperGroupElement);

  const lowerGroupElement = createSvgElement("g", { id: "lower-layer" });
  contentGroupElement.appendChild(lowerGroupElement);

  const textGroupElement = createSvgElement("g", { id: "text-layer" });
  contentGroupElement.appendChild(textGroupElement);

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
  svgElement.appendChild(debugCircleElement);

  return {
    svgElement,
    contentGroupElement,
    upperGroupElement,
    lowerGroupElement,
    textGroupElement,
    debugTextElement,
    debugCircleElement,
  };
}

class Application {
  private boardTranslate: Point = { x: 0, y: 0 };
  private boardScale = 1;

  private elements: BoardElements;
  private inputState: "none" | "hold-panning" | "text" = "none";
  private textGrid: TextGrid;

  private eventBuffer: BufferedEvent[] = [];
  private requestedAnimationFrame: number | undefined;

  private initialCursorX = 0;
  private initialCursorY = 0;

  constructor(elements: BoardElements) {
    this.elements = elements;
    // Init elements in constructor which isn't universally a best idea
    // but it keeps it simpler than passing all these elements in one by one.

    this.textGrid = new TextGrid(this.elements.textGroupElement);
    this.initialCursorX = 0;
    this.initialCursorY = 0;

    setStyle(this.elements.svgElement, {
      cursor: "crosshair",
    });

    document.body.appendChild(this.elements.svgElement);

    stretchToViewport(this.elements.svgElement);

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
    console.log(`State: ${oldState} -> ${state}`);
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
        "processEvents called needlessly: eventBuffer is empty. this is not a problem but it indicates"
      );
      return;
    }
    for (const event of this.eventBuffer) {
      this.processEvent(event);
    }
    this.eventBuffer = [];
  }

  processEvent(event: BufferedEvent) {
    if (
      this.inputState === "none" &&
      event.type === "keydown" &&
      event.key === "t"
    ) {
      this.enterState("text");
      return;
    }

    if (
      this.inputState === "none" &&
      event.type === "keydown" &&
      event.key === "-"
    ) {
      this.applyScaleFactor(0.5, this.getScreenCenter());
      return;
    }

    if (
      this.inputState === "none" &&
      event.type === "keydown" &&
      event.key === "="
    ) {
      this.applyScaleFactor(2, this.getScreenCenter());
      return;
    }

    if (
      this.inputState === "none" &&
      event.type === "keydown" &&
      event.key === " "
    ) {
      this.enterState("hold-panning");
      this.elements.svgElement.requestPointerLock();
      console.log("Hold panning");
      return;
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

    if (this.inputState === "text" && event.type === "pointerdown") {
      this.updateDebugCircle(event.location);

      const boardPoint = this.transformInputPoint(event.location);
      const { x, y } = TextGrid.findCellFromPoint(boardPoint);
      this.initialCursorX = x;
      this.initialCursorY = y;

      this.textGrid.moveCursor(x, y);
      this.textGrid.showCursor();
      this.inputState = "text";
      this.updateDebugState();
      console.log("Moved cursor");
    } else if (
      this.inputState === "text" &&
      event.type === "keydown" &&
      event.key === "Escape"
    ) {
      this.textGrid.hideCursor();
      this.enterState("none");
    } else if (this.inputState === "text" && event.type == "keydown") {
      if (event.key.length === 1) {
        this.textGrid.writeCharacterAtCursor(event.key);
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

    this.elements.svgElement.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text");
      console.log("Text", text);
      if (text && this.inputState === "text") {
        this.textGrid.writeTextAtCursor(text);
      }
    });

    window.addEventListener("keydown", (event: KeyboardEvent) => {
      //   event.preventDefault();
      //   event.stopPropagation();

      if (event.repeat) {
        // Ignore all repeated keys (they aren't real keypresses)
        return;
      }

      // Special handling of certain keys that need stop propagation
      if (event.key == "Tab") {
        event.preventDefault();
      }

      this.eventBuffer.push({ type: "keydown", key: event.key });
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
        //   event.preventDefault();
        //   event.stopPropagation();
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
        // event.preventDefault();
        // event.stopPropagation();
        if (this.inputState !== "hold-panning") {
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
    this.updateDebugState();
  }

  /** Transform a pointer input location, with board scale and translate, to real board coordinates. */
  transformInputPoint(point: Point): Point {
    return transformPoint(
      point,
      1 / this.boardScale,
      negative(this.boardTranslate)
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
    const element = createSvgElement("path", {
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      fill: "none",
    });

    element.style.stroke = penDefinition.svgAttributes.stroke;
    element.style.strokeWidth = String(
      penDefinition.svgAttributes["stroke-width"]
    );
    element.style.strokeDasharray =
      penDefinition.svgAttributes["stroke-dasharray"] || "";
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
