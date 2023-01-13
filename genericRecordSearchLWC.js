/*
* @Param    {String}    objectApiName           ApiName of the object to search.            
* @Param    {String[]}  fieldsToSearch          Array of ApiNames of fields to search across.
* @Param    {String[]}  fieldsToDisplay         ARRAY of ApiNames of fields to dispay in search results.
* @Param    {Boolean}   allowMultiSelect        Specify whether the user can make multiple selections or single selection
* @Param    {String}    staticWhereCondition    Specify a Where condition to be used always used while making search.
*                                               Eg. while searching on CASE. (Status != 'Closed') 
*                                               Eg. while searching on CASE. (Status != 'Closed' AND AccountId = '001....XXX')         
* @Param    {String}    label                   Label to display on the search box
* @Param    {Boolean}   required                If set to true displays error on search field if focus is moved away from 
*                                               field without selecting value(s) 
* @method               showErrorWhenValueMissing   Show error on search field if called
* @fires    CustomEvent selectionchanged        Custom event is fired whenever the user changes the 
*                                               Selection. The event details contain the Array of all 
*                                               records selected by the user.                          
*/
import { api, LightningElement ,wire} from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import getRecordsApex from '@salesforce/apex/GenericSearchRecordsComponentCntrl.searchRecords';
import getRecentlyViewedApex from '@salesforce/apex/GenericSearchRecordsComponentCntrl.getRecentlyViewed';


export default class GenericRecordSearchLWC extends LightningElement {
    /***** Public properties ********/
    @api objectApiName;
    @api fieldsToSearch;
    @api fieldsToDisplay;
    @api allowMultiSelect = false;
    @api staticWhereCondition;
    @api label;
    @api required = false;
    
    /***** Public methods *****/
    @api
    showErrorWhenValueMissing(){
        this.showRequiredMessage();
    }

    /*********Private properties *******/
    objectLabel; // 
    iconName; // Object icon
    searchKeyword = ''; // search keyword used in searching
    fieldLabels; // array of fields labels to be displayed
    selectedItemsPills = []; // pills of selected records in multiselect mode
    display; //Boolean to control result display
    mapOfIdAndRecords; // Map of ID and record 
    displayList; //array of records to display on UI
    selectedRecordsMap = new Object();
    timeout; // timeout variable for delayed search
    displaySpinner = true; // control spinner visibility
    recordSelected = false; // used to determine if the record is selected in single select mode
    selectedPill; // selected record pill in single select mode
    recentRecords; // Array to store recent records
    showingRecent = false; // True is currently recent records are shown
    recentRecordsLoaded = false; // True if recent record is loaded
    blurTimeout;
    
    /*
    * DESC: Connected callback
    */
    connectedCallback(){
        this.getRecentlyViewed();
    }

    /*
    * DESC: Wire method to get object Label and Icon
    */
    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    handleResult({error, data}) {
        if(data) {
            let objectInformation = data;
            if(!this.label){
                //get object label and set it in variable
                this.objectLabel = objectInformation.label;
                this.label = 'Search ' + this.objectLabel;
            }
            //get iconUrl and parse iconName
            let iconUrl = objectInformation.themeInfo.iconUrl;
            let urlSplit = iconUrl.split('/');
            let category = urlSplit[urlSplit.length-2];
            let name = urlSplit[urlSplit.length-1];
            name = name.split('_')[0];
            this.iconName = category + ':' + name;
        }
        if(error) {
            // handle error
        }
    }

    /*
    * DESC: Get the recently viewed records
    */
    getRecentlyViewed(){
        getRecentlyViewedApex({objectApiName:this.objectApiName,fieldsToDisplay:this.fieldsToDisplay,staticCondition:this.staticWhereCondition})
            .then(result => {
                this.recentRecords = result;
                this.recentRecordsLoaded = true;
                if(this.showingRecent){
                    this.showRecentlyViewed();
                }
            })
            .catch(error => {
                console.log('ERROR getRecentlyViewed:'+error.body.message);
            });
    }

    /*
    * DESC: Add recently viewed records to data sets which display on the UI
    */
    showRecentlyViewed(){
        let recentRecords = this.recentRecords;
        if(recentRecords){
            if(recentRecords.records){
                this.convertToMap(recentRecords.records);
                this.convertToDisplayMap(recentRecords.records);
            }
            if(recentRecords.fieldLabels){
                this.fieldLabels = recentRecords.fieldLabels;
            }
        }   
        this.hideSpinner();
    }

    /*
    *   DESC: Called when user input is changed. Sets a delay before calling apex for changed input.
    */
    delayedSearch(event){
        if (this.timeout) {  
            clearTimeout(this.timeout);
        }
        this.searchKeyword = event.target.value;
        this.timeout = setTimeout(function() {
            this.onchangeSearchKeyword(); 
        }.bind(this), 1000);
    }

