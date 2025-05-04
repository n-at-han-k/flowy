import { Controller } from '@hotwired/stimulus'

export default class extends Controller {

  connect() {
    let message = 'it works!'
    console.log(message)
    this.element.innerHTML = message
  }

}
