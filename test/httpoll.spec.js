describe('$httpoll service', function () {
    var $httpoll, $httpBackend, $http, $timeout, pollingIterations;
    var route = '/';
    var retries = 5;

    beforeEach(module('ngHTTPPoll'));

    beforeEach(inject(function($injector){
        $httpBackend = $injector.get('$httpBackend');
        $httpoll = $injector.get('$httpoll');
        $http = $injector.get('$http');
        $timeout = $injector.get('$timeout');
    }));

    beforeEach(function(){
        pollingIterations = 0;
        $httpSpy();
    });


    describe('main method', function () {

        beforeEach(function(){
            mockPollResponse('get', route, retries, "response");
        })

        it ('should only poll once if retries is zero', function () {
            var result = $httpoll({method: 'get', url: route, retries: 0});
            expectMaxRetries(result);
            expectHTTPCount(1)
        })

        it ('should limit polling by the number of retries', function () {
            var result = $httpoll({method: 'get', url: route, retries: 3})
            expectMaxRetries(result);
            expectHTTPCount(4)
        })

        it ('should retry if it receives a status code in the error range',
            function() {
                $httpoll({method: 'get', url: route, retryOnError: true })
                expectSuccess()
            }
        )

        it ('should not retry if it receives a status code in the error range',
            function() {
                var result = $httpoll({method: 'get', url: route, retryOnError: false});
                expectCatch(result, function(err){
                    expect(err).toEqual('HTTP error: 404')
                })
                expectHTTPCount(1)
            }
        )

        it ('should respect a custom error range', function() {
            mockPollResponse('get', route, retries, "response");
            $httpoll({
                method: 'get',
                url: route,
                errorRange: [500, 599],
                retryOnError: false
            })
            expectSuccess()
        })

        it ('should respect a custom success range', function() {
            $httpoll({
                method: 'get',
                url: route,
                retries: 9,
                successRange: [201, 299]
            })
            expectHTTPCount(10)
        })

        it ('should timeout', function() {
            var result = $httpoll({
                method: 'get',
                url: route,
                timeout: 1000,
                delay: 1200,
                retries: 9
            })
            expectTimeout(result);
            expectHTTPCount(1);
        })

        describe('until option', function(){

            it ('should get overriden by timeout', function() {
                var result = $httpoll({
                    method: 'get',
                    url: route,
                    timeout: 1000,
                    delay: 1200,
                    retries: 9,
                    until: function(){
                        return false;
                    }
                })
                expectTimeout(result);
                expectHTTPCount(1);
            })

            it ('should continue polling until condition is satisfied', function (){
                var result = $httpoll({
                    method: 'get',
                    url: route,
                    retries: 9,
                    until: function (response, config, state) {
                        return state.retryCount > 5;
                    }
                });
                expectHTTPCount(7);
            })

            it ('should use the "default" option defer to default logic', function () {
                var result = $httpoll({
                    method: 'get',
                    url: route,
                    retries: 9,
                    until: function (response, config, state, actions) {
                        return actions.default();
                    }
                });
                expectSuccess()
            });

            it ('should reset config for future requests', function () {
                var result = $httpoll({
                    method: 'get',
                    url: route,
                    retries: 9,
                    until: function (response, config, state, actions) {
                        actions.reConfig({
                            retries: 2
                        });
                        return actions.default();
                    }
                });
                expectHTTPCount(3);
            })

        })

        describe('followRedirect option', function(){

            it ('should follow redirect if Location header present', function () {

                $httpBackend.when('GET', '/redirect')
                    .respond(function (method, url, data) {
                        pollingIterations++;
                        return [302, "Redirect", {Location: route}]
                    });

                var result = $httpoll({
                    method: 'get',
                    url: '/redirect',
                    retries: 9,
                    followRedirect: true
                })
                expectThen(result, function(response){
                    expect(response.config.url).toBe(route)
                })
                expectSuccess();
            })

            it ('should not follow redirect without Location header', function () {
                $httpBackend.when('GET', '/redirect')
                    .respond(function (method, url, data) {
                        pollingIterations++;
                        return [302, "Redirect"]
                    });

                var result = $httpoll({
                    method: 'get',
                    url: '/redirect',
                    retries: 9,
                    followRedirect: true
                })

                expectMaxRetries(result);
            })
        });

    });

    /* GET, DELETE, JSONP */
    ['get','delete','jsonp'].forEach(function(method){

        describe (method+' method', function () {
            var response = "response message";
            beforeEach(function(){
                mockPollResponse(method, route, retries, response)
            });

            it ('should successfully poll a '+method.toUpperCase() +' route',
                function () {
                    var promise = $httpoll[method](route);
                    promise.then(function(r){
                        expect(r.data).toBe(response);
                    })
                    expectSuccess()
                }
            );
        });
    });

    /* PUT, POST, PATCH */
    ['put','post','patch'].forEach(function(method){

        describe (method+' method', function () {
            beforeEach(function(){
                mockPollResponse(method, route, retries, "", true)
            });

            it ('should successfully poll a '+method.toUpperCase() +' route\
                and pass data',
                function () {
                    var payload = {foo: 'bar'};
                    var promise = $httpoll[method](route, payload);
                    promise.then(function(r){
                        expect(r.data).toEqual(payload);
                    })
                    expectSuccess()
                }
            )

            it ('should not mutate the original config object', function() {
                var config = {retries: 20};
                $httpoll[method](route, {}, config);
                expect(config).toEqual({retries: 20});
            });
        })
    });



    /* HELPERS */

    function mockPollResponse(method, route, retries, response, passThrough) {
        $httpBackend.when(method.toUpperCase(),route)
            .respond(function (method, url, data) {
                pollingIterations ++;
                if (pollingIterations < retries) {
                    return [404, "Not found"]
                } else {
                    return [200, passThrough ? data : response]
                }
            });
    }

    function flush(){
        try {
            while (true) {
                $httpBackend.flush();
                $timeout.flush();
            }
        }
        catch (err) {
            if (err.message != 'No pending request to flush !') {
                throw err;
            }
        }
    }

    function $httpSpy () {
        $httpoll.provider = $http;
        spyOn($httpoll,'provider').and.callThrough();
    }

    function expectThen(promise, thenExpectation) {
        var thenCalled;
        promise.then(function(err){
            thenCalled = true;
            thenExpectation(err);
        });
        flush();
        expect(thenCalled).toBe(true);
    }

    function expectCatch(promise, catchExpectation) {
        var catchCalled;
        promise.catch(function(err){
            catchCalled = true;
            catchExpectation(err);
        });
        flush();
        expect(catchCalled).toBe(true);
    }

    function expectMaxRetries(promise) {
        expectCatch(promise, function(err){
            expect(err).toEqual("Polling reached max number of retries")
        });
    }

    function expectTimeout(promise) {
        expectCatch(promise, function (err){
            expect(err).toEqual("Polling timed out")
        })
    }

    function expectHTTPCount(count){
        flush();
        expect($httpoll.provider.calls.count()).toBe(count)
    }

    function expectSuccess() {
        expectHTTPCount(retries);
    }
})
