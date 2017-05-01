describe("Example test set", function() {
    it("should have written tests",function(){
        expect(true).toBe(true);
        expect(Ext.Date.format(new Date(),'Y')).toEqual('2017');
    });
    
    it('should render the app', function() {
        var app = Rally.test.Harness.launchApp("TSRTM2");
        expect(app.getEl()).toBeDefined();
    });
    
});
