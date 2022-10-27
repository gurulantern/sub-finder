function plannedPost(info, move, qualified){
    if (move) {
        if (qualified) {
            return `~<@${info['userId']}> is looking for a *${info['faculty']}* to sub for *${info['session']}*. Ages *${info['age']}* playing *${info['game']}* on *${info['date']}* at *${info['time']} PT*.~`
        }
        return `~<@${info['userId']}> is looking for a *${info['faculty']}* to sub for *${info['session']}* with <@${info['partner']}>. Ages *${info['age']}* playing *${info['game']}* on *${info['date']}* at *${info['time']} PT*.~`
    } else {
        if (qualified) {
            return `<@${info['userId']}> is looking for a *${info['faculty']}* to sub for *${info['session']}*. Ages *${info['age']}* playing *${info['game']}* on *${info['date']}* at *${info['time']} PT*.`
        }
        return `<@${info['userId']}> is looking for a *${info['faculty']}* to sub for *${info['session']}* with <@${info['partner']}>. Ages *${info['age']}* playing *${info['game']}* on *${info['date']}* at *${info['time']} PT*.`;
    }
}

function urgentPost(info, qualified){
    if (qualified) {
        return `*SUBSTITUTE REQUEST*:\n\n\ <@${info['userId']}> needs a *${info['faculty']}* to sub for *${info['session']}*. Ages *${info['age']}* playing *${info['game']}* at *${info['time']} PT*.`
    }
    return `*SUBSTITUTE REQUEST*:\n\n\ <@${info['userId']}> needs a *${info['faculty']}* to sub for *${info['session']}* with <@${info['partner']}>. Ages *${info['age']}* playing *${info['game']}* at *${info['time']} PT*.`;
}

function confirmation(chosenId, info){
    return `<@${chosenId}>! You have been selected to sub *${info['session']}* playing *${info['game']}* on *${info['date']} at ${info['time']} PT* for <@${info['userId']}>. \n\nYou can log into the AV session with this link (${info['link']}). Feel free to DM <@${info['userId']}> or <@${info['partner']}> for more details. If you can no longer make this session, please submit a new sub-finder request so others may have a chance to sub. \n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function notification(chosenId, info){
    return `Good news <@${info['userId']}>! Your substitution request for ${info['session']} playing ${info['game']} on ${info['date']} at ${info['time']} PT has been accepted by <@${chosenId}>. \n\nFeel free to DM them to confirm and share any important details. You are all set and should they not be able to sub any longer, it is their responsibility to submit a new sub-request. \n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function urgentValues(info){
    return `${info['userId']},${info['session']},${info['game']},${info['time']},${info['link']},${info['faculty']},${info['moved']},${info['row']},${info['partner']},${info['age']}`;
}

function urgentConfirmation(chosenId, info){
    return `++++ URGENT ++++\n\n<@${chosenId}>! You have volunteered to sub *${info['session']}* playing *${info['game']}* at *${info['time']} PT*  for <@${info['userId']}>. \n\nYou can log into the AV session with this link (${info['link']}). DM the sub requestor or <@${info['partner']}> for more info and have them add you to the session. \n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function urgentNotification(chosenId, info){
    return `Great news <@${info['userId']}>! Your urgent substitution request for ${info['session']} playing ${info['game']} at ${info['time']} PT has been accepted by <@${chosenId}>. \n\nPlease DM them to confirm with them, add them to the session on Portal, and share any important details. You are all set and should <@${chosenId}> not be able to sub any longer, it is their responsibility to submit a new sub-request. \n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

export { plannedPost, urgentPost, confirmation, notification, urgentConfirmation, urgentNotification, urgentValues };