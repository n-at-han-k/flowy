import { Controller } from "@hotwired/stimulus"

export default class SelectBlockController extends Controller {
  static targets = []
  static values = {}

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
    e.dataTransfer.setData(
      "application/drag-key",
      'somesortofuuid'
    )
    e.dataTransfer.effectAllowed = "move"
  }

  onDrag(e) {
  }

  endDrag() {
    this.element.classList.remove('dragging')
  }
}
