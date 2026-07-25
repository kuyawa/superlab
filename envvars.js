const nodeOS   = require('node:os');
const nodeFS   = require('node:fs');
const nodeUtil = require('node:util');

if(nodeOS.hostname()=='Macmini.local'){
    //process.loadEnvFile()
    const rawEnvText = nodeFS.readFileSync('.env', 'utf8')
    const parsedVars = nodeUtil.parseEnv(rawEnvText)
    for (const key in parsedVars) {
        process.env[key] = parsedVars[key]
    }
    console.log('Env vars loaded')
}
