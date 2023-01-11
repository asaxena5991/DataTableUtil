/**
 * SALESFORCE-8565: Navigate to Benefits Page from Member Eligibility & Benefits Tab
 *                  Component to dispaly the Benefit Information.
 * Modification log:
 * -------------------------------------------------------------------------------------
 * Developer                            Date                    Description
 * -------------------------------------------------------------------------------------
 * Seba Nasir                         08/13/2021                Original version
 * Seba Nasir                         08/23/2021                Modified for review comments
 * Seba Nasir                         08/25/2021                Modified for review comments 
 * Seba Nasir                         08/30/2021                SALESFORCE-8592 Accumulators section in Benefits page 
 * Seba Nasir                         11/16/2021                SALESFORCE-10658 Reload Button 
 * Seba Nasir                         11/23/2021                Modified for SALESFORCE-10979   
 * Seba Nasir                         12/02/2021                Modified for SALESFORCE-8560 Autodocumentation
 * Seba Nasir                         12/07/2021                Modified for SALESFORCE-8560 Review comments
 * Seba Nasir                         12/09/2021                Modified for SALESFORCE-10618 Autodocumentation
 * Seba Nasir                         12/13/2021                Modified for SALESFORCE-10795 Autodocumentation
@author  Seba Nasir
*/
import { LightningElement, track, api, wire } from 'lwc';
import startBenefitsCalloutLEX from '@salesforce/apex/BenefitsController_LEX.startBenefitsCalloutLEX';
import getBenefitCategoryDataLEX from "@salesforce/apex/BenefitsController_LEX.getBenefitCategoryData_LEX";
import { formatCurrency } from "c/generalUtils";
import DataTableUtil from "c/dataTableUtil";
import BenefitsSummaryDescription_Label from "@salesforce/label/c.BenefitsSummaryDescription"; //SALESFORCE-10658
import BenefitsDetailDescription_Label from "@salesforce/label/c.BenefitsDetailDescription"; //SALESFORCE-10658
import BenefitsCOPAY_Label from "@salesforce/label/c.BenefitsCOPAY"; //SALESFORCE-10658
import BenefitsCoinsurance_Label from "@salesforce/label/c.BenefitsCoinsurance"; //SALESFORCE-10658
import BenefitsDeductible_Label from "@salesforce/label/c.BenefitsDeductible"; //SALESFORCE-10658
import BenefitsLimit_Label from "@salesforce/label/c.BenefitsLimit"; //SALESFORCE-10658
import BenefitsSelectDate_Label from "@salesforce/label/c.BenefitsSelectDate"; //SALESFORCE-10658
import BenefitsListofCoveredBenefits_Label from "@salesforce/label/c.BenefitsListofCoveredBenefits"; //SALESFORCE-10658

