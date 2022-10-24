import { teacherSelect, taSelect } from './user_select.js';

/**
 * Returns Open Session Modal object using current date and time in PT
 * @param {*} today Current date/time in PT
 * @returns Open Session Modal
 */
function osView(today, teacher, qualified) {
    let facultyChoice;
    if (qualified) {
        facultyChoice = 		{
			"type": "divider"
		};
    } else if (teacher) {
        facultyChoice = taSelect;
    } else if (teacher) {
        facultyChoice = teacherSelect;
    }

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
                    "text": "Let's help you find a substitute!"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "plain_text",
                    "text": "The time window for finding subs in #admin-planned-absences is anytime before the urgent-hour before the session is scheduled to start. If you request a sub in the urgent-hour before the session, the request will post in #admin-urgent-issues.",
                    "emoji": false
                }
            },
            {
                "type": "input",
                "dispatch_action": false,
                "block_id": "session",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "session_input",
                },
                "label": {
                    "type": "plain_text",
                    "text": "Open Session Name",
                    "emoji": false
                }
            },
            {
                "type": "input",
                "dispatch_action": false,
                "block_id": "link",
                "element": {
                    "type": "plain_text_input",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Paste AV Link to Session Here "
                    },
                    "action_id": "link_input",
                },
                "label": {
                    "type": "plain_text",
                    "text": "AV Link",
                    "emoji": false
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
                "element": {
                    "type": "static_select",
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select an age range",
                        "emoji": true
                    },
                    "options": [
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "6-8",
                                "emoji": false
                            },
                            "value": "6-8"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "8-11",
                                "emoji": false
                            },
                            "value": "8-11"
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "11-14",
                                "emoji": false
                            },
                            "value": "11-14"
                        }
                    ],
                    "action_id": "static_select-action"
                },
                "label": {
                    "type": "plain_text",
                    "text": "What is the age range?",
                    "emoji": false
                }
            },
            {
                "type": "input",
                "dispatch_action": false,
                "block_id": "date",
                "element": {
                    "type": "datepicker",
                    "action_id": "date_input",
                    "initial_date": today,
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select a date",
                        "emoji": false
                    }
                },
                "label": {
                    "type": "plain_text",
                    "text": "Date of session (PT):"
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
                    "text": "Time of session (PT):"
                }
            },
            facultyChoice
        ],
        "submit": {
            "type": "plain_text",
            "text": "Submit"
        }
    }
}

export { osView };