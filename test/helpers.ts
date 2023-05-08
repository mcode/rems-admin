import config from '../src/config';
import chai from 'chai';
import { expect } from 'chai';
import chaiHttp from 'chai-http';
import { initialize } from '../src/server';
import { Model } from 'mongoose';
chai.use(chaiHttp);

const actLikeAService = async (resourceType: string, fixture: any, model: Model<any>) => {
  let remsServer: any;
  let app: any;
  before(async () => {
    remsServer = initialize(config);
    // Start listening on a port and pass the callback through
    app = remsServer._app();
  });

  it(`should be able to store ${resourceType}`, async () => {
    let found = await model.findOne({ id: fixture.id });
    expect(found).to.be.null;

    const res = await chai.request(app).post(`/4_0_0/${resourceType}`).send(fixture);
    expect(res).to.have.status(201);
    expect(res.body).to.be.a('object');

    found = await model.findOne({ id: fixture.id });
    expect(found.id).to.not.be.null;
  });

  it(`should be able to retrieve ${resourceType}`, async () => {
    const resource = { resourceType: resourceType, id: 'findMe' };

    await model.create(resource);
    const res = await chai.request(app).get(`/4_0_0/${resourceType}/${resource.id}`);

    expect(res).to.have.status(200);
    expect(res.body).to.be.a('object');
    expect(res.body.id).to.be.equal(resource.id);
  });
};

export default {
  actLikeAService
};
