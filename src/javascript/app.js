Ext.define("TSRTM2", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selector_box', layout: 'hbox', defaults: { margin: 5 }},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "TSRTM2"
    },

    alwaysSelectedValues: ['FormattedID','Name'],

    launch: function() {

        var modelNames = ["PortfolioItem/Initiative"];

        this._addSelectors(this.down('#selector_box'));

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: modelNames,
            enableHierarchy: false
        }).then({
            scope: this,
            success: function(store) {
                this._displayGrid(store,modelNames);
            },
            failure: function(msg) {
              // todo
            }
        });
    },

    _shouldShowField: function(field){
        blacklist_fields = ['Workspace','Subscription','ObjectUUID','ObjectID',
            'VersionId','Recycled', 'Rank','DragAndDropRank'];

        if ( field.hidden ) { return false; }
        if ( Ext.Array.contains(blacklist_fields,field.name)) { return false; }
        if ( !field.attributeDefinition ) { return false; }

        var attribute_def = field.attributeDefinition;

        if ( attribute_def.AttributeType == "COLLECTION" ) { return false; }

        return true;
    },

    _addSelectors: function(container){
        var width = 150;

        this.initiativeFieldPicker = container.add({
            xtype:'rallyfieldpicker',
            modelTypes: ['PortfolioItem/Initiative'],
            width: width,
            stateful: true,
            autoExpand: false,
            stateEvents: ['select','change'],
            stateId: this.getContext().getScopedStateId('initiative-fields'),
            fieldLabel: "Initiative Fields",
            alwaysExpanded : false,
            labelAlign: 'top',
            _shouldShowField: this._shouldShowField,
            alwaysSelectedValues: this.alwaysSelectedValues
        });

        this.featureFieldPicker = container.add({
            xtype:'rallyfieldpicker',
            alwaysExpanded : false,
            modelTypes: ['PortfolioItem/Feature'],
            width: width,
            fieldLabel: "Feature Fields",
            stateful: true,
            stateEvents: ['select','change'],
            stateId: this.getContext().getScopedStateId('feature-fields'),
            labelAlign: 'top',
            _shouldShowField: this._shouldShowField,
            alwaysSelectedValues: this.alwaysSelectedValues
        });

        this.storyFieldPicker = container.add({
            xtype:'rallyfieldpicker',
            alwaysExpanded : false,
            modelTypes: ['HierarchicalRequirement'],
            width: width,
            fieldLabel: "Story Fields",
            stateful: true,
            stateEvents: ['select','change'],
            stateId: this.getContext().getScopedStateId('story-fields'),
            labelAlign: 'top',
            _shouldShowField: this._shouldShowField,
            alwaysSelectedValues:this.alwaysSelectedValues
        });

        this.testCaseFieldPicker = container.add({
            xtype:'rallyfieldpicker',
            alwaysExpanded : false,
            modelTypes: ['TestCase'],
            width: width,
            fieldLabel: "TestCase Fields",
            stateful: true,
            stateEvents: ['select','change'],
            stateId: this.getContext().getScopedStateId('testcase-fields'),
            labelAlign: 'top',
            _shouldShowField: this._shouldShowField,
            alwaysSelectedValues: this.alwaysSelectedValues
        });

        this.defectFieldPicker = container.add({
            xtype:'rallyfieldpicker',
            alwaysExpanded : false,
            modelTypes: ['Defect'],
            width: width,
            fieldLabel: "Defect Fields",
            stateful: true,
            stateEvents: ['select','change'],
            stateId: this.getContext().getScopedStateId('defect-fields'),
            labelAlign: 'top',
            _shouldShowField: this._shouldShowField,
            alwaysSelectedValues: this.alwaysSelectedValues
        });

        container.add({
            xtype:'container',
            flex: 1
        });

        container.add({
            xtype: 'rallybutton',
            iconCls: 'icon-export',
            itemId: 'btExport',
            cls: 'rly-small primary',
            disabled: false,
            margin: 5,
            listeners: {
                scope: this,
                click: this._exportData
            }
        });
    },

    _loadWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var default_config = {
            model: 'Defect',
            fetch: ['ObjectID']
        };
        this.logger.log("Starting load:",config.model);
        Ext.create('Rally.data.wsapi.Store', Ext.Object.merge(default_config,config)).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },

    _displayGrid: function(store,modelNames){
        var context = this.getContext();
        //store.load();
        var gb = this.down('#display_box').add({
            xtype: 'rallygridboard',
            context: context,
            toggleState: 'grid',
            modelNames: modelNames,
            stateful: false,
            plugins: [
                {
                    ptype: 'rallygridboardinlinefiltercontrol',
                    inlineFilterButtonConfig: {
                        stateful: true,
                        stateId: context.getScopedStateId('rtm2-filters'),
                        modelNames: modelNames,
                        inlineFilterPanelConfig: {
                            quickFilterPanelConfig: {
                                defaultFields: [
                                    'ArtifactSearch',
                                    'Owner'
                                ]
                            }
                        }
                    }
                }
            ],
            cardBoardConfig: {
                attribute: 'State'
            },
            gridConfig: {
                columnCfgs: [
                     'FormattedID',
                     'Name',
                     'Owner'
                 ],
                 store: store
            },
            height: this.getHeight()
        });
    },

    _getExportColumns: function() {
        var me = this,
            columns = [];

        var fields = Ext.Array.merge([],me.initiativeFieldPicker.getValue() );
        Ext.Array.each(fields, function(field){
            columns.push({
                relativeType: "Initiative",
                dataIndex: field.get('name'),
                text: "Initiative " + field.get('displayName')
            });
        });

        fields = Ext.Array.merge([],me.featureFieldPicker.getValue() );

        Ext.Array.each(fields, function(field){
            columns.push({
                relativeType: "Feature",
                dataIndex: field.get('name'),
                text: "Feature " + field.get('displayName')
            });
        });

        fields = Ext.Array.merge([],me.storyFieldPicker.getValue() );
        Ext.Array.each(fields, function(field){
            columns.push({
                relativeType: "HierarchicalRequirement",
                dataIndex: field.get('name'),
                text: "Story " + field.get('displayName')
            });
        });

        fields = Ext.Array.merge([],me.testCaseFieldPicker.getValue() );
        Ext.Array.each(fields, function(field){
            columns.push({
                relativeType: "TestCase",
                dataIndex: field.get('name'),
                text: "TestCase " + field.get('displayName')
            });
        });

        fields = Ext.Array.merge([],me.defectFieldPicker.getValue() );
        Ext.Array.each(fields, function(field){
            columns.push({
                relativeType: "Defect",
                dataIndex: field.get('name'),
                text: "Defect " + field.get('displayName')
            });
        });

        return columns;
    },

    _getExportConfig: function(initiativeOids) {
        var gridboard = this.down('rallygridboard');

        return Ext.create('RallyTechServices.RequirementsTracabilityMatrix.utils.exportConfiguration',{
            portfolioItemTypes: ['PortfolioItem/Feature','PortfolioItem/Initiative'],
            initiativeObjectIDs: initiativeOids,
            initiativeFilter: gridboard.getGridOrBoard().getStore().filters && gridboard.getGridOrBoard().getStore().filters.items,
            extractFields: this._getExportColumns()
        });
    },

    _exportData: function(){
        var selected_items = this.down('rallygridboard').getGridOrBoard().getSelectionModel().getSelection();
        // And then you can iterate over the selected items, e.g.:
        selected_oids = [];
        Ext.each(selected_items, function (item) {
          selected_oids.push(item.data.ObjectID);
        });

        var exportConfig = this._getExportConfig(selected_oids);
        this.logger.log('_exportData', exportConfig);

        var exporter = Ext.create('RallyTechServices.RequirementsTracabilityMatrix.utils.exporter',{
            exportConfig: exportConfig,
            listeners: {
                scope: this,
                doexporterror: this.showErrorNotification,
                doexportupdate: this.showUpdateNotification,
                doexportcomplete: this.saveExportFile
            }
        });
        exporter.doExport();
    },
    saveExportFile: function(csv){
        Rally.ui.notify.Notifier.hide({});
        var fileName = Ext.String.format("tracability-matrix-{0}.csv",Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s'));
        this.saveCSVToFile(csv,fileName);
    },
    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.hide();
        this.logger.log('showErrorNotification', msg);
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    showUpdateNotification: function(msg){
        this.logger.log('showUpdateNotification', msg);
        Rally.ui.notify.Notifier.show({message: msg});
    },
    saveCSVToFile:function(csv,file_name,type_object){
        if (type_object === undefined){
            type_object = {type:'text/csv;charset=utf-8'};
        }
        this.saveAs(csv,file_name, type_object);
    },
    saveAs: function(textToWrite, fileName)
    {
        if (Ext.isIE9m){
            Rally.ui.notify.Notifier.showWarning({message: "Export is not supported for IE9 and below."});
            return;
        }

        var textFileAsBlob = null;
        try {
            textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
        }
        catch(e){
            window.BlobBuilder = window.BlobBuilder ||
                window.WebKitBlobBuilder ||
                window.MozBlobBuilder ||
                window.MSBlobBuilder;
            if (window.BlobBuilder && e.name == 'TypeError'){
                bb = new BlobBuilder();
                bb.append([textToWrite]);
                textFileAsBlob = bb.getBlob("text/plain");
            }

        }

        if (!textFileAsBlob){
            Rally.ui.notify.Notifier.showWarning({message: "Export is not supported for this browser."});
            return;
        }

        var fileNameToSaveAs = fileName;

        if (Ext.isIE10p){
            window.navigator.msSaveOrOpenBlob(textFileAsBlob,fileNameToSaveAs); // Now the user will have the option of clicking the Save button and the Open button.
            return;
        }

        var url = this.createObjectURL(textFileAsBlob);

        if (url){
            var downloadLink = document.createElement("a");
            if ("download" in downloadLink){
                downloadLink.download = fileNameToSaveAs;
            } else {
                //Open the file in a new tab
                downloadLink.target = "_blank";
            }

            downloadLink.innerHTML = "Download File";
            downloadLink.href = url;
            if (!Ext.isChrome){
                // Firefox requires the link to be added to the DOM
                // before it can be clicked.
                downloadLink.onclick = this.destroyClickedElement;
                downloadLink.style.display = "none";
                document.body.appendChild(downloadLink);
            }
            downloadLink.click();
        } else {
            Rally.ui.notify.Notifier.showError({message: "Export is not supported "});
        }

    },
    createObjectURL: function ( file ) {
        if ( window.URL && window.URL.createObjectURL ) {
            return window.URL.createObjectURL( file );
        }  else if (window.webkitURL ) {
            return window.webkitURL.createObjectURL( file );
        } else {
            return null;
        }
    },

    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },

    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }

});
