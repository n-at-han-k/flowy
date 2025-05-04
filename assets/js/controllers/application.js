import { Application } from "@hotwired/stimulus"

const application = Application.start()

import {
  FlowChartController,
  CanvasController,
  BlockController,
} from 'tpf-flowchart'

application.register('tpf-flowchart', FlowChartController)
application.register('tpf-canvas', CanvasController)
application.register('tpf-block', BlockController)

application.debug = true
window.Stimulus   = application

export { application }
