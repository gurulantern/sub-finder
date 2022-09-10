const { App, LogLevel } = require('@slack/bolt');
const { DateTime } = require('luxon');
const { scheduleJob } = require('node-schedule');
const { MongoClient } = require('mongodb');
const { request_view } = require('./listeners/views/request_view');
require("dotenv").config();

var TeacherCollection = new Map();
var TACollection = new Map();
var TeacherTACollection = new Map();
const planned = "planned-absences";
const urgent = "urgent-issues";
const any = new RegExp('/[\s\S]+/g');

async function listDatabases(client) {
    databasesList = await client.db().admin().listDatabases();

    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name})`));
}

async function dbSetter() {
    const uri = `mongodb+srv://sub-finder:${process.env.MONGO_USER_PW}@cluster0.ejudd.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri);

    try {
        await client.connect();

        await listDatabases(client);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function dbGetter() {
    const uri = `mongodb+srv://sub-finder:${process.env.MONGO_USER_PW}@cluster0.ejudd.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri);

    try {
        await client.connect();

        await listDatabases(client);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

dbGetter().catch(console.error);

// Initializes your app with your bot token, app token, setting it to socket mode for local dev and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    logLevel: LogLevel.DEBUG
  });

/**
 * 
 * @param {*} userId Ref to Slack User Id
 * @param {*} session Ref to session name
 * @param {*} date Ref to date of session(PDT)
 * @param {*} time Ref to time of session(PDT)
 * @param {*} faculty Ref to the faculty needed
 * @returns The message that will be posted to the channel for requests
 */
function plannedPost(info){
    return `<@${info['userId']}> is looking for *${info['faculty']}* to sub for *${info['session']}* playing *${info['game']}* on *${info['date']}* at *${info['time']} PDT*.`;
}

function urgentPost(info){
    return `<@${info['userId']}> needs *${info['faculty']}* to sub for *${info['session']}* playing *${info['game']}* at *${info['time']} PDT*.`;

}

function confirmation(chosenId, info){
    return `<@${chosenId}>! You have been selected to sub *${info['session']}* playing *${info['game']}* on *${info['date']} at ${info['time']} PDT* for <@${info['userId']}>. \n\nFeel free to dm <@${info['userId']}> for more details. If you can no longer make this session, please submit a new sub-finder request so others may have a chance to sub. \n\n\n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

function notification(chosenId, info){
    return `Good news <@${info['userId']}>! Your substitution request for ${info['session']} playing ${info['game']} on ${info['date']} at ${'time'} PDT has been accepted by <@${chosenId}>. \n\nFeel free to dm them to confirm and share any important details. You are all set and should <@${chosenId}> not be able to sub any longer, it is their responsibility to submit a new sub-request. \n\n\n\n\n\n:sandwich: Thanks for using sub-finder! :sandwich:`;
}

Date.prototype.today = function () { 
    return this.getFullYear() + "-" + (this.getMonth()+1) + "-" + ((this.getDate() < 10)?"0":"") + this.getDate();
}

// For the time now
Date.prototype.timeNow = function () {
     return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}

/**
 * 
 * @param {*} name The name of the channel that sub-finder posts to
 * @returns The channel's id string
 */
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
/**
 * 
 * @param {*} id The message's id
 * @param {*} text The text of the message sent
 * @returns The result of the message posted
 */
async function publishMessage(id, text) {
    try {
        const result = await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: id,
            text: text
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

    //Create the current date to be used as a ref for requesting the sub date
    var today = new Date().today();
    
    try {
        //Call open method for view with client
        const result = await client.views.open({
            trigger_id: body.trigger_id,
            //View payload of the request modal
            view: request_view(today)
        });
        logger.info(result);
    }
    catch (error) {
        logger.error(error);
    }
});


//Listener for submission of request
app.view("request_view", async ({ ack, body, view, client, logger }) => {
    //Acknowledge submission request
    await ack();
    let userTZ = "America/Los_Angeles";
    let channel = "";
    let msgTs = "";
    var currDateTime = new Date().today() + "T" + new Date().timeNow();
    logger.info("Current date and time: " + currDateTime);

    //Fetch relevant data and store in variables
    let subReqInfo = {
        userId: body['user']['id'],
        session: view['state']['values']['session']['session_input']['selected_option']['value'],
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
        message = urgentPost(subReqInfo)

        channel = await findConversation(urgent);
        let msgTs = await publishMessage(channel, message);
        logger.info("URGENT POSTING in " + channel + " " + msgTs);
    
        subReqInfo['msgTs'] = msgTs;
        subReqInfo['channel'] = channel;
    
        console.log(subReqInfo);
    } else if (diffObj['minutes'] > 10) {
        //Await for the conversation and the message to publish
        deadline = DateTime.now().plus({ minutes: 2 }).toJSDate();
        message = plannedPost(subReqInfo);

        channel = await findConversation(planned);
        let msgTs = await publishMessage(channel, message);
        console.log("Out of publish and b4 schedule " + channel + " " + msgTs);

        subReqInfo['deadline'] = deadline;
        subReqInfo['msgTs'] = msgTs;
        subReqInfo['channel'] = channel;

        console.log(subReqInfo);
        //Use awaited return values to schedule a job to sort interested parties

        plannedScheduler(subReqInfo);  
    } else if (diffObj['minutes'] <= 10 && diffObj['minutes'] > 1.5) {
        //Await for the conversation and the message to publish
        deadline = DateTime.now().plus({ minutes: 2 }).toJSDate();
        message = plannedPost(subReqInfo);

        channel = await findConversation(planned);
        let msgTs = await publishMessage(channel, message);
        console.log("Out of publish and b4 schedule " + channel + " " + msgTs);

        subReqInfo['deadline'] = deadline;
        subReqInfo['msgTs'] = msgTs;
        subReqInfo['channel'] = channel;

        console.log(subReqInfo);
        //Use awaited return values to schedule a job to sort interested parties

        semiPlannedscheduler(subReqInfo);          
    }
});

/**
 * 
 * @param {*} deadline The JavaScript Date object made in the submission
 * @param {*} channel The channel id from the submission
 * @param {*} msgTs The message to found and searched for reactions
 * @param {*} userId The user who posted the original request
 * @param {*} session The name of the session that will be subbed
 */
async function plannedScheduler(info) {
    scheduleJob(info['deadline'], async () => {
        let chosen;
        console.log("Job is firing");
        console.log("In schedule "+ info['channel'] + " " + info['msgTs']);
        let interestArr = await fetchInterested(info['channel'], info['msgTs']);
        console.log(interestArr);

        if (info['faculty'] === "a Teacher") {
            console.log(interestArr);
            chosen = await selectSub(interestArr, TeacherCollection);
        } else if (info['faculty'] === "a TA") {
            console.log(interestArr);
            chosen = await selectSub(interestArr, TACollection);
        } else if (info['faculty'] === "either a Teacher or a TA") {
            console.log(interestArr);
            chosen = await selectSub(interestArr, TeacherTACollection);
        }

        publishMessage(chosen, confirmation(chosen, info));
    })
}; 

async function semiPlannedScheduler(info) {


}

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
    publishMessage(chosen, confirmation(chosen, info));
}

// Listens to incoming messages that contain "any characters"
app.message(/[\s\S]*/g, async ({ message, say }) => {
    // say() sends a message to the channel that they cannot post here but can request using "/substitute"
    await say(`Hey there <@${message.user}>! You can submit a sub request using the slash command: '/substitute' in any Message Box.`);
});
/*
app.event('eyes', async ({ reactions, urgentSelect }) => {
    let urgentChosen = await reactions.user;
    let channel = await findConversation(urgent);
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
        if (reactions.item.channel == await findConversation(urgent)) {
            urgentSelect(chosen);
        }
    } catch (e) {
        console.error(e);
    }
})
*/
(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
