'use strict';

const aws = require('aws-sdk');

/**
Decrypt [KMS]{@link https://aws.amazon.com/kms/} encrypted values in config files. This tool is optimised for use in node 4.3.2 AWS Lambda functions but should work in any modern node runtime.

### Install
```
npm install --save @seek/kms-config
```

### Usage
The user that is running the lambda will need `kms:Decrypt` permission to the master key used for generating the ciphertext.
**Warning** To reduce KMS overhead you should just call this once and cache the result if possible.

#### myConfig.json
```javascript
{
    "foo" : "bar",
    "kms" { //All the values in this object are expected to be KMS ciphertext 
        "secretToHappiness" : "base64_encoded_ciphertext"
    }
}
```
#### handler.js
```javascript
const myConfig = require('./myConfig')
const config  = require('@seek/kms-config')(myConfig)

config.then(resolved => {
    console.log(resolved.foo) // "bar"
    console.log(resolved.kms.secretToHappiness) // "eat more chocolate"
}).catch(err => {
    console.log(err, "Oh dear perhaps you are missing KMS permissions")
})
...
```

@module config
@param  {Object} config  A config object which may contain a child `kms` object who's values are KMS ciphertext
@return {Promise}       A promise to the loaded config which will be resolved with all kms values decrypted.
*/
module.exports = (config) => new Promise((resolve, reject) => {
    if (!config) {
        reject(new TypeError('Expected raw config object'))
    }
    let configRaw = JSON.parse(JSON.stringify(config)); // Clone
    // Decode the keys in the kms field
    const kms = new aws.KMS();
    const decryptedKeyPromises = [];
    Object.keys(configRaw.kms || {}).forEach((key) => {
        decryptedKeyPromises.push(
            new Promise((res, rej) => { // eslint-disable-line promise/param-names
                kms.decrypt({ CiphertextBlob: new Buffer(configRaw.kms[key], 'base64')},
                    (err, data) => {
                        if (err) {
                            rej(err.stack);
                        } else {
                            configRaw.kms[key] = data.Plaintext.toString('utf8');
                            res();
                        }
                    });
            }));
    });

    // Only resolve once all the keys have been decrypted
    Promise.all(decryptedKeyPromises)
        .then(() => {
            resolve(configRaw);
        })
        .catch((err) => {
            reject(err);
        });
});
