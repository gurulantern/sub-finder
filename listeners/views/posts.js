function plannedPost(info){
    return `<@${info['userId']}> is looking for *${info['faculty']}* to sub for *${info['session']}* playing *${info['game']}* on *${info['date']}* at *${info['time']} PDT*.`;
}

function urgentPost(info){
    return `*SUBSTITUTE REQUEST*:\n\n <@${info['userId']}> needs *${info['faculty']}* to sub for *${info['session']}* playing *${info['game']}* at *${info['time']} PDT*.`;
}

function confirmation(chosenId, info){
    return `<@${chosenId}>! You have been selected to sub *${info['session']}* playing *${info['game']}* on *${info['date']} at ${info['time']} PDT* for <@${info['userId']}>. \n\nFeel free to DM <@${info['userId']}> for more details. If you can no longer make this session, please submit a new sub-finder request so others may have a chance to sub. \n\n\n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function notification(chosenId, info){
    return `Good news <@${info['userId']}>! Your substitution request for ${info['session']} playing ${info['game']} on ${info['date']} at ${info['time']} PDT has been accepted by <@${chosenId}>. \n\nFeel free to DM them to confirm and share any important details. You are all set and should <@${chosenId}> not be able to sub any longer, it is their responsibility to submit a new sub-request. \n\n\n\n\n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function urgentValues(info){
    return `${info['userId']}-${info['session']}-${info['game']}-${info['time']}-${info['link']}`;
}

function urgentConfirmation(chosenId, info){
    return `++++ URGENT ++++\n\n<@${chosenId}>! You have been selected to sub *${info[1]}* playing *${info[2]}* at ${info[3]} PDT*  for <@${info[0]}>. \n\nYou can join the session <${info[4]}|here>. DM <@${info[0]}> for more info and have them add you to the session. \n\n\n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function urgentNotification(chosenId, info){
    return `Great news <@${info[0]}>! Your urgent substitution request for ${info[1]} playing ${info[2]} on at ${info[3]} PDT has been accepted by <@${chosenId}>. \n\nPlease DM them to confirm with them, add them to the session on Portal, and share any important details. You are all set and should <@${chosenId}> not be able to sub any longer, it is their responsibility to submit a new sub-request. \n\n\n\n\n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

module.exports = { plannedPost, urgentPost, confirmation, notification, urgentConfirmation, urgentNotification, urgentValues };