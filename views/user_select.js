const teacherSelect = {
    "type": "input",
    "block_id": "user",
    "element": {
        "type": "users_select",
        "action_id": "user_input",
        "placeholder": {
            "type": "plain_text",
            "text": "Select Teacher",
            "emoji": false
        },
        "action_id": "users_select-action"
    },
    "label": {
        "type": "plain_text",
        "text": "Who is the teacher for the session?",
        "emoji": false
    }
}

const taSelect = {
    "type": "input",
    "block_id": "user",
    "element": {
        "type": "users_select",
        "action_id": "user_input",
        "placeholder": {
            "type": "plain_text",
            "text": "Select TA",
            "emoji": false
        },
        "action_id": "users_select-action"
    },
    "label": {
        "type": "plain_text",
        "text": "Who is the TA for the session?",
        "emoji": false
    }
}

export { teacherSelect, taSelect };
