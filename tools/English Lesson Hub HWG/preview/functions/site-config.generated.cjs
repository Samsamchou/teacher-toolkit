"use strict";

// Generated from config/site-source.json by scripts/sync-functions-config.mjs.
module.exports = Object.freeze({
  "functionsRegion": "asia-east1",
  "teacherPasscode": {
    "secretName": "TEACHER_RESULTS_PASSCODE",
    "loginFunction": "teacherPasscodeLogin",
    "logoutFunction": "teacherPasscodeLogout",
    "listFunction": "teacherResultsList",
    "recordExportFunction": "teacherResultsRecordExport",
    "deleteFunction": "teacherResultsDelete",
    "sessionHours": 8,
    "resultLimit": 5000
  }
});
