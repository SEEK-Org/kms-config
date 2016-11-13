'use strict';const levels={error:5,warn:4,info:3,debug:2};class Logger{constructor(a,b='info'){this.formattedName=a?`name=${a}, `:'',this.setLevel(b)}setLevel(a){if(!levels[a])throw new Error(`unknown error level ${a}`);return this.level=levels[a],this}log(a,b='info'){levels[b]&&levels[b]>=this.level&&console.log(`${this.formattedName}level=${b}, msg=${a}`)}error(a){this.log(a,'error')}warn(a){this.log(a,'warn')}info(a){this.log(a,'info')}debug(a){this.log(a,'debug')}}module.exports=Logger;
