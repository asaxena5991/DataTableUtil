/**
* This class serves as Helper Class for NBA
* Modification log:<p />
* -------------------------------------------------------------------------------------------------------------------<p />
* Developer                 Date            Description<p />
* -------------------------------------------------------------------------------------------------------------------<p />
* Sai Vishnu Machapatri     10/19/2020      SALESFORCE-9113/9516 As a CSR I can see a list of next best actions
* Sai Vishnu Machapatri     11/23/2020      SALESFORCE-9115 As a CSR I can select a Next Best Action to deliver to a member
* Sai Vishnu Machapatri     01/20/2021      SALESFORCE-9920: As a CSR, i can Deliver, Dismiss or mark the NBA as completed by member on Member360
* Sai Vishnu Machapatri     04/14/2021      SALESFORCE-10213: As a CSR, I can view the Dispositions from the NBA component without scrolling.
* Sai Vishnu Machapatri     09/08/2021      SALESFORCE-10577: Lens need to handle the different datatypes/Alerts changed into Messages
*
*@author Sai Vishnu Machapatri
*/


import { LightningElement, api, wire } from 'lwc';
import DataTableUtil from 'c/dataTableUtil';
import startRequest from '@salesforce/apexContinuation/NBAController.getNBAData';
import createComm from '@salesforce/apex/NBAController.createCommunication';
import MEMBER_ID from '@salesforce/schema/Contact.Unique_Member_ID__c';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';


import PRIORITY from '@salesforce/label/c.Priority_NBA';
import TITLE from '@salesforce/label/c.Title_NBA';
import CATEGORY from '@salesforce/label/c.Category_NBA';
import NO_DATA from '@salesforce/label/c.NBA_no_data_message';
import HEADER_LABEL from '@salesforce/label/c.NEXT_BEST_ACTION';
import DESCRIPTION from '@salesforce/label/c.Description_NBA';
import NBACOMMRECORDERROR from '@salesforce/label/c.NBACommrecorderror';
import NORECSFOUND from '@salesforce/label/c.NBAErrormessageforservice';
import DISMISSMSG from '@salesforce/label/c.NBADismissMessage';
import CBMMSG from '@salesforce/label/c.NBAcompletedbymembermessage';
import NBA_APEX_EXCEPTION from '@salesforce/label/c.NBAApexException';

export default class NBAMember360 extends LightningElement {
    @api
    recordId;
        
    memberId;
    util;
    pageData;
    tableData = [];
    originalData = [];
    showSpinner = true;
    display = false;
    noRecord = false;
    pageBlockSize = 5;
    keyword;
    serviceFailure = false;
    failureMessage = '';
    showMessage = false;
    successMsg = '';
    msgTimer;
    commErrorMsgTimer;
    showCommErrorMsg = false;
    labels = {  'PRIORITY' : PRIORITY,
                'TITLE' : TITLE,
                'CATEGORY' : CATEGORY,
                'NO_DATA' : NO_DATA,
                'HEADER_LABEL' : HEADER_LABEL,
                'DESCRIPTION' : DESCRIPTION,
                'NBACOMMRECORDERROR' : NBACOMMRECORDERROR,
                'NORECSFOUND' : NORECSFOUND,
                'DISMISSMSG' : DISMISSMSG,
                'CBMMSG' : CBMMSG,
                'NBA_APEX_EXCEPTION' : NBA_APEX_EXCEPTION
            };
    
    actions = [
        { label: 'Deliver', name: 'Deliver' },
        { label: 'Dismiss', name: 'Dismiss' },
        { label: 'Completed by Member', name: 'Completed By Member' }
    ];

    actionStatusMapping = {
        'Deliver' : 'Incomplete',
        'Dismiss' : 'Dismissed',
        'Completed By Member' : 'Completed by Member'
    };
    
