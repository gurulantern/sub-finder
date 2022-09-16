const { App, LogLevel } = require('@slack/bolt');
const { DateTime } = require('luxon');
const { scheduleJob }  = require('node-schedule');
const { MongoClient, CURSOR_FLAGS } = require('mongodb');
const { firstView } = require('./views/first_view');
const { cohortView } = require('./views/cohort_view');
const { osView } = require('./views/os_view');
const { plannedPost, urgentPost, urgentConfirmation, urgentNotification, urgentValues, confirmation, notification } = require('./views/posts');
const { plannedModal, dateBlocks, messageModal, urgentModal, resolvedModal } = require('./views/post_modals');
require("dotenv").config();

var TeacherCollection = new Map();
var TACollection = new Map();
var TeacherTACollection = new Map();
const planned = "planned-absences";
const urgent = "urgent-issues";


/*
//MongoDB variables
const uri = `mongodb+srv://sub-finder:${process.env.MONGO_USER_PW}@cluster0.ejudd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000
});
*/

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
    try {
        const result = await app.client.conversations.list({
            token: process.env.SLACK_BOT_TOKEN
        });

        for (const channel of result.channels) {
            if (channel.name === name) {
                console.log("Found conversation ID " + channel.id);
                channelId = channel.id;
                console.log(channelId);
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
        messageTs = result['message']['ts'];
        return await result['message']['ts'];
    }
    catch (error) {
        console.log(error);
    }
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

    console.log(body);
    message = body['message']['text'];
    chosen = body['user']['id'];

    let infoArr = body['actions'][0]['value'].split(",");
    let subReqInfo = {
        userId: infoArr[0],
        session: infoArr[1],
        game: infoArr[2],
        time: infoArr[3],
        link: infoArr[4],
        faculty: infoArr[5]
    }    
    console.log(body['actions'][0]['value']);
    console.log(infoArr);
    console.log(subReqInfo);

    //if (chosen === subReqInfo['userId']) {
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
    console.log(subReqInfo);

    //Fetch user's TZ
    try {
        const result = await client.users.info({
            user: subReqInfo['userId']
        })

        console.log(result);
        userTZ = result['user']['tz'];
        console.log("User TZ : "+ userTZ);
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
    pst = dateTime.setZone("America/Los_Angeles");
    logger.info("User's TZ: " + dateTime.toLocaleString(DateTime.DATETIME_FULL));
    logger.info("PDT: " + pst.toLocaleString(DateTime.DATETIME_FULL))
    let msgDate = pst.toLocaleString(DateTime.DATE_HUGE);
    let msgTime = pst.toLocaleString(DateTime.TIME_SIMPLE);
    
    subReqInfo['date'] = msgDate;
    subReqInfo['time'] = msgTime;

    let now = DateTime.now().setZone("America/Los_Angeles").toLocaleString(DateTime.DATETIME_FULL);
    console.log("Now:" + now);
    let diffObj = pst.diffNow( 'minutes').toObject(); 
    console.log(diffObj);
    
    //Check how close the request is made to the time of session
    if (diffObj['minutes'] <= 1.5 && diffObj['minutes'] >= -60) {
        message = urgentPost(subReqInfo);
        values = urgentValues(subReqInfo);
        blocks = urgentModal(message, values, subReqInfo['link']);
        console.log("Message: " + message);
        console.log("Value: " + values);
        console.log("Block: " + blocks);

        channel = await findConversation(urgent);
        let msgTs = await publishMessage(channel, message, blocks);
        logger.info("URGENT POSTING in " + channel + " " + msgTs);
    
        subReqInfo['msgTs'] = msgTs;
        subReqInfo['channel'] = channel;
    
        console.log(subReqInfo);
    } else if (diffObj['minutes'] > 10) {
        //Await for the conversation and the message to publish
        deadline = DateTime.now().plus({ minutes: 2 }).toJSDate();
        message = plannedPost(subReqInfo);

        channel = await findConversation(planned);
        let msgTs = await publishMessage(channel, message, blocks);
        console.log("Out of publish and b4 schedule " + channel + " " + msgTs);

        subReqInfo['deadline'] = deadline;
        subReqInfo['msgTs'] = msgTs;
        subReqInfo['channel'] = channel;

        console.log(subReqInfo);
        //Use awaited return values to schedule a job to sort interested parties

        plannedScheduler(subReqInfo);  
    } else if (diffObj['minutes'] <= 10 && diffObj['minutes'] > 1.5) {
        //Await for the conversation and the message to publish
        deadline = DateTime.now().plus({ minutes: 1 }).toJSDate();
        message = plannedPost(subReqInfo);

        channel = await findConversation(planned);
        let msgTs = await publishMessage(channel, message, blocks);
        console.log("Out of publish and b4 schedule " + channel + " " + msgTs);

        subReqInfo['deadline'] = deadline;
        subReqInfo['msgTs'] = msgTs;
        subReqInfo['channel'] = channel;

        console.log(subReqInfo);
        //Use awaited return values to schedule a job to sort interested parties

        semiPlannedscheduler(subReqInfo);          
    }
});

async function urgentScheduler(info) {
    
    
    scheduleJob()
}

async function plannedScheduler(info) {

    scheduleJob(info['msgTs'], info['deadline'], async () => {
        let chosen;
        console.log("Planned Job is firing");
        let interestArr = await fetchInterested(info['channel'], info['msgTs']);
        console.log(interestArr);

        if (typeof interestArr !== "undefined") {
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

            

            publishMessage(chosen, confirmation(chosen, info));
        } else {
            deadline = DateTime.now().plus({ minutes: 1 }).toJSDate();
            info['deadline'] = deadline;
            plannedScheduler(info);
        }
    })
}; 

async function semiPlannedScheduler(info) {


}
/*
async function deleteMsg(msg) {
    try {
        // Call the conversations.history method using the built-in WebClient
        const result = await app.client.conversations.history({
          token: process.env.SLACK_BOT_TOKEN,
          channel: id,
          latest: msg1,
          inclusive: true,
          limit: 1
        });
    
        // There should only be one result (stored in the zeroth index)
        message = result.messages[0];
  
        console.log(message);
        console.log(message['reactions']);
        reactArr = message['reactions'];
        for (let i = 0; i < reactArr.length; i++) {
            if (reactArr[i]['name'] === 'eyes') {
                console.log(reactArr[i]['users']);
                users = reactArr[i]['users'];
                return await users;
            }
        }
    }
    catch (error) {
        console.error(error);
    }
    console.log(msg + " deleted.");
}
async function deleteScheduler(msg1, msg2) {

    scheduleJob( , async () => {
        await deleteMsg(msg1);
        await deleteMsg(msg2);    
    })
}
*/
/**
 * 
 * @param {*} id The channel id to search for the required message
 * @param {*} msgTs The required message id/timestamp 
 * @returns An array of users that reacted to the post
 */
async function fetchInterested(id, msgTs) {
    console.log("Message: " + msgTs + " & Channel: " + id);
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
        message = result.messages[0];

        console.log(message);
        console.log(message['reactions']);
        reactArr = message['reactions'];
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
function findLowSub(faculty, currentLow) {
    var i = 0;

    //Iterate through and if anything is lower than current low set that as current low
    faculty.forEach(function (value, key) {
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
function facultyGetter(choices, faculty) {
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

    //Update counter in selected Faculty map and Whole faculty map
    console.log(chosen + " " + num);
    faculty.set(chosen, num + 1);
    TeacherTACollection.set(chosen, num + 1);
    console.log(chosen + " " + faculty.get(chosen));
    console.log(chosen + " " + TeacherTACollection.get(chosen));

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
async function selectSub(interested, faculty) {
    let choices = new Map();
    for (let i = 0; i < interested.length; i ++) {
        if (!faculty.has(interested[i])) {
            faculty.set(interested[i], 0);
            choices.set(interested[i], 0);
            TeacherTACollection.set(interested[i], 0);
        } else {
            choices.set(interested[i], faculty[interested[i]]);
        }
    }
    console.log("Faculty: " + faculty);
    console.log("Choices: " + choices);
    console.log("TeacherTACollection: " + TeacherTACollection);

    return await facultyGetter(choices, faculty);
}

function urgentSelect(user) {
    publishMessage(findConversation(urgent), urgentConfirmation(chosen, info));
}

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
