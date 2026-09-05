// Privacy guard for this one secret-entry process. Does not modify Firebase CLI files.
const path=require('node:path');
const cli=process.env.CLASSROOM_FIREBASE_CLI;
if(!cli)throw new Error('Missing Firebase CLI path.');
const logging=require(path.join(path.dirname(cli),'../logger.js'));
logging.logger.silent=true;
logging.logger.clear();
logging.useFileLogger=()=>undefined;
logging.useConsoleLoggers=()=>undefined;
