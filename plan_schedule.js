async function plannedJob(info) { 
    let chosen;
    let message;
    if (info['faculty'] === "Teacher") {
        console.log(interestArr);
        chosen = await selectSub(interestArr, TeacherCollection);
    } else if (info['faculty'] === "TA") {
        console.log(interestArr);
        chosen = await selectSub(interestArr, TACollection);
    } else if (info['faculty'] === "qualified Teacher or TA") {
        console.log(interestArr);
        chosen = await selectSub(interestArr, TeacherTACollection);
    }

    try {
        // Call the conversations.history method using the built-in WebClient
        const result = await app.client.conversations.history({
            token: process.env.SLACK_BOT_TOKEN,
            channel: info['channel'],
            latest: info['msgTs'],
            inclusive: true,
            limit: 1
        });

        // There should only be one result (stored in the zeroth index)
        message = result.messages[0];
    }
    catch (error) {
        console.error(error);
    }

    try {
        console.log("Message: " + message.text);
        console.log("channel: " + info['channel']);
        //Call open method for view with client
        const result = await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: info['channel'],
            ts: info['msgTs'],
            text: message.text,
            blocks: resolvedModal(chosen, message.text)
        });
    }
    catch (error) {
        console.error(error);
    }

    publishMessage(chosen, confirmation(chosen, info));
    publishMessage(info['userId'], notification(chosen, info));
}

export { plannedJob };