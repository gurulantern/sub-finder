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
				"type": "static_select",
				"placeholder": {
					"type": "plain_text",
					"text": "Select an item",
					"emoji": true
				},
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

module.exports = { firstView };