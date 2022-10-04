import fetch from 'node-fetch';

/**
 * Builds a query url using the spreadsheet URL, the interested users, and the desired columns from spreadsheet 
 * @param {*} spreadSheetUrl Spreadsheet URL - BE SURE TO MAKE SHEET VIEWABLE BY ANYONE WITH LINK
 * @param {*} userIds Array of Slack User IDs from the reactions to post
 * @param {*} column String of columns with desired info
 * @returns A query url string
 */
function queryMaker(spreadSheetUrl, userIds, column) {
    let query;
    if (userIds.length > 1) {
        query = spreadSheetUrl + encodeURIComponent(`select ${column} where `);
        for (let i = 0; i < userIds.length; i++) {
            if(userIds.length - 1 === i ) {
                query = query + encodeURIComponent(`A = '${userIds[i]}'`);
            } else {
                query = query + encodeURIComponent(`A = '${userIds[i]}'  or `);
            }
        }
        console.log(query);
        return query;
    } else {
        query = spreadSheetUrl + encodeURIComponent(`select ${column} where A = '${userIds[0]}'`);
        console.log(query)
        return query
    }
}

/**
 * Creates a Map using Slack User ID as key and array as value (email, faculty, os qualified, counter)
 * @param {*} rawArray The raw array that comes from the rows of queried users
 * @returns  The map of user IDs and user info attached to an ID 
 */
function mapMaker(rawArray) {
    let interestedMap = new Map();
    rawArray.forEach(userInfo => {
        let valueArray = []
        //Starts at 1 to skip Slack User ID
        for (let i=1; i < userInfo['c'].length; i++) {
            valueArray.push(userInfo['c'][i]['v']);
        }
        //Sets user ID as key and valueArray as value
        interestedMap.set(userInfo['c'][0]['v'], valueArray);
    })
    interestedMap.forEach(user => console.log(user));
    return interestedMap
}

/**
 * Uses a query to fetch the users and corresponding data. Then returns a map that   
 * @param {*} query A query url built in the app using interested users
 */
async function verifyInterested(query, info) {
    let unverifiedMap;
    let verifiedMap;
    fetch(query)
    .then(res => res.text())
    .then(rep =>{
        const data = JSON.parse(rep.substring(47).slice(0,-2));
        unverifiedMap = mapMaker(data['table']['rows']);
    })    

}

export {verifyInterested, queryMaker};