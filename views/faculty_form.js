/**
 * The Faculty forms use a different hacky way of passing along the chosen faculty using "text" key and type of session with "value" key.
 */

const osFaculty = {
	"type": "modal",
	"callback_id": "first_view",
	"title": {
		"type": "plain_text",
		"text": "Open Session",
		"emoji": true
	},
	"blocks": [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Are you in need of a teacher or a TA?*"
            },
            "accessory": {
                "type": "radio_buttons",
                "options": [
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "Teacher",
                            "emoji": false
                        },
                        "value": "teacher"
                    },
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "TA",
                            "emoji": false
                        },
                        "value": "TA"
                    },
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "Qualified Teacher or TA",
                            "emoji": false
                        },
                        "value": "qualified teacher or TA"
                    }
                ],
                "action_id": "faculty-action"
            }
        }
	]
}

const cohortFaculty = {
	"type": "modal",
	"callback_id": "first_view",
	"title": {
		"type": "plain_text",
		"text": "Cohort",
		"emoji": true
	},
	"blocks": [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Are you in need of a teacher or a TA?*"
            },
            "accessory": {
                "type": "radio_buttons",
                "options": [
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "Teacher",
                            "emoji": false
                        },
                        "value": "teacher"
                    },
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "TA",
                            "emoji": false
                        },
                        "value": "TA"
                    }
                ],
                "action_id": "faculty-action"
            }
        }
	]
}

const foundationFaculty = {
	"type": "modal",
	"callback_id": "first_view",
	"title": {
		"type": "plain_text",
		"text": "Foundation",
		"emoji": true
	},
	"blocks": [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Are you in need of a teacher or a TA?*"
            },
            "accessory": {
                "type": "radio_buttons",
                "options": [
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "Teacher",
                            "emoji": false
                        },
                        "value": "teacher"
                    },
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "TA",
                            "emoji": false
                        },
                        "value": "TA"
                    }
                ],
                "action_id": "faculty-action"
            }
        }
	]
}

export { osFaculty, cohortFaculty, foundationFaculty };