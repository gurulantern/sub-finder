import pkg from '@slack/bolt';
const { App, LogLevel } = pkg;
import { DateTime } from 'luxon';
import { scheduleJob } from 'node-schedule';
import { firstView } from './views/first_view.js';
import { foundationView } from './views/foundation_view.js';
import { cohortView } from './views/cohort_view.js';
import { osView } from './views/os_view.js';
import { conceptView } from './views/concept_view.js';
//import { plannedJob } from '../../plan_schedule.js';
import { plannedPost, urgentPost, urgentConfirmation, urgentNotification, urgentValues, confirmation, notification } from './views/posts.js'; 
import { plannedModal, dateBlocks, messageModal, urgentModal, resolvedModal, plannedMoveModal } from './views/post_modals.js';
import { google } from 'googleapis';
import { requestUpdate, resolutionUpdate } from './database/update_sheet_functions.js';
import { mapMaker, queryMaker } from './database/read_sheet_functions.js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config()

var TeacherTACollection = new Map();
const planned = "admin-planned-absences";
const urgent = "admin-urgent-issues";

//GoogleSheets login stuff
const facultySheetUrl = "https://docs.google.com/spreadsheets/d/12lL5sna_hzX4kwClq8fk7D2LI0wbXB9GLRu99MTFqFM/gviz/tq?tq=";
const subSheetId= "1dKwCu6hKetchuwyu7_kkN8FEN4N8TQfJl5jMeXlOQxo";
const facultySheetId = "12lL5sna_hzX4kwClq8fk7D2LI0wbXB9GLRu99MTFqFM";
const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
});
const counterColumn = 'F';
const activeColumn = 'G';
const interestedColumns = 'A,C,D,E,F'

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

/**
 * Simple function to grab Requesting User's email address for spreadsheet posting
 * @param {*} userId Slack User ID used to retrieve email address of requester
 * @returns Email strin
 */
async function emailGetter(userId) {
    const userInfo = await app.client.users.info({
        token: process.env.SLACK_BOT_TOKEN,
        user: userId
    })
    return userInfo['user']['profile']['email'];
}

/**
 * Function that uses channel name to find the channel ID for posting
 * @param {*} name String of channel name
 * @returns String of channel ID
 */
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

/**
 * Publishes a message or modal to a channel
 * @param {*} id Channel ID string
 * @param {*} text Message that posts if blocks don't post
 * @param {*} blocks Modal block object/array
 * @returns The message timestamp which is the identifier for updating messages
 */
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

/**
 * Function to find the time to deadline in the Semi-planned Window
 * @param {*} info The request info object
 * @returns Time til deadline in minutes
 */
function semiInterval(info) {
    let preUrgent = DateTime.fromISO(info['ISO']);
    let diffObj = preUrgent.diffNow('minutes').toObject();
    console.log("Time til Urgent(minutes): " + (diffObj['minutes']  - 1) );
    let timeToDeadline = (diffObj['minutes'] - 1)/2;
    return timeToDeadline;
}

/**
 * Function checking if the request is preurgent
 * @param {*} info The request info object
 * @returns True if not urgent but semi-planned/pre-urgent
 */
function isPreUrgent(info) {
    let preUrgent = DateTime.fromISO(info['ISO']);
    let diffObj = preUrgent.diffNow('minutes').toObject();
    if (diffObj['minutes'] <= 3 && diffObj['minutes'] > 1.15) {
        return true;
    }
    return false;
}

/**
 * Function checking if the request is urgent
 * @param {*} info The request info object
 * @returns True is request is now urgent
 */
function isUrgent(info) {
    let urgent = DateTime.fromISO(info['ISO']);
    let diffObj = urgent.diffNow('minutes').toObject();
    if (diffObj['minutes'] <= 1.15 && diffObj['minutes'] >= -30) {
        return true;
    }
    return false;
}

//Slash command logic for summoning modal form
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

