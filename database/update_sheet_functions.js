import { google } from 'googleapis';
import { queryMaker } from './read_sheet_functions.js';
import fetch from 'node-fetch';

/**
 * Updater function for subs that are actively looking for opportunities
 * @param {*} user Slack ID of user
 * @param {*} facultySheetUrl Googlesheet URL
 * @param {*} auth auth info in app
 * @param {*} spreadsheetId sheet ID of needed Google Sheet
 */
async function activeUpdater(user, facultySheetUrl, auth, spreadsheetId) {
    //Grabs the row number where the User id matches the row.
    const rowNumber = fetch(facultySheetUrl)
    .then(res => res.text())
    .then(rep => {
        const data = JSON.parse(rep.substring(47).slice(0,-2));
        const rows = data['table']['rows'];
        for(let i = 0; i < rows.length; i++) {
            if (rows[i]['c'][0]['v'] === user) {
                //Add 2 to result to offset the 0 indexing of arrays and the header row
                return i + 2;
            }
        }
    })

    //Grabs column H using sheetUrl and the user
    const active = fetch(queryMaker(facultySheetUrl, [user], 'H'))
        .then(res => res.text())
        .then(rep => {
            const data = JSON.parse(rep.substring(47).slice(0,-2));
            console.log(data)
            console.log(data['table']['rows'][0]['c'][0]['v']);
            return data['table']['rows'][0]['c'][0]['v'];
        })

    //Updates the sheet cell using column H and the row number    
    const sheetUpdate = async (auth, spreadsheetId) => {
        const client = await auth.getClient();
        const googleSheets = google.sheets({version: "v4", auth: client});

        const row = await rowNumber;
        try {
            if (await active !== 'TRUE') {
                await googleSheets.spreadsheets.values.update({
                    auth,
                    spreadsheetId,
                    range: `Sheet1!H${row}`,
                    valueInputOption:  "USER_ENTERED",
                    resource: {
                        values: [
                            [ 'TRUE' ]
                        ]
                    }
                })
            } else {
                console.log("User is already Active");
            }
        }
        catch(e) {
            console.error(e);
        }
    } 

    //Updates the sheet
    sheetUpdate(auth, spreadsheetId);
}

/**
 * Counter updater that fetches the row of the User and updates that Column cell
 * @param {*} newValue New Counter Value for substitute
 * @param {*} user Slack User ID
 */
 async function counterUpdater(user, facultySheetUrl, auth, spreadsheetId, updateInt) {
    //Grabs the row number where the User id matches the row.
    const rowNumber = fetch(facultySheetUrl)
    .then(res => res.text())
    .then(rep => {
        const data = JSON.parse(rep.substring(47).slice(0,-2));
        const rows = data['table']['rows'];
        for(let i = 0; i < rows.length; i++) {
            if (rows[i]['c'][0]['v'] === user) {
                //Add 2 to result to offset the 0 indexing of arrays and the header row
                return i + 2;
            }
        }
    })

    //Grabs column G using sheetUrl and the user
    const counter = fetch(queryMaker(facultySheetUrl, [user], 'G'))
        .then(res => res.text())
        .then(rep => {
            const data = JSON.parse(rep.substring(47).slice(0,-2));
            console.log(data)
            console.log(data['table']['rows'][0]['c'][0]['v']);
            if (data['table']['rows'][0]['c'][0]['v'] < 0) {
                return 0;
            }
            return data['table']['rows'][0]['c'][0]['v'];
        })

    const sheetUpdate = async (auth, spreadsheetId) => {
        const client = await auth.getClient();
        const googleSheets = google.sheets({version: "v4", auth: client});

        const row = await rowNumber;

        await googleSheets.spreadsheets.values.update({
            auth,
            spreadsheetId,
            range: `Sheet1!G${row}`,
            valueInputOption:  "USER_ENTERED",
            resource: {
                values: [
                    [ await counter + updateInt ]
                ]
            }
        })
    } 

    sheetUpdate(auth, spreadsheetId);
}