    columns = [
        {
            label: this.labels.PRIORITY,
            fieldName: 'nextBestActionPriority',
            type: 'text',
            sortable: true,
        },
        {
            label: this.labels.TITLE,
            fieldName: "nextBestActionName",
            type: "title",
            typeAttributes: { label: { fieldName: "nextBestActionName" }, index: {fieldName: "index"} },
            sortable: true,
        },
        {
            label: this.labels.CATEGORY,
            fieldName: "nextBestActionTheme",
            type: "text",
            sortable: true,
        },
        {
            label: this.labels.DESCRIPTION,
            fieldName: 'nextBestActionDescription',
            type: 'text',
            sortable: true,
        },
        {
            type: 'action',
            typeAttributes: {
                rowActions: this.actions,
                menuAlignment: 'auto'
            }
        }
        
    ];

    rowsPerPageOptions = [
        {
            value: "5",
            label: "5"
        },
        {
            value: "10",
            label: "10"
        },
        {
            value: "25",
            label: "25"
        },
        {
            value: "50",
            label: "50"
        },
        {
            value: "100",
            label: "100"
        }
         
    ];

    constructor() {
        super();
        this.util = new DataTableUtil(5);
    }

    connectedCallback(){
       
    }

    
    @wire(getRecord, { recordId: '$recordId', fields: [MEMBER_ID] })
    ContactRecord({ data, error }) {
            if (data) {
                if (getFieldValue(data, MEMBER_ID) !== null) {
                    this.memberId = getFieldValue(data, MEMBER_ID).toString();
                    this.callContinuation();
                }
            }
            if (error) {
                this.showSpinner = false;
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error !',
                    message: 'There was an error.',
                    vairant: 'error'
                }));
            }
        
    }
    

    // Imperative Call
    callContinuation() {
        startRequest({ strMemberID: this.memberId})
            .then(result => {
                if(result === 'ServiceFailure'){
                    this.serviceFailure = true;
                    this.failureMessage = this.labels.NORECSFOUND;
                    return;
                }
                let results = JSON.parse(result);
                if(!results || results.length === 0){
                    this.noRecord = true;
                    this.showSpinner = false;
                    this.display = true;
                    return;
                }
                this.originalData = results;
                this.tableData = this.processResponse(results);
                this.util.dataList = [...this.tableData];
                this.util.originalDataList = [...this.tableData];
                this.util.setNumberOfPages(this.util.dataList.length);
                this.util.setPageData("1");
                this.pageData = this.util.pageData;
                this.util.sortedBy = 'nextBestActionPriority';
                this.util.sortDirection = 'desc';
                this.util.sortData(this.util.primerPriority, 'number');
                this.pageData = this.util.pageData;
                this.showSpinner = false;
                this.display = true;
                
            })
            .catch(error => {
                this.showSpinner = false;
                this.serviceFailure = true;
                this.failureMessage = this.labels.NBA_APEX_EXCEPTION;
            }
        );
    }

    processResponse(results){
        let output = [];
        let index = 0;
        results.forEach(element => {
            let row = new Object;
            row.nextBestActionName = element.nextBestActionName;
            row.nextBestActionPriority = element.nextBestActionPriority;
            row.nextBestActionDescription = element.nextBestActionDescription;
            if(element.nextBestActionTheme !== undefined && element.nextBestActionTheme !== null && element.nextBestActionTheme !== ''){
                if(element.nextBestActionTheme.toUpperCase() === 'CARE_QUALITY') element.nextBestActionTheme = 'Care/Quality';
                if(element.nextBestActionTheme.toUpperCase() === 'UNDERSTAND_BENEFITS') element.nextBestActionTheme = 'Understand Benefits';
                if(element.nextBestActionTheme.toUpperCase() === 'SELF_SERVICE') element.nextBestActionTheme = 'Self Service';
                if(element.nextBestActionTheme.toUpperCase() === 'PAYMENT') element.nextBestActionTheme = 'Payment';
                if(element.nextBestActionTheme.toUpperCase() === 'PLAN_SELECTION') element.nextBestActionTheme = 'Plan Selection';
            }

            row.nextBestActionTheme = element.nextBestActionTheme;
            row.index = index;
            index++;
            output.push(row);
        });
        return output;
    }
   
    //PAGINATION BEGIN
    changePage(event) {
        let newPageNum = event.target.label;
        this.util.setPageData(newPageNum);
        this.pageData = this.util.pageData;
    }

    get pageList(){
        let pages = [];
        let numOfPages = this.util.pageCount.length;
        let selectedPageBlock = Math.ceil(parseInt(this.util.currentPage)/this.pageBlockSize);

        let pageNumStart = ((selectedPageBlock-1)*this.pageBlockSize)+1;
        let pageNumEnd = selectedPageBlock*this.pageBlockSize >= numOfPages ? numOfPages : selectedPageBlock*this.pageBlockSize;
        while(pageNumStart <= pageNumEnd){
            pages.push({
                num: pageNumStart,
                type: pageNumStart == parseInt(this.util.currentPage) ? 'brand' : 'neutral'
            });
            pageNumStart++;
        }
        return pages;
    }

    nextPage(event) {
        this.util.nextPage();
        this.pageData = this.util.pageData;
    }

    prevPage(event) {
        this.util.prevPage();
        this.pageData = this.util.pageData;
    }

    changeRowsPerPage(event) {
        let newRpp = parseInt(event.target.value);
        this.util.changeRowsPerPage(newRpp);
        this.pageData = this.util.pageData;
    }
    //PAGINATION END
    //SORT BEGIN
    handleSort(event) {
        this.util.sortedBy = event.detail.fieldName;
        this.util.sortDirection = event.detail.sortDirection;
        let fieldName = this.util.sortedBy;

        if (fieldName == 'nextBestActionPriority')
            this.util.sortData(this.util.primerPriority, 'number');
    
        if (fieldName == 'nextBestActionDescription')
            this.util.sortData(null, 'text');
        

        if (fieldName == 'nextBestActionName')
            this.util.sortData(null, 'text');
        
        if (fieldName == 'nextBestActionTheme')
            this.util.sortData(null, 'text');
        
        this.pageData = this.util.pageData;
    }

    convertStringtoNumber(stringval) {
        return parseInt(stringval);

    }

    searchHandler(event){
        let search = event.target.value;
        this.util.searchTable(search);
        this.pageData = this.util.pageData;
    }

    titleClickHandler(event){
        
        const index = event.detail.index;
        this.createCommRecord(this.originalData[index],'Incomplete');
        
    }

    handleRowAction(event){
        const actionName = event.detail.action.name;
        const index = event.detail.row.index;
        this.createCommRecord(this.originalData[index],this.actionStatusMapping[actionName]);
       
    }

    createCommRecord(data,status){
        this.showSpinner = true;
        createComm({contactId:this.recordId,response:JSON.stringify(data),status})
            .then(result => {
                if(status === 'Incomplete'){
                    this.showSpinner = false;
                    this.openSubTab(result);  
                } else{
                    if(this.msgTimer){
                        clearTimeout(this.msgTimer);
                    }
                    if(status === 'Dismissed'){
                        this.successMsg = this.labels.DISMISSMSG;
                        this.showMessage = true;
                    } else{
                        this.successMsg = this.labels.CBMMSG;
                        this.showMessage = true;
                    }
                    
                    this.msgTimer = setTimeout(function() {
                        this.successMsg = '';
                        this.showMessage = false;
                    }.bind(this), 5000);    

                    setTimeout(function() {
                        this.callContinuation();
                    }.bind(this), 5000);
                } 
            })
            .catch(error => {
                this.showSpinner = false;
                this.showCommErrorMsg = true;
                this.commErrorMsgTimer = setTimeout(function() {
                    this.showCommErrorMsg = false;
                }.bind(this), 30000);    
            });
    }

    openSubTab(recordId){
        const event = CustomEvent('opensubtab', {
            composed: true,
            bubbles: true,
            cancelable: true,
            detail: {
                recordId: recordId,
            },
        });
        this.dispatchEvent(event);
    }
    
}