import { createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import * as d3 from 'd3';

const EPICSChart = (props) => {
  let svgRef;
  let chartContainer;
  const [zoom, setZoom] = createSignal(null);
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
  const MARGIN = { top: 20, right: 120, bottom: 30, left: 60 };
 
  const processData = (rawData) => {
    if (!rawData?.length) return [];
    
    return rawData.map(pvData => {
      const pvInfo = pvData.data[0];
      if (!pvInfo) return null;
      
      return {
        name: pvInfo.meta?.name || 'Unknown',
        unit: pvInfo.meta?.EGU || '',
        values: pvInfo.data?.map(point => ({
          timestamp: new Date(point.secs * 1000),
          value: point.val
        })) || []
      };
    }).filter(Boolean);
  };
 
  const initChart = () => {
    if (!props.data || !Array.isArray(props.data)) return;
 
    const processedData = processData(props.data);
    if (!processedData.length) return;
 
    const width = chartContainer.clientWidth;
    const height = 500;
    
    d3.select(svgRef).selectAll("*").remove();
 
    const svg = d3.select(svgRef)
      .attr("width", width)
      .attr("height", height);
 
    // Create scales
    const x = d3.scaleUtc()
      .domain(d3.extent(processedData[0].values, d => d.timestamp))
      .range([MARGIN.left, width - MARGIN.right]);
 
    const y = d3.scaleLinear()
      .domain([
        d3.min(processedData, d => d3.min(d.values, v => v.value)),
        d3.max(processedData, d => d3.max(d.values, v => v.value))
      ]).nice()
      .range([height - MARGIN.bottom, MARGIN.top]);
 
    // Add zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.5, 50])
      .translateExtent([[MARGIN.left, -Infinity], [width - MARGIN.right, Infinity]])
      .on("zoom", zoomed);
 
    setZoom(zoomBehavior);
    svg.call(zoomBehavior);
 
    // Create line generator
    const line = d3.line()
      .defined(d => d.value != null)
      .x(d => x(d.timestamp))
      .y(d => y(d.value));
 
    // Draw lines
    const chartArea = svg.append("g");
 
    processedData.forEach((series) => {
      chartArea.append("path")
        .datum(series.values)
        .attr("fill", "none")
        .attr("stroke", colorScale(series.name))
        .attr("stroke-width", 1.5)
        .attr("d", line);
    });
 
    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${height - MARGIN.bottom})`)
      .call(d3.axisBottom(x));
 
    svg.append("g")
      .attr("transform", `translate(${MARGIN.left},0)`)
      .call(d3.axisLeft(y));
 
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - MARGIN.right + 10},${MARGIN.top})`);
 
    legend.selectAll("g")
      .data(processedData)
      .join("g")
      .attr("transform", (d, i) => `translate(0,${i * 20})`)
      .call(g => {
        g.append("rect")
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", d => colorScale(d.name));
        g.append("text")
          .attr("x", 20)
          .attr("y", 12)
          .text(d => `${d.name} (${d.unit})`);
      });
 
    function zoomed(event) {
      const newX = event.transform.rescaleX(x);
      chartArea.selectAll("path")
        .attr("d", d => line.x(p => newX(p.timestamp)));
      svg.select(".x-axis").call(d3.axisBottom(newX));
    }
  };
 
  createEffect(() => {
    if (props.data) {
      initChart();
    }
  });
 
  onMount(() => {
    const resizeObserver = new ResizeObserver(() => initChart());
    resizeObserver.observe(chartContainer);
    onCleanup(() => resizeObserver.disconnect());
  });
 
  return (
    <div ref={chartContainer} class="w-full h-[500px]">
      <svg ref={svgRef} class="w-full h-full" />
    </div>
  );
 };
 
 export default EPICSChart;