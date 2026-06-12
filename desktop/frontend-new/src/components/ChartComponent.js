import React, { useEffect, useRef } from 'react';

const ChartComponent = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    // 1. Check if the global Chart object is available (ensures CDN is loaded)
    // AND check if the canvas element is mounted (chartRef.current)
    if (typeof window.Chart === 'undefined' || !chartRef.current) {
        // If Chart.js isn't loaded yet or the canvas isn't ready, exit.
        return; 
    }
    
    // --- Dark Mode and Color Logic (Safe inside useEffect) ---
    const isDarkMode = document.documentElement.classList.contains("dark");
    const gridColor = isDarkMode
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)";
    const textColor = isDarkMode ? "#F9FAFB" : "#111827";

    const Chart = window.Chart; // Access the global Chart object
    const ctx = chartRef.current.getContext('2d');
    
    // Clean up previous instance before creating a new one
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // 2. Initialize the Chart
    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["January", "February", "March"],
        datasets: [
          {
            label: "Present",
            data: [28, 29, 28],
            backgroundColor: "rgba(16, 185, 129, 0.7)",
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1,
          },
          {
            label: "Absent",
            data: [1, 1, 1],
            backgroundColor: "rgba(239, 68, 68, 0.7)",
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 1,
          },
          {
            label: "Late",
            data: [1, 0, 1],
            backgroundColor: "rgba(245, 158, 11, 0.7)",
            borderColor: "rgba(245, 158, 11, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor } },
          y: { stacked: true, beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
        },
        plugins: {
          legend: { position: "top", labels: { color: textColor } },
        },
      },
    });

    // 3. Cleanup: Destroy the chart when the component unmounts
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []); // Empty dependency array ensures it runs only once after mount

  return (
    <canvas ref={chartRef} id="attendanceChart"></canvas>
  );
};

export default ChartComponent;