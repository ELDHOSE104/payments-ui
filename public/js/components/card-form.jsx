import CardValidator from 'card-validator';
import React, { Component, PropTypes } from 'react';

import { connect } from 'react-redux';

import CardInput from 'components/card-input';
import SubmitButton from 'components/submit-button';
import { getId, gettext, validateEmailAsYouType } from 'utils';


const defaultFieldAttrs = {
  autoComplete: 'off',
  // inputMode is not yet supported in React.
  // See https://github.com/facebook/react/pull/3798
  inputMode: 'numeric',
  type: 'tel',
};

const errorKeyToFieldMap = {
  __all__: {
    field: 'card',
    error: 'declined',
  },
  fraud: {
    field: 'card',
    error: 'declined',
  },
  cvv: {
    field: 'cvv',
    error: 'invalid',
  },
};

const fieldProps = {
  card: {
    attrs: defaultFieldAttrs,
    classNames: ['card'],
    errors: {
      invalid: gettext('Incorrect card number'),
      declined: gettext('Card was declined'),
    },
    id: 'card',
    placeholder: gettext('Card number'),
    validator: CardValidator.number,
  },
  email: {
    attrs: {
      type: 'email',
    },
    classNames: ['email'],
    errors: {
      invalid: gettext('Invalid email address'),
    },
    id: 'email',
    pattern: null,
    placeholder: gettext('Email address'),
    validator: validateEmailAsYouType,
  },
  expiration: {
    attrs: defaultFieldAttrs,
    classNames: ['expiration'],
    errors: {
      invalid: gettext('Invalid expiry date'),
    },
    id: 'expiration',
    // Expiration pattern doesn't change based on card type.
    pattern: '11/11',
    placeholder: 'MM/YY',
    validator: CardValidator.expirationDate,
  },
  cvv: {
    attrs: defaultFieldAttrs,
    autocomplete: 'off',
    classNames: ['cvv'],
    errors: {
      invalid: gettext('Invalid CVV'),
    },
    errorModifier: 'right',
    id: 'cvv',
    validator: CardValidator.cvv,
  },
};


export class CardForm extends Component {

  static propTypes = {
    card: PropTypes.object,
    cvv: PropTypes.object,
    dispatch: PropTypes.func.isRequired,
    emailFieldRequired: PropTypes.bool,
    expiration: PropTypes.object,
    handleCardSubmit: PropTypes.func.isRequired,
    id: PropTypes.string.isRequired,
    processing: PropTypes.object.isRequired,
    submissionErrors: PropTypes.object,
    submitPrompt: PropTypes.string,
  }

  static defaultProps = {
    emailFieldRequired: false,
    submitPrompt: gettext('Submit'),
  }

  constructor(props) {
    super(props);
    this.processingId = getId({prefix: 'CardForm'});
    this.state = {
      card: '',
      cardType: null,
      cvv: '',
      email: '',
      errors: {},
      expiration: '',
    };
  }

  handleChange = (e) => {
    var fieldId = e.target.id;
    var val = e.target.value;

    var fieldData = fieldProps[fieldId];
    var valData = fieldData.validator(this.stripPlaceholder(val));
    fieldData.hasVal = val.length > 0 || false;
    fieldData.isValid = valData.isValid === true;
    fieldData.showError = !valData.isValid && !valData.isPotentiallyValid;
    fieldData.errorMessage = fieldData.errors.invalid;

    var newState = {
      [e.target.id]: e.target.value,
    };

    // Only the card field has card data upon validation.
    if (fieldId === 'card') {
      var cardData = valData.card || {};
      newState.cardType = cardData.type;
    }

    this.setState(newState);
  }

  handleSubmit = (e) => {
    e.preventDefault();
    var formData = {
      number: this.state.card,
      cvv: this.state.cvv,
      expiration: this.state.expiration,
    };
    var opts = {};
    if (this.props.emailFieldRequired) {
      opts.email = this.state.email;
    }
    this.props.handleCardSubmit(formData, this.processingId, opts);
  }

  mapErrorsToFields(errors) {
    console.log('mapping submission errors to form fields', errors);
    // Note that __all__ errors will be rendered as notifications instead.
    if (errors.error_response && errors.error_response.braintree) {
      var apiErrors = errors.error_response.braintree;
      // Iterate over the error object and create a new data
      // structure keyed by field or otherwise push onto
      // a list of generic errors.
      Object.keys(apiErrors).forEach(function(key) {
        console.log('API ErrorMessage: ' + JSON.stringify(apiErrors[key]));
        var errorData = errorKeyToFieldMap[key] || {};
        var field = errorData.field;
        if (field) {
          var fieldData = fieldProps[field];
          fieldData.isValid = false;
          fieldData.showError = true;
          fieldData.errorMessage = fieldData.errors[errorData.error];
        }
      });
    }
  }

  stripPlaceholder(val) {
    return val ? val.replace(/_/g, '') : '';
  }

  render() {
    if (this.props.submissionErrors) {
      this.mapErrorsToFields(this.props.submissionErrors);
    }

    var formIsValid = true;

    // Update form validity based on fieldProps.
    Object.keys(fieldProps).forEach((field) => {
      // Skip over the email field if it's not required.
      if (field === 'email' && !this.props.emailFieldRequired) {
        return;
      } else if (!fieldProps[field].isValid) {
        console.log('credit card form field is invalid:',
                    fieldProps[field]);
        formIsValid = false;
      }
    });

    return (
      <form
        {...this.props}
        className="card-form"
        onSubmit={this.handleSubmit}>
        <div className="wrapper">
          {this.props.emailFieldRequired ?
           <CardInput {...fieldProps.email}
             onChangeHandler={this.handleChange} /> : null}

          <CardInput {...fieldProps.card}
            cardType={this.state.cardType}
            onChangeHandler={this.handleChange} />
          <CardInput {...fieldProps.expiration}
            cardType={this.state.cardType}
            onChangeHandler={this.handleChange} />
          <CardInput {...fieldProps.cvv}
            cardType={this.state.cardType}
            onChangeHandler={this.handleChange} />
        </div>
        <SubmitButton isDisabled={!formIsValid}
          showSpinner={this.props.processing[this.processingId]}
          content={this.props.submitPrompt} />
      </form>
    );
  }
}


function select(state) {
  return {
    processing: state.processing,
  };
}


export default connect(select)(CardForm);
