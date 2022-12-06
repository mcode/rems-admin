import bodyParser from 'body-parser';
import morgan from 'morgan';
import { initialize, REMSServer } from './server';
import config from './config';

describe('REMSServer class', () => {
  let server: REMSServer;

  beforeEach(() => {
    jest.mock('morgan', () => jest.fn());

    // Mock express and body parser
    jest.mock('body-parser', () => ({
      urlencoded: jest.fn(),
      json: jest.fn()
    }));

    jest.mock('express', () => {
      const mock = jest.fn(() => ({
        use: jest.fn(),
        set: jest.fn(),
        get: jest.fn(),
        listen: jest.fn(),
        options: jest.fn(),
        post: jest.fn(),
        static: jest.fn()
      }));
      return mock;
    });

    server = new REMSServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('method: constructor', () => {
    expect(server).toBeInstanceOf(REMSServer);
    expect(server).toHaveProperty('app');
    expect(server).toHaveProperty('listen');
  });

  test('method: configureMiddleware', () => {
    const set = jest.spyOn(server.app, 'set');
    const use = jest.spyOn(server.app, 'use');

    server.configureMiddleware();

    expect(set).toHaveBeenCalledTimes(5);
    expect(set.mock.calls[0][0]).toBe('showStackError');
    expect(set.mock.calls[0][1]).toBe(true);
    expect(set.mock.calls[1][0]).toBe('jsonp callback');
    expect(set.mock.calls[1][1]).toBe(true);

    expect(use).toHaveBeenCalledTimes(3);
  });

  test('method: configureLogstream', () => {
    const use = jest.spyOn(server.app, 'use');

    server.configureLogstream();

    expect(use).toHaveBeenCalledTimes(1);
  });

  test('method: registerService', () => {
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

    expect(server.services).toStrictEqual([
      {
        hook: 'patient-view',
        name: 'foo',
        description: 'bar',
        id: 'foobar'
      }
    ]);
  });

  test('Method: listen', () => {
    const listen = jest.spyOn(server.app, 'listen');
    const callback = jest.fn();
    // Start listening on a port and pass the callback through
    const serverListen = server.listen({ port: 3000 }, callback);
    expect(listen).toHaveBeenCalledTimes(1);
    expect(listen.mock.calls[0][0]).toBe(3000);
    expect(listen.mock.calls[0][1]).toBe(callback);
    serverListen.close();
  });

  test('should be able to initilize a server', () => {
    const newServer = initialize(config);
    expect(newServer).toBeInstanceOf(REMSServer);
    expect(newServer).toHaveProperty('app');
    expect(newServer).toHaveProperty('listen');
  });
});