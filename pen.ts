export type PenDefinition = {
  classList: string[];
  layer: "upper" | "lower";
};

export const pens: PenDefinition[] = [
  {
    classList: ["pen"],
    layer: "upper",
  },
  {
    classList: ["highlighter", "blue"],
    layer: "lower",
  },
  {
    classList: ["highlighter", "red"],
    layer: "lower",
  },
  {
    classList: ["highlighter", "green"],
    layer: "lower",
  },
];