//Update view depending on selected session type
app.action("session_type", async ({ body, ack, client, logger }) => {
    await ack();

    let newView = {}
    let sesh = body["actions"][0]["selected_option"]["value"]

    //Create the current date to be used as a ref for requesting the sub date
    var today = DateTime.now().setZone("America/Los_Angeles").toFormat("yyyy'-'MM'-'dd");
    console.log(today);

    if (sesh === "Foundation") {
        newView = foundationView(today);
    } else if (sesh === "Cohort") {
        newView = cohortView(today);
    } else if (sesh === "Open Session") {
        newView = osView(today);
    } else if (sesh === "Concept Class") {
        newView = conceptView;
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

//App action for responding to Urgent Button presses
app.action("urgent_assist", async ({ body, ack, client, logger }) => {
    await ack();
    let message = body['message']['text'];
    let sub = body['user']['id'];
    let subEmail = emailGetter(sub);    

    let infoArr = body['actions'][0]['value'].split(",");
    let subReqInfo = {
        userId: infoArr[0],
        session: infoArr[1],
        game: infoArr[2],
        time: infoArr[3],
        link: infoArr[4],
        faculty: infoArr[5],
        moved: infoArr[6]
    }    

    let dor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATE_SHORT);
    let tor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.TIME_24_WITH_SECONDS);

    resolutionUpdate(auth, subSheetId, subReqInfo, new Map(), subEmail, true, `${dor} ${tor}`);

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

            publishMessage(chosen, urgentConfirmation(chosen, subReqInfo), 
                messageModal(urgentConfirmation(chosen, subReqInfo)));
            publishMessage(subReqInfo['userId'], urgentNotification(chosen, subReqInfo), 
                messageModal(urgentNotification(chosen, subReqInfo)));
        
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

    let channel;
    let blocks = [];
    let message;
    let values;
    let sessionType;
    let sessionInput;

    logger.info(view);

    //Create a Google Sheet record update

    let sheetInfo = {  }

    if(view['title']['text'] === 'Cohort Sub Request') {
        //facultyInput = view['state']['values']['faculty']['faculty_input']['selected_option']['value'];
        sessionInput = "Cohort " + view['state']['values']['session']['session_input']['value'];
        sessionType = "Cohort";
        sheetInfo['num'] = view['state']['values']['session']['session_input']['value'];
    } else if(view['title']['text'] === 'OS Sub Request') {
        //facultyInput = "either a Teacher or TA";
        sessionInput = "Open Session: " + view['state']['values']['session']['session_input']['value'];
        sessionType = "Open Session";
        sheetInfo['name'] = view['state']['values']['session']['session_input']['value'];
    } else if(view['title']['text'] === 'Foundation Sub Request') {
        sessionInput = "Foundation Cohort " + view['state']['values']['session']['session_input']['value'];
        sessionType = "Foundation";
        sheetInfo['num'] = view['state']['values']['session']['session_input']['value'];
    }
 
    sheetInfo['type'] = sessionType;

    //Fetch relevant data and store in variables for Job payload
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

    sheetInfo['link'] = subReqInfo['link'];
    sheetInfo['game'] = subReqInfo['game'];
    sheetInfo['faculty']  = subReqInfo['faculty'];

    //Create a DateTime object with PT
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
        zone: "America/Los_Angeles"
    }) 

    console.log(dateTime);

    //Create times for post
    let msgDate = dateTime.toLocaleString(DateTime.DATE_HUGE);
    let msgTime = dateTime.toLocaleString(DateTime.TIME_24_SIMPLE);

    subReqInfo['date'] = msgDate;
    subReqInfo['time'] = msgTime;

    let now = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATETIME_FULL);
    console.log("Now:" + now);

    //Create a Time of Request (tor), Time of Session (tos), Date of Request (dor),and Date of Session (dos) for sheets
    let dor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATE_SHORT);
    let tor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.TIME_24_WITH_SECONDS);
    let dos = dateTime.toLocaleString(DateTime.DATE_SHORT);
    let tos = dateTime.toLocaleString(DateTime.TIME_SIMPLE);
    
    sheetInfo['reqTime'] = dor + " " + tor; 
    sheetInfo['date'] = dos;
    sheetInfo['time'] = tos;

    let diffObj = dateTime.diffNow('minutes').toObject();
    subReqInfo['ISO'] = dateTime.toISO();

    console.log("Time til session: ");
    console.log(diffObj);

    //Grab email from Slack
    sheetInfo['requestor'] = await emailGetter(subReqInfo['userId']);

    subReqInfo['row'] = await requestUpdate(auth, subSheetId, sheetInfo);
    console.log("Row of this request:");
    console.log(subReqInfo['row']);
    subReqInfo['moved'] = "false";
    
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
        message = plannedPost(subReqInfo, false);

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
        message = plannedPost(subReqInfo, false);

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

const plannedLogic = (info) => {
    info['deadline'] = deadlineSetter(1);
    plannedScheduler(info);
}

const semiPlannedLogic = (info) => {
    info['deadline'] = deadlineSetter(semiInterval(info));
    semiPlannedScheduler(info);
}

const urgentLogic = async (info) => {
    const result = await app.client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: await findConversation(planned),
        ts: info['msgTs'],
        text: plannedPost(info, true),
        blocks: plannedMoveModal(plannedPost(info, true))
    });

    console.log("Planned Post striked and moved");
    info['moved'] = "true";
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
}

/**
 * Function to schedule  a planned job and job logic 
 * @param {*} info The request info
 */
