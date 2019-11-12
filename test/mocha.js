var nconf = require('nconf');

nconf.overrides({
    "SERVICE_CONFIGS": "master:www:/apis/v/configs",
    "SERVICE_CLIENTS": "master:accounts:/apis/v/clients",
    "SERVICE_USERS": "master:accounts:/apis/v/users",
    "SERVICE_TOKENS": "master:accounts:/apis/v/tokens",
    "LOCAL_BINARIES": __dirname + "/..:www:/apis/v/binaries"
});

require('pot');
