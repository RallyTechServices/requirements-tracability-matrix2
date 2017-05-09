Ext.define('RallyTechServices.RequirementsTracabilityMatrix.utils.exporter',{

    mixins: {
        observable: 'Ext.util.Observable'
    },

    constructor: function(config){

        this.mixins.observable.constructor.call(this, config);

        this.exportConfig = config.exportConfig;
    },

    doExport: function(){

        this.initiatives = [];
        this.features = [];
        this.stories = [];
        this.testCases = [];

        this.fetchInitiatives()
            .then({
                success: this.fetchFeatures,
                failure: this.showErrorNotification,
                scope: this
            })
            .then({
                success: this.fetchStories,
                failure: this.showErrorNotification,
                scope: this
            })
            .then({
                success: this.fetchTestCases,
                failure: this.showErrorNotification,
                scope: this
            })
            .then({
                success: this.fetchDefects,
                failure: this.showErrorNotification,
                scope: this
            })
            .then({
                success: this.processCSV,
                failure: this.showErrorNotification,
                scope: this
            });

    },
    showErrorNotification: function(msg){
        this.fireEvent('doexporterror', msg);
    },
    fetchInitiatives: function(){
        return this._fetchWsapiRecords(this.exportConfig.getInitiativeConfig());
    },
    fetchFeatures: function(initiatives){
        this.initiatives = initiatives;
        this.fireEvent('doexportupdate', "Fetching Portfolio Items...");
        if ( !initiatives || initiatives.length == 0 ) {
            return [];
        }
        return this._fetchWsapiRecords(this.exportConfig.getFeatureConfig(initiatives));
    },
    fetchStories: function(features){
        this.features = features;
        this.fireEvent('doexportupdate', "Fetching User Stories...");
        if ( !features || features.length == 0 ) {
            return [];
        }
        return this._fetchWsapiRecords(this.exportConfig.getStoryConfig(features));
    },
    fetchTestCases: function(stories){
        this.stories = stories;
        this.fireEvent('doexportupdate', Ext.String.format("Fetching Test Cases for {0} User Stories...", stories.length));
        if ( !stories || stories.length == 0 ) {
            return [];
        }
        return this._fetchWsapiRecords(this.exportConfig.getTestCaseConfig(stories));
    },
    fetchDefects: function(testcases){
        this.testCases = testcases;
        this.fireEvent('doexportupdate', Ext.String.format("Fetching Defects for {0} Test Cases...", testcases.length));
        if ( !testcases || testcases.length == 0 ) {
            return [];
        }
        return this._fetchWsapiRecords(this.exportConfig.getDefectConfig(testcases, this.stories));
    },
    processCSV: function(defects){
        this.defects = defects;
        var csv = this.exportConfig.transformRecordsToExtract(this.initiatives, this.features,
            this.stories, this.testCases, this.defects);
        this.fireEvent('doexportcomplete', csv);
    },
    _fetchWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');

        if (!config.limit){
            config.limit = 'Infinity';
        }

        Ext.create('Rally.data.wsapi.Store', config).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    deferred.reject(Ext.String.format("Error loading [{0}] records: {1}", config.model, operation && operation.error && operation.error.errors.join('<br/>')));
                }
            }
        });
        return deferred.promise;
    }

});
