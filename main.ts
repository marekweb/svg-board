import { createSvgElement, setStyle } from "./createSvgElement";
import { createEventBuffer } from "./eventBuffer";
import { InputAction, InputEventReceiver } from "./InputEventReceiver";
import { ActivePathDrawer } from "./PathDrawer";
import { pens } from "./pen";
import { add, mul, negate, ORIGIN, Point } from "./point";

interface BoardState {
  translate: Point;
  scale: number;
  pen: number;
}

window.addEventListener("load", init);
let requestedAnimationFrame: number | undefined;

function init() {
  const state: BoardState = {
    translate: { x: 0, y: 0 },
    scale: 1,
    pen: 0,
  };

  const {
    svgElement,
    contentGroupElement,
    upperGroupElement,
    lowerGroupElement,
  } = createBoardElements();

  function updatePan(relativeOffset: Point) {
    const PAN_SPEED = 2;
    relativeOffset = mul(relativeOffset, PAN_SPEED);
    setTranslate(add(state.translate, relativeOffset));
  }

  function setTranslate(translate: Point) {
    state.translate = translate;
    eventReceiver.setTranslate(negate(state.translate));
    applyTransform();
  }

  function setScale(scale: number) {
    state.scale = scale;
    eventReceiver.setScale(1 / scale);
    setTranslate(mul(state.translate, 1 / scale));
    applyTransform();
  }

  function applyTransform() {
    const transformString = generateTransformStringWithUnits(
      state.scale,
      state.translate
    );
    // contentGroupElement.setAttribute("transform", transformString);
    contentGroupElement.style.transform = transformString;
  }

  function onAction(action: InputAction) {
    console.log("!action", action);
    if (action.action === "pen") {
      state.pen = action.value;
      return;
    }

    if (action.action === "zoom") {
      setScale(state.scale + action.value);
      return;
    }

    if (action.action === "resetZoom") {
      setScale(1);
      return;
    }

    if (action.action === "resetPan") {
      setTranslate(ORIGIN);
      return;
    }
  }

  function createPathElement(): SVGPathElement {
    const element = createSvgElement("path", {
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      fill: "none",
    });

    const penDefinition = pens[state.pen];
    element.style.stroke = penDefinition.svgAttributes.stroke;
    element.style.strokeWidth = String(
      penDefinition.svgAttributes["stroke-width"]
    );
    element.style.strokeDasharray =
      penDefinition.svgAttributes["stroke-dasharray"] || "";
    if (penDefinition.layer === "upper") {
      upperGroupElement.appendChild(element);
    } else if (penDefinition.layer === "lower") {
      lowerGroupElement.appendChild(element);
    }

    return element;
  }

  stretchToViewport(svgElement);
  const pathDrawer = new ActivePathDrawer({ createPathElement });
  const eventReceiver = new InputEventReceiver({
    pathDrawer,
    updatePan,
    onAction,
  });

  document.body.appendChild(svgElement);
  const getEvents = createEventBuffer(svgElement, () => {
    // The reason why `getEvents` is used to grab the events is just to allow
    // the extra step of waiting for a new frame before we.
    if (requestedAnimationFrame === undefined) {
      requestedAnimationFrame = requestAnimationFrame(handleAnimationFrame);
    }
  });

  function handleAnimationFrame() {
    requestedAnimationFrame = undefined;
    const events = getEvents();
    if (!events.length) {
      console.warn(
        "getEvents returned no events. Could this have been avoided?"
      );
    }
    eventReceiver.processEvents(events);
  }
}

function createBoardElements() {
  const svgElement = createSvgElement("svg");
  const contentGroupElement = createSvgElement("g", { id: "content-group" });
  contentGroupElement.style.transition = "0.1s transform";
  const upperGroupElement = createSvgElement("g", { id: "upper-layer" });
  const lowerGroupElement = createSvgElement("g", { id: "lower-layer" });
  contentGroupElement.appendChild(lowerGroupElement);
  contentGroupElement.appendChild(upperGroupElement);
  svgElement.appendChild(contentGroupElement);
  setStyle(svgElement, {
    cursor: "crosshair",
  });
  return {
    svgElement,
    contentGroupElement,
    upperGroupElement,
    lowerGroupElement,
  };
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