export default class BenefitsAndAccumulatorsLWC extends LightningElement {
@api asofDate;
@api productCategoryCode;
@api memberId;//Name field of Member 
@api strSummaryCode = '';//SALESFORCE-8560 
@api summaryDescription;//SALESFORCE-8560
@track benefitOptions = [];  
mapForCallout = {};
benefitData; //to display the benefit summary datatable results. 
@track pageData = [];
searchValue;
responseData;
isSearchFilter = false;//Show total records records in UI on search filter
exception ='';
error='';
benefitDataLoaded = false;
isError = false; 
showSpinner = true; 
//used to sort currencies
listToSort = [];//holds benefit data with numeric values for currency (without $ symbol)
charInitial='';
charRest=''; 
showSubstring = false;
viewMoreOrLessLink='';
benefitsCalloutDone = false; 
@track benefitCategoryOptions = []; //SALESFORCE-8560 
@track mapCategoryKeyValue={};//SALESFORCE-8560
selectedBenefitCategories = [];//SALESFORCE-8560
showCategoryDropdown = false; //SALESFORCE-8560 
categoryCount = 0;//SALESFORCE-8560 
categoryDropdownLabel = 'Benefit Categories';//SALESFORCE-8560
countvalue = 'Please select a Benefit Category';//SALESFORCE-8560 
benefitSummaryQuoteData;//SALESFORCE-8560 
//to pass the updated quoted data from Parent to Child component
@api benefitQuotedDataFromParent; //SALESFORCE-10618

label = { //SALESFORCE-10658
  BenefitsSummaryDescription_Label,
  BenefitsSelectDate_Label, 
  BenefitsListofCoveredBenefits_Label,
  BenefitsSummaryDescription_Label,
  BenefitsDetailDescription_Label,  
  BenefitsCOPAY_Label, 
  BenefitsCoinsurance_Label,  
  BenefitsDeductible_Label, 
  BenefitsLimit_Label
};

benefitColumns = [ 
//SALESFORCE-10795  
{
  label: "",
  type: "customcheckbox", 
  initialWidth:10,
  typeAttributes: {
    selected: { fieldName: "isselected" },
    type:"benefitdetail",
    value: { fieldName: "benefitdetailtoquote" } 
  }
},
  {   
  label: BenefitsDetailDescription_Label,
  fieldName: 'bsdlCodeDescription', 
  sortable: true,
  wrapText : false
},
{ 
  label: BenefitsCOPAY_Label, 
  fieldName: 'copay', 
  type: "text", 
  sortable: true 
},
{   
  label: BenefitsCoinsurance_Label, 
  fieldName: 'coinsurance', 
  type: "text", 
  sortable: true,
  initialWidth : 140 
},
{   
  label: BenefitsDeductible_Label,
  fieldName: 'deductible', 
  type: "text", 
  sortable: true 
},
{  
  label: BenefitsLimit_Label,
  fieldName: 'limit_Z',
  type: "text", 
  sortable: true  
}];

rowsPerPageOptions = [
  {
    value: "10",
    label: "10"
  },
  {
    value: "20",
    label: "20"
  }, 
  {
    value: "30",
    label: "30"
  }
];

constructor() {
  super();
  this.util = new DataTableUtil(10);
}

connectedCallback(){   
  //Display As of date in correct format
  this.handleAsOfDateDisplay(); 

  //initiate callout to load the covered benefits dropdown values &Benefit summary data   
  this.invokeBenefitCallout(true); 
}

handleAsOfDateDisplay(){
  let today = new Date();
  let thisDay;
  let monthToday = ("0" + (today.getMonth() + 1)).slice(-2);
  let intTodayDate = ("0" + today.getDate()).slice(-2); 
  this.asofDate =  today.getFullYear() + '-' + monthToday + '-' + intTodayDate;
}

//SALESFORCE-8560 Benefit Categories
//Retrieving custom setting Benefit Categories passed from apex
@wire(getBenefitCategoryDataLEX) 
  benefitCategory({ data }) {
  if (data) {
    this.mapCategoryKeyValue = data; 
  } 
} 

invokeBenefitCallout(sortResultAsc){   
this.showSpinner = true;
this.mapForCallout = {'asofdate'            : this.asofDate ,
                      'memberid'            : this.memberId,
                      'productcategorycode' : this.productCategoryCode
                     }; 
startBenefitsCalloutLEX({benefitRequestMap : this.mapForCallout})
.then((response)=>{
  this.showSpinner = false;

  //responsedata holds all the data coming in response
  //data related to covered benefits combobox values, data for benefit detail, benefit summary.
  this.responseData = response;  
  this.exception =''; 

  if(response.hasOwnProperty('lstBenefitsListofCoveredBenefits') && 
    response.lstBenefitsListofCoveredBenefits != {}){
    //load the values to the  Covered Benefits Dropdown combobox
    this.getCoveredBenefits(response.lstBenefitsListofCoveredBenefits);
  }

  if(response.hasOwnProperty('mapBenefitSummaries') && response.hasOwnProperty('strChkMapKey')){
    //Populate Summary Description Field
    this.displaySummaryDescription(response); 
  } 

  if(response.hasOwnProperty('mapBsdl')){
    //load the Benefits record on the Table
    //benefitData holds value displayed in datatble
    this.benefitData = this.processResponse(response.mapBsdl); 
    this.displayPaginated(this.benefitData,sortResultAsc);
  }

  if(response.hasOwnProperty('noDataAvailable')){
    //Apex class returns noDataAvailable if, no data from callout
    this.pageData = [];
    this.displayPaginated(this.pageData,false); 
  }

  if(response.hasOwnProperty('error')){
    //Apex class returns error if there is a webservice failure
    this.exception = response.error; 
    this.error = ''; 
    this.isError = false;
  }
}).catch((error) => { 
    console.error(error); 
    this.exception = 'An error occured while retreiving benefits';
    this.error = ''; 
    this.isError = false;
});
  this.benefitsCalloutDone = true;
}


getCoveredBenefits(listOfCoveredBenefits){
  let coveredBenefitsOptions;
  coveredBenefitsOptions = listOfCoveredBenefits;
  for(let i=0;i<coveredBenefitsOptions.length;i++){
    const optiondata = { label: coveredBenefitsOptions[i].summarytype, value: coveredBenefitsOptions[i].summarycode};
    this.benefitOptions = [ ...this.benefitOptions, optiondata];
  } 
}

handleCoveredBenefitsChange(event){
  this.strSummaryCode = event.detail.value;
  if(this.strSummaryCode != null)
    this.fetchBenefitCategories(this.strSummaryCode);//SALESFORCE-8560
  this.displaySummaryDescription(this.responseData);  
  //10795 dec13 Pass the benefit type selected to auto documetn
  const summaryTypeChangedEvt = CustomEvent('summarytypechange',{
  detail : {
    value : this.strSummaryCode
  }});
  this.dispatchEvent(summaryTypeChangedEvt);
}

//Method to set the value in summary description
displaySummaryDescription(responseData){ 
  let strChkMapKeyArray = [];
  if(responseData.strChkMapKey){
    strChkMapKeyArray = responseData.strChkMapKey.split(',');
  } 

  if(this.strSummaryCode && (this.strSummaryCode != '' || this.strSummaryCode != null) &&
    strChkMapKeyArray.includes(this.strSummaryCode)){
    let summaryDesc  =  responseData.mapBenefitSummaries[this.strSummaryCode].benefitSummaryDescription;
    summaryDesc = summaryDesc.replaceAll(/<br\s*[\/]?>/gi, "\n");
    this.summaryDescription = summaryDesc;

    let showDescChar = 300;
    let contentText = this.summaryDescription;
    if(contentText.length > showDescChar){ 
      this.viewMoreOrLessLink = '..View more';
      this.showSubstring = true;
      this.charInitial = contentText.substr(0, showDescChar-1);
      this.charRest = contentText.substr(showDescChar-1, (contentText.length - showDescChar)+1);
    }else if(contentText.length < showDescChar || contentText.length == showDescChar){
      this.viewMoreOrLessLink = ' ';//View more link not required if short description
      this.showSubstring= false;
    }
  if(contentText.length <= 0 || this.summaryDescription == null){//If sumamrydescription is null
    this.showSubstring= false;
    this.viewMoreOrLessLink = ' ';
  }
}
}

handleMoreOrLessClick(){
  //If substring is true(View More Text clicked), then the user wants to see complete description
  if(this.showSubstring == true){
  this.showSubstring = false;
  this.viewMoreOrLessLink = '..View less';
  }else if(this.showSubstring == false){//If the user wants to see less data (User lciked on view less)
  this.showSubstring = true;
  this.viewMoreOrLessLink = '..View more';
  }
}

processResponse(data){ 
  let result = [];  
  this.listToSort =[]; 
  data.forEach((element) => {  
  let elementToSort = {}; 

  element.id = element.id;
  if(element.bsdlCodeDescription){
      element.bsdlCodeDescription = element.bsdlCodeDescription;
      elementToSort.bsdlCodeDescription = element.bsdlCodeDescription;
  }  

  if (element.copay!=null) {
    elementToSort.copay = element.copay; 
    let copayElmnt =  element.copay;
    element.copay = formatCurrency(copayElmnt);
    
  }

  if (element.coinsurance!=null) { 
    element.coinsurance = element.coinsurance;
    elementToSort.coinsurance = element.coinsurance;
  }

  if (element.deductible!=null) { 
    elementToSort.deductible = element.deductible;
    let deductElmnt =  element.deductible;
    element.deductible = formatCurrency(deductElmnt);
    
  }

  if (element.limit_Z != null) { 
    elementToSort.limit_Z = element.limit_Z;
    let limitElmnt =  element.limit_Z;    
    element.limit_Z = formatCurrency(limitElmnt);
    
  }
  if(element.bsdlCode !=null){
    element.bsdlCode = element.bsdlCode;
  }

  //SALESFORCE-10795
  element.isselected = false;  
  this.listToSort.push(elementToSort); 
  /*SALESFORCE-10795 Preparing the row for auto documentation*/
  element.benefitdetailtoquote =  this.constructBenefitDetailQuoteRow(element);   

  result.push(element);
  });   
  return result;
}

/*SALESFORCE-10795
This method creates a field in the column data for auto documetation*/
constructBenefitDetailQuoteRow(benefitdetail){
  let rowObj = {}; 
  rowObj.isselected =  benefitdetail.isselected;
  rowObj.bsdlCode =  benefitdetail.bsdlCode;
  rowObj.bsdlCodeDescription = benefitdetail.bsdlCodeDescription;
  rowObj.copay = benefitdetail.copay;
  rowObj.coinsurance = benefitdetail.coinsurance;
  rowObj.deductible = benefitdetail.deductible;
  rowObj.limit_Z = benefitdetail.limit_Z;
  return rowObj;
}

displayPaginated(datatToDisplay,sortResultAsc){
  this.util.dataList = [...datatToDisplay];
  this.util.originalDataList = [...datatToDisplay];
  this.util.setNumberOfPages(this.util.dataList.length);
  this.util.setPageData("1");
  if(sortResultAsc == true){
  this.util.sortedBy = "bsdlCodeDescription";
  this.util.sortDirection = "asc";
  let fieldName = this.util.sortedBy;
  this.util.sortData(null, "text");
  }
  this.pageData = this.util.pageData; 
  this.benefitDataLoaded = true;
  this.isError = false;
  if(this.pageData.length == 0 && this.isSearchFilter){
    this.error = 'No matching records found';
    this.benefitDataLoaded = false;
    this.isError = true;
  }else if(this.pageData.length == 0){
    this.error = 'No data available in table'; //When apex callout do not return data
    this.benefitDataLoaded = false;
    this.isError = true;
  }
} 


filterBenefitData(event){
  this.isSearchFilter = true;
  this.searchValue = event.detail.value;
  //convert to upper case if the incoming vlaue is not number
  let searchTermUpperCase = isNaN(this.searchValue)?this.searchValue.toUpperCase() : this.searchValue;
  let filteredResults =[];
  let dataListToFindTerm = this.benefitData; 
  if (searchTermUpperCase.length > 0) {
  for(let i=0; i<dataListToFindTerm.length;i++){ 
  if( 
  ( dataListToFindTerm[i].bsdlCode && dataListToFindTerm[i].bsdlCode.toUpperCase().indexOf(searchTermUpperCase) != -1 ) ||
  ( dataListToFindTerm[i].bsdlCodeDescription && dataListToFindTerm[i].bsdlCodeDescription.toUpperCase().indexOf(searchTermUpperCase) != -1 ) ||
  ( dataListToFindTerm[i].coinsurance && dataListToFindTerm[i].coinsurance == searchTermUpperCase) ||
  ( dataListToFindTerm[i].copay && dataListToFindTerm[i].copay == searchTermUpperCase) ||
  ( dataListToFindTerm[i].deductible && dataListToFindTerm[i].deductible == searchTermUpperCase) ||
  ( dataListToFindTerm[i].limit && dataListToFindTerm[i].limit == searchTermUpperCase))
  {
    filteredResults.push(dataListToFindTerm[i]);
  } 
  }

  if(filteredResults.length > 0){ 
    this.displayPaginated(filteredResults,true);  
  }else{//if no matching records.
    this.displayPaginated(filteredResults,true); 
  }
  }
  else{
    this.isSearchFilter = false;
    this.displayPaginated(this.benefitData,true);  
  }
}

/*SALESFORCE-10658*/
reloadBenefits(){ 
  this.invokeBenefitCallout(true);
}
/*SALESFORCE-10658*/


// PAGINATION BEGIN
changePage(event) {
  let newPageNum;
  event.target.label == "Next" ? (newPageNum = parseInt(this.util.currentPage) + 1) : (newPageNum = parseInt(this.util.currentPage) - 1);
  this.util.setPageData(newPageNum.toString());
  this.pageData = this.util.pageData;
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
// PAGINATION END

// SORT BEGIN
handleSort(event) {
  this.util.sortedBy = event.detail.fieldName;
  this.util.sortDirection = event.detail.sortDirection;
  let fieldName = this.util.sortedBy;
  if (fieldName == "bsdlCodeDescription"){
      this.util.sortData(null, "text");  
  }
  if(fieldName == "coinsurance"){
      this.util.sortData(null, "number");  
  }    
  if(fieldName == "copay" || fieldName == "deductible" || fieldName == "limit_Z"){
      this.util.dataList = [...this.listToSort]; 
      this.util.sortData(null, "number"); 
      this.listToSort = [...this.util.dataList];//Keep the sorted datalist for furthur sorting
      let checkLst =[];
      checkLst = this.processResponse(this.util.dataList); 
      this.displayPaginated(checkLst,false); 
  }
  this.pageData = this.util.pageData;
}
// SORT END

handleDateChange(event){ 
  let selectedDt = event.target.value;//SALESFORCE-10979 

  //If valid date is entered, reload Benefits & Accumulators
  if(selectedDt !== null){ //SALESFORCE-10979 
    this.asofDate  = selectedDt; //SALESFORCE-10979 
    //reload the benefits 
    this.invokeBenefitCallout(true);
    //reload accumulators in sibling component after Benefits are re-loaded
    if(this.benefitsCalloutDone == true){
    let changedDate = this.asofDate; 
    //Sending parameter accumulatorcalloutdone=false to indicate 
    //that Accumulator callout needs to be initiated from event
    let accumulatorcalloutdone = false; //SALESFORCE-10658
    const fireReloadAccumEvt = new CustomEvent("reloadondatechange", {
    detail: {changedDate,accumulatorcalloutdone}});
    this.dispatchEvent(fireReloadAccumEvt); 
    }
  }
}

/*SALESFORCE-8560
Method to retreive the Benefit Categories for the 
selected Benefit Summary Type. This method is 
invoked every time the Benefit Summary field changes. 
*/
fetchBenefitCategories(summaryCodeSelected){
  this.benefitCategoryOptions = []; //Clear all the existing categories
  this.countvalue = ''; //Clear the count of selected categories
  this.countvalue = 'Please select a Benefit Category';
  this.selectedBenefitCategories =[]; //Clear the selected categories
  this.categoryCount = 0; 
  let validCategoryLst =[]; 
  if(summaryCodeSelected != null){
      validCategoryLst = this.mapCategoryKeyValue[summaryCodeSelected];
  }  

  if(validCategoryLst!=undefined && validCategoryLst.length >0){
      validCategoryLst.forEach((category)=> {
          let categoryObj = {};
          categoryObj = { label    : category, 
                          value    : category,  
                          selected : false };
          this.benefitCategoryOptions.push(categoryObj);  
      }); 
      if(this.showCategoryDropdown == false){
          this.showCategoryDropdown = true;
      }
  }else{ 
          //Hide the Category dropdown if No categories exist for the selected summary type
          this.showCategoryDropdown = false;
  } 
}

/*SALESFORCE-8560
This method is invoked everytime a Category is selected from the 
custoMultiselectPicklistComponent. This method sets the 
attribute  'selected' for categories &
maintains the count of selected categories.
*/
handleCategorySelection(event){
let selectedCategory = event.detail.selectedvalue;  

  this.benefitCategoryOptions.forEach((categoryOption) => {
      if(categoryOption.value === selectedCategory) {
      if(categoryOption.selected == true){
        categoryOption.selected = false;
        this.categoryCount--;
        if(this.selectedBenefitCategories.includes(selectedCategory)){
          this.selectedBenefitCategories.splice(this.selectedBenefitCategories.indexOf(selectedCategory), 1);
        }
      }else{
        categoryOption.selected = true;
        this.categoryCount++;
        this.selectedBenefitCategories.push(categoryOption.value);
      }       
    }
  }); 
this.countvalue = this.categoryCount + ' Option(s) Selected'; 
}

/*SALESFORCE-8560 This method is called when the 'Select' 
button is clicked for autodocumenting Benefit Summary
*/
handleBenefitSummarySelectionForQuote(){   
  //Reset benefitSummaryQuoteData with the updated Quoted data from Parent
  this.benefitSummaryQuoteData = [...this.benefitQuotedDataFromParent];//SALESFORCE-10618 
  if(this.strSummaryCode!=null){
    let summaryCode_quote = this.strSummaryCode;
    let summaryType_quote = this.responseData.mapBenefitSummaries[this.strSummaryCode].benefitSummaryType;
    let summaryDescription_quote = this.responseData.mapBenefitSummaries[this.strSummaryCode].benefitSummaryDescription;
    summaryDescription_quote = summaryDescription_quote.replaceAll(/<br\s*[\/]?>/gi, "\n");
    let benefitSummaryList =[];
    if(this.selectedBenefitCategories.length >0){ 
        this.selectedBenefitCategories.forEach((selectedBenefitCategory) => { 
          let summaryToQuote = {  
            benefitCode               : summaryCode_quote,
            benefitSummaryType        : summaryType_quote,
            benefitSummaryDescription : summaryDescription_quote,
            benefitCategory           : selectedBenefitCategory
          }; 
          benefitSummaryList.push(summaryToQuote);  
        }); 
        //SALESFORCE-10795
        this.addSelectedRowToQuoteTable(benefitSummaryList);
    }else{//If no categories selected 
        let summaryToQuote = {  
        benefitCode : summaryCode_quote,
        benefitSummaryType : summaryType_quote,
        benefitSummaryDescription : summaryDescription_quote,
        benefitCategory : null
        }; 
        benefitSummaryList.push(summaryToQuote);  
        //SALESFORCE-10795
        this.addSelectedRowToQuoteTable(benefitSummaryList);
    }  
  }
}

/*SALESFORCE-10795*/
addSelectedRowToQuoteTable(benefitSummaryLst){ 
  //Firing event with the selected Benefit Summary to add it to the Quote table
  //This event is handled by the parent component benefitsPageLWCComponent 
  const fireToAddQuotedSummaryRow = new CustomEvent("addbenefitrowtoquote", {
  detail: {
          type : 'benefitsummary', 
          value : benefitSummaryLst
  }});
  this.dispatchEvent(fireToAddQuotedSummaryRow); 
}

/*SALESFORCE-10795 
This method gets called from benefitsPageLWCComponent when: 
1. When checkbox in the row is clicked to quote the table.
(The isselected field in the row data will be updated to true)
2. When delete button in quoted benefit detail is clicked
(The isselected field in the row will be updated to false)
Parameters : 1.Unique key to filter the row, 2. Boolean to update isselected with.  
*/
@api
updateBenefitDetailData(bsdlcodeKey, boolSelect){  
      const rowToUpdate = this.pageData.find(element => element.bsdlCode === bsdlcodeKey);
      rowToUpdate.isselected = boolSelect;  
      const rowDataToSplice = (element) => element.bsdlCode  === bsdlcodeKey;
      let indextodelete = this.benefitData.findIndex(rowDataToSplice); 
      let benefitLst = [...this.benefitData];   
      benefitLst.splice(indextodelete,1,rowToUpdate); 
      this.benefitData = [...benefitLst];
      this.displayPaginated(this.benefitData,true);  
}

}