import { BoardUserEvent } from "./eventBuffer";
import { ActiveDrawingPath, PathDrawer } from "./PathDrawer";
import { diff, Point, transformPoint } from "./point";

export interface InputAction {
  action: "pen" | "zoom" | "resetZoom" | "resetPan";
  value: number;
}

const keyboardInputMap: Record<string, InputAction> = {
  "1": { action: "pen", value: 0 },
  "2": { action: "pen", value: 1 },
  "3": { action: "pen", value: 2 },
  "4": { action: "pen", value: 3 },
  a: { action: "zoom", value: -0.1 },
  z: { action: "zoom", value: 0.1 },
  x: { action: "resetZoom", value: 0 },
  q: { action: "resetPan", value: 0 },
};

type BoardInputState =
  | { state: "draw"; path: ActiveDrawingPath }
  | { state: "drag"; origin: Point };

export class InputEventReceiver {
  private state: BoardInputState | undefined;
  private pathDrawer: PathDrawer<ActiveDrawingPath>;
  private updatePan: (offset: Point) => void;
  private scale = 1;
  private translate: Point = { x: 0, y: 0 };
  private onAction: (action: InputAction) => void;

  constructor({
    pathDrawer,
    updatePan,
    onAction,
  }: {
    pathDrawer: PathDrawer<ActiveDrawingPath>;
    updatePan: (offset: Point) => void;
    onAction: (action: InputAction) => void;
  }) {
    this.pathDrawer = pathDrawer;
    this.updatePan = updatePan;
    this.onAction = onAction;
  }

  public setScale(scale: number): void {
    this.scale = scale;
  }

  public setTranslate(translate: Point): void {
    this.translate = translate;
  }

  public processEvents(events: Iterable<BoardUserEvent>): void {
    for (const event of events) {
      this.processEvent(event);
    }
  }

  /**
   * Transform a point from user input to board coordinates.
   */
  private transformPoint(point: Point) {
    return transformPoint(point, this.scale, this.translate);
  }

  private processEvent(event: BoardUserEvent) {
    if (event.event === "input") {
      const action = keyboardInputMap[event.key];
      if (action) {
        this.onAction(action);
      }
    }

    if (event.event === "text") {
      const transformedPoint = this.transformPoint(event.location);
      console.log("Text event received at", transformedPoint);
    }

    if (event.event === "start") {
      if (this.state) {
        throw new Error(
          `Received start (${event.state}) but already in state ${this.state}`
        );
      }

      if (event.state === "draw") {
        const transformedPoint = this.transformPoint(event.location);
        this.state = {
          state: "draw",
          path: this.pathDrawer.startPath(transformedPoint),
        };
        return;
      }

      if (event.state === "drag") {
        this.state = {
          state: "drag",
          origin: event.location,
        };
        return;
      }
    }

    if (event.event === "move") {
      if (!this.state) {
        console.warn("Received move event but not in any input state");
        return;
      }

      if (this.state.state === "draw") {
        const transformedPoint = this.transformPoint(event.location);
        this.pathDrawer.updatePath(this.state.path, transformedPoint);
        return;
      }

      if (this.state.state === "drag") {
        const delta = diff(event.location, this.state.origin);
        this.state.origin = event.location;
        this.updatePan(delta);
        return;
      }
    }

    if (event.event === "end") {
      if (!this.state) {
        console.warn("Received end event but not in any input state");
        return;
      }

      if (this.state.state === "draw") {
        this.pathDrawer.endPath(this.state.path);
      }

      // If there is any final work to be done at the end of the input, it can
      // be added here.

      this.state = undefined;
    }
  }
}
