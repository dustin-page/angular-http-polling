
/* Initializes module */
angular.module("ngHTTPPoll",[])
    .service("$httpoll",pollingService)

/* Polling service */
function pollingService($http, $timeout) {

    var poller = {};
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
        errorRange: [400, 599]
    }

    /* generates public methods on the poller for each $http method */
    for (var method in HTTP_METHODS) {
        var hasBody = !!HTTP_METHODS[method].body;
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
        return function (url, dataOrConfig, configOrNull) {
            var data = hasBody ? dataOrConfig : null;
            var config = hasBody ? config : dataOrConfig;
            return poller.poll(httpMethod, url, dataOrConfig, config);
        }
    }


    /* polls a remote API via provided HTTP method */
    poller.poll = function (httpMethod, url, data, config) {
        config = getConfig(config);


        if (config.timeout && !config.timeoutId) {
            timeoutIdCounter ++;
            config.timeoutId = timeoutIdCounter;
            $timeout(function(){
                timeoutStatuses[timeoutId] = true;
            }, config.timeout);
        }

        return $httpCall(httpMethod, url, data, config)
            .then(pollResponse)
            .catch(pollResponse);

        function pollResponse(response){
            var timedOut = timeoutStatuses[config.timeoutId];
            if (config.timeoutId) {
            }
            if (inSuccessRange(response.status, config)) {
                return response.data;
            }

            if (timedOut ||
                (inErrorRange(response.status, config) && !config.retryOnError)) {
                throw response;
            }

            return delayedPoll(httpMethod, url, data, config);
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

    /* polls a remote API via provided HTTP method, with a set delay */
    function delayedPoll (httpMethod, url, data, config) {
        if (config.retries > 0) {
            config.retries -= 1;
            return $timeout(function(){
                return poller.poll(httpMethod, url, data, config);
            }, config.delay)
        }
    }

    /* formats a remote API call via the angular $http service */
    function $httpCall (httpMethod, url, data, config) {
        var hasBody = HTTP_METHODS[httpMethod].body;
        var arg1 = hasBody ? data : config;
        var arg2 = hasBody ? config : null;
        return $http[httpMethod](url, arg1, arg2);
    }

    /* generates a config object using defaults and global config settings\
       with the following priority:
            1) Provided config settings
            2) User default config settings
            3) Default config settings */
    function getConfig(config) {
        config = config || {};
        var newConfig = {};
        var keys = Object.keys(POLLING_DEFAULTS).concat(Object.keys(config))
        keys.forEach(function(key){
            if (angular.isDefined(config[key])) {
                newConfig[key] = config[key];
            } else if (angular.isDefined(userDefaults[key])) {
                newConfig[key] = userDefaults[key];
            } else {
                newConfig[key] = POLLING_DEFAULTS[key];
            }
        })
        return newConfig;
    }


    return poller;

}