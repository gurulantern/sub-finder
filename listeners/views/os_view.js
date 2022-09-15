function osView(today) {
    return {
        "type": "modal",
        "callback_id": "request_view",
        "title": {
            "type": "plain_text",
            "text": "OS Sub Request"
        },
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Hello, let's help you find a substitute."
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "plain_text",
                    "text": "*The time window for finding substitutes is 24 hours so please be sure to post at least 24 hours before the session.",
                    "emoji": false
                }
            },
            {
                "type": "input",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "plain_text_input-action"
                },
                "label": {
                    "type": "plain_text",
                    "text": "Open Session Title",
                    "emoji": true
                }
            },
            {
                "type": "input",
                "dispatch_action": false,
                "block_id": "game",
                "element": {
                    "type": "static_select",
                    "action_id": "game_input",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select a game",
                        "emoji": true
                    },
                    "options": [
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Constellation",
                                "emoji": false
                            },
                            "value": "Constellation"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Constellation 3D",
                                "emoji": false
                            },
                            "value": "Constellation 3D"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Proxima",
                                "emoji": false
                            },
                            "value": "Proxima"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Fire",
                                "emoji": false
                            },
                            "value": "Fire"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Fish",
                                "emoji": false
                            },
                            "value": "Fish"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Art 4 All",
                                "emoji": false
                            },
                            "value": "Art 4 All"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Hollywood",
                                "emoji": false
                            },
                            "value": "Hollywood"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Geobridge",
                                "emoji": false
                            },
                            "value": "Geobridge"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Conundrums",
                                "emoji": false
                            },
                            "value": "Conundrums"
                        }
                    ]
                },
                "label": {
                    "type": "plain_text",
                    "text": "What game is being played?"
                }
            },
            {
                "type": "input",
                "dispatch_action": false,
                "block_id": "date",
                "element": {
                    "type": "datepicker",
                    "action_id": "date_input",
                    "initial_date": "2022-11-11",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select a date",
                        "emoji": false
                    }
                },
                "label": {
                    "type": "plain_text",
                    "text": "Date of session (Your time zone):"
                }
            },
            {
                "type": "input",
                "dispatch_action": false,
                "block_id": "time",
                "element": {
                    "type": "timepicker",
                    "action_id": "time_input",
                    "initial_time": "12:00",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select time",
                        "emoji": false
                    }
                },
                "label": {
                    "type": "plain_text",
                    "text": "Time of session (Your time zone):"
                }
            }
        ],
        "submit": {
            "type": "plain_text",
            "text": "Submit"
        }
    }
}

module.exports = { osView };