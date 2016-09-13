describe('$httpoll service', function () {
    var $httpoll, $httpBackend, $timeout, pollingIterations;
    var route = '/';

    beforeEach(module('ngHTTPPoll'));

    beforeEach(inject(function($injector){
        $httpBackend = $injector.get('$httpBackend');
        $httpoll = $injector.get('$httpoll');
        $timeout = $injector.get('$timeout');
    }));

    beforeEach(function(){
        pollingIterations = 0;
        spyOn($httpoll, 'poll').and.callThrough()
    });


    describe('poll method', function () {
        var retries;

        beforeEach(function(){
            retries = 5;
            mockPollResponse('get', route, retries, "response");
        })

        it ('should only poll once if retries is zero', function () {
            $httpoll.poll('get', route, {}, {retries: 0})
            flush();
            expect($httpoll.poll.calls.count()).toBe(1)
        })

        it ('should limit polling by the number of retries', function () {
            $httpoll.poll('get', route, {}, {retries: 3})
            flush();
            expect($httpoll.poll.calls.count()).toBe(4)
        })

        it ('should retry if it receives a status code in the error range',
            function() {
                $httpoll.poll('get', route, {}, {retryOnError: true})
                flush();
                expect($httpoll.poll.calls.count()).toBe(5)
            }
        )

        it ('should not retry if it receives a status code in the success range',
            function() {
                $httpoll.poll('get', route, {}, {retryOnError: false})
                flush();
                expect($httpoll.poll.calls.count()).toBe(1)
            }
        )

        it ('should respect a custom error range', function() {
            mockPollResponse('get', route, retries, "response");
            $httpoll.poll('get', route, {}, {
                errorRange: [500, 599],
                retryOnError: false
            })
            flush();
            expect($httpoll.poll.calls.count()).toBe(5)
        })

        it ('should respect a custom success range', function() {
            $httpoll.poll('get', route, {}, {
                retries: 9,
                successRange: [201, 299]
            })
            flush();
            expect($httpoll.poll.calls.count()).toBe(10)
        })

        it ('should timeout', function() {
            $httpoll.poll('get', route, {}, {
                timeout: 1000,
                delay: 1200,
                retries: 9
            })
            flush(1000);
            expect($httpoll.poll.calls.count()).toBe(1)
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
                    expect($httpoll.poll.calls.count()).toBe(5);
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
                    expect($httpoll.poll.calls.count()).toBe(5);
                }
            )
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
})
