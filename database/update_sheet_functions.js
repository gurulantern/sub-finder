import { google } from 'googleapis';
import { queryMaker } from './read_sheet_functions.js';
import fetch from 'node-fetch';

/**
 * Counter updater that fetches the row of the User and updates that Column cell
 * @param {*} newValue New Counter Value for substitute
 * @param {*} user Slack User ID
 */
 async function counterUpdater(user, facultySheetUrl, auth, spreadsheetId) {
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

    const counter = fetch(queryMaker(facultySheetUrl, [user], 'F'))
        .then(res => res.text())
        .then(rep => {
            const data = JSON.parse(rep.substring(47).slice(0,-2));
            console.log(data)
            console.log(data['table']['rows'][0]['c'][0]['v']);
            return data['table']['rows'][0]['c'][0]['v'];
        })

    const sheetUpdate = async (auth, spreadsheetId) => {
        const client = await auth.getClient();
        const googleSheets = google.sheets({version: "v4", auth: client});

        const row = await rowNumber;

        await googleSheets.spreadsheets.values.update({
            auth,
            spreadsheetId,
            range: `Sheet1!F${row}`,
            valueInputOption:  "USER_ENTERED",
            resource: {
                values: [
                    [ await counter + 1 ]
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

    console.log("Posted to" + (rows.data.values.length + 1).toString());
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


export {requestUpdate, resolutionUpdate, counterUpdater};