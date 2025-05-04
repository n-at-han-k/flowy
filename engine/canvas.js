class Canvas {
  constructor(element, options = {}) {
    this.element = element;
    this.blocks = [];
    this.paddingX = options.paddingX || 20;
    this.paddingY = options.paddingY || 80;
    this.nextBlockId = 0;
    
    this.setupIndicator();
  }
  
  setupIndicator() {
    const indicator = document.createElement('DIV');
    indicator.classList.add('indicator');
    indicator.classList.add('invisible');
    this.element.appendChild(indicator);
    this.indicator = indicator;
  }
  
  getAbsoluteX() {
    if (window.getComputedStyle(this.element).position === "absolute" || 
        window.getComputedStyle(this.element).position === "fixed") {
      return this.element.getBoundingClientRect().left;
    }
    return 0;
  }
  
  getAbsoluteY() {
    if (window.getComputedStyle(this.element).position === "absolute" || 
        window.getComputedStyle(this.element).position === "fixed") {
      return this.element.getBoundingClientRect().top;
    }
    return 0;
  }
  
  getPaddingX() { return this.paddingX; }
  getPaddingY() { return this.paddingY; }
  
  getNextBlockId() {
    return this.blocks.length > 0 ? 
      Math.max(...this.blocks.map(block => block.id)) + 1 : 0;
  }
  
  addBlock(block) {
    this.blocks.push(block);
    this.element.appendChild(block.element);
  }
  
  getBlockById(id) {
    return this.blocks.find(block => block.id === id) || null;
  }
  
  getBlocksByParent(parentId) {
    return this.blocks.filter(block => block.parent === parentId);
  }
  
  removeBlock(blockId) {
    const block = this.getBlockById(blockId);
    if (block) {
      block.remove();
      this.blocks = this.blocks.filter(b => b.id !== blockId);
    }
  }
  
  showAttachIndicator(targetBlock) {
    this.indicator.classList.remove('invisible');
    targetBlock.element.appendChild(this.indicator);
    this.indicator.style.left = (targetBlock.element.offsetWidth / 2) - 5 + "px";
    this.indicator.style.top = targetBlock.element.offsetHeight + "px";
  }
  
  hideAttachIndicator() {
    this.indicator.classList.add('invisible');
  }
}

export default Canvas;