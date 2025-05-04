export default class FlowChart {
  constructor(canvasDiv, options) {
    this.canvas = canvasDiv;
    this.options = options || {};
    this.nodePositions = new Map(); // To store calculated positions
    this.draggedNodeElement = null; // Track the DOM element of the dragged node
    this.offsetX = 0; // Offset for dragging
    this.offsetY = 0;
  }

  populateFromJSON(jsonTree) {
    if (!jsonTree) {
      throw new Error("A JSON tree is required to populate the flowchart.");
    }

    this.jsonTree = jsonTree; // Store the tree structure
    this.nodePositions.clear(); // Clear previous positions
    this.canvas.innerHTML = ""; // Clear the canvas

    // Step 1: Calculate positions for all nodes
    this.calculatePositions(jsonTree, 0, 0);

    // Step 2: Render nodes based on calculated positions
    this.renderNodes(jsonTree);

    return this.nodePositions;
  }

  calculatePositions(node, level, xOffset) {
    const nodeWidth = this.options.nodeWidth || 120;
    const horizontalSpacing = this.options.horizontalSpacing || 30;

    if (!node.children || node.children.length === 0) {
      // Leaf node: Assign its position and return its width
      const width = nodeWidth;
      this.nodePositions.set(node, { x: xOffset, y: level });
      return width;
    }

    // Internal node: Calculate positions for children first
    let totalWidth = 0;
    const childXOffsets = [];

    node.children.forEach((child, index) => {
      const childXOffset = xOffset + totalWidth;
      childXOffsets.push(childXOffset);

      // Recursively calculate the child's position
      const childWidth = this.calculatePositions(child, level + 1, childXOffset);
      totalWidth += childWidth + horizontalSpacing;
    });

    // Remove extra spacing after the last child
    totalWidth -= horizontalSpacing;

    // Center the parent node above its children
    const parentX = xOffset + totalWidth / 2 - nodeWidth / 2;
    this.nodePositions.set(node, { x: parentX, y: level });

    return totalWidth;
  }

  renderNodes(node) {
    const queue = [node];

    while (queue.length > 0) {
      const currentNode = queue.shift();
      const { x, y } = this.nodePositions.get(currentNode);

      // Create and position the node
      const nodeElement = this.createNode(currentNode, x, y);
      this.canvas.appendChild(nodeElement);

      // Add children to the queue
      if (currentNode.children && Array.isArray(currentNode.children)) {
        queue.push(...currentNode.children);
      }
    }
  }

  createNode(data, x, y) {
    const nodeDiv = document.createElement("div");
    nodeDiv.className = "flowchart-node";
    nodeDiv.textContent = data.name || "Unnamed Node";

    const nodeWidth = this.options.nodeWidth || 120;
    const nodeHeight = this.options.nodeHeight || 60;
    const verticalSpacing = this.options.verticalSpacing || 100;

    // Set absolute position
    nodeDiv.style.position = "absolute";
    nodeDiv.style.left = `${x}px`;
    nodeDiv.style.top = `${y * (nodeHeight + verticalSpacing)}px`;

    // Add drag-and-drop functionality
    nodeDiv.addEventListener("mousedown", (event) => this.startDrag(event, nodeDiv));
    document.addEventListener("mousemove", (event) => this.drag(event));
    document.addEventListener("mouseup", () => this.endDrag());

    return nodeDiv;
  }

  startDrag(event, nodeElement) {
    this.draggedNodeElement = nodeElement;
    this.offsetX = event.clientX - nodeElement.offsetLeft;
    this.offsetY = event.clientY - nodeElement.offsetTop;
    nodeElement.style.zIndex = 1000; // Bring the dragged node to the front
  }

  drag(event) {
    if (!this.draggedNodeElement) return;

    // Update the position of the dragged node
    this.draggedNodeElement.style.left = `${event.clientX - this.offsetX}px`;
    this.draggedNodeElement.style.top = `${event.clientY - this.offsetY}px`;
  }

  endDrag() {
    if (this.draggedNodeElement) {
      this.draggedNodeElement.style.zIndex = ""; // Reset z-index
      this.draggedNodeElement = null;
    }
  }
}