import FlowChart from "./FlowChart.js"

const canvasDiv = document.getElementById("canvas");
const options = { nodeWidth: 120, nodeHeight: 60, horizontalSpacing: 30, verticalSpacing: 100 };

const flowChart = new FlowChart(canvasDiv, options);

const jsonTree = {
    name: "Root",
    children: [
      {
        name: "Child 1",
        children: [
          { name: "Grandchild 1" },
          { name: "Grandchild 2" }
        ]
      },
      {
        name: "Child 2",
        children: [
          { name: "Grandchild 3" },
          { name: "Grandchild 4", children: [{ name: "Great-Grandchild 1" }] }
        ]
      }
    ]
  };

flowChart.populateFromJSON(jsonTree);