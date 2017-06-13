'use strict';

const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const chai = require('chai');

chai.should(); //attach 'should' to Promise
chai.use(require('chai-as-promised'));

class FakeKMS {}

describe('config', () => {
    let rawConf;
    let fakeAws;
    let kmsDecryptStub;
    let targetModule;

    beforeEach(() => {
        rawConf = {};
        fakeAws = { KMS: FakeKMS };
        kmsDecryptStub = sinon.stub();
        FakeKMS.prototype.decrypt = kmsDecryptStub;
        targetModule = proxyquire('../config', {'aws-sdk': fakeAws});
    });

    describe('getConfig', () => {

        it('should return config with specific decrypted KMS keys', () =>
            configureSuccess()
        );

        it('should not interfere with the passed in config object', () =>
            configureSuccess().then(() => rawConf.kms.stripeAuApiKey.should.eql('olleh'))
        );

        it('should reject the config promise if KMS decryption fails', () => {
            // add an encoded key to the config
            rawConf.kms = { stripeAuApiKey : 'olleh', stripeNzApiKey : 'ollehnz' };

            //KMS decrypts UNsuccesfully
            kmsDecryptStub
                .withArgs({ CiphertextBlob: sinon.match.instanceOf(Buffer) }, sinon.match.func)
                //Call the KMS callback with an error
                .callsArgWith(1, { stack : 'bogus' }, null);

            return targetModule(rawConf).should.eventually.be.rejected
        });

        it('should reject the config promise if given nothing', () =>
            targetModule().should.eventually.be.rejected
        );

        let configureSuccess = () => {
            rawConf.kms = { stripeAuApiKey : 'olleh' };
            //KMS decrypts succesfully
            kmsDecryptStub
                .withArgs({ CiphertextBlob: sinon.match.instanceOf(Buffer) }, sinon.match.func)
                //Call the KMS callback with the decrypted key
                .callsArgWith(1, null, { Plaintext: 'hello' });

            const expectedConf = Object.assign({}, rawConf);
            expectedConf.kms = { stripeAuApiKey : 'hello' };
            return targetModule(rawConf).should.become(expectedConf)
        }
    });
});
