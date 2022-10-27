import pkg from '@slack/bolt';
const { App, LogLevel } = pkg;
import { DateTime } from 'luxon';
import { scheduleJob, RecurrenceRule } from 'node-schedule';
import { getTransitions, adjustForDS } from './time/dst_checker.js';
import { firstView } from './views/modals/first_view.js';
import { foundationView } from './views/modals/foundation_view.js';
import { cohortView } from './views/modals/cohort_view.js';
import { osView } from './views/modals/os_view.js';
import { conceptView } from './views/modals/concept_view.js';
import { invalidTime } from './views/modals/invalid_time.js';
import { osFaculty, cohortFaculty, foundationFaculty } from './views/modals/faculty_form.js';
//import { plannedJob } from '../../plan_schedule.js';
import { plannedPost, urgentPost, urgentConfirmation, urgentNotification, urgentValues, confirmation, notification } from './views/messages/posts.js'; 
import { messageModal, resetterMsg, urgentModal, resolvedModal, plannedMoveModal } from './views/messages/post_modals.js';
import { google } from 'googleapis';
import { requestUpdate, resolutionUpdate, counterUpdater, activeUpdater, resetCounters } from './database/update_sheet_functions.js';
import { mapMaker, queryMaker } from './database/read_sheet_functions.js';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config()

const planned = "admin-planned-absences";
const urgent = "admin-urgent-issues";

//GoogleSheets login stuff
const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
});
const interestedColumns = 'A,C,D,E,F,G'

//Monthly Reset Logic
const rule = new RecurrenceRule();
rule.hour = 24;
console.log(rule);

scheduleJob("0 0 28 * *", async () => {
    console.log("Monthly Reset Job is firing");
    resetCounters(auth, process.env.FACULTY_SHEET);
})

