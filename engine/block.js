class Block {
  /**
   * Create a Block that represents a node in the flowchart
   * @param {Object} options - Block configuration
   * @param {number} options.id - Unique identifier
   * @param {HTMLElement} options.element - DOM element
   * @param {Object} options.canvas - Canvas reference
   * @param {number} [options.parent=-1] - Parent block ID (-1 for root)
   * @param {number} [options.x=0] - X position
   * @param {number} [options.y=0] - Y position
   */
  constructor(options) {
    this.id = options.id;
    this.element = options.element;
    this.canvas = options.canvas;
    this.parent = options.parent || -1;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = parseInt(window.getComputedStyle(this.element).width);
    this.height = parseInt(window.getComputedStyle(this.element).height);
    this.childwidth = 0;
    this.arrow = null;
    
    this.ensureBlockId();
  }
  
  /**
   * Ensures the element has a blockid input
   */
  ensureBlockId() {
    if (!this.element.querySelector('.blockid')) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'blockid';
      input.className = 'blockid';
      input.value = this.id;
      this.element.appendChild(input);
    }
  }
  
  /**
   * Get all child blocks of this block
   * @returns {Block[]} Array of child blocks
   */
  getChildren() {
    return this.canvas.getBlocksByParent(this.id);
  }
  
  /**
   * Get parent block if it exists
   * @returns {Block|null} Parent block or null
   */
  getParent() {
    return this.parent === -1 ? null : this.canvas.getBlockById(this.parent);
  }
  
  /**
   * Update block's position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.updateElementPosition();
    this.updateArrow();
  }
  
  /**
   * Updates DOM element position to match block coordinates
   */
  updateElementPosition() {
    const canvasRect = this.canvas.element.getBoundingClientRect();
    const absx = this.canvas.getAbsoluteX();
    const absy = this.canvas.getAbsoluteY();
    
    this.element.style.left = (this.x - (this.width / 2) - (window.scrollX + absx) + 
      this.canvas.element.scrollLeft + canvasRect.left) + "px";
    this.element.style.top = (this.y - (this.height / 2) - (window.scrollY + absy) + 
      this.canvas.element.scrollTop + canvasRect.top) + "px";
  }
  
  /**
   * Check if this block can attach to another block
   * @param {Block} targetBlock - Block to check attachment with
   * @returns {boolean} True if can attach
   */
  canAttachTo(targetBlock) {
    const paddingx = this.canvas.getPaddingX();
    const xWithinRange = this.x >= targetBlock.x - (targetBlock.width / 2) - paddingx && 
                         this.x <= targetBlock.x + (targetBlock.width / 2) + paddingx;
    const yWithinRange = this.y >= targetBlock.y - (targetBlock.height / 2) && 
                         this.y <= targetBlock.y + targetBlock.height;
                         
    return xWithinRange && yWithinRange;
  }
  
  /**
   * Snap block to parent
   * @param {Block} parentBlock - Parent to snap to
   */
  snapToParent(parentBlock) {
    const paddingx = this.canvas.getPaddingX();
    const paddingy = this.canvas.getPaddingY();
    this.parent = parentBlock.id;
    
    this.positionRelativeToParent(parentBlock, paddingx, paddingy);
    this.createArrow(parentBlock, paddingy);
    this.updateParentChildWidths();
  }
  
  /**
   * Position block relative to parent based on siblings
   * @param {Block} parentBlock - Parent block
   * @param {number} paddingx - Horizontal padding
   * @param {number} paddingy - Vertical padding
   */
  positionRelativeToParent(parentBlock, paddingx, paddingy) {
    const siblings = parentBlock.getChildren();
    
    // Calculate total width of all siblings
    let totalwidth = this.calculateTotalChildrenWidth(siblings, paddingx);
    totalwidth += this.width;
    
    // Position all siblings and self
    let totalremove = 0;
    siblings.forEach(child => {
      totalremove = this.positionChild(child, parentBlock, totalwidth, totalremove, paddingx);
    });
    
    // Position this block
    this.x = parentBlock.x - (totalwidth / 2) + totalremove + (this.width / 2);
    this.y = parentBlock.y + (parentBlock.height / 2) + paddingy;
    this.updateElementPosition();
  }
  
  /**
   * Calculate total width needed for children blocks
   * @param {Block[]} children - Array of child blocks
   * @param {number} paddingx - Horizontal padding
   * @returns {number} Total width
   */
  calculateTotalChildrenWidth(children, paddingx) {
    return children.reduce((total, child) => {
      const effectiveWidth = child.childwidth > child.width ? child.childwidth : child.width;
      return total + effectiveWidth + paddingx;
    }, 0);
  }
  
  /**
   * Position a child block
   * @param {Block} child - Child block to position
   * @param {Block} parent - Parent block
   * @param {number} totalWidth - Total width of all siblings
   * @param {number} currentOffset - Current horizontal offset
   * @param {number} paddingx - Horizontal padding
   * @returns {number} New horizontal offset
   */
  positionChild(child, parent, totalWidth, currentOffset, paddingx) {
    if (child.childwidth > child.width) {
      child.x = parent.x - (totalWidth / 2) + currentOffset + (child.childwidth / 2);
      child.updateElementPosition();
      child.updateArrow();
      return currentOffset + child.childwidth + paddingx;
    } else {
      child.x = parent.x - (totalWidth / 2) + currentOffset + (child.width / 2);
      child.updateElementPosition();
      child.updateArrow();
      return currentOffset + child.width + paddingx;
    }
  }
  
  /**
   * Create arrow connecting this block to parent
   * @param {Block} parentBlock - Parent block
   * @param {number} paddingy - Vertical padding
   */
  createArrow(parentBlock, paddingy) {
    const arrowElement = document.createElement('div');
    arrowElement.className = 'arrowblock';
    
    const arrowx = this.x - parentBlock.x + 20;
    const arrowy = paddingy;
    
    this.drawArrowSvg(arrowElement, arrowx, arrowy, parentBlock);
    
    this.canvas.element.appendChild(arrowElement);
    this.arrow = arrowElement;
  }
  
  /**
   * Draw SVG for arrow
   * @param {HTMLElement} element - Arrow element
   * @param {number} arrowx - Arrow X offset
   * @param {number} arrowy - Arrow Y length
   * @param {Block} parentBlock - Parent block
   */
  drawArrowSvg(element, arrowx, arrowy, parentBlock) {
    element.innerHTML = `<input type="hidden" class="arrowid" value="${this.id}">`;
    
    const absx = this.canvas.getAbsoluteX();
    const absy = this.canvas.getAbsoluteY();
    const canvasRect = this.canvas.element.getBoundingClientRect();
    
    if (arrowx < 0) {
      // Left-side arrow
      element.innerHTML += `<svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M${parentBlock.x - this.x + 5} 0L${parentBlock.x - this.x + 5} ${arrowy / 2}L5 ${arrowy / 2}L5 ${arrowy}" 
              stroke="#C5CCD0" stroke-width="2px"/>
        <path d="M0 ${arrowy - 5}H10L5 ${arrowy}L0 ${arrowy - 5}Z" fill="#C5CCD0"/>
      </svg>`;
      
      element.style.left = (this.x - 5) - (absx + window.scrollX) + 
        this.canvas.element.scrollLeft + canvasRect.left + "px";
    } else {
      // Right-side arrow
      element.innerHTML += `<svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0L20 ${arrowy / 2}L${arrowx} ${arrowy / 2}L${arrowx} ${arrowy}" 
              stroke="#C5CCD0" stroke-width="2px"/>
        <path d="M${arrowx - 5} ${arrowy - 5}H${arrowx + 5}L${arrowx} ${arrowy}L${arrowx - 5} ${arrowy - 5}Z" fill="#C5CCD0"/>
      </svg>`;
      
      element.style.left = parentBlock.x - 20 - (absx + window.scrollX) + 
        this.canvas.element.scrollLeft + canvasRect.left + "px";
    }
    
    element.style.top = parentBlock.y + (parentBlock.height / 2) + 
      canvasRect.top - absy + "px";
  }
  
  /**
   * Update arrow when block position changes
   */
  updateArrow() {
    if (!this.arrow || this.parent === -1) return;
    
    const parentBlock = this.getParent();
    if (!parentBlock) return;
    
    const paddingy = this.canvas.getPaddingY();
    const arrowx = this.x - parentBlock.x + 20;
    
    this.drawArrowSvg(this.arrow, arrowx, paddingy, parentBlock);
  }
  
  /**
   * Update childwidth of this block and all parent blocks
   */
  updateParentChildWidths() {
    let currentBlock = this.getParent();
    const paddingx = this.canvas.getPaddingX();
    
    while (currentBlock) {
      const children = currentBlock.getChildren();
      currentBlock.childwidth = this.calculateTotalChildrenWidth(children, paddingx);
      currentBlock = currentBlock.getParent();
    }
  }
  
  /**
   * Start dragging this block
   * @param {number} mouseX - Mouse X position
   * @param {number} mouseY - Mouse Y position
   */
  startDrag(mouseX, mouseY) {
    this.element.classList.add('dragging');
    this.dragOffsetX = mouseX - this.x;
    this.dragOffsetY = mouseY - this.y;
  }
  
  /**
   * Update position during drag
   * @param {number} mouseX - Current mouse X
   * @param {number} mouseY - Current mouse Y
   */
  drag(mouseX, mouseY) {
    this.setPosition(mouseX - this.dragOffsetX, mouseY - this.dragOffsetY);
  }
  
  /**
   * End dragging
   */
  endDrag() {
    this.element.classList.remove('dragging');
  }
  
  /**
   * Remove block from canvas
   */
  remove() {
    if (this.arrow) {
      this.arrow.parentNode.removeChild(this.arrow);
    }
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
  
  /**
   * Create a block from existing DOM element
   * @param {HTMLElement} element - DOM element
   * @param {Object} canvas - Canvas reference
   * @param {Object} options - Additional options
   * @returns {Block} New Block instance
   */
  static fromElement(element, canvas, options = {}) {
    const idInput = element.querySelector('.blockid');
    const id = idInput ? parseInt(idInput.value) : options.id || canvas.getNextBlockId();
    
    const rect = element.getBoundingClientRect();
    const x = (rect.left + window.scrollX) + (rect.width / 2);
    const y = (rect.top + window.scrollY) + (rect.height / 2);
    
    return new Block({
      id,
      element,
      canvas,
      x,
      y,
      parent: options.parent || -1
    });
  }
  
  /**
   * Clone a block from an existing element
   * @param {HTMLElement} sourceElement - Element to clone
   * @param {Object} canvas - Canvas reference
   * @param {Object} options - Additional options
   * @returns {Block} New Block instance
   */
  static clone(sourceElement, canvas, options = {}) {
    const newElement = sourceElement.cloneNode(true);
    newElement.classList.add('block');
    
    if (newElement.classList.contains('create-flowy')) {
      newElement.classList.remove('create-flowy');
    }
    
    const id = options.id || canvas.getNextBlockId();
    
    // Add hidden input for blockid
    let blockIdInput = newElement.querySelector('.blockid');
    if (!blockIdInput) {
      blockIdInput = document.createElement('input');
      blockIdInput.type = 'hidden';
      blockIdInput.name = 'blockid';
      blockIdInput.className = 'blockid';
      newElement.appendChild(blockIdInput);
    }
    blockIdInput.value = id;
    
    document.body.appendChild(newElement);
    
    return new Block({
      id,
      element: newElement,
      canvas,
      parent: options.parent || -1,
      x: options.x || 0,
      y: options.y || 0
    });
  }
}

export default Block;