import { google } from 'googleapis';


async function updateSheet(auth, spreadsheetId, info) { 
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

export {updateSheet};