const { filterSensitiveCookies } = require('./cookies');
const { dependencies } = require('../package.json');

const isDefined = o => typeof o !== 'undefined';

/**
 * Determines if the Elastic APM agent has sufficient config to be active
 * @param {object} config gasket config
 * @param {object<string,any>} env environment variables
 * @returns {boolean} A combined config object
 */
const isActive = (config, env) => {
  const { active, serverUrl, secretToken } = config;

  if (active || env.ELASTIC_APM_ACTIVE) {
    return true;
  }

  const combined = {
    serverUrl: serverUrl || env.ELASTIC_APM_SERVER_URL,
    secretToken: secretToken || env.ELASTIC_APM_SECRET_TOKEN
  };

  if (combined.serverUrl && combined.secretToken) {
    return true;
  }

  return false;
};

module.exports = {
  hooks: {
    configure: {
      handler: async (gasket, config) => {
        config.elasticAPM = config.elasticAPM || {};
        // eslint-disable-next-line no-process-env
        config.elasticAPM.active = isActive(config.elasticAPM, process.env);

        return { ...config };
      }
    },
    preboot: {
      handler: async ({ config }) => {
        require('elastic-apm-node')
          .start({
            ...config.elasticAPM
          })
          .addFilter(filterSensitiveCookies(config));
      }
    },
    create: {
      timing: {
        after: ['@gasket/plugin-start']
      },
      handler(gasket, { pkg }) {
        pkg.add('dependencies', {
          'elastic-apm-node': dependencies['elastic-apm-node']
        });
        pkg.add('scripts', {
          start: 'gasket start --require elastic-apm-node/start'
        });
      }
    }
  }
};
