const firstView = {
	"type": "modal",
	"callback_id": "first_view",
	"title": {
		"type": "plain_text",
		"text": "Sub Request",
		"emoji": true
	},
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "What type of session do you need subbed?"
			},
			"accessory": {
				"type": "radio_buttons",
				"options": [
					{
						"text": {
							"type": "plain_text",
							"text": "Cohort",
							"emoji": true
						},
						"value": "Cohort"
					},
					{
						"text": {
							"type": "plain_text",
							"text": "Open Session",
							"emoji": true
						},
						"value": "Open Session"
					}
				],
				"action_id": "session_type"
			}
		}
	]
}

export { firstView };