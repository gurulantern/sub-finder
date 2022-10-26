// Possible way to take multiple dates for subbing. 

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

function dateBlocks (info) {
    

    return dateArray
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

function resetterMsg(msg, ts, user, info) {
    let blocks = [
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
						"text": "Reset Request",
						"emoji": false
					},
					"value": ts + "," + user + "," + info,
					"action_id": "reset-request"
				}
			]
		}
    ]

    return blocks;
}

/**
 * Returns an Urgent Modal message with an Assist button
 * @param {*} msg String of text for urgent request
 * @param {*} value value is a string of request information for resolution purposes
 * @param {*} link AV Link or stirng describing if link works or not
 * @returns An urgent modal using parameters
 */
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

/**
 * function to return resolve modal
 * @param {*} user Resolver/chosen sub Slack ID
 * @param {*} msg Text for request message
 * @returns Resolved Modal  to update  resolved modals
 */
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

/**
 * Update function to strikethrough planned move modal 
 * @param {*} msg Strikethrough message request text
 * @returns New modal to  update  post
 */
function plannedMoveModal(msg) {
    let move = [
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
                "text": `:arrow_up:---- Request was moved to urgent-issues`
            }
        }
    ]

    return move;
}

export { plannedModal, messageModal, resetterMsg, urgentModal, resolvedModal, plannedMoveModal };