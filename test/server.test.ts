import { initialize, REMSServer } from '../src/server';
import config from '../src/config';
import sinon from 'sinon';
import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';

describe('REMSServer class', () => {
  let server: REMSServer;
  let mongo: any;
  before(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    const options: ConnectOptions = {};
    await mongoose.connect(uri, options);
  });

  after(async () => {
    console.log('Closing connection?');

    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
  });

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
});
