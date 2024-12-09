import Hybrid from '../../src';
import LocalServer from './_server';

describe('Hybrid.misc', () => {
  const localSever = new LocalServer();

  beforeAll(async () => await localSever.start());

  afterAll(async () => localSever.stop());

  it('can run health checks', async () => {
    const res = await Hybrid.healthCheck(localSever.baseUrl.value, { logger: false });

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.msg).toBe('ok');
  });

  it('can check neuron compatibility versions', async () => {
    const res = await Hybrid.getVersion(localSever.baseUrl.value, { logger: false });

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.version).toBe('1.40.2');
  });
});
