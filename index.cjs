import('./app.js')
.then(async ({app}) => {
    await app.start(process.env.PORT || 3000);

    console.log("⚡️ LET'S FIND SUBSTITUTES!");
})