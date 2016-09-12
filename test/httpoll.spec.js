describe('$httpoll service', function () {
    var $httpoll, $httpBackend, $timeout;
    var route = '/';

    beforeEach(module('ngHTTPPoll'));

    beforeEach(inject(function($injector){
        $httpBackend = $injector.get('$httpBackend');
        $httpoll = $injector.get('$httpoll');
        $timeout = $injector.get('$timeout');
    }));


    describe ('get method', function () {
        var response;
        beforeEach(function(){
            response = "response message";
            $httpBackend.whenGET(route)
                .respond(200, response);
        });

        it ('should successfully poll a GET route', function () {
            var promise = $httpoll.get(route)
            promise.then(function(r){
                expect(r).toBe(response);
            })
            $httpBackend.flush();
        })
    })
})
