
/* Initializes module */
angular.module("ngHTTPPoll",[])
    .service("$httpoll",pollingService)

/* Polling service */

function pollingService($http, $timeout, $q) {

    var timeoutIdCounter = 1;
    var timeoutStatuses = {};
    var userDefaults = {};

    var HTTP_METHODS = {
        delete: {body: false},
        get: {body: false},
        jsonp: {body: false},
        patch: {body: true},
        post: {body: true},
        put: {body: true}
    };

    var POLLING_DEFAULTS = {
        retries: 50,
        delay: 100,
        retryOnError: true,
        timeout: false,
        successRange: [200, 201],
        errorRange: [400, 599],
        until: null
    }

    /* polls an API based on settings */
    var poller = function (config, state) {
        config = getConfig(config);
        state = state || {
            retryCount: 0
        };

        // allows overriding of the $http service, useful for testing
        var httpProvider = poller.provider || $http;

        if (config.timeout && !state.timeoutId) {
            timeoutIdCounter ++;
            state.timeoutId = timeoutIdCounter;
            $timeout(function(){
                timeoutStatuses[state.timeoutId] = true;
            }, config.timeout);
        }

        return httpProvider(config)
            .then(pollResponse, pollResponse)

        function pollResponse(response){

            var actions = {
                // apply default `until` logic
                pass: function() {
                    return defaultUntil(response, config, state)
                },
                // overrides config for subsequent requests
                reConfig: function (overrideConfig) {
                    return config = getConfig(config, overrideConfig);
                }
            }

            try {
                var untilFunc = config.until || defaultUntil;
                // deep-copy config prevents overriding config values
                var untilConfig = angular.copy(config);
                if (untilFunc(response, config, state, actions)) {
                    return response;
                } else {
                    state.retryCount += 1;
                    return $timeout(function(){
                        if (timeoutStatuses[state.timeoutId]) {
                            return $q.reject("Polling timed out")
                        }
                        return poller(config, state);
                    }, config.delay)
                }
            } catch (err) {
                return $q.reject(err.message);
            }
        }

    };

    /* generates public methods on the poller for each $http method */
    for (var method in HTTP_METHODS) {
        var hasBody = HTTP_METHODS[method].body;
        poller[method] = generatePollingFunction(method, hasBody)
    }

    /* override current config values */
    poller.setConfig = function (config) {
        userDefaults = getConfig(config);
    }

    /* get current default config values */
    poller.getConfig = getConfig;

    /* generates a single polling function for provided HTTP method */
    function generatePollingFunction(httpMethod, hasBody) {
        return function (url, dataOrConfig, config) {
            var requestOptions = {url: url, method: httpMethod};
            if (hasBody) {
                config = config || {};
                if (dataOrConfig) requestOptions.data = dataOrConfig;
            } else {
                config = dataOrConfig || {};
            }
            config = angular.extend({}, config, requestOptions);
            return poller(config);
        }
    }


    function inErrorRange (status, config) {
        return status >= config.errorRange[0] &&
               status <= config.errorRange[1];
    }

    function inSuccessRange (status, config) {
        return status >= config.successRange[0] &&
               status <= config.successRange[1];
    }

    /* generates a config object using defaults and global config settings\
       with the following priority:
            1) Provided config settings
            2) User default config settings
            3) Default config settings */
    function getConfig(config, overrides) {
        config = config || {};
        overrides = overrides || {};

        return angular.extend({}, POLLING_DEFAULTS, userDefaults,
                              config, overrides)
    }

    function defaultUntil (response, config, state) {
        if (inErrorRange(response.status, config) && !config.retryOnError) {
            throw new Error("HTTP error: " + response.status);
        }

        if (inSuccessRange(response.status, config)) return true;
        if (state.retryCount >= config.retries) {
            throw new Error('Polling reached max number of retries');
        }
    }



    return poller;

}