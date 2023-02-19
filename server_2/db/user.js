let { Schema, model } = require('mongoose');

const UserSchema = new Schema(
    {
        discordId: {
            type: String,
            required: true,
            unique: true,
        },
        displayName: {
            type: String,
            required: true,
        },
        badges: {
            type: Array,
            default: [],
        },
    },
    {
        versionKey: false,
    }
);

/**
 * @typedef UserModel
 * @property {string} hashName
 */

/** @type {UserModel | import('mongoose').Model} */
const UserModel = model('user', UserSchema);
module.exports = UserModel;
