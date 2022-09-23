import pkg from '@slack/bolt';
const { App, LogLevel } = pkg;
import { DateTime } from 'luxon';
import { scheduleJob } from 'node-schedule';
import { firstView } from './views/first_view.js';
import { cohortView } from './views/cohort_view.js';
import { osView } from './views/os_view.js';
import { plannedJob } from './plan_schedule.js';
import { plannedPost, urgentPost, urgentConfirmation, urgentNotification, urgentValues, confirmation, notification } from './views/posts.js'; 
import { plannedModal, dateBlocks, messageModal, urgentModal, resolvedModal } from './views/post_modals.js';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config()

var TeacherTACollection = new Map();
const planned = "admin-planned-absences";
const urgent = "admin-urgent-issues";

//GoogleSheets login stuff
const spreadsheetId= "1dKwCu6hKetchuwyu7_kkN8FEN4N8TQfJl5jMeXlOQxo";

const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
});

async function getRows(auth, spreadsheetId) {
    const getRows = await googleSheets.spreadsheets.values.get({
        auth, 
        spreadsheetId,
        range: "Sheet1"
    });

    return (getRows.data.values.length + 1).toString();
}

async function updateSheet(auth, spreadsheetId, range, info) { 
    const client = await auth.getClient();

    const googleSheets = google.sheets({version: "v4", auth: client});

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `Sheet1!${range}`,
        valueInputOption:  "USER_ENTERED",
        resource: {
            values: [
                ["9/20/2022 9:00:00", "alexander.ho@synthesis.is"]
            ]
        }
    })

    console.log(getRows.data);
}

/*
//MongoDB variables
const uri = `mongodb+srv://sub-finder:${process.env.MONGO_USER_PW}@cluster0.ejudd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000
});
*/
async function checkLink(url) { return (await fetch(url)).ok }

async function monthlyReset(deadline) {
    scheduleJob(deadline, async () => {
        console.log("Monthly Reset Job is firing");
        TeacherTACollection.forEach(function(count, userId) {
            if(count <= 0 ) {
                count --;
            } else if (count > 0) {
                count = 0;
            }

            console.log("{" + userId + " : " + count + " }");
        })
    })
}

monthlyReset(DateTime.now().plus({ minutes: 6 }).toJSDate());

function counter(chosen, num, value) {
    TeacherTACollection.set(chosen, num + value);
    console.log(chosen + " is at " + TeacherTACollection.get(chosen));
    console.log("---------------------------");
    console.log("Updated faculty collection");
    TeacherTACollection.forEach(function(count, userId) { console.log("{ " + userId + " : " + count + " }") });
}

function deadlineSetter(time) {
    let deadline = DateTime.now().plus({ minutes: time }).toJSDate();
    return deadline;
}

// Initializes your app with your bot token, app token, setting it to socket mode for local dev and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    logLevel: LogLevel.DEBUG
  });

Date.prototype.today = function () { 
    return this.getFullYear() + "-" + (this.getMonth()+1) + "-" + ((this.getDate() < 10)?"0":"") + this.getDate();
}

// For the time now
Date.prototype.timeNow = function () {
     return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}


async function findConversation(name) {
    let channelId;
    try {
        const result = await app.client.conversations.list({
            token: process.env.SLACK_BOT_TOKEN
        });

        for (const channel of result.channels) {
            if (channel.name === name) {
                console.log("Found conversation ID " + channel.id);
                channelId = channel.id;
                return await channel.id;
            }
        }
    }
    catch (error) {
        console.error(error);
    }
}


async function publishMessage(id, text, blocks) {
    try {
        const result = await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: id,
            text: text,
            blocks: blocks
        });
        let messageTs = result['message']['ts'];
        return await result['message']['ts'];
    }
    catch (error) {
        console.log(error);
    }
}

function semiInterval(info) {
    let preUrgent = DateTime.fromISO(info['ISO']);
    let diffObj = preUrgent.diffNow('minutes').toObject();
    console.log("Time til Urgent(minutes): " + (diffObj['minutes']  - 1) );
    let timeToDeadline = (diffObj['minutes'] - 1)/2;
    return timeToDeadline;
}

function isPreUrgent(info) {
    let preUrgent = DateTime.fromISO(info['ISO']);
    let diffObj = preUrgent.diffNow('minutes').toObject();
    if (diffObj['minutes'] <= 3 && diffObj['minutes'] > 1.15) {
        return true;
    }
    return false;
}

function isUrgent(info) {
    let urgent = DateTime.fromISO(info['ISO']);
    let diffObj = urgent.diffNow('minutes').toObject();
    if (diffObj['minutes'] <= 1.15 && diffObj['minutes'] >= -30) {
        return true;
    }
    return false;
}