/**
 * Function to set new deadlines to check for substitutes
 * @param {*} time Interval of time to set next deadline
 * @returns JSDate of new deadline
 */
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
 * @returns Email string
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
    try {
        const result = await app.client.conversations.list({
            token: process.env.SLACK_BOT_TOKEN
        });

        for (const channel of result.channels) {
            if (channel.name === name) {
                console.log("Found conversation ID " + channel.id);
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
        console.log(result);
        let msgValues = result['ts'] + ',' + result['channel'];
        console.log(msgValues)
        return await msgValues;
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
    if (diffObj['minutes'] <= 540 && diffObj['minutes'] > 60) {
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
    if (diffObj['minutes'] <= 60 && diffObj['minutes'] >= -30) {
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
    let sesh = body.actions[0].selected_option.value;

    if (sesh === "Foundation") {
        newView = foundationFaculty;
    } else if (sesh === "Cohort") {
        newView = cohortFaculty;
    } else if (sesh === "Open Session") {
        newView = osFaculty;
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

app.action("faculty-action", async ({ body, ack, client, logger }) => {
    await ack();
    let newView;
    let faculty = body.actions[0].selected_option.value;
    let sesh = body.view.title.text;

    //Create the current date to be used as a ref for requesting the sub date
    var today = DateTime.now().setZone("America/Los_Angeles").toFormat("yyyy'-'MM'-'dd");

    console.log(faculty);
    console.log(sesh);

    if (sesh === 'Cohort') {
        newView = faculty === 'teacher' ? cohortView(today, true) : cohortView(today, false);
    } else if (sesh === 'Foundation') {
        newView = faculty === 'teacher' ? foundationView(today, true) : foundationView(today, false);
    } else if (sesh === 'Open Session') {
        if (faculty === "qualified teacher or TA") {
            newView = osView(today, false, true);
        } else {
            newView = faculty === 'teacher' ? osView(today, true, false) : osView(today, false, false);
        }

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

    //if (chosen !== subReqInfo['userId']) return;

    let sub = body['user']['id'];
    let subEmail = await emailGetter(sub);    
    let subReqInfo;
    console.log(sub);

    let valueArr = body['actions'][0]['value'].split(",");

    //Conditional to check for reset or initial info object
    if (valueArr.length < 12) {
        subReqInfo = {
            userId: valueArr[0],
            session: valueArr[1],
            game: valueArr[2],
            time: valueArr[3],
            link: valueArr[4],
            faculty: valueArr[5],
            moved: valueArr[6],
            row: valueArr[7],
            partner: valueArr[8],
            age: valueArr[9]
        }  
    } else { 
        subReqInfo = {
            userId: valueArr[2],
            session: valueArr[3],
            game: valueArr[4],
            time: valueArr[5],
            link: valueArr[6],
            faculty: valueArr[7],
            moved: valueArr[8],
            row: valueArr[9],
            partner: valueArr[10],
            age: valueArr[11]
        }  
    }

    let message = urgentPost(subReqInfo, subReqInfo['faculty'] === 'qualified teacher or TA'? true:false);
    let timeArr = subReqInfo.time.split(":")
    let dor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATE_SHORT);
    let tor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.TIME_24_WITH_SECONDS);
    let endOfTime = DateTime.now().set({hour: timeArr[0], minute: timeArr[1]}).plus({minutes: 60}).setZone("America/Los_Angeles").toJSDate();
    console.log("END OF SESSION:")
    console.log(endOfTime.toLocaleString(DateTime.DATETIME_FULL));

    logger.info("URGENT UPDATING GOOGLE SHEET");
    resolutionUpdate(auth, process.env.SUB_SHEET, subReqInfo, new Map(), subEmail, true, `${dor} ${tor}`);
    counterUpdater(sub, process.env.FACULTY_SHEET_URL, auth, process.env.FACULTY_SHEET, 1);
    activeUpdater(sub, process.env.FACULTY_SHEET_URL, auth, process.env.FACULTY_SHEET);

    //Call open method for view with client
    const result = await client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body['container']['channel_id'],
        ts: body['message']['ts'],
        text: message,
        blocks: resolvedModal(body['user']['id'], message)
    });

    logger.info("URGENT POSTING MESSAGES TO USERS")
    //Publish message including a reset request button to redo request, lower counter of previous faculty, and redo confirmation 
    let confirmValues = await (await publishMessage(sub, urgentConfirmation(sub, subReqInfo), 
        resetterMsg(urgentConfirmation(sub, subReqInfo), body['message']['ts'], sub, body['actions'][0]['value']))).split(',');
    let notifyValues = await (await publishMessage(subReqInfo['userId'], urgentNotification(sub, subReqInfo), 
        resetterMsg(urgentNotification(sub, subReqInfo), body['message']['ts'], sub, body['actions'][0]['value']))).split(',');
/*
    logger.info("SCHEDULING JOBS TO REMOVE BUTTONS")
    scheduleJob(endOfTime, async () => {
        const confirmed = await client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: confirmValues[1],
            ts: confirmValues[0],
            text: messageModal(urgentConfirmation(sub, subReqInfo), body['message']['ts'], sub, body['actions'][0]['value']),
            blocks: messageModal(urgentConfirmation(sub, subReqInfo), body['message']['ts'], sub, body['actions'][0]['value']),

        });

        const notified = await client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: notifyValues[1],
            ts: notifyValues[0],
            text: messageModal(urgentNotification(sub, subReqInfo), body['message']['ts'], sub, body['actions'][0]['value']),
            blocks: messageModal(urgentConfirmation(sub, subReqInfo), body['message']['ts'], sub, body['actions'][0]['value'])
        });
    })
*/
})

app.action("reset-request", async({ ack, body, view, client, logger}) => {
    await ack()


    //Hacky but the info is passed along as csv and split into info object for message maker
    console.log(body);
    console.log(body.actions[0].value)
    let valueArr = body.actions[0].value.split(',')
    console.log(valueArr);
    
    let subReqInfo = {
        userId: valueArr[2],
        session: valueArr[3],
        game: valueArr[4],
        time: valueArr[5],
        link: valueArr[6],
        faculty: valueArr[7],
        moved: valueArr[8],
        row: valueArr[9],
        partner: valueArr[10],
        age: valueArr[11]
    }  
    let timeArr = subReqInfo.time.split(":")
    let endOfSesh = DateTime.now().set({hour: timeArr[0], minute: timeArr[1]}).diffNow('minutes').toObject()
    if (endOfSesh['minutes'] <= -60 ) {
        console.log("MINUTES SINCE SESSION END");
        console.log(endOfSesh['minutes'])
        console.log("SESSION PASSED")
        return;
    }

    counterUpdater(valueArr[1],process.env.FACULTY_SHEET_URL, auth, process.env.FACULTY_SHEET, -1);

    let message = urgentPost(subReqInfo, subReqInfo['faculty'] === 'qualified teacher or TA'? true:false);
    let values = urgentValues(subReqInfo);

    try {
        //Call open method for view with client
        const result = await client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: await  findConversation(urgent),
            ts: valueArr[0],
            blocks: urgentModal(message, values, subReqInfo['link'])
        });

        const result1 = await client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel.id,
            ts: body.container.message_ts,
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "The urgent request has been reset!"
                    }
                }
            ]
        })
    }
    catch (error) {
        logger.error(error);
    }

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
    let qualified = false;

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
        type: sessionType,
        link: view['state']['values']['link']['link_input']['value'],
        game: view['state']['values']['game']['game_input']['selected_option']['value'],
        date: view['state']['values']['date']['date_input']['selected_date'],
        time: view['state']['values']['time']['time_input']['selected_time'],
        age: view['state']['values']['age']['age_input']['selected_option']['value'],
    }

    if (view.blocks[8].type == 'divider') {
        subReqInfo.faculty = "qualified teacher or TA";
        qualified = true;
    } else if(view.blocks[8].label.text === "Who is the TA for the session?") {
        subReqInfo.faculty = "teacher";
        subReqInfo.partner = view['state']['values']['user']['users_select-action']['selected_user'];
    } else if (view.blocks[8].label.text === "Who is the teacher for the session?") {
        subReqInfo.faculty = "TA";
        subReqInfo.partner = view['state']['values']['user']['users_select-action']['selected_user'];
    }

    console.log(subReqInfo);
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

    if (diffObj['minutes'] >= -30) {
        subReqInfo['row'] = await requestUpdate(auth, process.env.SUB_SHEET, sheetInfo);
    } else {
        try {
            //Call open method for view with client
            const result = await client.views.open({
                trigger_id: body.trigger_id,
                //View payload of the request modal
                view: invalidTime
            });
            logger.info(result);
        }
        catch (error) {
            logger.error(error);
        }
    }

    console.log("Row of this request:");
    console.log(subReqInfo['row']);
    subReqInfo['moved'] = "false";
    
    //URGENT -- Check how close the request is made to the time of session
    if (diffObj['minutes'] <= 60 && diffObj['minutes'] >= -60) {
        message = urgentPost(subReqInfo,  qualified);
        values = urgentValues(subReqInfo);
        blocks = urgentModal(message, values, subReqInfo['link']);
        console.log("Message: " + message);
        console.log("Value: " + values);
        console.log("Block: " + blocks);

        channel = await findConversation(urgent);
        publishMessage(channel, message, blocks);
    
        //console.log(subReqInfo);
    //PLANNED 
    } else if (diffObj['minutes'] > 540) {
        //Await for the conversation and the message to publish
        message = plannedPost(subReqInfo, false, qualified);

        channel = await findConversation(planned);
        let msgValues = await (await publishMessage(channel, message, blocks)).split(',');

        console.log("Posting Planned Req in " + channel + " " + msgValues[0]);

        ///480 minutes = 8 hours from post
        subReqInfo['deadline'] = deadlineSetter(480 + adjustForDS(getTransitions(DateTime.now().year)));
        subReqInfo['msgTs'] = msgValues[0];
        subReqInfo['channel'] = channel;

        //console.log(subReqInfo);
        //Use awaited return values to schedule a job to sort interested parties

        plannedScheduler(subReqInfo);
    //SEMIPLANNED  
    } else if (diffObj['minutes'] <= 540 && diffObj['minutes'] > 60) {
        //Await for the conversation and the message to publish
        console.log((diffObj['minutes']/2) -1);
        message = plannedPost(subReqInfo, false, qualified);

        channel = await findConversation(planned);
        let msgValues = await (await publishMessage(channel, message, blocks)).split(',');
        console.log("Post SemiPlanned in " + channel + " " + msgValues[0]);

        subReqInfo['deadline'] = deadlineSetter(semiInterval(subReqInfo));
        subReqInfo['msgTs'] = msgValues[0];
        subReqInfo['channel'] = channel;

        //console.log(subReqInfo);
        //Use awaited return values to schedule a job to sort interested parties
        semiPlannedScheduler(subReqInfo);          
    }
});

