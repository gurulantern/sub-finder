const invalidTime = {
	"type": "modal",
	"title": {
		"type": "plain_text",
		"text": "Invalid Time/Date Input",
		"emoji": true
	},
	"close": {
		"type": "plain_text",
		"text": "Cancel",
		"emoji": true
	},
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "plain_text",
				"text": "Sub Finder cannot post a request for a sub if the session has already passed. Please go back and check if you entered the correct date and time in PT.",
				"emoji": true
			}
		}
	]
}
export { invalidTime };