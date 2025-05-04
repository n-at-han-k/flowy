import { Controller } from "@hotwired/stimulus"

export default class CanvasController extends Controller {
  static targets = []
  static values = {}

  connect() {
    this.element.controller = this

    this.onDrop      = this.onDrop.bind(this)
    this.onDragEnter = this.onDragEnter.bind(this)
    this.onDragLeave = this.onDragLeave.bind(this)
    this.onDragOver  = this.onDragOver.bind(this)

    this.element.addEventListener('drop',      this.onDrop)
    this.element.addEventListener('dragenter', this.onDragEnter)
    this.element.addEventListener('dragleave', this.onDragLeave)
    this.element.addEventListener('dragover',  this.onDragOver)
  }

  get x() {
    return this.element.getBoundingClientRect().left
  }

  get y() {
    return this.element.getBoundingClientRect().top
  }

  onDrop(e) {
    console.log('dropped')
  }

  onDragEnter(e) {
    console.log('enter')
  }

  onDragLeave(e) {
    console.log('leave')
  }

  onDragOver(e) {
    console.log('over')
    e.preventDefault() // prevent default to allow drop
  }
}
