const os = require('os');
module.exports = {
    apps: [{
        port: 3000,
        name: "app",
        script: "index.cjs",
        watch: true,
        exec_mode: 'fork',
    }]
}