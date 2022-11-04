import { createSvgElement, setStyle } from "./createSvgElement";
import { PenDefinition } from "./pen";
import { add, mul, ORIGIN, Point } from "./point";
import { TextGrid } from "./TextGrid";

window.addEventListener("load", () => {
  const elements = createBoardElements2();
  new Application(elements);
});

interface BoardElements {
  svgElement: SVGSVGElement;
  contentGroupElement: SVGGElement;
  upperGroupElement: SVGGElement;
  lowerGroupElement: SVGGElement;
  textGroupElement: SVGGElement;
}

type BufferedEvent =
  | { type: "keyup"; key: string }
  | { type: "keydown"; key: string }
  | { type: "pointerdown"; location: Point }
  | { type: "pointermove"; location: Point }
  | { type: "pointerup"; location: Point };

function createBoardElements2(): BoardElements {
  const svgElement = createSvgElement("svg");

  const contentGroupElement = createSvgElement("g", { id: "content-group" });
  contentGroupElement.style.transition = "0.1s transform";
  svgElement.appendChild(contentGroupElement);

  const upperGroupElement = createSvgElement("g", { id: "upper-layer" });
  contentGroupElement.appendChild(upperGroupElement);

  const lowerGroupElement = createSvgElement("g", { id: "lower-layer" });
  contentGroupElement.appendChild(lowerGroupElement);

  const textGroupElement = createSvgElement("g", { id: "text-layer" });
  contentGroupElement.appendChild(textGroupElement);

  return {
    svgElement,
    contentGroupElement,
    upperGroupElement,
    lowerGroupElement,
    textGroupElement,
  };
}

class Application {
  private boardTranslate: Point = { x: 0, y: 0 };
  private boardScale = 1;

  private elements: BoardElements;
  private inputState: "none" | "hold-panning" | "text" = "text";
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

    console.log("Init complete");
    this.attachEventListeners();
  }

  requestAnimationFrame() {
    if (this.requestedAnimationFrame === undefined) {
      this.requestedAnimationFrame = window.requestAnimationFrame(() =>
        this.processEvents()
      );
    }
  }

  processEvents() {
    this.requestedAnimationFrame = undefined;
    if (this.eventBuffer.length === 0) {
      console.warn("processEvents called needlessly: eventBuffer is empty.");
      return;
    }
    for (const event of this.eventBuffer) {
      this.processEvent(event);
    }
    this.eventBuffer = [];
  }

  processEvent(event: BufferedEvent) {
    if (this.inputState === "text" && event.type === "pointerdown") {
      const { x, y } = TextGrid.findCellFromPoint(
        event.location.x,
        event.location.y
      );
      this.initialCursorX = x;
      this.initialCursorY = y;

      this.textGrid.moveCursor(x, y);
      this.textGrid.showCursor();
      this.inputState = "text";
      console.log("Moved cursor");
    } else if (
      this.inputState === "text" &&
      event.type === "keydown" &&
      event.key === "Escape"
    ) {
      this.textGrid.hideCursor();
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
    window.addEventListener("keydown", (event: KeyboardEvent) => {
      //   event.preventDefault();
      //   event.stopPropagation();

      this.eventBuffer.push({ type: "keydown", key: event.key });
      console.log("Key is ", JSON.stringify(event.key));
      this.requestAnimationFrame();
    });
    window.addEventListener("keyup", (event: KeyboardEvent) => {
      //   event.preventDefault();
      //   event.stopPropagation();
      this.eventBuffer.push({ type: "keyup", key: event.key });
      this.requestAnimationFrame();
    });

    this.elements.svgElement.addEventListener("pointerdown", (event: PointerEvent) => {
      //   event.preventDefault();
      //   event.stopPropagation();
      this.eventBuffer.push({
        type: "pointerdown",
        location: { x: event.offsetX, y: event.offsetY },
      });
      this.requestAnimationFrame();
    });

    this.elements.svgElement.addEventListener("pointermove", (event: PointerEvent) => {
      //   event.preventDefault();
      //   event.stopPropagation();
      this.eventBuffer.push({
        type: "pointermove",
        location: { x: event.offsetX, y: event.offsetY },
      });
      this.requestAnimationFrame();
    });

    this.elements.svgElement.addEventListener("wheel", (event: WheelEvent) => {
      console.log(event);
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

  setScale(scale: number) {
    this.boardScale = scale;
    this.setTranslate(mul(this.boardTranslate, 1 / scale));
    this.applyTransform();
  }

  applyTransform() {
    const transformString = generateTransformStringWithUnits(
      this.boardScale,
      this.boardTranslate
    );
    this.elements.contentGroupElement.style.transform = transformString;
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

// If an event got queued, then schedule a requestAnimationFrame for handling.
