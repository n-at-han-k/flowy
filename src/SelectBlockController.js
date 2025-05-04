import { Controller } from "@hotwired/stimulus"

const FLOWCHART_CONTROLLER_NAME = 'tpf-flowchart'
const CANVAS_CONTROLLER_NAME = 'tpf-canvas'

export default class SelectBlockController extends Controller {
  static targets = []
  static values = {}

  connect() {
    this.startDrag = this.startDrag.bind(this)
    this.endDrag = this.endDrag.bind(this)
    this.onMove = this.onMove.bind(this)

    this.element.addEventListener('dragstart', this.startDrag)
    window.addEventListener('mouseup', this.endDrag)
  }

  disconnect() {
    window.removeEventListener('mousemove', this.onMove)
    window.removeEventListener('mouseup', this.endDrag)
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
    window.addEventListener('mousemove', this.onMove)
    e.dataTransfer.setData(
      "application/drag-key",
      'godknowswhat'
    )
    e.dataTransfer.effectAllowed = "move"
    console.log('start')
  }

  onMove() {
    //console.log('move')
  }

  endDrag() {
    window.removeEventListener('mousemove', this.onMove)
    //console.log('end')
  }
}
