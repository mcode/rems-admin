import { initialize, REMSServer } from './server';
import config from './config';
import { Db, MongoClient } from 'mongodb';
import sinon from 'sinon';
import {expect} from 'chai';
import  { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';

describe('REMSServer class', () => {
  let server: REMSServer;

  let connection: MongoClient;
  let db: Db;
  let mongo: any;
  before(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    const options :ConnectOptions = {
      
    };
    await mongoose.connect(uri, options);
  });

  after(async () => {
    console.log('Closing connection?');
    
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
    
  });

  beforeEach(() => {
    // jest.mock('morgan', () => jest.fn());

    // // Mock express and body parser
    // jest.mock('body-parser', () => ({
    //   urlencoded: jest.fn(),
    //   json: jest.fn()
    // }));

    // jest.mock('express', () => {
    //   const mock = jest.fn(() => ({
    //     use: jest.fn(),
    //     set: jest.fn(),
    //     get: jest.fn(),
    //     listen: jest.fn(),
    //     options: jest.fn(),
    //     post: jest.fn(),
    //     static: jest.fn()
    //   }));
    //   return mock;
    // });

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
    // expect(set.mock.calls[0][0]).toBe('showStackError');
    // expect(set.mock.calls[0][1]).toBe(true);
    // expect(set.mock.calls[5][0]).toBe('jsonp callback');
    // expect(set.mock.calls[5][1]).toBe(true);

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
    // expect(listen.mock.calls[0][0]).toBe(3000);
    // expect(listen.mock.calls[0][1]).toBe(callback);
    serverListen.close();
  });

  it('should be able to initilize a server', () => {
    const newServer = initialize(config);
    expect(newServer).to.be.instanceOf(REMSServer);
    expect(newServer).to.have.property('app');
    expect(newServer).to.have.property('listen');
  });
});
