import { createEffect } from 'solid-js';
import * as d3 from 'd3';

const EPICSChart = (props) => {
  let svgRef;
  
  const margin = { top: 20, right: 20, bottom: 30, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const initChart = () => {
    if (!props.data || props.data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef).selectAll("*").remove();

    const svg = d3.select(svgRef)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Process data
    const timeExtent = d3.extent(props.data, d => new Date(d.timestamp));
    const valueExtent = d3.extent(props.data, d => d.value);
    
    // Add padding to value extent
    const valueRange = valueExtent[1] - valueExtent[0];
    const valuePadding = valueRange * 0.1;
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([
        Math.min(valueExtent[0] - valuePadding, 0),
        valueExtent[1] + valuePadding
      ])
      .range([height, 0]);

    // Create line generator
    const line = d3.line()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.value));

    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

    svg.append("g")
      .call(d3.axisLeft(yScale));

    // Add line path
    svg.append("path")
      .datum(props.data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat("")
      );
  };

  createEffect(() => {
    if (props.data && props.data.length > 0) {
      initChart();
    }
  });

  return (
    <div class="epics-chart w-full h-[400px] overflow-hidden">
      <svg ref={svgRef} class="w-full h-full" />
    </div>
  );
};

export default EPICSChart;
