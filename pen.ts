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
    layer: "upper",
  },
];
