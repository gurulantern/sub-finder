import { google } from 'googleapis';

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
    console.log("Updating sheet with eligibles");
    const client = await auth.getClient();
    let plannedResolver;
    let urgentResolver;
    let plannedToR;
    let urgentToR;
    let count;
    let interestedAndEligible = '';

    const googleSheets = google.sheets({version: "v4", auth: client});
    
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
        urgentResolver = sub
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
    console.log("Finished updating eligibles");
}


export {requestUpdate, resolutionUpdate};