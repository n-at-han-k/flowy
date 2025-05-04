import { Controller } from "@hotwired/stimulus"

const FLOWCHART_CONTROLLER_NAME = 'tpf-flowchart'
const CANVAS_CONTROLLER_NAME = 'tpf-canvas'

export default class BlockBaseController extends Controller {
  connect() {
    this.startDrag = this.startDrag.bind(this)
    this.endDrag = this.endDrag.bind(this)
    this.onDrag = this.onDrag.bind(this)

    this.element.addEventListener('dragstart', this.startDrag)
    this.element.addEventListener('dragend', this.endDrag)
    this.element.addEventListener('drag', this.onDrag)
  }

  get canvas() {
    let element = this.element.closest(
      `[data-controller~=${FLOWCHART_CONTROLLER_NAME}]`
    ).querySelector(
      `[data-controller~=${CANVAS_CONTROLLER_NAME}]`
    )
    return element.controller
  }

  startDrag(e) {
    this.element.classList.add('dragging')
  }

  onDrag(e) {
  }

  endDrag() {
    this.element.classList.remove('dragging')
  }
}
