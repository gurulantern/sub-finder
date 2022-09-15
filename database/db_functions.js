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