async function plannedScheduler(info) {
    scheduleJob(info['msgTs'], info['deadline'], async () => {
        console.log("Planned Job is firing");
        const interestedArray = await fetchInterested(info['channel'], info['msgTs']);
        if (typeof interestedArray !== 'undefined') {
            const verifiedMap = fetch(queryMaker(facultySheetUrl, interestedArray, interestedColumns), info)
                .then(res => res.text())
                .then(rep => {
                    const data = JSON.parse(rep.substring(47).slice(0,-2));
                    let interestedMap = mapMaker(data['table']['rows']);
                    interestedMap.forEach(function(value, key) {
                        if (info['faculty'] === 'Teacher') {
                            if (value[1] !== 'Teacher') interestedMap.delete(key);
                        } else if (info['faculty'] === 'TA') {
                            if (value[1] !== 'TA') interestedMap.delete(key)
                        } else if (info['faculty'] === 'qualified Teacher or TA') {
                            if (!value[2]) interestedMap.delete(key); 
                        }
                    })
                    return interestedMap
            }); 

            const jobLogic = async (info) => {
                const verified = await verifiedMap;
            
                console.log("Verified is defined");        
                let message;
                let chosen = await randomSelector(verified);

                //Date of Resolution and Time of Resolution
                let dor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATE_SHORT);
                let tor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.TIME_24_WITH_SECONDS);

                resolutionUpdate(auth, subSheetId, info, verified, chosen, false, `${dor} ${tor}`);

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
            }

            jobLogic(info);
        } else if (isPreUrgent(info)) {
            semiPlannedLogic(info);
        } else {
            plannedLogic(info);
        }
    })
} 

/**
 * Function to schedule a semi-planned job and job logic 
 * @param {*} info The request info
 */
async function semiPlannedScheduler(info) {
    scheduleJob(info['msgTs'], info['deadline'], async () => {
        console.log("SemiPlanned Job is firing");
        const interestedArray = await fetchInterested(info['channel'], info['msgTs']);
        if (typeof interestedArray !== 'undefined') {
            const verifiedMap = fetch(queryMaker(facultySheetUrl, interestedArray, interestedColumns), info)
                .then(res => res.text())
                .then(rep => {
                    const data = JSON.parse(rep.substring(47).slice(0,-2));
                    let interestedMap = mapMaker(data['table']['rows']);
                    interestedMap.forEach(function(value, key) {
                        if (info['faculty'] === 'Teacher') {
                            if (value[1] !== 'Teacher') interestedMap.delete(key);
                        } else if (info['faculty'] === 'TA') {
                            if (value[1] !== 'TA') interestedMap.delete(key)
                        } else if (info['faculty'] === 'qualified Teacher or TA') {
                            if (!value[2]) interestedMap.delete(key); 
                        }
                    })
                    return interestedMap
            }); 

            const jobLogic = async (info) => {
                const verified = await verifiedMap;
            
                console.log("Verified is defined");
        
                let message;
                let chosen = await randomSelector(verified);

                //Date of Resolution and Time of Resolution
                let dor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATE_SHORT);
                let tor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.TIME_24_WITH_SECONDS);

                resolutionUpdate(auth, subSheetId, info, verified, chosen, false, `${dor} ${tor}`);

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
            } 
            jobLogic(info);
        } else if (isUrgent(info)) {
            urgentLogic(info);
        } else {
            semiPlannedLogic(info);
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
    let users;

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
                if (reactArr[i]['name'] === 'ballot_box_with_check') {
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
function findLowSub(verifiedMap) {
    var i = 0;
    var currentLow = 0;

    //Iterate through and if anything is lower than current low set that as current low
    verifiedMap.forEach(function (value, key) {
        if (i === 0) {
            currentLow = value[3];
            i++;
        }
        else {
            if (value < currentLow) {
                currentLow = value[3];
            }
        }
    });

    console.log("Current low is " + currentLow);
    return currentLow;
};

/**
 * 
 * @param {*} verifiedMap The map of interested and eligible faculty
 * @returns The randomly chosen interested party
 */
async function randomSelector(verifiedMap) {
    //initialize empty selections and temp current low
    let selections = [];

    //Call findLowSub to get the true current low
    let low = findLowSub(verifiedMap);
    verifiedMap.forEach(function (value, key) {
        if (value[3] === low) {
            selections.push(key);
        }
    });

    // Set random number based on length of selections and fetch
    let random = Math.floor(Math.random() * selections.length);
    var chosen = selections[random];
    let num = verifiedMap.get(chosen)[3];

    //Update counter in selected Faculty map and Whole faculty map\
    counter(chosen, num, 1);

    //empty selections
    selections.splice(0);
    console.log(chosen + " was picked.");
    return chosen;
};

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ LET'S FIND SUBSTITUTES!");
})();
