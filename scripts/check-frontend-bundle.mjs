import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
const target=process.env.NAWAH_FRONTEND_APP;assert(['member','admin'].includes(target));
const build=await import(pathToFileURL(resolve('build/server/index.js'))),ids=Object.keys(build.routes);
assert(!ids.some(id=>/features\/(founder-workspace|strategic-relationships|learning-library)\//.test(id)));
for(const name of ['founder-workspace','strategic-relationships','learning-pdf-assets'])assert(!existsSync('build/client/'+name),'Personal assets must not ship in Nawah');
if(target==='member'){assert(!ids.some(id=>/features\/admin\//.test(id)));assert(ids.some(id=>id.endsWith('routes/applications')));}else{assert(!ids.some(id=>/routes\/(applications|IndexRedirect|application-details)$/.test(id)));assert(ids.some(id=>id.includes('AdminOverviewPage')));}
console.log(JSON.stringify({target,routeCount:ids.length,personalDomainsExcluded:true}));