const plannedLogic = (info) => {
    info['deadline'] = deadlineSetter(480 + adjustForDS(getTransitions(DateTime.now().year)));
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
        text: plannedPost(info, true, info['faculty'] === 'qualified teacher or TA'? true:false),
        blocks: plannedMoveModal(plannedPost(info, true, info['faculty'] === 'qualified teacher or TA'? true:false))
    });

    console.log("Planned Post striked and moved");
    info['moved'] = "true";
    let message = urgentPost(info, info['faculty'] === 'qualified teacher or TA'? true:false);
    let values = urgentValues(info);
    let blocks = urgentModal(message, values, info['link']);
    console.log("Message: " + message);
    console.log("Value: " + values);
    console.log("Block: ");
    for (let i = 0; i < blocks.length; i++) {
        console.log(blocks[i]);
    }

    let channel = await findConversation(urgent);
    let msgValues = await (await publishMessage(channel, message, blocks)).split(',');
    console.log("URGENT POSTING in " + channel + " " + msgValues[0]);

    info['msgTs'] = msgValues[0];
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
            const verifiedMap = fetch(queryMaker(process.env.FACULTY_SHEET_URL, interestedArray, interestedColumns), info)
                .then(res => res.text())
                .then(rep => {
                    const data = JSON.parse(rep.substring(47).slice(0,-2));

                    console.log(data);
                    let interestedMap = mapMaker(data['table']['rows']);
                    console.log(interestedMap);
                    interestedMap.forEach(function(value, key) {
                        if (info['faculty'] === 'teacher') {
                            if (value[1] !== 'Teacher') interestedMap.delete(key);
                                //console.log(`${key} is not a teacher`);
                            console.log(interestedMap)
                        } else if (info['faculty'] === 'TA') {
                            if (value[1] !== 'TA') interestedMap.delete(key);
                                //console.log(`${key} is not a TA`);
                            console.log(interestedMap)
                        } else if (info['faculty'] === 'qualified teacher or TA') {
                            if (!value[2]) interestedMap.delete(key);
                                //console.log(`${key} is not OS qualified`);
                        } 

                        console.log(info['type']);
                        if (info['type'] === "Foundation") {
                            if (!value[3]) interestedMap.delete(key);
                                //console.log(`${key} is not Foundation qualified`);
                        }
                    })
                    return interestedMap
            }); 

            const jobLogic = async (info) => {
                const verified = await verifiedMap;
                console.log(verifiedMap);
                console.log("Verified is defined");        
                let message;
                let chosen = await randomSelector(verified);

                //Date of Resolution and Time of Resolution
                let dor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATE_SHORT);
                let tor = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.TIME_24_WITH_SECONDS);

                resolutionUpdate(auth, process.env.SUB_SHEET, info, verified, chosen, false, `${dor} ${tor}`);

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

            if (verifiedMap.size > 0) {
                jobLogic(info);
            } else if (isPreUrgent(info)) {
                semiPlannedLogic(info);
            } else {
                plannedLogic(info);
            }
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
            const verifiedMap = fetch(queryMaker(process.env.FACULTY_SHEET_URL, interestedArray, interestedColumns), info)
                .then(res => res.text())
                .then(rep => {
                    const data = JSON.parse(rep.substring(47).slice(0,-2));
                    let interestedMap = mapMaker(data['table']['rows']);
                    console.log(interestedMap);
                    interestedMap.forEach(function(value, key) {
                        if (key === info['userId'] || key === info['partner']) {
                            interestedMap.delete(key);
                        } else {
                            if (info['faculty'] === 'teacher') {
                                if (value[1] !== 'Teacher') interestedMap.delete(key);
                                    //console.log(`${key} is not a teacher`);
                                console.log(interestedMap)
                            } else if (info['faculty'] === 'TA') {
                                if (value[1] !== 'TA') interestedMap.delete(key);
                                    //console.log(`${key} is not a TA`);
                                console.log(interestedMap)
                            } else if (info['faculty'] === 'qualified teacher or TA') {
                                if (!value[2]) interestedMap.delete(key);
                                    //console.log(`${key} is not OS qualified`);
                            } 

                            console.log(info['type']);
                            if (info['type'] === "Foundation") {
                                if (!value[3]) interestedMap.delete(key);
                                    //console.log(`${key} is not Foundation qualified`);
                            }
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

                resolutionUpdate(auth, process.env.SUB_SHEET, info, verified, chosen, false, `${dor} ${tor}`);

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

            if (verifiedMap.size > 0) {
                jobLogic(info);
            } else if (isUrgent(info)) {
                urgentLogic(info);
            } else {
                semiPlannedLogic(info);
            }
        } else if (isUrgent(info)) {
            urgentLogic(info);
        } else {
            semiPlannedLogic(info);
        }
    })
}

/**
 * Fetches the array of Slack User Ids to verify and select a sub from
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
 * Finds the current lowest counter in the eligible subs interested and updates Active status
 * @param {*} verifiedMap Returned map of eligibles in Promise chain
 * @returns the current lowes amount of subs assigned
 */
function findLowSub(verifiedMap) {
    var i = 0;
    var currentLow = 0;

    verifiedMap.forEach((value, key) => activeUpdater(key, process.env.FACULTY_SHEET_URL, auth, process.env.FACULTY_SHEET))
    //Iterate through and if anything is lower than current low set that as current low
    verifiedMap.forEach(function (value, key) {
        if (i === 0) {
            currentLow = value[4];
            i++;
        }
        else {
            if (value < currentLow) {
                currentLow = value[4];
            }
        }
    });

    console.log("Current low is " + currentLow);
    return currentLow;
};

/**
 * Random selection function that uses findLowSub to select the sub
 * @param {*} verifiedMap Returned map of eligibles in Promise chain
 * @returns The randomly chosen interested party
 */
async function randomSelector(verifiedMap) {
    //initialize empty selections and temp current low
    let selections = [];

    //Call findLowSub to get the true current low
    let low = findLowSub(verifiedMap);
    verifiedMap.forEach(function (value, key) {
        if (value[4] === low) {
            selections.push(key);
        }
    });

    // Set random number based on length of selections and fetch
    let random = Math.floor(Math.random() * selections.length);
    var chosen = selections[random];

    //Update counter in selected Faculty map and Whole faculty map\
    counterUpdater(chosen, process.env.FACULTY_SHEET_URL, auth, process.env.FACULTY_SHEET, 1);

    console.log(chosen + " was picked.");
    return chosen;
};

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ LET'S FIND SUBSTITUTES!");
})();
