async function listDatabases(client) {
    databasesList = await client.db().admin().listDatabases();

    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name})`));
}

async function valueReader(key) {
    value = await allFaculty.find()
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

async function dbGetter(userId, info, collection, choices) {
    try {
        await client.connect();
        let query = {};
        const database = client.db("faculty");
        const faculty = database.collection(collection);

        if (info['session'] === "an Open Session") {
            query = { user: { $eq: userId }, osQualified: true };
            console.log("Searching for OS qualified Teacher or TA using: ");
            console.dir(query);
        } else {
            query = { user: { $eq: userId }, faculty: { $eq: info['faculty'] === "a Teacher"? "Teacher": "TA" } };
            console.log("Searching for a Teacher or TA to sub a Cohort using: ");
            console.dir(query)
        }

        const projection = { user: 1, counter: 1 }
        const cursor = faculty.find(query).project(projection);

        if ((await cursor.count()) === 0) {
            console.log(`${userId} does not qualify for this sub.`);
        } else {
            await cursor.forEach(doc => interested = doc);
            console.log(interested);
            choices.set(interested['user'], interested['counter']);
            console.log(choices);
        }
    } catch (e) {
        console.error(e);
    }
}

async function readFaculty() {
    const uri = `mongodb+srv://sub-finder:${process.env.MONGO_USER_PW}@cluster0.ejudd.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        
         
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
} 