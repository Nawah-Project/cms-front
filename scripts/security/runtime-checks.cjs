const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const path=require('node:path');
const r=createRequire(path.join(process.cwd(),'package.json'));
const [major,minor,patch]=process.versions.node.split('.').map(Number);
assert.equal(major,24);assert(minor>22||minor===22&&patch>=1,'Patched Node 24 is required');
const versions={};
for(const [name,minimum] of Object.entries({'body-parser':'2.4.0',qs:'6.16.1'})){
 versions[name]=r(name+'/package.json').version;const a=versions[name].split('.').map(Number),b=minimum.split('.').map(Number);
 assert(a[0]===b[0]&&(a[1]>b[1]||a[1]===b[1]&&a[2]>=b[2]),name+' must be patched');
}
console.log(JSON.stringify({node:process.version,runtimeDependencies:versions}));
