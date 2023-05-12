import { Point } from "./point";

const POINTER_BUTTON_LEFT = 0;
const POINTER_BUTTON_MIDDLE = 1;

export type BoardUserEvent =
  | { event: "start"; state: EventBufferState; location: Point }
  | { event: "move"; location: Point }
  | { event: "input"; key: string }
  | { event: "end" }
  | { event: "text"; location: Point };

type EventBufferState = "drag" | "draw";

/**
 * @param target Element on which listeners are attached
 * @param onUpdateCallback Callback called when there are events. Call the
 * returned `getEvents` function to drain the event queue.
 */
export function createEventBuffer(
  target: SVGSVGElement,
  onUpdateCallback: () => void
): () => BoardUserEvent[] {
  let events: BoardUserEvent[] = [];
  let state: EventBufferState | undefined;

  function transitionToState(newState: EventBufferState, event: PointerEvent) {
    state = newState;
    events.push({
      event: "start",
      state,
      location: { x: event.offsetX, y: event.offsetY },
    });
  }

  target.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (state) {
      return;
    }

    if (
      event.button === POINTER_BUTTON_LEFT &&
      !event.ctrlKey &&
      !event.shiftKey
    ) {
      transitionToState("draw", event);
    } else if (
      event.button === POINTER_BUTTON_MIDDLE ||
      (event.ctrlKey && !event.shiftKey)
    ) {
      transitionToState("drag", event);
    } else if (
      event.button === POINTER_BUTTON_LEFT &&
      !event.ctrlKey &&
      event.shiftKey
    ) {
      events.push({
        event: "text",
        location: { x: event.offsetX, y: event.offsetY },
      });
    }
  });

  target.addEventListener("wheel", (event) => {
    console.log("Wheel:", event);
  });

  target.addEventListener("pointerup", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (state) {
      state = undefined;
      events.push({ event: "end" });
      onUpdateCallback();
    }
  });

  target.addEventListener("pointerleave", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (state) {
      state = undefined;
      events.push({ event: "end" });
      onUpdateCallback();
    }
  });

  target.addEventListener("pointermove", (event: PointerEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!state) {
      return;
    }

    const coalescedEvents = event.getCoalescedEvents();
    for (const e of coalescedEvents) {
      events.push({ event: "move", location: { x: e.offsetX, y: e.offsetY } });
    }
    onUpdateCallback();
  });

  document.body.addEventListener("keydown", (event: KeyboardEvent) => {
    events.push({ event: "input", key: event.key });
    onUpdateCallback();
  });

  return function getEvents(): BoardUserEvent[] {
    const savedEvents = events;
    events = [];
    return savedEvents;
  };
}
