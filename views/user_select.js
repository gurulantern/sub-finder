const teacherSelect = {
    "type": "input",
    "element": {
        "type": "users_select",
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
    "element": {
        "type": "users_select",
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
