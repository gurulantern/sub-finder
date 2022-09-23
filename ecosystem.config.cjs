const os = require('os');
module.exports = {
    apps: [{
        port: 3000,
        name: "app",
        script: "lib/src/app.js",
        watch: true,
        exec_mode: 'fork',
    }]
}