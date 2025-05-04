import { Controller } from "@hotwired/stimulus"

export default class CanvasController extends Controller {
  static targets = []
  static values = {}

  connect() {
    this.element.controller = this
  }

  get x() {
    return this.element.getBoundingClientRect().left
  }

  get y() {
    return this.element.getBoundingClientRect().top
  }
}
