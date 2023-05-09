import { initialize, REMSServer } from '../src/server';
import config from '../src/config';
import sinon from 'sinon';
import { expect } from 'chai';
import { metRequirementsCollection, medicationCollection } from '../src/fhir/models';

import { FhirUtilities } from '../src/fhir/utilities';
import LibraryModel from '../src/lib/schemas/resources/Library';
import QuestionnaireModel from '../src/lib/schemas/resources/Questionnaire';

describe('REMSServer class', () => {
  let server: REMSServer;

  beforeEach(() => {
    server = new REMSServer(config.fhirServerConfig);
  });

  it('method: constructor', () => {
    expect(server).to.be.instanceOf(REMSServer);
    expect(server).to.have.property('app');
    expect(server).to.have.property('listen');
  });

  it('method: configureMiddleware', () => {
    const set = sinon.spy(server.app, 'set');
    const use = sinon.spy(server.app, 'use');

    server.configureMiddleware();
    expect(set.callCount).to.equal(6);
    expect(set.getCall(4).args[0]).to.equal('showStackError');
    expect(set.getCall(4).args[1]).to.be.true;
    expect(set.getCall(5).args[0]).to.equal('jsonp callback');
    expect(set.getCall(5).args[1]).to.be.true;

    expect(use.callCount).to.equal(8);
  });

  it('method: configureLogstream', () => {
    const use = sinon.spy(server.app, 'use');

    server.configureLogstream();

    expect(use.calledOnce).to.have.true;
  });

  it('method: registerService', () => {
    const mockService = {
      definition: {
        hook: 'patient-view',
        name: 'foo',
        description: 'bar',
        id: 'foobar'
      },
      handler: (req: any, res: { json: (arg0: string) => void }) => {
        res.json('hello world');
      }
    };

    server.registerService(mockService);

    expect(server.services).to.deep.equal([
      {
        hook: 'patient-view',
        name: 'foo',
        description: 'bar',
        id: 'foobar'
      }
    ]);
  });

  it('Method: listen', () => {
    const listen = sinon.spy(server.app, 'listen');
    const callback = sinon.fake();
    // Start listening on a port and pass the callback through
    const serverListen = server.listen({ port: 3000 }, callback);
    expect(listen.calledOnce).to.be.true;
    expect(listen.getCall(0).args[0]).to.equal(3000);
    expect(listen.getCall(0).args[1]).to.equal(callback);
    serverListen.close();
  });

  it('should be able to initilize a server', () => {
    const newServer = initialize(config);
    expect(newServer).to.be.instanceOf(REMSServer);
    expect(newServer).to.have.property('app');
    expect(newServer).to.have.property('listen');
  });

  it('should be able to prepopulate data without error', async () => {
    expect(await metRequirementsCollection.count({})).to.equal(0);
    expect(await medicationCollection.count({})).to.equal(0);
    await FhirUtilities.populateDB();
    expect(await metRequirementsCollection.count({})).to.not.equal(0);
    expect(await medicationCollection.count({})).to.not.equal(0);
    await FhirUtilities.populateDB();
  });

  it('should be able to load artifacts from filesystem', async () => {
    expect(await LibraryModel.count({})).to.equal(0);
    expect(await QuestionnaireModel.count({})).to.equal(0);
    await FhirUtilities.loadResources('./test/fixtures/cds-library');
    expect(await LibraryModel.count({})).to.not.equal(0);
    expect(await QuestionnaireModel.count({})).to.not.equal(0);
    await FhirUtilities.loadResources('./test/fixtures/cds-library');
  });
});
