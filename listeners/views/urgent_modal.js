function urgentModal (msg, value) {
    block = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": msg
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Assist"
                    },
                    "value": value,
                    "action_id": "urgent_assist"
                }
            ]
        }
    ];

    return block;
}

function resolvedModal(msg) { 
    resolved = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": msg
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": ":arrow_up:---- *RESOLVED* ----:arrow_up:"
            }
        }
    ];

    return resolved;
}

module.exports = { urgentModal, resolvedModal };