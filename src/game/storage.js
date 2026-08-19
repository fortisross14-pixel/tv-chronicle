const DB_NAME='tvEmpireSimulator';
const STORE='saves';
const DB_VERSION=1;

function openDb(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined') return reject(new Error('IndexedDB unavailable'));
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));
  });
}
async function idbGet(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();});}
async function idbSet(key,value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(tx.error)};});}
async function idbDelete(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(tx.error)};});}

export function makeSlotKey(n){return `tvEmpireSim_v05_slot_${n}`}
export async function loadSlot(n){
  const key=makeSlotKey(n);
  try{const raw=window.localStorage?.getItem(key);if(raw)return {state:JSON.parse(raw),mode:'localStorage'}}catch{}
  try{const raw=await idbGet(key);if(raw)return {state:typeof raw==='string'?JSON.parse(raw):raw,mode:'indexedDB'}}catch{}
  try{const raw=window.sessionStorage?.getItem(key);if(raw)return {state:JSON.parse(raw),mode:'session'}}catch{}
  return {state:null,mode:'none'};
}
export async function saveSlot(n,state){
  const key=makeSlotKey(n),raw=JSON.stringify(state);
  try{window.localStorage?.setItem(key,raw);return {ok:true,persistent:true,mode:'localStorage'}}catch(localError){
    try{await idbSet(key,state);return {ok:true,persistent:true,mode:'indexedDB',error:localError}}catch(idbError){
      try{window.sessionStorage?.setItem(key,raw);return {ok:true,persistent:false,mode:'session',error:idbError}}catch(sessionError){return {ok:false,persistent:false,mode:'memory',error:sessionError||idbError||localError};}
    }
  }
}
export async function deleteSlot(n){const key=makeSlotKey(n);try{window.localStorage?.removeItem(key)}catch{}try{await idbDelete(key)}catch{}try{window.sessionStorage?.removeItem(key)}catch{}}
export async function loadAllSlots(){return Promise.all([1,2,3].map(async n=>({n,...await loadSlot(n)})))}