//Command logic for the shortcut message /substitute
app.command('/substitute', async ({ body, ack, client, logger }) => {
    //Acknowledge shortcut request
    await ack();
    
    try {
        //Call open method for view with client
        const result = await client.views.open({
            trigger_id: body.trigger_id,
            //View payload of the request modal
            view: firstView
        });
        logger.info(result);
    }
    catch (error) {
        logger.error(error);
    }
});

app.action("session_type", async ({ body, ack, client, logger }) => {
    await ack();

    let newView = {}
    let sesh = body["actions"][0]["selected_option"]["value"]

    //Create the current date to be used as a ref for requesting the sub date
    var today = new Date().today();

    if (sesh === "Cohort") {
        newView = cohortView(today);
    } else if (sesh === "Open Session") {
        newView = osView(today);
    }

    try {
        //Call open method for view with client
        const result = await client.views.update({
            view_id: body.view.id,
            hash: body.view.hash,
            //View payload of the request modal
            view: newView
        });
        logger.info(result);
    }
    catch (error) {
        logger.error(error);
    }
})

app.action("urgent_assist", async ({ body, ack, client, logger }) => {
    await ack();

    //console.log(body);
    let message = body['message']['text'];
    let chosen = body['user']['id'];

    if (!TeacherTACollection.has(chosen)) {
        TeacherTACollection.set(chosen, 0);
    }

    let infoArr = body['actions'][0]['value'].split(",");
    let subReqInfo = {
        userId: infoArr[0],
        session: infoArr[1],
        game: infoArr[2],
        time: infoArr[3],
        link: infoArr[4],
        faculty: infoArr[5]
    }    
    //console.log(body['actions'][0]['value']);
    //console.log(infoArr);
    //console.log(subReqInfo);

    //if (chosen !== subReqInfo['userId']) {
        try {
            //Call open method for view with client
            const result = await client.chat.update({
                token: process.env.SLACK_BOT_TOKEN,
                channel: body['container']['channel_id'],
                ts: body['message']['ts'],
                text: message,
                blocks: resolvedModal(body['user']['id'], body['message']['text'])
            });

            publishMessage(chosen, urgentConfirmation(chosen, subReqInfo), messageModal(urgentConfirmation(chosen, subReqInfo)));
            publishMessage(subReqInfo['userId'], urgentNotification(chosen, subReqInfo), messageModal(urgentNotification(chosen, subReqInfo)));
        
            counter(chosen, TeacherTACollection.get(chosen), 1);
        }
        catch (error) {
            logger.error(error);
        }
    //}
})


