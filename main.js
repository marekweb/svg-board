let zoom = 1;

function updateSvgZoom(svg, newZoom) {
  const viewBox = svg.viewBox.baseVal;
  const zoomFactor = newZoom / zoom;
  viewBox.width *= zoomFactor;
  viewBox.height *= zoomFactor;
  zoom = newZoom;
}

function addLineToPathElement(path, points) {
  let d = path.getAttribute("d");
  d += convertPointsToLineCommands(points);
  path.setAttribute("d", d);
}

function convertPointsToLineCommands(points) {
  return points.map((point) => `L${point.x},${point.y}`).join("");
}

function createSvgElement(name, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  setAttributes(element, attributes);
  return element;
}

function setAttributes(element, attributes) {
  for (let key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}

function init() {
  const body = document.body;
  const svg = createSvgElement('svg');
  body.style.margin = "0";
  svg.style.width = "100vw";
  svg.style.height = "100vh";
  svg.style.display = "block";
  body.appendChild(svg);

  const svgClientRect = svg.getBoundingClientRect();
  let viewBox = svg.viewBox.baseVal;
  viewBox.width = svgClientRect.width;
  viewBox.height = svgClientRect.height;

  let currentLayer = createSvgElement('g');
  svg.appendChild(currentLayer)
  const layers = [currentLayer];
  const penAttributes = {
    stroke: "rgba(0, 0, 255, 0.5)",
    "stroke-width": "16",
  }


  let pointsBuffer = [];
  /**
   * @type {SVGPathElement}
   */
  let currentPath;

  svg.addEventListener("mousemove", (event) => {
    // Performance concern: on mousemove, do as little work as possible
    if (draggingViewbox) {
      const viewBox = svg.viewBox.baseVal;
      viewBox.x -= event.offsetX - draggingViewbox.x;
      viewBox.y -= event.offsetY - draggingViewbox.y;
      draggingViewbox.x = event.clientX;
      draggingViewbox.y = event.clientY;
      event.preventDefault();
      return;
    }

    if (currentPath) {
      const loc = {
        x: event.offsetX + viewBox.x,
        y: event.offsetY + viewBox.y,
      };
      pointsBuffer.push(loc);
      event.preventDefault();
      setTimeout(() => {
        drawPointsFromBuffer();
      });
    }
  });

  function drawPointsFromBuffer() {
    addLineToPathElement(currentPath, pointsBuffer);
    pointsBuffer = [];
  }

  let draggingViewbox;

  const debugTextElement = createSvgElement('text', {
    x: 10,
    y: 10
  })

  debugTextElement.textContent = "debug";
  svg.appendChild(debugTextElement);

  svg.addEventListener("mousedown", (event) => {
    if (event.button === 1) {
      // Middle click: drag viewbox
      draggingViewbox = {
        x: event.offsetX,
        y: event.offsetY,
      };
      return;
    } else if (event.button === 0) {
      debugTextElement.textContent = `button: ${event.button}`;
      const loc = {
        x: event.offsetX + viewBox.x,
        y: event.offsetY + viewBox.y,
      };
      currentPath = createSvgElement("path", {
        d: `M${loc.x},${loc.y}`,
        fill: "none",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        ...penAttributes
      });
      currentLayer.appendChild(currentPath);
    }
  });

  svg.addEventListener("mouseup", (event) => {
    draggingViewbox = undefined;
    if (currentPath) {
      currentPath.setAttribute("stroke", "black");
      currentPath = undefined;
    }
  });

  function getSvgContents() {
    return svg.outerHTML;
  }

  body.addEventListener('keypress', event => {
    console.log(event)
    if (event.key === 's') {
      console.log(getSvgContents());
    }
  })
}


window.addEventListener('load', init)
