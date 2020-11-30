const markerSize = 40;
const penSize = 6;

type PenDefinition = {
  svgAttributes: {
    stroke: string;
    "stroke-width": number;
    "stroke-dasharray"?: string;
  };
  layer: "upper" | "lower";
};

export const pens: PenDefinition[] = [
  {
    svgAttributes: {
      stroke: "#000000",
      "stroke-width": penSize,
    },
    layer: "upper",
  },

  {
    svgAttributes: {
      stroke: "#808080",
      "stroke-width": penSize,
      "stroke-dasharray": `${penSize * 4} ${penSize * 4}`,
    },
    layer: "upper",
  },

  {
    svgAttributes: {
      stroke: "#D7E8F7",
      "stroke-width": markerSize,
    },
    layer: "lower",
  },
  {
    svgAttributes: {
      stroke: "#F7D9E9",
      "stroke-width": markerSize,
    },
    layer: "lower",
  },
  {
    svgAttributes: {
      stroke: "#E9F7D9",
      "stroke-width": markerSize,
    },
    layer: "lower",
  },
];
