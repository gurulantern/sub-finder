function plannedDateItem(info){
    return `*${info['date']}* at *${info['time']} PDT*`
}

function plannedPost(info){
    return `<@${info['userId']}> is looking for a *${info['faculty']}* to sub for *${info['session']}* playing *${info['game']}* on *${info['date']}* at *${info['time']} PDT*.`;
}

function urgentPost(info){
    return `*SUBSTITUTE REQUEST*:\n\n\ <@${info['userId']}> needs a *${info['faculty']}* to sub for *${info['session']}* playing *${info['game']}* at *${info['time']} PDT*.`;
}

function confirmation(chosenId, info){
    return `<@${chosenId}>! You have been selected to sub *${info['session']}* playing *${info['game']}* on *${info['date']} at ${info['time']} PDT* for <@${info['userId']}>. \n\nFeel free to DM <@${info['userId']}> for more details. If you can no longer make this session, please submit a new sub-finder request so others may have a chance to sub. \n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function notification(chosenId, info){
    return `Good news <@${info['userId']}>! Your substitution request for ${info['session']} playing ${info['game']} on ${info['date']} at ${info['time']} PDT has been accepted by <@${chosenId}>. \n\nFeel free to DM them to confirm and share any important details. You are all set and should they not be able to sub any longer, it is their responsibility to submit a new sub-request. \n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function urgentValues(info){
    return `${info['userId']},${info['session']},${info['game']},${info['time']},${info['link']},${info['faculty']}`;
}

function urgentConfirmation(chosenId, info){
    return `++++ URGENT ++++\n\n<@${chosenId}>! You have been selected to sub *${info['session']}* playing *${info['game']}* at *${info['time']} PDT*  for <@${info['userId']}>. \n\nYou can log into the AV session with this link (${info['link']}). DM your sub for more info and have them add you to the session. \n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function urgentNotification(chosenId, info){
    return `Great news <@${info['userId']}>! Your urgent substitution request for ${info['session']} playing ${info['game']} at ${info['time']} PDT has been accepted by <@${chosenId}>. \n\nPlease DM them to confirm with them, add them to the session on Portal, and share any important details. You are all set and should <@${chosenId}> not be able to sub any longer, it is their responsibility to submit a new sub-request. \n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

module.exports = { plannedPost, urgentPost, confirmation, notification, urgentConfirmation, urgentNotification, urgentValues };