    /*
    *   DESC: Call APEX to retrive results from the for the search keyword.
    */
    onchangeSearchKeyword(){
            if(this.searchKeyword.trim().length>0){
                this.showingRecent = false;
                this.showResultBox();
                this.showSpinner();
                //retrieve records based on search input
                getRecordsApex({objectApiName:this.objectApiName,fieldsToSearch:this.fieldsToSearch,fieldsToDisplay:this.fieldsToDisplay,keyword:this.searchKeyword,staticCondition:this.staticWhereCondition})
                .then(result => {
                    if(result.records){
                        this.convertToMap(result.records);
                        this.convertToDisplayMap(result.records);
                    }
                    if(result.fieldLabels){
                        this.fieldLabels = result.fieldLabels;
                    }
                    
                    this.records = result;
                    this.hideSpinner();
                })
                .catch(error => {
                    console.log('Error onchangeSearchKeyword:'+JSON.stringify(error));
                });
            } else{
                this.showingRecent = true;
                this.showRecentlyViewed();
            }                
    }

    /*
    * DESC: Convert the results into a map of ID and record.
    */
    convertToMap(data){
        this.mapOfIdAndRecords = data.reduce(function(map, obj) {
            map[obj.Id] = obj;
            return map;
        }, {});
    }

    /*
    * DESC: Convert the results into an Array so that they can be displayed on the UI
    *       Due to the dynamic nature of the component data cannot be accessed with field Names.
    *       So an Array of reoord values is needed to iterate on the UI
    */
    convertToDisplayMap(data){
        //Convert the fieldstoDisplay input to the component and the field API Names in the data retrived
        //from apex into lowercase so that they can be accessed dynamically
        let fields = this.convertArrayToLowerCase(this.fieldsToDisplay);
        let records = this.convertArrayOfObjectToLowerCase(data);
        this.displayList = records.map(function(obj) {
            let element = {};
            element.key = obj.id;
            element.value = [];
            fields.forEach(ele => {
                let val = obj[ele];
                //if a certain field is not returned in response Apex then put a blank value
                //for that field position in array to maintain consistency for iteration on the UI
                if(val === undefined || val == null){
                    val = '';
                }
                element.value.push(val);
            });
            return element;
        });
    }

    /*
    * DESC: Converts all elements of the input Array to Lowercase and returns the new Array
    */
    convertArrayToLowerCase(data){
        let newArray = data.map(function(ele){
            return ele.toLowerCase();
        });
        return newArray;
    }

    /*
    * DESC: Given an Array of Object, converts the keys of the Objects to LowerCase and returns the new Array
    */
    convertArrayOfObjectToLowerCase(data){
        let newArray = data.map(function(ele){
            return this.convertObjectKeysToLowerCase(ele);
        }.bind(this));
        return newArray;
    }

    /*
    * DESC: Convert the keys of the input Object to LowerCase 
    */
    convertObjectKeysToLowerCase(data){
        let key; 
        let keys = Object.keys(data);
        let n = keys.length;
        let newobj={}
        while (n--) {
            key = keys[n];
            newobj[key.toLowerCase()] = data[key];
        }
        return newobj;
    }

    /*
    * DESC: Handler for record selection
    */
    handleSelect(event){
        let selectedIndex = event.currentTarget.dataset.item;
        let selectedRecordId = this.displayList[selectedIndex].key;
        let SelectedRecordValues = this.displayList[selectedIndex].value;
        if(this.allowMultiSelect){
            if(!this.selectedRecordsMap[selectedRecordId]){
                this.selectedRecordsMap[selectedRecordId] = this.mapOfIdAndRecords[selectedRecordId];
                let selectedItemPill = {label:SelectedRecordValues[0],value:selectedRecordId};
                this.selectedItemsPills = [...this.selectedItemsPills,selectedItemPill];
                this.selectionChangedEvent();
            } 
        } else {
            this.selectedRecordsMap[selectedRecordId] = this.mapOfIdAndRecords[selectedRecordId];
            this.selectedPill = {label:SelectedRecordValues[0],value:selectedRecordId};
            this.recordSelected = true;
            this.hideResultBox();
            this.selectionChangedEvent();
        }
    }

    /*
    * DESC: Handler for record removal
    */
    handleRemoveRecord(event){
        this.clearBlurTimeout();
        let removedId = event.currentTarget.dataset.item;
        delete this.selectedRecordsMap[removedId];
        if(this.allowMultiSelect){
            this.selectedItemsPills = this.selectedItemsPills.filter(item => item.value  != removedId); 
        } else{
            this.selectedPill = {};
            this.recordSelected = false;
            this.searchKeyword = '';
            this.displayList = [];
        }
        this.selectionChangedEvent();
    }

