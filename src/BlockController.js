import { Controller } from "@hotwired/stimulus"
import BlockBaseController from './BlockBaseController.js'

export default class BlockController extends BlockBaseController {
  static targets = []
  static values = {}

  connect() {
    super.connect()
  }

  startDrag(e) {
    super.startDrag(e)
    e.dataTransfer.setData(
      "application/drag-key",
      'somesortofuuid'
    )
    e.dataTransfer.effectAllowed = "move"
  }

  onDrag(e) {
    super.onDrag(e)
  }

  endDrag(e) {
    super.endDrag(e)
  }
}
