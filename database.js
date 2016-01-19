/* jshint node: true, esversion: 6, eqeqeq: true, latedef: true, undef: true, unused: true */
"use strict";

const _ = require('lodash');
const config = require('config');
const mongoose = require('mongoose');

mongoose.connect(config.get('server.mongodb'));

var userSchema = new mongoose.Schema({
    alias: {
        type: String,
        match: /^[A-Za-z0-9_]{1,15}$/
    },
    steamID: String,
    setUp: {
        type: Boolean,
        default: false
    },
    currentRating: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rating'
    },
    captainScore: {
        low: Number,
        center: Number,
        high: Number
    }
});
userSchema.virtual('admin').get(function() {
    return _.includes(config.get('app.admins'), this.steamID);
});
userSchema.set('toObject', {
    getters: true,
    versionKey: false
});

var gameSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['assigning', 'launching', 'live', 'aborted', 'completed']
    },
    date: Date,
    map: String,
    server: String,
    duration: Number,
    score: [Number],
    teams: [{
        captain: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        faction: String,
        composition: [{
            role: String,
            players: [{
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                replaced: {
                    type: Boolean,
                    default: false
                },
                time: {
                    type: Number,
                    default: 0
                }
            }]
        }]
    }],
    links: [{
        type: {
            type: String
        },
        url: String
    }],
    draft: {
        choices: [{
            type: {
                type: String
            },
            method: String,
            captain: Number,
            faction: String,
            role: String,
            player: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            map: String
        }],
        pool: {
            maps: [String],
            players: [{
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                roles: [String]
            }]
        }
    }
});
gameSchema.set('toObject', {
    getters: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.map = config.get('app.games.maps')[doc.map];
        ret.server = _.omit(config.get('app.servers.pool')[doc.server], 'rcon', 'salt');
    }
});

var ratingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    date: Date,
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
    },
    before: {
        rating: Number,
        deviation: Number
    },
    after: {
        rating: Number,
        deviation: Number
    }
});
ratingSchema.set('toObject', {
    getters: true,
    versionKey: false
});

var restrictionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    active: Boolean,
    aspects: [{
        type: String,
        enum: ['sub', 'start', 'captain', 'chat', 'support']
    }],
    reason: String,
    expires: Date
});
restrictionSchema.set('toObject', {
    getters: true,
    versionKey: false
});

module.exports = {
    User: mongoose.model('User', userSchema),
    Game: mongoose.model('Game', gameSchema),
    Rating: mongoose.model('Rating', ratingSchema),
    Restriction: mongoose.model('Restriction', restrictionSchema),
    mongoose: mongoose
};
