import { Controller } from "@hotwired/stimulus"

export default class FlowChartController extends Controller {
  static targets = [
    'canvas'
  ]

  static values = {
    blockData: Object
  }

  connect() {
    this.blockDataValue = testData()
  }

}

function testData() {
  let data = {
    root: {
      data: {},
      children: [
        {
          data: {},
          children: [],
        },
        {
          data: {},
          children: [
            {
              data: {},
              children: [],
            },
            {
              data: {},
              children: [],
            },
          ],
        },
        {
          data: {},
          children: [],
        },
      ],
    },
  }
  return data
}
