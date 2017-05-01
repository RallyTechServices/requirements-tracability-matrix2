Ext.define('RallyTechServices.RequirementsTracabilityMatrix.utils.exportConfiguration',{

    //initiativeObjectID
    initiativeObjectIDs: [],
    portfolioItemTypes: null,

    extractFields: null,


    constructor: function(config){
        this.portfolioItemTypes = config.portfolioItemTypes;
        this.initiativeObjectIDs = config.initiativeObjectIDs;

        this.extractFields = config.extractFields;
    },
    /**
     * transformRecordsToExtract
     * @param initiatives
     * @param features
     * @param stories
     * @param testCases
     * @param defects
     *
     * Using the configuration in this object, transform the data in the records to the desired extract
     *
     */
    transformRecordsToExtract: function(initiatives, features, stories, testCases, defects){
        //console.log('transformRecordsToExtract', initiatives, features, stories, testCases);
        var initiativeMap = {};
        for (var k=0; k<initiatives.length; k++){
            var oid = initiatives[k].get('ObjectID');
            initiativeMap[oid] = initiatives[k].getData();
            initiativeMap[oid]._kids = [];
        }

        var featureMap = {};
        for (var k=0; k<features.length; k++){
            var feature = features[k].getData();
            feature._kids = [];
            featureMap[feature.ObjectID] = feature;
            if (feature.Parent){
                var parent_oid = feature.Parent.ObjectID;
                initiativeMap[parent_oid]._kids.push(feature);
            }
        }
        
        var storyMap = {};
        for (var k=0; k<stories.length; k++){
            var story = stories[k].getData();
            storyMap[story.ObjectID] = story;
            story._kids = [];
            if (story.PortfolioItem){
                var parent_oid = story.PortfolioItem.ObjectID;
                featureMap[parent_oid]._kids.push(story);
            } else if (story.Feature){
                var parent_oid = story.Feature.ObjectID;
                featureMap[parent_oid]._kids.push(story);
            }
        }

        var testCaseMap = {};
        for (var k=0; k<testCases.length; k++){
            var tc = testCases[k].getData();
            tc._kids = [];
            testCaseMap[tc.ObjectID] = tc;

            if (tc.WorkProduct){
                
                var parent_oid = tc.WorkProduct.ObjectID;
                storyMap[parent_oid]._kids.push(tc);
            }
        }

        var defectMap = {};
        for (var k=0; k<defects.length; k++){
            var defect = defects[k].getData();
            defect._kids = [];
            defectMap[defect.ObjectID] = defect;
            if (defect.TestCase){
                var parent_oid = defect.TestCase.ObjectID;
                testCaseMap[parent_oid]._kids.push(defect);
            }
        }
        
        var csv = [],
            row = [];

        //start with the column headers
        for (var j= 0; j < this.extractFields.length; j++){
            row.push(this.scrubCell(this.extractFields[j].text));
        }
        csv.push(row.join(','));

        Ext.Object.each(initiativeMap, function(key,initiative) {
            row = [];
            var fields = this.getFieldsFor('Initiative');
            for (var j=0; j<fields.length; j++ ) {
                row.push(this.scrubCell(initiative[fields[j].dataIndex]));
            }
            csv.push(row.join(','));
            csv = Ext.Array.push(csv, this._getChildRows(row, initiative, "Feature"));
        },this);

        return csv.join('\r\n');
    },
    
    _getChildRows: function(row_start, parent, child_type) {
        var csv = []; 

        Ext.Array.each(parent._kids, function(child) {
            var child_row = Ext.clone(row_start);
            var fields = this.getFieldsFor(child_type);
            for (var j=0; j<fields.length; j++ ) {
                child_row.push(this.scrubCell(child[fields[j].dataIndex]));
            }
            csv.push(child_row.join(','));
            
            var grandchild_type = this._getChildTypeFor(child_type);
            
            if ( grandchild_type ) {
                csv = Ext.Array.push(csv, this._getChildRows(child_row, child,grandchild_type));
            }
        },this);
        return csv;
    },
    
    _getChildTypeFor: function(type){
        var mapper = {
            "Initiative": "Feature",
            "Feature":"HierarchicalRequirement",
            "HierarchicalRequirement": "TestCase",
            "TestCase": "Defect",
            "Defect": null
        }
        return mapper[type];
    },
    
    scrubCell: function(val){
        var re = new RegExp(',|\"|\r|\n','g'),
            reHTML = new RegExp('<\/?[^>]+>', 'g'),
            reNbsp = new RegExp('&nbsp;','ig');

        if (/<br\s?\/?>/.test(val)){
            val = val.replace(/<br\s?\/?>/g,'\n')
        }

        //Strip out HTML tags, too
        if (reHTML.test(val)){
            val = Ext.util.Format.htmlDecode(val);
            val = Ext.util.Format.stripTags(val);
        }

        if (reNbsp.test(val)){
            val = val.replace(reNbsp,' ');
        }

        if (re.test(val)){ //enclose in double quotes if we have the delimiters
            val = val.replace(/\"/g,'\"\"');
            val = Ext.String.format("\"{0}\"",val);
        }

        return val;
    },
    getCellData: function(extractField, artifact, initiativeMap, featureMap, storyTestCaseMap){

        if (!extractField || !extractField.dataIndex){
            return null;
        }

        var val = null;
        if (!extractField.relativeType){
            val = artifact[extractField.dataIndex];
        }

        if (extractField.relativeType === "Feature"){
            var featureId = artifact[this.getFeatureName()].ObjectID;
            val = featureMap[featureId] && featureMap[featureId][extractField.dataIndex];
        }

        if (extractField.relativeType === "Initiative"){
            var featureId = artifact[this.getFeatureName()].ObjectID,
                feature = featureMap[featureId],
                initiativeId = feature && feature['Parent'] && feature['Parent'].ObjectID || null,
                initiative = initiativeId && initiativeMap[initiativeId];

            val = initiative && initiative[extractField.dataIndex];
        }

        if (extractField.relativeType === 'TestCases'){
            var testCases = storyTestCaseMap[artifact.ObjectID];

            if (testCases && testCases.length > 0){
                val = _.pluck(testCases, extractField.dataIndex);
                val = val.join('\n');
            }
        }

        if (Ext.isObject(val)){
            val = val._refObjectName || val.Name;
        }

        return this.scrubCell(val);
    },
    getInitiativeFetch: function(){
        var fetch = ['ObjectID','FormattedID'];
        Ext.Array.each(this.extractFields, function(f){
            if (f.relativeType === 'Initiative'){
                fetch.push(f.dataIndex);
            }
        });
        return fetch;
    },
    getFeatureFetch: function(){
        var fetch = ['ObjectID','FormattedID','Parent'];
        Ext.Array.each(this.extractFields, function(f){
            if (f.relativeType === 'Feature'){
                fetch.push(f.dataIndex);
            }
        });
        return fetch;
    },
    getStoryFetch: function(){
        var fetch = ['ObjectID','FormattedID','TestCases','Defects','PortfolioItem',this.getFeatureName()];
        Ext.Array.each(this.extractFields, function(f){
            if (f.relativeType === 'HierarchicalRequirement'){
                fetch.push(f.dataIndex);
            }
        });
        return fetch;
    },
    getDefectFetch: function(){
        var fetch = ['ObjectID','FormattedID','TestCase'];
        Ext.Array.each(this.extractFields, function(f){
            if (f.relativeType === 'Defect'){
                fetch.push(f.dataIndex);
            }
        });
        return fetch;
    },
    getTestCaseFetch: function(){
        var fetch = ['ObjectID','FormattedID','Name','Defects','LastVerdict','WorkProduct'];
        Ext.Array.each(this.extractFields, function(f){
            if (f.relativeType === 'TestCases'){
                fetch.push(f.dataIndex);
            }
        });
        return fetch;
    },
    getFieldsFor: function(name){
        var fields = Ext.Array.filter(this.extractFields, function(f){
            return (f.relativeType === name);
        });
        return fields;
    },

    getFeatureName: function(){
        return this.portfolioItemTypes[0].replace('PortfolioItem/','');
    },
    getInitiativeConfig: function(){
        var filters = [];
        for (var i=0; i<this.initiativeObjectIDs.length; i++){
            filters.push({
                property: "ObjectID",
                value: this.initiativeObjectIDs[i]
            });
        }

        if (filters && filters.length > 1){
            filters = Rally.data.wsapi.Filter.or(filters);
        }
        
        return {
            model: this.portfolioItemTypes[1],
            fetch: this.getInitiativeFetch(),
            filters: filters
        };
    },
    getFeatureConfig: function(initiatives){
         var filters = [];
         for (var i=0; i<initiatives.length; i++){
            filters.push({
                property: "Parent.ObjectID",
                value: initiatives[i].get('ObjectID')
            });
        }

        if (filters && filters.length > 1){
            filters = Rally.data.wsapi.Filter.or(filters);
        }
        
        return {
            model: this.portfolioItemTypes[0],
            fetch: this.getFeatureFetch(),
            filters: filters
        };
    },
    getStoryConfig: function(features){
        var filters = [],
            featureName = this.getFeatureName();
            
         for (var i=0; i<features.length; i++){
            filters.push({
                property: featureName + ".ObjectID",
                value: features[i].get('ObjectID')
            });
        }

        if (filters && filters.length > 1){
            filters = Rally.data.wsapi.Filter.or(filters);
        }
        return {
            model: 'HierarchicalRequirement',
            fetch: this.getStoryFetch(),
            filters: filters
        };
    },
    getTestCaseConfig: function(stories){
        var filters = [];

        for (var i=0; i<stories.length; i++){
            if (stories[i].get('TestCases') && stories[i].get('TestCases').Count > 0){
                filters.push({
                    property: "WorkProduct.ObjectID",
                    value: stories[i].get('ObjectID')
                });
            }
        }

        if (filters && filters.length > 1){
            filters = Rally.data.wsapi.Filter.or(filters);
        }
        return {
            model: 'TestCase',
            fetch: this.getTestCaseFetch(),
            filters: filters,
            enablePostGet: true
        };
    },
    getDefectConfig: function(testcases){
        var filters = [];

        for (var i=0; i<testcases.length; i++){
            if (testcases[i].get('Defect') && testcases[i].get('Defects').Count > 0){
                filters.push({
                    property: "TestCase.ObjectID",
                    value: testcases[i].get('ObjectID')
                });
            }
        }

        if (filters && filters.length > 1){
            filters = Rally.data.wsapi.Filter.or(filters);
        }
        return {
            model: 'Defect',
            fetch: this.getDefectFetch(),
            filters: filters,
            enablePostGet: true
        };
    }
});