//Listener for submission of request
app.view("request_view", async ({ ack, body, view, client, logger }) => {
    //Acknowledge submission request
    await ack();
    let userTZ = "America/Los_Angeles";
    let channel = "";
    let msgTs = "";
    let blocks = [];
    let message;
    let values;
    //let facultyInput = "";
    let sessionInput = "";
    var currDateTime = new Date().today() + "T" + new Date().timeNow();
    logger.info("Current date and time: " + currDateTime);

    logger.info(view);

    if(view['title']['text'] === 'Cohort Sub Request') {
        //facultyInput = view['state']['values']['faculty']['faculty_input']['selected_option']['value'];
        sessionInput = "Cohort " + view['state']['values']['session']['session_input']['value'];
    } else if(view['title']['text'] === 'OS Sub Request') {
        //facultyInput = "either a Teacher or TA";
        sessionInput = "Open Session: " + view['state']['values']['session']['session_input']['value'];
    }

    //Fetch relevant data and store in variables
    let subReqInfo = {
        userId: body['user']['id'],
        session: sessionInput,
        link: view['state']['values']['link']['link_input']['value'],
        game: view['state']['values']['game']['game_input']['selected_option']['value'],
        date: view['state']['values']['date']['date_input']['selected_date'],
        time: view['state']['values']['time']['time_input']['selected_time'],
        faculty: view['state']['values']['faculty']['faculty_input']['selected_option']['value']
    }
    //console.log(subReqInfo);
    console.log("Checking Link");

    try {
        await fetch(subReqInfo['link']);
        console.log("Link works");
    }
    catch (e) {
        console.error(e);
        subReqInfo['link'] = "working link not provided";
        console.log("Info Link is now: " + subReqInfo['link']);
    }

    //Fetch user's TZ
    try {
        const result = await client.users.info({
            user: subReqInfo['userId']
        })

        userTZ = result['user']['tz'];
        //console.log("User TZ : "+ userTZ);
    }
    catch (error){
        console.error(error);
    }

    //Create a DateTime object with user's TZ
    let dateParts = subReqInfo['date'].split("-");
    let timeParts = subReqInfo['time'].split(":");

    let dateTime = DateTime.fromObject({
        year: dateParts[0],
        month: dateParts[1],
        day: dateParts[2],
        hour: timeParts[0],
        minutes: timeParts[1]
    },
    {
        zone: userTZ
    })

    //Create a DateTime in PDT and set post Locale Strings for post in planned-absence
    let pdt = dateTime.setZone("America/Los_Angeles");
    logger.info("User's TZ: " + dateTime.toLocaleString(DateTime.DATETIME_FULL));
    logger.info("PDT: " + pdt.toLocaleString(DateTime.DATETIME_FULL))
    let msgDate = pdt.toLocaleString(DateTime.DATE_HUGE);
    let msgTime = pdt.toLocaleString(DateTime.TIME_SIMPLE);
    
    subReqInfo['date'] = msgDate;
    subReqInfo['time'] = msgTime;

    let now = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATETIME_FULL);
    console.log("Now:" + now);
    
    let diffObj = pdt.diffNow('minutes').toObject();
    subReqInfo['ISO'] = pdt.toISO();

    console.log("Time til session: ");
    console.log(diffObj);
    
    //URGENT -- Check how close the request is made to the time of session
    if (diffObj['minutes'] <= 1 && diffObj['minutes'] >= -30) {
        message = urgentPost(subReqInfo);
        values = urgentValues(subReqInfo);
        blocks = urgentModal(message, values, subReqInfo['link']);
        console.log("Message: " + message);
        console.log("Value: " + values);
        console.log("Block: " + blocks);

        channel = await findConversation(urgent);
        let msgTs = await publishMessage(channel, message, blocks);
        //logger.info("URGENT POSTING in " + channel + " " + msgTs);
    
        subReqInfo['msgTs'] = msgTs;
        subReqInfo['channel'] = channel;
    
        //console.log(subReqInfo);
    //PLANNED 
    } else if (diffObj['minutes'] > 3) {
        //Await for the conversation and the message to publish
        message = plannedPost(subReqInfo);

        channel = await findConversation(planned);
        let msgTs = await publishMessage(channel, message, blocks);
        console.log("Posting Planned Req in " + channel + " " + msgTs);

        subReqInfo['deadline'] = deadlineSetter(1);
        subReqInfo['msgTs'] = msgTs;
        subReqInfo['channel'] = channel;

        //console.log(subReqInfo);
        //Use awaited return values to schedule a job to sort interested parties

        plannedScheduler(subReqInfo);
    //SEMIPLANNED  
    } else if (diffObj['minutes'] <= 3 && diffObj['minutes'] > 1) {
        //Await for the conversation and the message to publish
        console.log((diffObj['minutes']/2) -1);
        message = plannedPost(subReqInfo);

        channel = await findConversation(planned);
        let msgTs = await publishMessage(channel, message, blocks);
        console.log("Post SemiPlanned in " + channel + " " + msgTs);

        subReqInfo['deadline'] = deadlineSetter(semiInterval(subReqInfo));
        subReqInfo['msgTs'] = msgTs;
        subReqInfo['channel'] = channel;

        //console.log(subReqInfo);
        //Use awaited return values to schedule a job to sort interested parties
        semiPlannedScheduler(subReqInfo);          
    }
});

async function plannedScheduler(info) {
    scheduleJob(info['msgTs'], info['deadline'], async () => {
        console.log("Planned Job is firing");
        let now = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATETIME_FULL);
        console.log("Now:" + now);
        let interestArr = await fetchInterested(info['channel'], info['msgTs']);
        console.log(interestArr);

        if (typeof interestArr !== "undefined") {
            let chosen;
            let message;
            if (info['faculty'] === "Teacher") {
                console.log(interestArr);
                chosen = await selectSub(interestArr);
            } else if (info['faculty'] === "TA") {
                console.log(interestArr);
                chosen = await selectSub(interestArr);
            } else if (info['faculty'] === "qualified Teacher or TA") {
                console.log(interestArr);
                chosen = await selectSub(interestArr);
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
                //console.log("Message: " + message.text);
                //console.log("channel: " + info['channel']);
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
        } else if (isPreUrgent(info)) {
            info['deadline'] = deadlineSetter(semiInterval(info));
            semiPlannedScheduler(info);
        } else {
            info['deadline'] = deadlineSetter(1);
            plannedScheduler(info);
        }
    })
}; 

