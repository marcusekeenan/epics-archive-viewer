import { createEffect } from 'solid-js';
import * as d3 from 'd3';

const EPICSChart = (props) => {
  let svgRef;
  
  const width = 928;
  const height = 600;
  const marginTop = 20;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 60;

  const initChart = () => {
    if (!props.data || !Array.isArray(props.data) || props.data.length === 0) {
      console.log('No valid data to display');
      return;
    }

    // Process the EPICS data structure
    const processedData = props.data.flatMap((pvResponse) => {
      if (!pvResponse[0] || !pvResponse[0].data) return [];
      
      const pvName = pvResponse[0].meta?.name || 'Unknown PV';
      const unit = pvResponse[0].meta?.EGU || '';
      
      // Group data into bins and calculate statistics
      const binSize = 300; // 5 minutes in seconds
      const bins = new Map();
      
      pvResponse[0].data.forEach(point => {
        const binKey = Math.floor(point.secs / binSize) * binSize;
        if (!bins.has(binKey)) {
          bins.set(binKey, {
            values: [],
            timestamp: new Date(binKey * 1000),
            pv: pvName,
            unit: unit
          });
        }
        bins.get(binKey).values.push(point.val);
      });

      // Calculate statistics for each bin
      return Array.from(bins.values()).map(bin => ({
        timestamp: bin.timestamp,
        value: d3.mean(bin.values),
        high: d3.max(bin.values),
        low: d3.min(bin.values),
        pv: bin.pv,
        unit: bin.unit
      }));
    });

    if (processedData.length === 0) return;

    // Clear previous chart
    d3.select(svgRef).selectAll("*").remove();

    const svg = d3.select(svgRef)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    // Create scales
    const x = d3.scaleUtc()
      .domain(d3.extent(processedData, d => d.timestamp))
      .range([marginLeft, width - marginRight]);

    const y = d3.scaleLinear()
      .domain([
        d3.min(processedData, d => d.low),
        d3.max(processedData, d => d.high)
      ]).nice(10)
      .range([height - marginBottom, marginTop]);

    // Create the area generator for the band
    const area = d3.area()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.timestamp))
      .y0(d => y(d.low))
      .y1(d => y(d.high));

    // Create the line generator for the mean
    const line = d3.line()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.timestamp))
      .y(d => y(d.value));

    // Add the band
    svg.append("path")
      .datum(processedData)
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.2)
      .attr("d", area);

    // Add the mean line
    svg.append("path")
      .datum(processedData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Add the horizontal axis
    svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x)
        .ticks(width / 80)
        .tickSizeOuter(0))
      .call(g => g.select(".domain").remove());

    // Add the vertical axis, grid, and label
    svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").clone()
        .attr("x2", width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1))
      .call(g => g.append("text")
        .attr("x", -marginLeft)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(`↑ ${processedData[0].pv} (${processedData[0].unit})`));

    // Add hover interaction
    const hover = svg.append("g")
      .style("pointer-events", "none");

    svg.append("rect")
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .attr("width", width)
      .attr("height", height)
      .on("pointermove", pointermoved)
      .on("pointerleave", pointerleft);

    function pointermoved(event) {
      const [xm, ym] = d3.pointer(event);
      const i = d3.bisector(d => d.timestamp).left(processedData, x.invert(xm));
      const d = processedData[i];

      if (!d) return;

      hover.style("display", null);
      hover.attr("transform", `translate(${x(d.timestamp)},${y(d.value)})`);

      const text = hover.selectAll("text")
        .data([,])
        .join("text")
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")
        .attr("y", -8);

      text.text(`${d.value.toFixed(2)} ${d.unit}`);

      hover.append("line")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("y1", -y(d.value))
        .attr("y2", height - marginBottom - y(d.value));
    }

    function pointerleft() {
      hover.style("display", "none");
    }
  };

  createEffect(() => {
    console.log('Initializing chart with data:', props.data);
    initChart();
  });

  return (
    <div class="epics-chart w-full overflow-hidden bg-white rounded-lg p-4">
      <svg ref={svgRef} class="w-full" />
      {(!props.data || props.data.length === 0) && (
        <div class="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      )}
    </div>
  );
};

export default EPICSChart;