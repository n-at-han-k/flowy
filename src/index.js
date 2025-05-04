//import FlowChart from "./FlowChart.js"
import FlowChartController from "./FlowChartController.js"
import CanvasController from "./CanvasController.js"
import SelectPanelController from "./SelectPanelController.js"
import PropPanelController from "./PropPanelController.js"
import SelectBlockController from "./SelectBlockController.js"
import BlockController from "./BlockController.js"

export {
  FlowChartController,
  CanvasController,
  PropPanelController,
  SelectPanelController,
  SelectBlockController,
  BlockController,
}

//const canvasDiv = document.getElementById("canvas");

//const options = {
//  nodeWidth: 120,
//  nodeHeight: 60,
//  horizontalSpacing: 30,
//  verticalSpacing: 100
//};

//const flowChart = new FlowChart(canvasDiv, options);

const jsonTree = {
  name: "Root",
  child: [
    {
      name: "Child 1",
      child: [
        { name: "Grandchild 1" },
        { name: "Grandchild 2" }
      ]
    },
    {
      name: "Child 2",
      child: [
        { name: "Grandchild 3" },
        { name: "Grandchild 4", child: [{ name: "Great-Grandchild 1" }] }
      ]
    }
  ]
};

//flowChart.populateFromJSON(jsonTree);
