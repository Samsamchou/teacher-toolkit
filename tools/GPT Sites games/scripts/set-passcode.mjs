// Run personally in a trusted local terminal after deployment setup is authorized.
// No PIN or derived hash is written to disk or command-line arguments.
import {randomBytes,scryptSync} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import readline from 'node:readline';
const PROJECT='gamesinclass-5d9d1';
if(!process.stdin.isTTY)throw new Error('Open this setup script in your own interactive terminal.');
function hidden(prompt){return new Promise(resolve=>{let input='';process.stdout.write(prompt);readline.emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();const onKey=(str,key)=>{if(key?.ctrl&&key.name==='c'){process.stdin.setRawMode(false);process.exit(1);}if(key?.name==='return'){process.stdin.off('keypress',onKey);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(input);}else if(key?.name==='backspace')input=input.slice(0,-1);else if(/^\d$/.test(str||'')&&input.length<6)input+=str;};process.stdin.on('keypress',onKey);});}
let pin=await hidden('Enter your new 6-digit teacher passcode (hidden): ');
let again=await hidden('Enter it again (hidden): ');
if(!/^\d{6}$/.test(pin)||pin!==again){pin='';again='';throw new Error('The two entries must be the same 6 digits. Nothing was saved.');}
const salt=randomBytes(16).toString('hex');let hash=`scrypt-v1:${salt}:${scryptSync(pin,salt,32).toString('hex')}`;pin='';again='';
// This CLI version logs Secret Manager request bodies by default. A child-process-only
// preload disables CLI diagnostic transports before CLI initialization. Cloud audit
// logging is unaffected; the passcode/hash never enters a local diagnostic file.
const require=createRequire(import.meta.url);let cli;try{cli=require.resolve('firebase-tools/lib/bin/firebase.js');}catch{cli=join(process.env.APPDATA||'', 'npm/node_modules/firebase-tools/lib/bin/firebase.js');}
const dir=await mkdtemp(join(tmpdir(),'classroom-pin-'));
try{
  const code=await new Promise(done=>{const child=spawn(process.execPath,['--require',fileURLToPath(new URL('./secret-cli-no-log.cjs',import.meta.url)),cli,'functions:secrets:set','CLASSROOM_TEACHER_PIN','--project',PROJECT,'--data-file','-','--non-interactive'],{cwd:dir,env:{...process.env,CLASSROOM_FIREBASE_CLI:cli},stdio:['pipe','ignore','ignore'],windowsHide:true});child.on('error',()=>done(-1));child.on('close',done);child.stdin.on('error',()=>{});child.stdin.end(hash);hash='';});
  if(code!==0)throw new Error('Passcode setup did not complete. Check Firebase CLI login and Secret Manager access, then retry.');
  process.stdout.write('Passcode stored in the project secret manager. Redeploy teacherLogin to use this secret version.\n');
}finally{hash='';if(resolve(dir).startsWith(resolve(tmpdir())+'\\')&&basename(dir).startsWith('classroom-pin-'))await rm(dir,{recursive:true,force:true});}
