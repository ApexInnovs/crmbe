const mongoose = require('mongoose');

const FormFieldSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        description: 'Internal key name for the field (e.g., firstName, email)',
    },
    label: {
        type: String,
        required: true,
        trim: true,
        description: 'Display label for the field on the form (e.g., First Name)',
    },
    type: {
        type: String,
        required: true,
        enum: ['text', 'email', 'number', 'date', 'textarea', 'dropdown', 'radio', 'checkbox'],
        description: 'Type of the input field',
    },
    isRequired: {
        type: Boolean,
        default: false,
        description: 'Whether this field is mandatory to fill',
    },
    prefilledValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
        description: 'Default or prefilled value for the field',
    },
    options: {
        type: [String],
        default: [],
        description: 'Options for dropdown, radio, or checkbox field types',
    },
    placeholder: {
        type: String,
        trim: true,
    },
});

const CampigneSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    formStructure: {
        type: [FormFieldSchema],
        default: [],
        description: 'The dynamic form fields for the campaign',
    },
    status: {
        type: Number,
        default: 1,  //1-active 2-started 3-completed 4-cancelled
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Campigne', CampigneSchema);
