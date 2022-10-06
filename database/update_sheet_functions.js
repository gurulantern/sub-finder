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
    return (rows.data.values.length + 1).toString();
}

async function interestedAndEligibleUpdate(auth, spreadsheetId, info, verifiedMap) {
    const client = await auth.getClient();

    const googleSheets = google.sheets({version: "v4", auth: client});
    
    let interestedAndEligible = '';
    let count = verifiedMap.size;

    verifiedMap.forEach(function(value, key) {
        interestedAndEligible = interestedAndEligible + value[0] + '; ';
    })

    await googleSheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `Sheet1!K${info['row']}:Q${info['row']}`,
        valueInputOption:  "USER_ENTERED",
        resource: {
            values: [
                [
                    interestedAndEligible,
                    count                
                ]
            ]
        }
    })
}

/**
 * Update function to update sub-finder spreadsheet when  request is resolved
 * @param {*} auth Google auth info from credentials.json and scope
 * @param {*} spreadsheetId ID string from spreadsheet URL
 * @param {*} info Request info object
 */
async function resolutionUpdate(auth, spreadsheetId, info) { 
    const client = await auth.getClient();

    const googleSheets = google.sheets({version: "v4", auth: client});
    
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `Sheet1!K1:Q1`,
        valueInputOption:  "USER_ENTERED",
        resource: {
            values: [
                [
                    info['interested'], 
                    info['count'], 
                    info['resolver'], 
                    info['resTime'],
                    info['repost'], 
                    info['urgeResolver'],
                    info['urgeTime']
                ]
            ]
        }
    })
}

export {requestUpdate, interestedAndEligibleUpdate, resolutionUpdate};