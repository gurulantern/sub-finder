function plannedModal (msg, dateBlocks) {
    let block = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": msg
            }
        }
    ];

    for (i = 0; i < dateBlocks.length; i++) {
        block.push(dateBlocks[i]);
    }

    return block;
}

function messageModal(msg) {
    let block = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": msg
            }
        }
    ];

    return block;
}

function dateBlocks (info) {
    

    return dateArray
}

function urgentModal (msg, value, link) {
    console.log("LINK:")
    console.log(link);
    let block;
    if (link === "working link not provided") {
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
                        "action_id": "urgent_assist",
                    }
                ]
            }
        ];
    } else {
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
                        "action_id": "urgent_assist",
                        "url": link,
                    }
                ]
            }
        ];
    }
    return block;
}

function resolvedModal(user, msg) { 
    let resolved = [
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
                "text": `:arrow_up:---- *RESOLVED by <@${user}>* ----:arrow_up:`
            }
        }
    ];

    return resolved;
}

export { plannedModal, messageModal, dateBlocks, urgentModal, resolvedModal };