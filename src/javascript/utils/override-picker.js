Ext.override(Rally.ui.picker.FieldPicker,{
    setValue: function(values) {

        if (this.store) {
            if (Ext.isString(values)) {
                // convert customField -> c_customField, in case called with old wsapi1.x values while in 2.x
                var models = _.values(this.models),

                    fieldNames = _(values.split(',')).map(function(value) {
                        var modelFields = _(models).invoke('getField', value).compact().value(),
                            builtInFields = _.filter(modelFields, {custom: false}),
                            customFields = _.difference(modelFields, builtInFields);
                        return builtInFields.length === 0 ? customFields : builtInFields;
                    }).flatten().compact().pluck('name').unique().value();

                this.callParent([fieldNames.join(',')]);
            } else {
                this.callParent(arguments);
            }
        } else {
            this._loadStore();
            this.on('fieldpickerstoreloaded', function() {
                this.setValue(values);
            }, this);
        }
    },
    getState: function(){
      var valueField = 'name';
      return {value: Ext.Array.map(this.getValue(), function(v){ return v.get(valueField); }).join(',')};
    },
    applyState: function(state) {
      if (state && state.value) {
          this.setValue(state.value);
      }
    }
});