/**
 * Updates subfinder spreadsheet with new request info
 * @param {*} auth Google auth info from credentials.json/scopes
 * @param {*} spreadsheetId ID string from spreadsheet URL
 * @param {*} info request info object
 * @returns Row number for later updating
 */
async function requestUpdate(auth, spreadsheetId, info) { 
    const client = await auth.getClient();

    const googleSheets = google.sheets({version: "v4", auth: client});
    
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `Sheet1!A1:J1`,
        valueInputOption:  "USER_ENTERED",
        resource: {
            values: [
                [
                    info['reqTime'], 
                    info['requestor'], 
                    info['type'], 
                    info['num'],
                    info['name'], 
                    info['link'],
                    info['game'], 
                    info['date'], 
                    info['time'], 
                    info['faculty']
                ]
            ]
        }
    })

    const rows = await googleSheets.spreadsheets.values.get({
        auth, 
        spreadsheetId,
        range: "Sheet1"
    });

    console.log("Posted to row " + (rows.data.values.length).toString());
    return (rows.data.values.length).toString();
}

async function resolutionUpdate(auth, spreadsheetId, info, verifiedMap, sub, isUrgent, tor) {
    console.log("Updating sheets with resolutions");
    const client = await auth.getClient();
    const googleSheets = google.sheets({version: "v4", auth: client});

    let plannedResolver;
    let urgentResolver;
    let plannedToR;
    let urgentToR;
    let count;
    let interestedAndEligible = '';
    
    if (verifiedMap.size >= 1 && !isUrgent) {
        count = verifiedMap.size;
        verifiedMap.forEach(function(value, key) {
            interestedAndEligible = interestedAndEligible + value[0] + '; ';
        })
        plannedResolver = verifiedMap.get(sub)[0];
        plannedToR = tor;
        urgentResolver = 'n/a';
        urgentToR = 'n/a';
    } else {
        urgentResolver = sub;
        urgentToR = tor;
        interestedAndEligible = 'n/a';
        count = 0;
        plannedResolver = 'n/a';
        plannedToR = 'n/a';
    }

    await googleSheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `Sheet1!K${info['row']}:Q${info['row']}`,
        valueInputOption:  "USER_ENTERED",
        resource: {
            values: [
                [
                    interestedAndEligible,
                    count,           
                    plannedResolver,
                    plannedToR,
                    info['moved'],
                    urgentResolver,
                    urgentToR     
                ]
            ]
        }
    })
}

/**
 * Function to reset the counters for all faculty on the faculty sheet. Currently checks column G for Counters and column H for Active status.
 * @param {*} auth Google auth info in the App
 * @param {*} spreadsheetId SpreadsheetID of the sheet with faculty info
 */
async function resetCounters(auth, spreadsheetId) {
    const client = await auth.getClient();
    const googleSheets = google.sheets({version: "v4", auth: client});

    let updatedCounters = [];
    let updatedActives = [];

    let rawCounters = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: `Sheet1!G2:G`
    })

    let rawActives = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: `Sheet1!H2:H`
    })

    console.log(rawCounters['data']['values']);
    console.log(rawActives['data']['values']);

    let counters = rawCounters['data']['values'];
    let actives = rawActives['data']['values'];

    for (let i = 0; i < counters.length; i++ ) {
        let currentCounter = parseInt(counters[i][0])
        console.log("Current Counter: " + currentCounter);
        if (currentCounter <= 0) {
            if (actives[i][0] == 'TRUE') {
                currentCounter --;
            } else {
                currentCounter = 0;
            }
        } else {
            currentCounter = 0;
        }
        updatedCounters.push([currentCounter]);
        updatedActives.push(['FALSE']);
    }

    console.log(updatedActives);
    console.log(updatedCounters);

    await googleSheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `Sheet1!G2:G`,
        valueInputOption:  "USER_ENTERED",
        resource: {
            values: updatedCounters 
        }
    })

    await googleSheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `Sheet1!H2:H`,
        valueInputOption:  "USER_ENTERED",
        resource: {
            values: updatedActives
        }
    })
}


export {requestUpdate, resolutionUpdate, counterUpdater, activeUpdater, resetCounters};