async function semiPlannedScheduler(info) {
    scheduleJob(info['msgTs'], info['deadline'], async () => {
        console.log("SemiPlanned Job is firing");
        let now = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATETIME_FULL);
        console.log("Now:" + now);
        let interestArr = await fetchInterested(info['channel'], info['msgTs']);
        console.log(interestArr);
        console.log(isUrgent(info));
        console.log(info);
        if (typeof interestArr !== "undefined") {
            let chosen;
            let message;
            if (info['faculty'] === "Teacher") {
                console.log(interestArr);
                chosen = await selectSub(interestArr);
            } else if (info['faculty'] === "TA") {
                console.log(interestArr);
                chosen = await selectSub(interestArr);
            } else if (info['faculty'] === "qualified Teacher or TA") {
                console.log(interestArr);
                chosen = await selectSub(interestArr);
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
        } else if (isUrgent(info)) {
            const result = await app.client.chat.delete({
                token: process.env.SLACK_BOT_TOKEN,
                channel: await findConversation(planned),
                ts: info['msgTs']
            });

            console.log("Planned Post deleted");

            let message = urgentPost(info);
            let values = urgentValues(info);
            let blocks = urgentModal(message, values, info['link']);
            console.log("Message: " + message);
            console.log("Value: " + values);
            console.log("Block: ");
            for (let i = 0; i < blocks.length; i++) {
                console.log(blocks[i]);
            }
    
            let channel = await findConversation(urgent);
            let msgTs = await publishMessage(channel, message, blocks);
            console.log("URGENT POSTING in " + channel + " " + msgTs);
        
            info['msgTs'] = msgTs;
            info['channel'] = channel;
        
            console.log(info);
        } else {
            info['deadline'] = deadlineSetter(semiInterval(info));
            semiPlannedScheduler(info);
        }
    })
}

/**
 * 
 * @param {*} id The channel id to search for the required message
 * @param {*} msgTs The required message id/timestamp 
 * @returns An array of users that reacted to the post
 */
async function fetchInterested(id, msgTs) {
    //console.log("Message: " + msgTs + " & Channel: " + id);
    try {
        // Call the conversations.history method using the built-in WebClient
        const result = await app.client.conversations.history({
            token: process.env.SLACK_BOT_TOKEN,
            channel: id,
            latest: msgTs,
            inclusive: true,
            limit: 1
        });

        // There should only be one result (stored in the zeroth index)
        let message = result.messages[0];

        //console.log(message);
        console.log(message['reactions']);
        let reactArr = message['reactions'];
        if ( typeof reactArr !== 'undefined') {
            for (let i = 0; i < reactArr.length; i++) {
                if (reactArr[i]['name'] === 'eyes') {
                    console.log(reactArr[i]['users']);
                    users = reactArr[i]['users'];
                    return await users;
                }
            }
        } else {
            return reactArr; 
        }
    }
    catch (error) {
      console.error(error);
    }
  }

/**
 * 
 * @param {*} faculty The Collection of faculty to iterate
 * @param {*} currentLow The current lowest amount of the subs assigned to person
 * @returns the current lowes amount of subs assigned
 */
function findLowSub(currentLow) {
    var i = 0;

    //Iterate through and if anything is lower than current low set that as current low
    TeacherTACollection.forEach(function (value, key) {
        if (i === 0) {
            currentLow = value;
            i++;
        }
        else {
            if (value < currentLow) {
                currentLow = value;
            }
        }
    });

    console.log("Current low is " + currentLow);
    return currentLow;
};

/**
 * 
 * @param {*} choices The array of interested parties that also have lowest subs
 * @param {*} faculty The selected required faculty for updates to counters
 * @returns The randomly chosen interested party
 */
function facultyGetter(choices) {
    //initialize empty selections and temp current low
    let selections = [];
    let currentLow = 0;

    //Call findLowSub to get the true current low
    let low = findLowSub(choices, currentLow);
    choices.forEach(function (value, key) {
        if (value === low) {
            selections.push(key);
        }
    });

    // Set random number based on length of selections and fetch
    let random = Math.floor(Math.random() * selections.length);
    var chosen = selections[random];
    let num = choices.get(chosen);

    //Update counter in selected Faculty map and Whole faculty map\
    counter(chosen, num, 1);

    //empty selections
    selections.splice(0);
    console.log(chosen + " was picked.");
    return chosen;
};


/**
 * 
 * @param {*} interested Array of interested faculty 
 * @param {*} faculty The map of required faculty
 * @returns chosen party for assignment
 */
async function selectSub(interested) {
    let choices = new Map();
    for (let i = 0; i < interested.length; i ++) {
        if (!TeacherTACollection.has(interested[i])) {
            //faculty.set(interested[i], 0);
            choices.set(interested[i], 0);
            TeacherTACollection.set(interested[i], 0);
        } else {
            choices.set(interested[i], TeacherTACollection.get(interested[i]));
        }
    }
    console.log("Choices: " + choices);
    console.log("TeacherTACollection: " + TeacherTACollection);

    return await facultyGetter(choices);
}

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ LET'S FIND SUBSTITUTES!");
})();
