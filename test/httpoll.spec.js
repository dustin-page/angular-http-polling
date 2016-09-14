describe('$httpoll service', function () {
    var $httpoll, $httpBackend, $http, $timeout, pollingIterations;
    var route = '/';

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

        var retries;

        beforeEach(function(){
            retries = 5;
            mockPollResponse('get', route, retries, "response");
        })

        it ('should only poll once if retries is zero', function () {
            $httpoll({method: 'get', url: route, retries: 0})
            flush();
            expectHTTPCount(1)
        })

        it ('should limit polling by the number of retries', function () {
            $httpoll({method: 'get', url: route, retries: 3})
            flush();
            expectHTTPCount(4)
        })

        it ('should retry if it receives a status code in the error range',
            function() {
                $httpoll({method: 'get', url: route, retryOnError: true })
                flush();
                expectHTTPCount(5)
            }
        )

        it ('should not retry if it receives a status code in the success range',
            function() {
                $httpoll({method: 'get', url: route, retryOnError: false})
                flush();
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
            flush();
            expectHTTPCount(5)
        })

        it ('should respect a custom success range', function() {
            $httpoll({
                method: 'get',
                url: route,
                retries: 9,
                successRange: [201, 299]
            })
            flush();
            expectHTTPCount(10)
        })

        it ('should timeout', function() {
            $httpoll({
                method: 'get',
                url: route,
                timeout: 1000,
                delay: 1200,
                retries: 9
            })
            flush(1000);
            expectHTTPCount(1)
        })
    });

    /* GET, DELETE, JSONP */
    ['get','delete','jsonp'].forEach(function(method){

        describe (method+' method', function () {
            var response = "response message";
            var retries = 5;
            beforeEach(function(){
                mockPollResponse(method, route, retries, response)
            });

            it ('should successfully poll a '+method.toUpperCase() +' route',
                function () {
                    var promise = $httpoll[method](route);
                    promise.then(function(r){
                        expect(r).toBe(response);
                    })
                    flush();
                    expectHTTPCount(5)
                }
            );
        });
    });

    /* PUT, POST, PATCH */
    ['put','post','patch'].forEach(function(method){

        describe (method+' method', function () {
            var retries = 5;
            beforeEach(function(){
                mockPollResponse(method, route, retries, "", true)
            });

            it ('should successfully poll a '+method.toUpperCase() +' route\
                and pass data',
                function () {
                    var payload = {foo: 'bar'};
                    var promise = $httpoll[method](route, payload);
                    promise.then(function(r){
                        expect(r).toEqual(payload);
                    })
                    flush();
                    expectHTTPCount(5)
                }
            )

            it ('should not mutate the original config object', function() {
                var config = {retries: 20};
                var promise = $httpoll[method](route, {}, config);
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

    function flush(delay){
        try {
            while (true) {
                $httpBackend.flush();
                $timeout.flush(delay);
            }
        }
        catch (Error) {}
    }

    function $httpSpy () {
        $httpoll.provider = $http;
        spyOn($httpoll,'provider').and.callThrough();
    }

    function expectHTTPCount(count){
        expect($httpoll.provider.calls.count()).toBe(count)
    }
})
