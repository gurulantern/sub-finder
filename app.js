const { App, LogLevel } = require('@slack/bolt');
const { DateTime } = require('luxon');
const { scheduleJob } = require('node-schedule');
require("dotenv").config();

var TeacherCollection = new Map();
var TACollection = new Map();
var TeacherTACollection = new Map();

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
function postMaker(userId, session, date, time, faculty, game){
    return `<@${userId}> is looking for ${faculty} to sub for ${session} playing ${game} on ${date} at ${time} PDT.`;
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
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    //var view = viewMaker(today);

    today = yyyy + '-' + mm + '-' + dd;
    
    try {
        //Call open method for view with client
        const result = await client.views.open({
            trigger_id: body.trigger_id,
            //View payload of the request modal
            view: { 
                "type": "modal",
                "callback_id": "request_view",
                "title": {
                    "type": "plain_text",
                    "text": "Substitute Request"
                },
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Hello, let's help you find a substitute."
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "plain_text",
                            "text": "*The time window for finding substitutes is 24 hours so please be sure to post at least 24 hours before the session.",
                            "emoji": false
                        }
                    },
                    {
                        "type": "input",
                        "dispatch_action": false,
                        "block_id": "session",
                        "element": {
                            "type": "static_select",
                            "action_id": "session_input",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Select session type",
                                "emoji": false
                            },
                            "options": [
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Open Session",
                                        "emoji": false
                                    },
                                    "value": "an Open Session"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Cohort",
                                        "emoji": false
                                    },
                                    "value": "a Cohort"
                                }
                            ]
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "Is this a Cohort or an Open Session?"
                        }
                    },
                    {
                        "type": "input",
                        "dispatch_action": false,
                        "block_id": "game",
                        "element": {
                            "type": "static_select",
                            "action_id": "game_input",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Select a game",
                                "emoji": true
                            },
                            "options": [
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Constellation",
                                        "emoji": false
                                    },
                                    "value": "Constellation"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Constellation 3D",
                                        "emoji": false
                                    },
                                    "value": "Constellation 3D"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Proxima",
                                        "emoji": false
                                    },
                                    "value": "Proxima"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Fire",
                                        "emoji": false
                                    },
                                    "value": "Fire"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Fish",
                                        "emoji": false
                                    },
                                    "value": "Fish"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Art 4 All",
                                        "emoji": false
                                    },
                                    "value": "Art 4 All"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Hollywood",
                                        "emoji": false
                                    },
                                    "value": "Hollywood"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Geobridge",
                                        "emoji": false
                                    },
                                    "value": "Geobridge"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Conundrums",
                                        "emoji": false
                                    },
                                    "value": "Conundrums"
                                }
                            ]
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "What game is being played?"
                        }
                    },
                    {
                        "type": "input",
                        "dispatch_action": false,
                        "block_id": "date",
                        "element": {
                            "type": "datepicker",
                            "action_id": "date_input",
                            "initial_date": today,
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Select a date",
                                "emoji": false
                            },
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "Date of session:"
                        }
                    },
                    {
                        "type": "input",
                        "dispatch_action": false,
                        "block_id": "time",
                        "element": {
                            "type": "timepicker",
                            "action_id": "time_input",
                            "initial_time": "12:00",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Select time",
                                "emoji": false
                            },
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "Time of session (Your timezone):"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "input",
                        "dispatch_action": false,
                        "block_id": "faculty",
                        "label": {
                            "type": "plain_text",
                            "text": "Are you in need of a Teacher or a TA?"
                        },
                        "element": {
                            "type": "radio_buttons",
                            "action_id": "faculty_input",
                            "options": [
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Teacher",
                                        "emoji": false
                                    },
                                    "value": "a Teacher"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "TA",
                                        "emoji": false
                                    },
                                    "value": "a TA"
                                },
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Either Teacher or TA",
                                        "emoji": false
                                    },
                                    "value": "either a Teacher or a TA"
                                }
                            ]
                        }
                    }    
                ],
                "submit": {
                    "type": "plain_text",
                    "text": "Submit"
                }
            }
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

    logger.info(view['session']);
    logger.info(view['game']);
    //Fetch relevant data and store in variables
    userId = body['user']['id'];
    session = view['state']['values']['session']['session_input']['selected_option']['value'];
    game = view['state']['values']['game']['game_input']['selected_option']['value'];
    date = view['state']['values']['date']['date_input']['selected_date'];
    time = view['state']['values']['time']['time_input']['selected_time'];
    
    userDt = DateTime.fromFormat(date, "yyyy-mm-dd");
    pdt = userDt.setZone("America/Los_Angeles");
    console.log("User: " + userDt.toLocaleString(DateTime.DATETIME_FULL) + " PDT: " + pdt.toLocaleString(DateTime.DATETIME_FULL));
    //Use luxon to format the time
    //msgDate = 
    //msgDate = moment(date, 'YYYY-MM-DD').format('dddd, MMMM Do');
    //msgTime = moment(time, 'HH:mm').format('hh:mm a');
    //console.log(msgTime + " " + msgDate);
    faculty = view['state']['values']['faculty']['faculty_input']['selected_option']['value'];

    //Create a JavaScript Date object for time
    //deadline = new Date(moment(date + time, 'YYYY-MM-DDHH:mm').add(1, 'm').toDate());
    console.log(deadline);
    message = postMaker(userId, session, msgDate, msgTime, faculty, game);
    
    //Await for the conversation and the message to publish
    let channel = await findConversation("planned-absences");
    let msgTs = await publishMessage(channel, message);
    console.log("Out of publish and b4 schedule " + channel + " " + msgTs);

    //Use awaited return values to schedule a job to sort interested parties
    scheduler(deadline, channel, msgTs, userId, session);  
});

/**
 * 
 * @param {*} deadline The JavaScript Date object made in the submission
 * @param {*} channel The channel id from the submission
 * @param {*} msgTs The message to found and searched for reactions
 * @param {*} userId The user who posted the original request
 * @param {*} session The name of the session that will be subbed
 */
async function scheduler(deadline, channel, msgTs, userId, session) {
    scheduleJob(deadline, async () => {
        let chosen;
        console.log("Job is firing");
        console.log("In schedule "+ channel + " " + msgTs);
        let interestArr = await fetchInterested(channel, msgTs);
        console.log(interestArr);

        if (faculty === "a Teacher") {
            console.log(interestArr);
            chosen = await selectSub(interestArr, TeacherCollection);
        } else if (faculty === "a TA") {
            console.log(interestArr);
            chosen = await selectSub(interestArr, TACollection);
        } else if (faculty === "either a Teacher or a TA") {
            console.log(interestArr);
            chosen = await selectSub(interestArr, TeacherTACollection);
        }

        publishMessage(chosen, `<@${chosen}> you have been selected to substitute for <@${userId}>'s ${session}!`);
    })
}; 

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

      // Print message text
      console.log(message['text']);
      console.log(message);
      console.log(message['reactions']);
      reactArr = message['reactions'];
      for (let i = 0; i < reactArr.length; i++) {
          if (reactArr[i]['name'] === 'raised_hands') {
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

// Listens to incoming messages that contain "any characters"
app.message('hello', async ({ message, say }) => {
    // say() sends a message to the channel that they cannot post here but can request using "/substitute"
    await say(`Hey there <@${message.user}>!`);
  });

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();