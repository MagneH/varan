import { DefinePlugin } from 'webpack';
import createServerConfig from '../../../src/webpack/createServerConfig';

// Init
const ServerDefinePluginMock = DefinePlugin as jest.Mock;

// Mocks
jest.mock('webpack', () => ({
  ...jest.requireActual('webpack'),
  DefinePlugin: jest.fn(),
}));

// Tests
beforeEach(() => {
  ServerDefinePluginMock.mockReset();
});
it('should automatically add `APP_` and `REACT_APP_` environment variables to `DefinePlugin`', () => {
  process.env.APP_AUTO_DEFINE_VAR = JSON.stringify('DEFINE-VAR-APP-AUTO-REPLACE');
  process.env.REACT_APP_AUTO_DEFINE_VAR = JSON.stringify('DEFINE-VAR-REACT-APP-AUTO-REPLACE');
  process.env.NOT_REPLACED = JSON.stringify('DEFINE-VAR-NOT-REPLACE');

  // Create the config
  createServerConfig();

  // Unmock
  delete process.env.APP_AUTO_DEFINE_VAR;
  delete process.env.REACT_APP_AUTO_DEFINE_VAR;
  delete process.env.NOT_REPLACED;

  // Assertions
  expect(ServerDefinePluginMock).toHaveBeenCalledWith(
    expect.objectContaining({
      BUILD_TARGET: JSON.stringify('server'),
      'process.env.APP_AUTO_DEFINE_VAR': JSON.stringify('DEFINE-VAR-APP-AUTO-REPLACE'),
      'process.env.REACT_APP_AUTO_DEFINE_VAR': JSON.stringify('DEFINE-VAR-REACT-APP-AUTO-REPLACE'),
    }),
  );
  const args = ServerDefinePluginMock.mock.calls[0][0];
  expect(args).toHaveProperty(['BUILD_TARGET']);
  expect(args).not.toHaveProperty(['process.env.NOT_REPLACED']);
});
it('should respect the `buildVars` property', () => {
  // Create the config
  createServerConfig({
    buildVars: {
      var1: JSON.stringify('value1'),
      'process.env.MY_VAR': JSON.stringify('long value 2'),
    },
  });

  // Assertions
  expect(ServerDefinePluginMock).toHaveBeenCalledWith(
    expect.objectContaining({
      BUILD_TARGET: JSON.stringify('server'),
      var1: JSON.stringify('value1'),
      'process.env.MY_VAR': JSON.stringify('long value 2'),
    }),
  );
});
