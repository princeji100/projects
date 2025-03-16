'use client';
import { Chart } from "react-google-charts";

const Graf = ({ data }) => {

  const options = {
    title: "Clicks Over the Last 30 Days",
    hAxis: {
      title: 'Day',
      format: 'yyyy-MM-dd',
      gridlines: 'none',
    },
    vAxis: {
      title: 'Clicks',
      minValue: 0,
    },
    legend:'none',
    colors: ['#2b7fff'],
    curveType: "function",
    pointSize: 8,
    lineWidth: 4,
    animation: {
      duration: 1000,
      easing: "out",
    },
  };

  return (

    <Chart
      chartType="LineChart"
      width="100%"
      height="400px"
      data={data}
      options={options}
    />
  );
};

export default Graf;