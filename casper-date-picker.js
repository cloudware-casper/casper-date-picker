import moment from 'moment/src/moment.js';
import '@polymer/paper-input/paper-input.js';
import '@vaadin/vaadin-date-picker/theme/material/vaadin-date-picker-light.js';
import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';

class CasperDatePicker extends PolymerElement {
  static get template () {
    return html`
      <style>
        vaadin-date-picker-light {
          width: 100%;
        }
      </style>
      <vaadin-date-picker-light
        id="vaadinDatePicker"
        min="[[minimumDate]]"
        max="[[maximumDate]]"
        attr-for-value="value"
        value="{{__internalValue}}"
        opened="{{__isPickerOverlayOpened}}">
        <paper-input
          disabled="[[disabled]]"
          invalid="{{_inputInvalid}}"
          label="[[inputPlaceholder]]"
          error-message="[[_errorMessage]]">
          <iron-icon icon="casper-icons:date-range" slot="suffix"></iron-icon>
        </paper-input>
      </vaadin-date-picker-light>
    `;
  }

  static get is () {
    return 'casper-date-picker';
  }

  static get properties () {
    return {
      required: Boolean,
      minimumDate: String,
      maximumDate: String,
      inputPlaceholder: String,
      autoValidate: {
        type: Boolean,
        value: false
      },
      minimumErrorMessage: {
        type: String,
        value: 'A data não pode ser inferior ao limite mínimo'
      },
      maximumErrorMessage: {
        type: String,
        value: 'A data não pode ser superior ao limite máximo'
      },
      requiredErrorMessage: {
        type: String,
        value: 'Este campo deve ser preenchido.',
      },
      disabled: {
        type: Boolean,
        value: false,
        observer: '_disabledChanged'
      },
      format: {
        type: String,
        value: 'DD-MM-YYYY'
      },
      value: {
        type: String,
        notify: true,
        observer: '__valueChanged'
      },
      _inputInvalid: {
        type: Boolean,
        value: false,
      },
      __isPickerOverlayOpened: {
        type: Boolean,
        value: false,
        observer: '__isPickerOverlayOpenedChanged'
      },
      __internalValue: {
        type: String,
        observer: '__internalValueChanged'
      },
      __isDatePickerPristine: {
        type: Boolean,
        value: true
      }
    };
  }

  ready () {
    super.ready();

    this.__datePicker = this.shadowRoot.querySelector('vaadin-date-picker-light');
    this.__datePicker.addEventListener('click', event => this.__shouldOpenDatePicker(event));

    this.__datePickerInput = this.shadowRoot.querySelector('paper-input');
    this.__datePickerInput.addEventListener('input', () => this.__internalValueChanged(this.__datePickerInput.value));

    this.__setupDatePicker();
  }

  __valueChanged (value) {
    this._skipValueObserver = value;
    this.__internalValue = value;
  }

  __internalValueChanged (internalValue) {
    if (!this.__datePickerInput) return;

    if (this.autoValidate) {
      if (this.__isDatePickerPristine) {
        this.__isDatePickerPristine = false;
        return;
      }

      const inputInvalid = (this.required && !internalValue) || !this.$.vaadinDatePicker.checkValidity();

      if (inputInvalid) {
        // Discover why the input is invalid (required / minimum / maximum).
        if (!internalValue) this._errorMessage = this.requiredErrorMessage;

        const currentDate = moment(internalValue);
        const minimumDate = moment(this.minimumDate);
        const maximumDate = moment(this.maximumDate);

        if (currentDate < minimumDate) this._errorMessage = this.minimumErrorMessage;
        if (currentDate > maximumDate) this._errorMessage = this.maximumErrorMessage;

        this.__setValue('');
      } else {
        this.__setValue(internalValue);
      }

      // Necessary to make sure the UI changes correctly.
      afterNextRender(this.__datePickerInput, () => {
        this._inputInvalid = inputInvalid;
      });

      return !inputInvalid;
    } else {
      this.__setValue(internalValue);
    }
  }

  __setValue (value) {
    // Lock the observer from being triggered.
    if (this._skipValueObserver !== value) {
      this._valueLock = true;
      this.value = value;
    }
  }

  open () {
    this.__isPickerOverlayOpened = true;
  }

  close () {
    this.__isPickerOverlayOpened = false;
  }

  toggle () {
    this.__isPickerOverlayOpened = !this.__isPickerOverlayOpened;
  }

  __setupDatePicker () {
    // Function to format a date into a String and the other way around.
    this.__datePicker.set('i18n.parseDate', date => this._parseDate(date));
    this.__datePicker.set('i18n.formatDate', date => this._formatDate(date));

    // Date picker translations.
    this.__datePicker.set('i18n.today', 'Hoje');
    this.__datePicker.set('i18n.cancel', 'Cancelar');
    this.__datePicker.set('i18n.weekdaysShort', ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
    this.__datePicker.set('i18n.weekdays', ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']);
    this.__datePicker.set('i18n.monthNames', ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']);
  }

  _formatDate (date) {
    return moment(new Date(date.year, date.month, date.day)).format(this.format);
  }

  _parseDate (date) {
    const regexMatches = date.match(/(\d{2}).?(\d{2}).?(\d{4})/);

    if (regexMatches && regexMatches.length === 4) {
      return {
        day: parseInt(regexMatches[1]),
        month: parseInt(regexMatches[2]) - 1,
        year: parseInt(regexMatches[3]),
      };
    }
  }

  __shouldOpenDatePicker () {
    this.__isPickerOverlayOpened = !this.disabled;
  }

  __isPickerOverlayOpenedChanged (isOverlayOpen) {
    if (this._focusDatePickerTimeout) clearTimeout(this._focusDatePickerTimeout);

    if (!this.__datePickerInput || !isOverlayOpen) return;

    this._focusDatePickerTimeout = setTimeout(() => {
      this.__datePickerInput.blur();
      this.__datePickerInput.focus();
    }, 15);
  }

  _disabledChanged () {
    // Close the date picker if the input becomes disabled.
    if (this.disabled) {
      this.__isPickerOverlayOpened = false;
      this.shadowRoot.querySelector('iron-icon').style.color = '';
    } else {
      this.shadowRoot.querySelector('iron-icon').style.color = 'var(--primary-color)';
    }
  }
}

window.customElements.define(CasperDatePicker.is, CasperDatePicker);