    /*
    * DESC: Fires a custom event. Call this whenever selection is changed
    */
    selectionChangedEvent(){
        let selectedRecordsList = Object.values(this.selectedRecordsMap);
        const scEvent = new CustomEvent('selectionchanged',{
            detail: selectedRecordsList
        });
        this.dispatchEvent(scEvent);
    }
    
    /*
    * DESC: Close the result box when Selection is done
    */
    handleDoneClick(){
        this.hideResultBox();
        this.searchKeyword = '';
        this.displayList = [];
    }

    /*
    * DESC: when focus is moved to the input search keyword field. Show the Recently viewed records
    */
    handleOnFocus(){
        this.clearBlurTimeout();
        this.hideRequiredMessage();
        if(this.searchKeyword.trim().length === 0){
            this.showResultBox();
            this.showingRecent = true;
            if(this.recentRecordsLoaded){
                this.showRecentlyViewed();
            }
        } else{
            this.showResultBox();
        }
    }

    /*
    * DESC: shows the results box
    */
    showResultBox(){
        this.template.querySelector(".toggleResultDisplay").classList.add("slds-is-open");
        this.template.querySelector(".toggleResultDisplay").classList.remove("slds-is-close");
    }

    /*
    * DESC: hides the results box
    */
    hideResultBox(){
        //Add Error if required and record not selected
        if(this.required && ((!this.allowMultiSelect && !this.recordSelected) || (this.allowMultiSelect && this.selectedItemsPills.length === 0))){
            this.showRequiredMessage();
        }

        //Hide the results box
        this.template.querySelector(".toggleResultDisplay").classList.add("slds-is-close");
        this.template.querySelector(".toggleResultDisplay").classList.remove("slds-is-open");   
    }

    /*
    * DESC: show required error message
    */
    showRequiredMessage(){
        const searchBox = this.template.querySelector(".singleSelectSearch");
        if(searchBox){
            searchBox.setCustomValidity("Complete this field.");
            searchBox.reportValidity();
        }
    }

    /*
    * DESC: hide required error message
    */
    hideRequiredMessage(){
        const searchBox = this.template.querySelector(".singleSelectSearch");
        if(searchBox){
            searchBox.setCustomValidity("");
            searchBox.reportValidity();
        }
    }

    /*
    * DESC: Show Spinner
    */  
    showSpinner(){
        this.displaySpinner = true;
    }

    /*
    * DESC: Hide Spinner
    */
    hideSpinner(){
       this.displaySpinner = false; 
    }

    /*
    * DESC: Clear the blurTimeout.
    */
    clearBlurTimeout(){
        if (this.blurTimeout) {  
            clearTimeout(this.blurTimeout);
        }
    }

    /*
    * DESC: Fired when focus is lost from the combobox.
    *       Used to set a timeout and then hide the search results box.
    *       DOES NOT hide the search result box if object is Knowledge, since hover is enabled for it.
    */
    onBlurHandler(){
        //If it is knowledge object then do not close the search results box
        if(this.isKnowledgeObject()) 
        return;
        this.blurTimeout = setTimeout(function() {
            this.hideResultBox(); 
        }.bind(this), 200);
    }
    
    /******************************Knowledge object specific code. *********************************/
    
    /*
    * DESC: Handler to show popover. 
    *       Fires a custom Event to parent component only if the search object is Knowledge.
    */
    showPopover(event){
        if(!this.isKnowledgeObject())
        return;
        
        let element = event.target;
        let coord = element.getBoundingClientRect();
                
        let selectedIndex = event.currentTarget.dataset.item;
        let selectedRecordId = this.displayList[selectedIndex].key;
        
        let eventData = {
            coordinates: coord,
            recordId: selectedRecordId
        };
        const showPopoverEvent = new CustomEvent('showpopover',{
            detail: eventData
        });
        this.dispatchEvent(showPopoverEvent);
    }

    /*
    * DESC: Handler to hide popover. 
    *       Fires a custom Event to parent component only if the search object is Knowledge.
    */
    hidePopover(){
        if(!this.isKnowledgeObject())
        return;
        
        const hidePopoverEvent = new CustomEvent('hidepopover',{
            detail: 'visibility:hidden;'
        });
        this.dispatchEvent(hidePopoverEvent);
    }

    /*
    * DESC: Check if the search object is KnowledgeArticleVersion 
    */
    isKnowledgeObject(){
        if(this.objectApiName.toLowerCase() === 'knowledgearticleversion'){
            return true;
        } 
        return false;
    }

    /*
    * DESC: Getter for css class applied to first table column Text. If knowledge object then apply
    *       CSS class to show text as hoverable. Otherwise show as plain text.
    */
    get firstColumnClass(){
        if(this.isKnowledgeObject()){
            return 'hoverLink slds-m-left_x-small';
        } else{
            return 'slds-m-left_x-small';
        }
    }
}