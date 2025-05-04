import { Application } from "@hotwired/stimulus"

const application = Application.start()

import {
  FlowChartController,
  CanvasController,
  PropPanelController,
  SelectPanelController,
  BlockController,
  SelectBlockController,
} from 'tpf-flowchart'

application.register('tpf-flowchart', FlowChartController)
application.register('tpf-canvas', CanvasController)
application.register('tpf-select-panel', SelectPanelController)
application.register('tpf-select-block', BlockController)
application.register('tpf-block', BlockController)
application.register('tpf-prop-panel', PropPanelController)

application.debug = true
window.Stimulus   = application

export { application }
